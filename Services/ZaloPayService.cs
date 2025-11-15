using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using HealthWeb.Models.EF;
using Microsoft.EntityFrameworkCore;

namespace HealthWeb.Services;

public interface IZaloPayService
{
    Task<(bool success, string? paymentUrl, string? errorMessage)> CreatePaymentAsync(
        string transactionId, double amount, string description);
    Task<(bool success, string? errorMessage)> VerifyCallbackAsync(Dictionary<string, string> callbackData);
}

public class ZaloPayService : IZaloPayService
{
    private readonly IConfiguration _configuration;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ZaloPayService> _logger;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public ZaloPayService(
        IConfiguration configuration,
        ApplicationDbContext context,
        ILogger<ZaloPayService> logger,
        IHttpContextAccessor httpContextAccessor)
    {
        _configuration = configuration;
        _context = context;
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<(bool success, string? paymentUrl, string? errorMessage)> CreatePaymentAsync(
        string transactionId, double amount, string description)
    {
        try
        {
            var appId = _configuration["Payment:ZaloPay:AppId"];
            var key1 = _configuration["Payment:ZaloPay:Key1"];
            var key2 = _configuration["Payment:ZaloPay:Key2"];
            var appUser = _configuration["Payment:ZaloPay:AppUser"] ?? "HealthWeb";
            
            // Lấy base URL từ config hoặc từ HttpContext
            var baseUrl = _configuration["Payment:BaseUrl"];
            if (string.IsNullOrEmpty(baseUrl) && _httpContextAccessor.HttpContext != null)
            {
                var request = _httpContextAccessor.HttpContext.Request;
                baseUrl = $"{request.Scheme}://{request.Host}";
            }
            if (string.IsNullOrEmpty(baseUrl))
            {
                baseUrl = "http://localhost:5000";
            }
            
            var callbackUrl = _configuration["Payment:ZaloPay:CallbackUrl"];
            if (string.IsNullOrEmpty(callbackUrl))
            {
                callbackUrl = $"{baseUrl}/Payment/ZaloPayCallback";
            }
            
            var redirectUrl = _configuration["Payment:ZaloPay:RedirectUrl"];
            if (string.IsNullOrEmpty(redirectUrl))
            {
                redirectUrl = $"{baseUrl}/Payment/Success";
            }

            if (string.IsNullOrEmpty(appId) || string.IsNullOrEmpty(key1))
            {
                _logger.LogWarning("ZaloPay configuration is missing");
                return (false, null, "Cấu hình ZaloPay chưa đầy đủ");
            }

            // Tạo order ID từ transaction ID
            var appTransId = DateTime.Now.ToString("yyMMdd") + "_" + transactionId;
            
            // Tạo request data
            var embedData = new Dictionary<string, object>
            {
                { "redirecturl", redirectUrl }
            };

            var items = new[]
            {
                new { itemid = "1", itemname = description, itemprice = (long)amount, itemquantity = 1 }
            };

            var order = new Dictionary<string, object>
            {
                { "app_id", int.Parse(appId) },
                { "app_user", appUser },
                { "app_time", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() },
                { "amount", (long)amount },
                { "app_trans_id", appTransId },
                { "embed_data", JsonSerializer.Serialize(embedData) },
                { "item", JsonSerializer.Serialize(items) },
                { "description", description },
                { "bank_code", "zalopayapp" },
                { "callback_url", callbackUrl }
            };

            // Tạo mac (message authentication code)
            var data = $"{appId}|{order["app_trans_id"]}|{order["app_user"]}|{order["amount"]}|{order["app_time"]}|{order["embed_data"]}|{order["item"]}";
            var mac = ComputeHMACSHA256(data, key1);
            order["mac"] = mac;

            // Gọi ZaloPay API
            var httpClient = new HttpClient();
            var content = new FormUrlEncodedContent(
                order.Select(kv => new KeyValuePair<string, string>(kv.Key, kv.Value.ToString() ?? ""))
            );

            var response = await httpClient.PostAsync("https://sb-openapi.zalopay.vn/v2/create", content);
            var responseContent = await response.Content.ReadAsStringAsync();

            _logger.LogInformation("ZaloPay API Response: {Response}", responseContent);

            var result = JsonSerializer.Deserialize<Dictionary<string, object>>(responseContent);

            if (result != null && result.ContainsKey("return_code") && result["return_code"].ToString() == "1")
            {
                var orderUrl = result.ContainsKey("order_url") ? result["order_url"].ToString() : null;
                return (true, orderUrl, null);
            }
            else
            {
                var returnMessage = result != null && result.ContainsKey("return_message") 
                    ? result["return_message"].ToString() 
                    : "Lỗi không xác định từ ZaloPay";
                return (false, null, returnMessage);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating ZaloPay payment");
            return (false, null, "Lỗi khi tạo thanh toán ZaloPay: " + ex.Message);
        }
    }

    public async Task<(bool success, string? errorMessage)> VerifyCallbackAsync(Dictionary<string, string> callbackData)
    {
        try
        {
            var key2 = _configuration["Payment:ZaloPay:Key2"];
            if (string.IsNullOrEmpty(key2))
            {
                return (false, "Cấu hình Key2 chưa được thiết lập");
            }

            // Verify mac từ callback
            var dataStr = $"{callbackData["app_id"]}|{callbackData["app_trans_id"]}|{callbackData["app_time"]}|{callbackData["amount"]}|{callbackData["app_user"]}|{callbackData["zp_trans_id"]}";
            var mac = ComputeHMACSHA256(dataStr, key2);

            if (mac != callbackData["mac"])
            {
                _logger.LogWarning("ZaloPay callback MAC verification failed");
                return (false, "Xác thực callback thất bại");
            }

            // Cập nhật transaction trong database
            var appTransId = callbackData["app_trans_id"];
            var transactionId = appTransId.Contains("_") ? appTransId.Split('_')[1] : appTransId;

            var transaction = await _context.GiaoDiches
                .FirstOrDefaultAsync(t => t.GiaoDichId == transactionId);

            if (transaction != null)
            {
                transaction.TrangThaiThanhToan = "Completed";
                transaction.PhuongThucThanhToan = "ZaloPay";
                await _context.SaveChangesAsync();
            }

            return (true, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying ZaloPay callback");
            return (false, "Lỗi khi xác thực callback: " + ex.Message);
        }
    }

    private string ComputeHMACSHA256(string data, string key)
    {
        var keyBytes = Encoding.UTF8.GetBytes(key);
        var dataBytes = Encoding.UTF8.GetBytes(data);

        using (var hmac = new HMACSHA256(keyBytes))
        {
            var hashBytes = hmac.ComputeHash(dataBytes);
            return BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
        }
    }
}

