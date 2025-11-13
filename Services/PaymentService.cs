using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using HealthWeb.Models.Entities;
using HealthWeb.Models.EF;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace HealthWeb.Services
{
    public interface IPaymentService
    {
        Task<object?> GetBookingForPaymentAsync(string bookingId, string userId);
        Task<(bool success, string message, object? paymentUrl)> CreateMoMoPaymentAsync(string bookingId, string userId);
        Task<(bool success, string message)> ProcessMoMoCallbackAsync(string orderId, long resultCode, string? extraData);
        Task<object?> GetPaymentStatusAsync(string bookingId, string userId);
        Task<string?> GetCurrentUserIdAsync(HttpContext httpContext);
    }

    public class PaymentService : IPaymentService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<PaymentService> _logger;
        private readonly IConfiguration _configuration;
        private readonly IHttpContextAccessor _httpContextAccessor;

        // MoMo API Configuration
        private readonly string _momoApiUrl;
        private readonly string _momoPartnerCode;
        private readonly string _momoAccessKey;
        private readonly string _momoSecretKey;
        private readonly string _momoReturnUrl;
        private readonly string _momoNotifyUrl;
        private readonly double _appCommissionRate = 0.15; // 15% hoa hồng app

        public PaymentService(
            ApplicationDbContext context,
            ILogger<PaymentService> logger,
            IConfiguration configuration,
            IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
            _httpContextAccessor = httpContextAccessor;

            // Load MoMo configuration from appsettings.json
            _momoApiUrl = _configuration["MoMo:ApiUrl"] ?? "https://test-payment.momo.vn/v2/gateway/api/create";
            _momoPartnerCode = _configuration["MoMo:PartnerCode"] ?? "MOMOBKUN20180529";
            _momoAccessKey = _configuration["MoMo:AccessKey"] ?? "klm05TvNBzhg7h7j";
            _momoSecretKey = _configuration["MoMo:SecretKey"] ?? "at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa";
            _momoReturnUrl = _configuration["MoMo:ReturnUrl"] ?? "https://localhost:7011/Payment/Callback";
            _momoNotifyUrl = _configuration["MoMo:NotifyUrl"] ?? "https://localhost:7011/Payment/Callback";
        }

        public async Task<object?> GetBookingForPaymentAsync(string bookingId, string userId)
        {
            try
            {
                var booking = await _context.DatLichPts
                    .Include(b => b.Pt)
                        .ThenInclude(p => p.User)
                    .Include(b => b.KhacHang)
                    .Include(b => b.GiaoDich)
                    .FirstOrDefaultAsync(b => b.DatLichId == bookingId && b.KhacHangId == userId);

                if (booking == null)
                {
                    return null;
                }

                // Kiểm tra booking đã được confirm chưa
                if (booking.TrangThai != "Confirmed")
                {
                    return new { error = "Booking chưa được xác nhận. Vui lòng đợi PT xác nhận trước khi thanh toán." };
                }

                // Kiểm tra đã thanh toán chưa
                if (booking.GiaoDich != null && booking.GiaoDich.TrangThaiThanhToan == "Completed")
                {
                    return new { error = "Booking này đã được thanh toán." };
                }

                // Tính toán số tiền
                var pt = booking.Pt;
                if (pt == null)
                {
                    return new { error = "Không tìm thấy thông tin huấn luyện viên." };
                }

                var pricePerHour = pt.GiaTheoGio ?? 0;
                var hours = 1.0; // Mặc định 1 giờ, có thể tính toán dựa trên session type
                var totalAmount = pricePerHour * hours;
                var appCommission = totalAmount * _appCommissionRate;
                var ptAmount = totalAmount - appCommission;

                return new
                {
                    bookingId = booking.DatLichId,
                    ptName = pt.User?.HoTen ?? "N/A",
                    ptAvatar = pt.AnhDaiDien ?? pt.User?.AnhDaiDien ?? "/images/default-avatar.png",
                    sessionDate = booking.NgayGioDat.ToString("dd/MM/yyyy HH:mm"),
                    sessionType = booking.LoaiBuoiTap ?? "Online",
                    pricePerHour = pricePerHour,
                    hours = hours,
                    totalAmount = totalAmount,
                    appCommission = appCommission,
                    ptAmount = ptAmount,
                    hasExistingTransaction = booking.GiaoDich != null,
                    transactionStatus = booking.GiaoDich?.TrangThaiThanhToan ?? "Pending"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting booking for payment");
                return new { error = "Có lỗi xảy ra khi lấy thông tin booking." };
            }
        }

        public async Task<(bool success, string message, object? paymentUrl)> CreateMoMoPaymentAsync(string bookingId, string userId)
        {
            try
            {
                // Lấy thông tin booking
                var booking = await _context.DatLichPts
                    .Include(b => b.Pt)
                        .ThenInclude(p => p.User)
                    .Include(b => b.GiaoDich)
                    .FirstOrDefaultAsync(b => b.DatLichId == bookingId && b.KhacHangId == userId);

                if (booking == null)
                {
                    return (false, "Không tìm thấy booking", null);
                }

                if (booking.TrangThai != "Confirmed")
                {
                    return (false, "Booking chưa được xác nhận. Vui lòng đợi PT xác nhận trước khi thanh toán.", null);
                }

                // Kiểm tra đã có giao dịch chưa
                GiaoDich? transaction = null;
                if (booking.GiaoDich != null)
                {
                    transaction = booking.GiaoDich;
                    if (transaction.TrangThaiThanhToan == "Completed")
                    {
                        return (false, "Booking này đã được thanh toán.", null);
                    }
                }

                // Tính toán số tiền
                var pt = booking.Pt;
                if (pt == null)
                {
                    return (false, "Không tìm thấy thông tin huấn luyện viên.", null);
                }

                var pricePerHour = pt.GiaTheoGio ?? 0;
                var hours = 1.0;
                var totalAmount = (long)(pricePerHour * hours);
                var appCommission = (long)(totalAmount * _appCommissionRate);
                var ptAmount = totalAmount - appCommission;

                // Tạo hoặc cập nhật giao dịch
                if (transaction == null)
                {
                    var lastTransaction = await _context.GiaoDiches
                        .OrderByDescending(t => t.GiaoDichId)
                        .FirstOrDefaultAsync();

                    var transactionId = "txn_0001";
                    if (lastTransaction != null)
                    {
                        try
                        {
                            var number = int.Parse(lastTransaction.GiaoDichId.Split('_')[1]) + 1;
                            transactionId = $"txn_{number:D4}";
                        }
                        catch
                        {
                            transactionId = $"txn_{DateTime.Now:yyyyMMddHHmmss}";
                        }
                    }

                    transaction = new GiaoDich
                    {
                        GiaoDichId = transactionId,
                        DatLichId = bookingId,
                        KhachHangId = userId,
                        Ptid = booking.Ptid ?? "",
                        SoTien = totalAmount,
                        HoaHongApp = appCommission,
                        SoTienPtnhan = ptAmount,
                        TrangThaiThanhToan = "Pending",
                        PhuongThucThanhToan = "MoMo",
                        NgayGiaoDich = DateTime.Now
                    };

                    _context.GiaoDiches.Add(transaction);
                }
                else
                {
                    transaction.SoTien = totalAmount;
                    transaction.HoaHongApp = appCommission;
                    transaction.SoTienPtnhan = ptAmount;
                    transaction.TrangThaiThanhToan = "Pending";
                    transaction.PhuongThucThanhToan = "MoMo";
                    transaction.NgayGiaoDich = DateTime.Now;
                }

                await _context.SaveChangesAsync();

                // Tạo MoMo payment request
                var orderId = transaction.GiaoDichId;
                var orderInfo = $"Thanh toan booking {bookingId}";
                var requestId = Guid.NewGuid().ToString();
                var extraData = "";

                // Tạo signature
                var rawHash = $"accessKey={_momoAccessKey}&amount={totalAmount}&extraData={extraData}&ipnUrl={Uri.EscapeDataString(_momoNotifyUrl)}&orderId={orderId}&orderInfo={orderInfo}&partnerCode={_momoPartnerCode}&redirectUrl={Uri.EscapeDataString(_momoReturnUrl)}&requestId={requestId}&requestType=captureWallet";
                var signature = ComputeHmacSha256(rawHash, _momoSecretKey);

                // Tạo request body
                var requestBody = new
                {
                    partnerCode = _momoPartnerCode,
                    partnerName = "HealthWeb",
                    storeId = "HealthWeb",
                    requestId = requestId,
                    amount = totalAmount,
                    orderId = orderId,
                    orderInfo = orderInfo,
                    redirectUrl = _momoReturnUrl,
                    ipnUrl = _momoNotifyUrl,
                    lang = "vi",
                    extraData = extraData,
                    requestType = "captureWallet",
                    autoCapture = true,
                    signature = signature
                };

                // Gọi MoMo API
                using var httpClient = new HttpClient();
                var jsonContent = JsonSerializer.Serialize(requestBody);
                var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

                var response = await httpClient.PostAsync(_momoApiUrl, content);
                var responseContent = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("MoMo API error: {Response}", responseContent);
                    return (false, "Không thể kết nối đến MoMo. Vui lòng thử lại sau.", null);
                }

                var momoResponse = JsonSerializer.Deserialize<JsonElement>(responseContent);
                var resultCode = momoResponse.GetProperty("resultCode").GetInt32();
                var message = momoResponse.GetProperty("message").GetString() ?? "";

                if (resultCode == 0)
                {
                    var payUrl = momoResponse.GetProperty("payUrl").GetString();
                    return (true, "Tạo yêu cầu thanh toán thành công", new { paymentUrl = payUrl });
                }
                else
                {
                    _logger.LogError("MoMo payment creation failed: {Message}", message);
                    return (false, $"MoMo: {message}", null);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating MoMo payment");
                return (false, "Có lỗi xảy ra khi tạo yêu cầu thanh toán.", null);
            }
        }

        public async Task<(bool success, string message)> ProcessMoMoCallbackAsync(string orderId, long resultCode, string? extraData)
        {
            try
            {
                var transaction = await _context.GiaoDiches
                    .Include(t => t.DatLich)
                    .FirstOrDefaultAsync(t => t.GiaoDichId == orderId);

                if (transaction == null)
                {
                    return (false, "Không tìm thấy giao dịch");
                }

                if (transaction.TrangThaiThanhToan == "Completed")
                {
                    return (true, "Giao dịch đã được xử lý trước đó");
                }

                if (resultCode == 0)
                {
                    // Thanh toán thành công
                    transaction.TrangThaiThanhToan = "Completed";
                    if (transaction.DatLich != null)
                    {
                        // Có thể cập nhật trạng thái booking nếu cần
                        // transaction.DatLich.TrangThai = "Paid";
                    }
                    await _context.SaveChangesAsync();
                    return (true, "Thanh toán thành công");
                }
                else
                {
                    // Thanh toán thất bại
                    transaction.TrangThaiThanhToan = "Pending";
                    await _context.SaveChangesAsync();
                    return (false, "Thanh toán thất bại");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing MoMo callback");
                return (false, "Có lỗi xảy ra khi xử lý callback");
            }
        }

        public async Task<object?> GetPaymentStatusAsync(string bookingId, string userId)
        {
            try
            {
                var booking = await _context.DatLichPts
                    .Include(b => b.GiaoDich)
                    .FirstOrDefaultAsync(b => b.DatLichId == bookingId && b.KhacHangId == userId);

                if (booking == null)
                {
                    return null;
                }

                var transaction = booking.GiaoDich;
                if (transaction == null)
                {
                    return new
                    {
                        hasTransaction = false,
                        status = "Chưa thanh toán"
                    };
                }

                return new
                {
                    hasTransaction = true,
                    transactionId = transaction.GiaoDichId,
                    status = transaction.TrangThaiThanhToan,
                    amount = transaction.SoTien,
                    paymentMethod = transaction.PhuongThucThanhToan,
                    transactionDate = transaction.NgayGiaoDich?.ToString("dd/MM/yyyy HH:mm")
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting payment status");
                return new { error = "Có lỗi xảy ra khi lấy trạng thái thanh toán." };
            }
        }

        public async Task<string?> GetCurrentUserIdAsync(HttpContext httpContext)
        {
            var userId = httpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(userId))
            {
                return null;
            }
            return await Task.FromResult(userId);
        }

        private string ComputeHmacSha256(string message, string secretKey)
        {
            var keyBytes = Encoding.UTF8.GetBytes(secretKey);
            var messageBytes = Encoding.UTF8.GetBytes(message);

            using var hmac = new HMACSHA256(keyBytes);
            var hashBytes = hmac.ComputeHash(messageBytes);
            return BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
        }
    }
}

