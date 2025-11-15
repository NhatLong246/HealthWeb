using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using HealthWeb.Models.EF;
using Microsoft.EntityFrameworkCore;

namespace HealthWeb.Services;

public interface IMoMoService
{
    Task<(bool success, string? paymentUrl, string? errorMessage)> CreatePaymentAsync(
        string transactionId, double amount, string description);
    Task<(bool success, string? errorMessage)> VerifyCallbackAsync(Dictionary<string, string> callbackData);
}

public class MoMoService : IMoMoService
{
    private readonly IConfiguration _configuration;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<MoMoService> _logger;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public MoMoService(
        IConfiguration configuration,
        ApplicationDbContext context,
        ILogger<MoMoService> logger,
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
            var partnerCode = _configuration["Payment:MoMo:PartnerCode"];
            var accessKey = _configuration["Payment:MoMo:AccessKey"];
            var secretKey = _configuration["Payment:MoMo:SecretKey"];
            
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
            
            var callbackUrl = _configuration["Payment:MoMo:CallbackUrl"];
            if (string.IsNullOrEmpty(callbackUrl))
            {
                callbackUrl = $"{baseUrl}/Payment/MoMoCallback";
            }
            
            var redirectUrl = _configuration["Payment:MoMo:RedirectUrl"];
            if (string.IsNullOrEmpty(redirectUrl))
            {
                redirectUrl = $"{baseUrl}/Payment/MoMoRedirect";
            }

            if (string.IsNullOrEmpty(partnerCode) || string.IsNullOrEmpty(accessKey) || string.IsNullOrEmpty(secretKey))
            {
                _logger.LogWarning("MoMo configuration is missing");
                return (false, null, "Cấu hình MoMo chưa đầy đủ");
            }

            // Tạo request ID và order ID
            var requestId = Guid.NewGuid().ToString();
            var orderId = DateTime.Now.ToString("yyyyMMddHHmmss") + "_" + transactionId;
            var orderInfo = description;
            var extraData = "";

            // Tạo raw signature
            var rawHash = $"accessKey={accessKey}&amount={(long)amount}&extraData={extraData}&ipnUrl={callbackUrl}&orderId={orderId}&orderInfo={orderInfo}&partnerCode={partnerCode}&redirectUrl={redirectUrl}&requestId={requestId}&requestType=captureWallet";
            var signature = ComputeHMACSHA256(rawHash, secretKey);

            // Tạo request body
            var requestBody = new
            {
                partnerCode = partnerCode,
                partnerName = "HealthWeb",
                storeId = "HealthWeb",
                requestId = requestId,
                amount = (long)amount,
                orderId = orderId,
                orderInfo = orderInfo,
                redirectUrl = redirectUrl,
                ipnUrl = callbackUrl,
                lang = "vi",
                extraData = extraData,
                requestType = "captureWallet",
                signature = signature
            };

            // Gọi MoMo API
            var httpClient = new HttpClient();
            var json = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await httpClient.PostAsync("https://test-payment.momo.vn/v2/gateway/api/create", content);
            var responseContent = await response.Content.ReadAsStringAsync();

            _logger.LogInformation("MoMo API Response: {Response}", responseContent);

            var result = JsonSerializer.Deserialize<Dictionary<string, object>>(responseContent);

            if (result != null && result.ContainsKey("resultCode") && result["resultCode"].ToString() == "0")
            {
                var payUrl = result.ContainsKey("payUrl") ? result["payUrl"].ToString() : null;
                return (true, payUrl, null);
            }
            else
            {
                var message = result != null && result.ContainsKey("message") 
                    ? result["message"].ToString() 
                    : "Lỗi không xác định từ MoMo";
                return (false, null, message);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating MoMo payment");
            return (false, null, "Lỗi khi tạo thanh toán MoMo: " + ex.Message);
        }
    }

    public async Task<(bool success, string? errorMessage)> VerifyCallbackAsync(Dictionary<string, string> callbackData)
    {
        try
        {
            var secretKey = _configuration["Payment:MoMo:SecretKey"];
            if (string.IsNullOrEmpty(secretKey))
            {
                return (false, "Cấu hình SecretKey chưa được thiết lập");
            }

            // Verify signature từ callback
            var rawHash = $"accessKey={callbackData["accessKey"]}&amount={callbackData["amount"]}&extraData={callbackData["extraData"]}&message={callbackData["message"]}&orderId={callbackData["orderId"]}&orderInfo={callbackData["orderInfo"]}&orderType={callbackData["orderType"]}&partnerCode={callbackData["partnerCode"]}&payType={callbackData["payType"]}&requestId={callbackData["requestId"]}&responseTime={callbackData["responseTime"]}&resultCode={callbackData["resultCode"]}&transId={callbackData["transId"]}";
            var signature = ComputeHMACSHA256(rawHash, secretKey);

            if (signature != callbackData["signature"])
            {
                _logger.LogWarning("MoMo callback signature verification failed");
                return (false, "Xác thực callback thất bại");
            }

            // Kiểm tra resultCode
            if (callbackData["resultCode"] != "0")
            {
                return (false, "Thanh toán thất bại: " + callbackData["message"]);
            }

            // Cập nhật transaction trong database
            var orderId = callbackData["orderId"];
            // Format: YYYYMMDDHHmmss_<transaction_id>
            // Transaction ID có thể chứa nhiều dấu gạch dưới (ví dụ: txn_251115_152cc7)
            // Cần lấy tất cả phần sau dấu _ đầu tiên
            string transactionId;
            if (orderId.Contains("_"))
            {
                var firstUnderscoreIndex = orderId.IndexOf('_');
                transactionId = orderId.Substring(firstUnderscoreIndex + 1);
            }
            else
            {
                transactionId = orderId;
            }

            var transaction = await _context.GiaoDiches
                .FirstOrDefaultAsync(t => t.GiaoDichId == transactionId);

            if (transaction != null)
            {
                transaction.TrangThaiThanhToan = "Completed";
                transaction.PhuongThucThanhToan = "MoMo";
                await _context.SaveChangesAsync();
            }

            return (true, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying MoMo callback");
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

