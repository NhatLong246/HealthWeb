using System.Linq;
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
    Task<(bool success, bool isPaid, string? errorMessage)> QueryPaymentStatusAsync(string appTransId);
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
            
            // ZaloPay redirect về embed_data.redirecturl sau khi thanh toán
            // Sử dụng endpoint riêng để xử lý redirect và sau đó chuyển về MyPayments
            var redirectUrl = _configuration["Payment:ZaloPay:RedirectUrl"];
            if (string.IsNullOrEmpty(redirectUrl))
            {
                redirectUrl = $"{baseUrl}/Payment/ZaloPayRedirect";
            }

            if (string.IsNullOrEmpty(appId) || string.IsNullOrEmpty(key1))
            {
                _logger.LogWarning("ZaloPay configuration is missing");
                return (false, null, "Cấu hình ZaloPay chưa đầy đủ");
            }

            // Tạo order ID từ transaction ID
            // Format: YYMMDD_<transaction_id>_<timestamp> (tối đa 40 ký tự)
            // Thêm timestamp để đảm bảo tính duy nhất khi cùng transaction được thử thanh toán nhiều lần
            var dateStr = DateTime.Now.ToString("yyMMdd");
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            
            // Rút ngắn transaction ID nếu cần để đảm bảo tổng độ dài <= 40
            // Format: YYMMDD_<short_txn_id>_<last_6_digits_of_timestamp>
            // Ví dụ: 250115_txn_250115_0001_123456 (tối đa 30 ký tự)
            var shortTxnId = transactionId.Length > 20 ? transactionId.Substring(0, 20) : transactionId;
            var timestampSuffix = timestamp.ToString().Substring(Math.Max(0, timestamp.ToString().Length - 6)); // Lấy 6 chữ số cuối
            
            var appTransId = $"{dateStr}_{shortTxnId}_{timestampSuffix}";
            
            // Kiểm tra độ dài app_trans_id (tối đa 40 ký tự theo ZaloPay)
            if (appTransId.Length > 40)
            {
                // Nếu vẫn quá dài, rút ngắn transaction ID
                var maxTxnIdLength = 40 - dateStr.Length - timestampSuffix.Length - 2; // -2 cho 2 dấu _
                if (maxTxnIdLength > 0)
                {
                    shortTxnId = transactionId.Substring(0, Math.Min(transactionId.Length, maxTxnIdLength));
                    appTransId = $"{dateStr}_{shortTxnId}_{timestampSuffix}";
                }
                else
                {
                    // Nếu vẫn quá dài, chỉ dùng timestamp
                    appTransId = $"{dateStr}_{timestampSuffix}";
                }
                
                _logger.LogWarning("AppTransId truncated: {AppTransId} ({Length} chars)", 
                    appTransId, appTransId.Length);
            }
            
            _logger.LogInformation("ZaloPay AppTransId generated: {AppTransId} for TransactionId: {TransactionId}", 
                appTransId, transactionId);
            
            // Tạo request data
            // Lưu ý: redirectUrl phải là URL đầy đủ và có thể truy cập được từ internet
            // Nếu dùng localhost, chỉ hoạt động khi test trên cùng máy
            _logger.LogInformation("ZaloPay RedirectUrl: {RedirectUrl}, CallbackUrl: {CallbackUrl}", 
                redirectUrl, callbackUrl);
            
            var embedData = new Dictionary<string, object>
            {
                { "redirecturl", redirectUrl }
            };

            var items = new[]
            {
                new { itemid = "1", itemname = description, itemprice = (long)amount, itemquantity = 1 }
            };

            // Serialize embed_data và item
            // Lưu ý: ZaloPay yêu cầu JSON với property names giữ nguyên (không camelCase)
            // Nhưng Dictionary keys sẽ được serialize như là, nên cần đảm bảo keys đúng
            var embedDataJson = JsonSerializer.Serialize(embedData);
            var itemsJson = JsonSerializer.Serialize(items);

            var order = new Dictionary<string, object>
            {
                { "app_id", int.Parse(appId) },
                { "app_user", appUser },
                { "app_time", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() },
                { "amount", (long)amount },
                { "app_trans_id", appTransId },
                { "embed_data", embedDataJson },
                { "item", itemsJson },
                { "description", description },
                { "bank_code", "zalopayapp" },
                { "callback_url", callbackUrl }
            };

            // Tạo mac (message authentication code)
            // Format: app_id|app_trans_id|app_user|amount|app_time|embed_data|item
            // Lưu ý: embed_data và item phải là JSON string đã được serialize
            var data = $"{appId}|{appTransId}|{appUser}|{amount}|{order["app_time"]}|{embedDataJson}|{itemsJson}";
            var mac = ComputeHMACSHA256(data, key1);
            order["mac"] = mac;
            
            _logger.LogInformation("ZaloPay Create Payment Request - AppId: {AppId}, AppTransId: {AppTransId}, Amount: {Amount}, RedirectUrl: {RedirectUrl}", 
                appId, appTransId, amount, redirectUrl);
            _logger.LogInformation("ZaloPay MAC Data String: {Data}", data);
            _logger.LogInformation("ZaloPay MAC: {Mac}", mac);

            // Gọi ZaloPay API
            var httpClient = new HttpClient();
            
            // Log request data để debug
            var requestData = string.Join("&", order.Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value.ToString() ?? "")}"));
            _logger.LogInformation("ZaloPay Request Data: {RequestData}", requestData);
            
            var content = new FormUrlEncodedContent(
                order.Select(kv => new KeyValuePair<string, string>(kv.Key, kv.Value.ToString() ?? ""))
            );

            var response = await httpClient.PostAsync("https://sb-openapi.zalopay.vn/v2/create", content);
            var responseContent = await response.Content.ReadAsStringAsync();

            _logger.LogInformation("ZaloPay API Response Status: {StatusCode}, Content: {Response}", 
                response.StatusCode, responseContent);

            var result = JsonSerializer.Deserialize<Dictionary<string, object>>(responseContent);

            if (result != null && result.ContainsKey("return_code"))
            {
                // return_code có thể là số (1) hoặc string ("1")
                var returnCodeValue = result["return_code"];
                var returnCode = returnCodeValue?.ToString() ?? "";
                _logger.LogInformation("ZaloPay return_code: {ReturnCode} (Type: {Type})", returnCode, returnCodeValue?.GetType().Name);
                
                // Kiểm tra return_code: 1 = thành công
                if (returnCode == "1" || returnCode == "1.0" || (returnCodeValue is JsonElement jsonElement && jsonElement.ValueKind == JsonValueKind.Number && jsonElement.GetInt32() == 1))
                {
                    var orderUrl = result.ContainsKey("order_url") ? result["order_url"]?.ToString() : null;
                    _logger.LogInformation("ZaloPay payment URL created: {OrderUrl}", orderUrl);
                    return (true, orderUrl, null);
                }
                else
                {
                    var returnMessage = result.ContainsKey("return_message") 
                        ? result["return_message"]?.ToString() 
                        : "Lỗi không xác định từ ZaloPay";
                    var subReturnCode = result.ContainsKey("sub_return_code") 
                        ? result["sub_return_code"]?.ToString() 
                        : null;
                    var subReturnMessage = result.ContainsKey("sub_return_message") 
                        ? result["sub_return_message"]?.ToString() 
                        : null;
                    
                    var fullErrorMessage = returnMessage;
                    if (!string.IsNullOrEmpty(subReturnCode))
                    {
                        fullErrorMessage += $" (Sub Code: {subReturnCode})";
                    }
                    if (!string.IsNullOrEmpty(subReturnMessage))
                    {
                        fullErrorMessage += $" - {subReturnMessage}";
                    }
                    
                    _logger.LogWarning("ZaloPay payment creation failed - ReturnCode: {ReturnCode}, Message: {Message}", 
                        returnCode, fullErrorMessage);
                    return (false, null, fullErrorMessage);
                }
            }
            else
            {
                _logger.LogError("ZaloPay API response missing return_code. Response: {Response}", responseContent);
                return (false, null, "Phản hồi từ ZaloPay không hợp lệ");
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
            _logger.LogInformation("ZaloPay VerifyCallback - Received data keys: {Keys}", 
                string.Join(", ", callbackData.Keys));

            var key2 = _configuration["Payment:ZaloPay:Key2"];
            if (string.IsNullOrEmpty(key2))
            {
                _logger.LogError("ZaloPay Key2 is not configured");
                return (false, "Cấu hình Key2 chưa được thiết lập");
            }

            // Kiểm tra các trường bắt buộc
            var requiredFields = new[] { "app_id", "app_trans_id", "app_time", "amount", "app_user", "zp_trans_id", "mac" };
            foreach (var field in requiredFields)
            {
                if (!callbackData.ContainsKey(field) || string.IsNullOrEmpty(callbackData[field]))
                {
                    _logger.LogWarning("ZaloPay callback missing required field: {Field}", field);
                    return (false, $"Thiếu trường bắt buộc: {field}");
                }
            }

            // Verify mac từ callback
            // Format: app_id|app_trans_id|app_time|amount|app_user|zp_trans_id
            var dataStr = $"{callbackData["app_id"]}|{callbackData["app_trans_id"]}|{callbackData["app_time"]}|{callbackData["amount"]}|{callbackData["app_user"]}|{callbackData["zp_trans_id"]}";
            var mac = ComputeHMACSHA256(dataStr, key2);

            _logger.LogInformation("ZaloPay Callback MAC - Computed: {Computed}, Received: {Received}", 
                mac, callbackData["mac"]);

            if (mac != callbackData["mac"])
            {
                _logger.LogWarning("ZaloPay callback MAC verification failed. Computed: {Computed}, Received: {Received}", 
                    mac, callbackData["mac"]);
                return (false, "Xác thực callback thất bại");
            }

            // Cập nhật transaction trong database
            var appTransId = callbackData["app_trans_id"];
            // Format: YYMMDD_<transaction_id>_<timestamp>
            // Extract transaction ID: bỏ phần đầu (YYMMDD_) và phần cuối (_timestamp)
            string transactionId;
            if (appTransId.Contains("_"))
            {
                var parts = appTransId.Split('_');
                if (parts.Length >= 3)
                {
                    // Có timestamp: YYMMDD_<transaction_id>_<timestamp>
                    // Lấy tất cả các phần giữa (bỏ phần đầu và cuối)
                    transactionId = string.Join("_", parts.Skip(1).Take(parts.Length - 2));
                }
                else
                {
                    // Format cũ: YYMMDD_<transaction_id>
                    transactionId = appTransId.Substring(appTransId.IndexOf('_') + 1);
                }
            }
            else
            {
                transactionId = appTransId;
            }

            _logger.LogInformation("ZaloPay Callback - AppTransId: {AppTransId}, Extracted TransactionId: {TransactionId}", 
                appTransId, transactionId);

            var transaction = await _context.GiaoDiches
                .FirstOrDefaultAsync(t => t.GiaoDichId == transactionId);

            if (transaction != null)
            {
                transaction.TrangThaiThanhToan = "Completed";
                transaction.PhuongThucThanhToan = "ZaloPay";
                await _context.SaveChangesAsync();
                _logger.LogInformation("ZaloPay transaction updated: {TransactionId} -> Completed", transactionId);
            }
            else
            {
                _logger.LogWarning("ZaloPay transaction not found: {TransactionId}", transactionId);
            }

            return (true, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying ZaloPay callback");
            return (false, "Lỗi khi xác thực callback: " + ex.Message);
        }
    }

    public async Task<(bool success, bool isPaid, string? errorMessage)> QueryPaymentStatusAsync(string appTransId)
    {
        try
        {
            var appId = _configuration["Payment:ZaloPay:AppId"];
            var key1 = _configuration["Payment:ZaloPay:Key1"];
            
            if (string.IsNullOrEmpty(appId) || string.IsNullOrEmpty(key1))
            {
                return (false, false, "Cấu hình ZaloPay chưa đầy đủ");
            }

            // Tạo request để query payment status
            var requestData = new Dictionary<string, object>
            {
                { "app_id", int.Parse(appId) },
                { "app_trans_id", appTransId }
            };

            // Tạo MAC: app_id|app_trans_id|key1
            var macData = $"{appId}|{appTransId}|{key1}";
            var mac = ComputeHMACSHA256(macData, key1);
            requestData["mac"] = mac;

            // Gọi ZaloPay query API
            var httpClient = new HttpClient();
            var content = new FormUrlEncodedContent(
                requestData.Select(kv => new KeyValuePair<string, string>(kv.Key, kv.Value.ToString() ?? ""))
            );

            var response = await httpClient.PostAsync("https://sb-openapi.zalopay.vn/v2/query", content);
            var responseContent = await response.Content.ReadAsStringAsync();

            _logger.LogInformation("ZaloPay Query API Response: {Response}", responseContent);

            var result = JsonSerializer.Deserialize<Dictionary<string, object>>(responseContent);

            if (result != null && result.ContainsKey("return_code"))
            {
                var returnCode = result["return_code"].ToString();
                _logger.LogInformation("ZaloPay Query - return_code: {ReturnCode}", returnCode);
                
                if (returnCode == "1")
                {
                    // Kiểm tra trạng thái thanh toán
                    // return_code = 1: thành công
                    // Kiểm tra thêm thông tin trong response
                    var zpTransId = result.ContainsKey("zp_trans_id") ? result["zp_trans_id"]?.ToString() : null;
                    var isPaid = !string.IsNullOrEmpty(zpTransId);
                    
                    _logger.LogInformation("ZaloPay Query - zp_trans_id: {ZpTransId}, isPaid: {IsPaid}", zpTransId, isPaid);
                    
                    return (true, isPaid, null);
                }
                else
                {
                    var returnMessage = result.ContainsKey("return_message") 
                        ? result["return_message"].ToString() 
                        : "Lỗi không xác định";
                    var subReturnCode = result.ContainsKey("sub_return_code") 
                        ? result["sub_return_code"]?.ToString() 
                        : null;
                    var subReturnMessage = result.ContainsKey("sub_return_message") 
                        ? result["sub_return_message"]?.ToString() 
                        : null;
                    
                    var fullMessage = returnMessage;
                    if (!string.IsNullOrEmpty(subReturnCode))
                    {
                        fullMessage += $" (Sub Code: {subReturnCode})";
                    }
                    if (!string.IsNullOrEmpty(subReturnMessage))
                    {
                        fullMessage += $" - {subReturnMessage}";
                    }
                    
                    _logger.LogWarning("ZaloPay Query failed - return_code: {ReturnCode}, message: {Message}", returnCode, fullMessage);
                    return (false, false, fullMessage);
                }
            }

            return (false, false, "Phản hồi từ ZaloPay không hợp lệ");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error querying ZaloPay payment status");
            return (false, false, "Lỗi khi kiểm tra trạng thái thanh toán: " + ex.Message);
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

