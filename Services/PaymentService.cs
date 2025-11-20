using HealthWeb.Models.EF;
using HealthWeb.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace HealthWeb.Services;

public interface IPaymentService
{
    Task<PaymentInfoDto?> GetPaymentInfoAsync(string bookingId, string userId);
    Task<(bool success, string? transactionId, string? errorMessage)> CreateTransactionAsync(string bookingId, string userId, string paymentMethod);
    Task<(bool success, string? paymentUrl, string? errorMessage)> ProcessPaymentAsync(string transactionId, string paymentMethod);
    Task<(bool success, string? errorMessage)> VerifyPaymentAsync(string transactionId);
}

public class PaymentService : IPaymentService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PaymentService> _logger;
    private readonly IZaloPayService _zaloPayService;
    private readonly IMoMoService _moMoService;
    private const double COMMISSION_RATE = 0.15; // 15% hoa hồng app

    public PaymentService(
        ApplicationDbContext context, 
        ILogger<PaymentService> logger,
        IZaloPayService zaloPayService,
        IMoMoService moMoService)
    {
        _context = context;
        _logger = logger;
        _zaloPayService = zaloPayService;
        _moMoService = moMoService;
    }

    public async Task<PaymentInfoDto?> GetPaymentInfoAsync(string bookingId, string userId)
    {
        try
        {
            var booking = await _context.DatLichPts
                .Include(b => b.Pt)
                    .ThenInclude(pt => pt.User)
                .Include(b => b.KhacHang)
                .Include(b => b.GiaoDich)
                .FirstOrDefaultAsync(b => b.DatLichId == bookingId && b.KhacHangId == userId);

            if (booking == null)
            {
                return null;
            }

            // Kiểm tra xem đã có transaction chưa
            if (booking.GiaoDich != null)
            {
                return new PaymentInfoDto
                {
                    BookingId = booking.DatLichId,
                    TransactionId = booking.GiaoDich.GiaoDichId,
                    PTName = booking.Pt?.User?.HoTen ?? booking.Pt?.Ptid ?? "N/A",
                    BookingDateTime = booking.NgayGioDat,
                    BookingType = booking.LoaiBuoiTap ?? "In-person",
                    Amount = booking.GiaoDich.SoTien,
                    Commission = booking.GiaoDich.HoaHongApp ?? 0,
                    PTRevenue = booking.GiaoDich.SoTienPtnhan ?? 0,
                    PaymentStatus = booking.GiaoDich.TrangThaiThanhToan ?? "Pending",
                    PaymentMethod = booking.GiaoDich.PhuongThucThanhToan,
                    HasTransaction = true
                };
            }

            // Tính toán số tiền dựa trên giá PT và số giờ
            var ptPrice = booking.Pt?.GiaTheoGio ?? 0;
            
            // Parse số giờ từ GhiChu
            double hours = 1; // Mặc định 1 giờ
            if (!string.IsNullOrWhiteSpace(booking.GhiChu))
            {
                // Tìm "Số giờ buổi này: X.X giờ" trong GhiChu
                var hoursMatch = System.Text.RegularExpressions.Regex.Match(
                    booking.GhiChu, 
                    @"Số giờ buổi này:\s*([\d.]+)\s*giờ",
                    System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (hoursMatch.Success && double.TryParse(hoursMatch.Groups[1].Value, out var parsedHours))
                {
                    hours = parsedHours;
                }
            }
            
            var amount = ptPrice * hours; // Giá = giá mỗi giờ × số giờ
            
            if (amount <= 0)
            {
                return null; // Không có giá
            }

            var commission = amount * COMMISSION_RATE;
            var ptRevenue = amount - commission;

            return new PaymentInfoDto
            {
                BookingId = booking.DatLichId,
                PTName = booking.Pt?.User?.HoTen ?? booking.Pt?.Ptid ?? "N/A",
                BookingDateTime = booking.NgayGioDat,
                BookingType = booking.LoaiBuoiTap ?? "In-person",
                Amount = amount,
                Commission = commission,
                PTRevenue = ptRevenue,
                PaymentStatus = "Pending",
                HasTransaction = false
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting payment info for booking {BookingId}", bookingId);
            return null;
        }
    }

    public async Task<(bool success, string? transactionId, string? errorMessage)> CreateTransactionAsync(
        string bookingId, string userId, string paymentMethod)
    {
        try
        {
            var booking = await _context.DatLichPts
                .Include(b => b.Pt)
                .Include(b => b.GiaoDich)
                .FirstOrDefaultAsync(b => b.DatLichId == bookingId && b.KhacHangId == userId);

            if (booking == null)
            {
                return (false, null, "Không tìm thấy booking");
            }

            // Kiểm tra xem đã có transaction chưa
            if (booking.GiaoDich != null)
            {
                return (false, null, "Booking này đã có giao dịch thanh toán");
            }

            if (string.IsNullOrEmpty(booking.Ptid))
            {
                return (false, null, "Booking chưa được xác nhận bởi PT");
            }

            // Tính toán số tiền dựa trên giá PT và số giờ
            var ptPrice = booking.Pt?.GiaTheoGio ?? 0;
            
            // Parse số giờ từ GhiChu
            double hours = 1; // Mặc định 1 giờ
            if (!string.IsNullOrWhiteSpace(booking.GhiChu))
            {
                // Tìm "Số giờ buổi này: X.X giờ" trong GhiChu
                var hoursMatch = System.Text.RegularExpressions.Regex.Match(
                    booking.GhiChu, 
                    @"Số giờ buổi này:\s*([\d.]+)\s*giờ",
                    System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (hoursMatch.Success && double.TryParse(hoursMatch.Groups[1].Value, out var parsedHours))
                {
                    hours = parsedHours;
                }
            }
            
            var amount = ptPrice * hours; // Giá = giá mỗi giờ × số giờ
            
            if (amount <= 0)
            {
                return (false, null, "Không thể xác định giá dịch vụ");
            }

            var commission = amount * COMMISSION_RATE;
            var ptRevenue = amount - commission;

            // Tạo transaction ID
            var transactionId = await GenerateTransactionIdAsync();

            var transaction = new GiaoDich
            {
                GiaoDichId = transactionId,
                DatLichId = bookingId,
                KhachHangId = userId,
                Ptid = booking.Ptid,
                SoTien = amount,
                HoaHongApp = commission,
                SoTienPtnhan = ptRevenue,
                TrangThaiThanhToan = "Pending",
                PhuongThucThanhToan = paymentMethod,
                NgayGiaoDich = DateTime.Now
            };

            _context.GiaoDiches.Add(transaction);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Transaction created: {TransactionId} for booking {BookingId}", transactionId, bookingId);

            return (true, transactionId, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating transaction for booking {BookingId}", bookingId);
            return (false, null, "Lỗi khi tạo giao dịch: " + ex.Message);
        }
    }

    public async Task<(bool success, string? paymentUrl, string? errorMessage)> ProcessPaymentAsync(
        string transactionId, string paymentMethod)
    {
        try
        {
            var transaction = await _context.GiaoDiches
                .Include(t => t.DatLich)
                    .ThenInclude(b => b.Pt)
                        .ThenInclude(pt => pt.User)
                .FirstOrDefaultAsync(t => t.GiaoDichId == transactionId);

            if (transaction == null)
            {
                return (false, null, "Không tìm thấy giao dịch");
            }

            if (transaction.TrangThaiThanhToan == "Completed")
            {
                return (false, null, "Giao dịch đã được thanh toán");
            }

            var amount = transaction.SoTien;
            var description = $"Thanh toán buổi tập với PT {transaction.Pt?.User?.HoTen ?? transaction.Ptid}";

            // Gọi API thanh toán tương ứng
            if (paymentMethod == "ZaloPay")
            {
                var (success, paymentUrl, errorMessage) = await _zaloPayService.CreatePaymentAsync(
                    transactionId, amount, description);
                
                if (success && !string.IsNullOrEmpty(paymentUrl))
                {
                    return (true, paymentUrl, null);
                }
                else
                {
                    return (false, null, errorMessage ?? "Không thể tạo thanh toán ZaloPay");
                }
            }
            else if (paymentMethod == "MoMo")
            {
                var (success, paymentUrl, errorMessage) = await _moMoService.CreatePaymentAsync(
                    transactionId, amount, description);
                
                if (success && !string.IsNullOrEmpty(paymentUrl))
                {
                    return (true, paymentUrl, null);
                }
                else
                {
                    return (false, null, errorMessage ?? "Không thể tạo thanh toán MoMo");
                }
            }
            else
            {
                return (false, null, "Phương thức thanh toán không được hỗ trợ");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing payment for transaction {TransactionId}", transactionId);
            return (false, null, "Lỗi khi xử lý thanh toán: " + ex.Message);
        }
    }

    public async Task<(bool success, string? errorMessage)> VerifyPaymentAsync(string transactionId)
    {
        try
        {
            var transaction = await _context.GiaoDiches
                .FirstOrDefaultAsync(t => t.GiaoDichId == transactionId);

            if (transaction == null)
            {
                return (false, "Không tìm thấy giao dịch");
            }

            // Trong thực tế, sẽ gọi API ZaloPay/MoMo để verify
            // Ở đây chỉ kiểm tra status trong DB
            if (transaction.TrangThaiThanhToan == "Completed")
            {
                return (true, null);
            }

            return (false, "Giao dịch chưa được thanh toán");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying payment for transaction {TransactionId}", transactionId);
            return (false, "Lỗi khi xác minh thanh toán: " + ex.Message);
        }
    }

    private async Task<string> GenerateTransactionIdAsync()
    {
        var dateStr = DateTime.Now.ToString("yyyyMMdd");
        var count = await _context.GiaoDiches
            .CountAsync(g => g.GiaoDichId.StartsWith($"txn_{dateStr}"));
        
        var transactionId = $"txn_{dateStr}_{count + 1:D4}";
        
        // Đảm bảo unique
        while (await _context.GiaoDiches.AnyAsync(g => g.GiaoDichId == transactionId))
        {
            count++;
            transactionId = $"txn_{dateStr}_{count + 1:D4}";
        }

        return transactionId;
    }
}

public class PaymentInfoDto
{
    public string BookingId { get; set; } = null!;
    public string? TransactionId { get; set; }
    public string PTName { get; set; } = null!;
    public DateTime BookingDateTime { get; set; }
    public string BookingType { get; set; } = null!;
    public double Amount { get; set; }
    public double Commission { get; set; }
    public double PTRevenue { get; set; }
    public string PaymentStatus { get; set; } = null!;
    public string? PaymentMethod { get; set; }
    public bool HasTransaction { get; set; }
}

