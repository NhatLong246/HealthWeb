using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HealthWeb.Services;
using HealthWeb.Models.EF;
using Microsoft.EntityFrameworkCore;

namespace HealthWeb.Controllers;

[Authorize]
[Route("Payment")]
public class PaymentController : Controller
{
    private readonly IPaymentService _paymentService;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PaymentController> _logger;

    public PaymentController(IPaymentService paymentService, ApplicationDbContext context, ILogger<PaymentController> logger)
    {
        _paymentService = paymentService;
        _context = context;
        _logger = logger;
    }

    // GET: /Payment/MyPayments - Trang danh sách thanh toán
    [HttpGet("MyPayments")]
    public IActionResult MyPayments()
    {
        return View();
    }

    // GET: /Payment/{bookingId} - Trang thanh toán chi tiết
    [HttpGet("{bookingId}")]
    public async Task<IActionResult> Index(string bookingId)
    {
        _logger.LogInformation("Payment Index called with bookingId: {BookingId}", bookingId);
        
        var userId = HttpContext.Session.GetString("UserId");
        if (string.IsNullOrEmpty(userId))
        {
            _logger.LogWarning("Payment Index: No userId in session, redirecting to login");
            return RedirectToAction("Login", "Account");
        }

        _logger.LogInformation("Payment Index: UserId: {UserId}, BookingId: {BookingId}", userId, bookingId);

        var paymentInfo = await _paymentService.GetPaymentInfoAsync(bookingId, userId);
        if (paymentInfo == null)
        {
            _logger.LogWarning("Payment Index: PaymentInfo is null for BookingId: {BookingId}, UserId: {UserId}", bookingId, userId);
            TempData["ErrorMessage"] = "Không tìm thấy thông tin thanh toán";
            return RedirectToAction("MyPayments");
        }

        _logger.LogInformation("Payment Index: Returning view for BookingId: {BookingId}", bookingId);
        return View(paymentInfo);
    }

    // API: Lấy danh sách booking cần thanh toán
    [HttpGet("MyPayments/Data")]
    public async Task<IActionResult> GetMyPaymentsData()
    {
        try
        {
            var userId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Vui lòng đăng nhập" });
            }

            // Lấy tất cả booking đã confirmed của user
            var bookings = await _context.DatLichPts
                .Include(b => b.Pt)
                    .ThenInclude(pt => pt.User)
                .Include(b => b.GiaoDich)
                .Where(b => b.KhacHangId == userId && b.TrangThai == "Confirmed")
                .OrderByDescending(b => b.NgayGioDat)
                .Select(b => new
                {
                    bookingId = b.DatLichId,
                    ptId = b.Ptid,
                    ptName = b.Pt != null ? (string.IsNullOrWhiteSpace(b.Pt.User.HoTen) ? b.Pt.User.Username : b.Pt.User.HoTen) : "N/A",
                    ptAvatar = b.Pt != null ? (b.Pt.AnhDaiDien ?? b.Pt.User.AnhDaiDien ?? "/images/default-avatar.png") : "/images/default-avatar.png",
                    dateTime = b.NgayGioDat,
                    sessionType = b.LoaiBuoiTap ?? "In-person",
                    notes = b.GhiChu,
                    hasTransaction = b.GiaoDich != null,
                    paymentStatus = b.GiaoDich != null ? (b.GiaoDich.TrangThaiThanhToan ?? "Pending") : "Pending",
                    amount = b.GiaoDich != null ? b.GiaoDich.SoTien : (b.Pt != null ? b.Pt.GiaTheoGio : 0),
                    paymentMethod = b.GiaoDich != null ? b.GiaoDich.PhuongThucThanhToan : null
                })
                .ToListAsync();

            return Json(new { success = true, data = bookings });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting my payments data");
            return Json(new { success = false, message = "Không thể tải danh sách thanh toán" });
        }
    }

    // POST: /Payment/CreateTransaction
    [HttpPost("CreateTransaction")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> CreateTransaction([FromBody] CreateTransactionRequest request)
    {
        var userId = HttpContext.Session.GetString("UserId");
        if (string.IsNullOrEmpty(userId))
        {
            return Json(new { success = false, message = "Vui lòng đăng nhập" });
        }

        if (string.IsNullOrEmpty(request.BookingId) || string.IsNullOrEmpty(request.PaymentMethod))
        {
            return Json(new { success = false, message = "Thông tin không hợp lệ" });
        }

        var (success, transactionId, errorMessage) = await _paymentService.CreateTransactionAsync(
            request.BookingId, userId, request.PaymentMethod);

        if (!success)
        {
            return Json(new { success = false, message = errorMessage ?? "Không thể tạo giao dịch" });
        }

        return Json(new { success = true, transactionId = transactionId });
    }

    // POST: /Payment/ProcessPayment
    [HttpPost("ProcessPayment")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> ProcessPayment([FromBody] ProcessPaymentRequest request)
    {
        var userId = HttpContext.Session.GetString("UserId");
        if (string.IsNullOrEmpty(userId))
        {
            return Json(new { success = false, message = "Vui lòng đăng nhập" });
        }

        if (string.IsNullOrEmpty(request.TransactionId) || string.IsNullOrEmpty(request.PaymentMethod))
        {
            return Json(new { success = false, message = "Thông tin không hợp lệ" });
        }

        var (success, paymentUrl, errorMessage) = await _paymentService.ProcessPaymentAsync(
            request.TransactionId, request.PaymentMethod);

        if (!success)
        {
            return Json(new { success = false, message = errorMessage ?? "Thanh toán thất bại" });
        }

        // Trả về payment URL để redirect
        return Json(new { success = true, paymentUrl = paymentUrl });
    }

    // POST: /Payment/ZaloPayCallback - Callback từ ZaloPay
    [HttpPost("ZaloPayCallback")]
    public async Task<IActionResult> ZaloPayCallback()
    {
        try
        {
            var formData = Request.Form.ToDictionary(k => k.Key, v => v.Value.ToString());
            
            _logger.LogInformation("ZaloPay Callback received: {Data}", string.Join(", ", formData.Select(kv => $"{kv.Key}={kv.Value}")));

            var zaloPayService = HttpContext.RequestServices.GetRequiredService<IZaloPayService>();
            var (success, errorMessage) = await zaloPayService.VerifyCallbackAsync(formData);

            if (success)
            {
                return Ok(new { return_code = 1, return_message = "Success" });
            }
            else
            {
                return Ok(new { return_code = -1, return_message = errorMessage ?? "Failed" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing ZaloPay callback");
            return Ok(new { return_code = -1, return_message = "Error" });
        }
    }

    // POST: /Payment/MoMoCallback - Callback từ MoMo
    [HttpPost("MoMoCallback")]
    public async Task<IActionResult> MoMoCallback([FromBody] Dictionary<string, string> callbackData)
    {
        try
        {
            _logger.LogInformation("MoMo Callback received: {Data}", string.Join(", ", callbackData.Select(kv => $"{kv.Key}={kv.Value}")));

            var moMoService = HttpContext.RequestServices.GetRequiredService<IMoMoService>();
            var (success, errorMessage) = await moMoService.VerifyCallbackAsync(callbackData);

            if (success)
            {
                return Ok(new { resultCode = 0, message = "Success" });
            }
            else
            {
                return Ok(new { resultCode = 1, message = errorMessage ?? "Failed" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing MoMo callback");
            return Ok(new { resultCode = 1, message = "Error" });
        }
    }

    // GET: /Payment/Success - Trang thành công sau khi thanh toán
    [HttpGet("Success")]
    public IActionResult Success()
    {
        return View();
    }

    // GET: /Payment/Verify/{transactionId}
    [HttpGet("Verify/{transactionId}")]
    public async Task<IActionResult> VerifyPayment(string transactionId)
    {
        var userId = HttpContext.Session.GetString("UserId");
        if (string.IsNullOrEmpty(userId))
        {
            return Json(new { success = false, message = "Vui lòng đăng nhập" });
        }

        var (success, errorMessage) = await _paymentService.VerifyPaymentAsync(transactionId);

        return Json(new { success = success, message = errorMessage });
    }
}

public class CreateTransactionRequest
{
    public string BookingId { get; set; } = null!;
    public string PaymentMethod { get; set; } = null!;
}

public class ProcessPaymentRequest
{
    public string TransactionId { get; set; } = null!;
    public string PaymentMethod { get; set; } = null!;
}
