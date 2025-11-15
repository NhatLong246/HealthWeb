using System.Linq;
using System.Text.Json;
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
    public IActionResult MyPayments([FromQuery] bool? paymentSuccess = false)
    {
        if (paymentSuccess == true)
        {
            ViewBag.PaymentSuccess = true;
        }
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

    // GET: /Payment/PT/Invoices - Trang hóa đơn cho PT
    [HttpGet("PT/Invoices")]
    public IActionResult PTInvoices()
    {
        return View();
    }

    // API: Lấy danh sách hóa đơn của khách hàng cho PT
    [HttpGet("PT/Invoices/Data")]
    public async Task<IActionResult> GetPTInvoicesData()
    {
        try
        {
            var userId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Vui lòng đăng nhập" });
            }

            // Lấy PT ID từ user
            var pt = await _context.HuanLuyenViens
                .FirstOrDefaultAsync(h => h.UserId == userId);
            
            if (pt == null || string.IsNullOrEmpty(pt.Ptid))
            {
                return Json(new { success = false, message = "Bạn chưa đăng ký làm PT" });
            }

            var ptId = pt.Ptid;

            // Lấy tất cả transaction của khách hàng với PT này
            var invoices = await _context.GiaoDiches
                .Include(t => t.DatLich)
                    .ThenInclude(b => b.KhacHang)
                .Include(t => t.DatLich)
                    .ThenInclude(b => b.Pt)
                        .ThenInclude(pt => pt.User)
                .Where(t => t.Ptid == ptId)
                .OrderByDescending(t => t.NgayGiaoDich)
                .Select(t => new
                {
                    transactionId = t.GiaoDichId,
                    bookingId = t.DatLichId,
                    clientId = t.KhachHangId,
                    clientName = t.DatLich != null && t.DatLich.KhacHang != null 
                        ? (string.IsNullOrWhiteSpace(t.DatLich.KhacHang.HoTen) 
                            ? t.DatLich.KhacHang.Username 
                            : t.DatLich.KhacHang.HoTen) 
                        : "N/A",
                    clientAvatar = t.DatLich != null && t.DatLich.KhacHang != null
                        ? (t.DatLich.KhacHang.AnhDaiDien ?? "/images/default-avatar.png")
                        : "/images/default-avatar.png",
                    dateTime = t.DatLich != null ? t.DatLich.NgayGioDat : (DateTime?)null,
                    sessionType = t.DatLich != null ? (t.DatLich.LoaiBuoiTap ?? "In-person") : "N/A",
                    amount = t.SoTien,
                    commission = t.HoaHongApp ?? 0,
                    ptRevenue = t.SoTienPtnhan ?? 0,
                    paymentStatus = t.TrangThaiThanhToan ?? "Pending",
                    paymentMethod = t.PhuongThucThanhToan,
                    transactionDate = t.NgayGiaoDich
                })
                .ToListAsync();

            return Json(new { success = true, data = invoices });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting PT invoices data");
            return Json(new { success = false, message = "Không thể tải danh sách hóa đơn" });
        }
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

            // Không verify tự động ở đây vì không có app_trans_id chính xác
            // Verification sẽ được thực hiện ở ZaloPayRedirect/MoMoRedirect endpoint khi redirect về
            // Hoặc callback sẽ tự động cập nhật status

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
    public async Task<IActionResult> MoMoCallback()
    {
        try
        {
            Dictionary<string, string> callbackData;
            
            // MoMo có thể gửi JSON body hoặc form data
            if (Request.ContentType?.Contains("application/json") == true)
            {
                // Đọc từ JSON body - enable buffering để có thể đọc lại
                Request.EnableBuffering();
                Request.Body.Position = 0;
                
                using var reader = new StreamReader(Request.Body, leaveOpen: true);
                var body = await reader.ReadToEndAsync();
                Request.Body.Position = 0; // Reset để middleware khác có thể đọc
                
                _logger.LogInformation("MoMo Callback received (JSON): {Body}", body);
                
                var jsonData = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(body);
                callbackData = jsonData?.ToDictionary(
                    kv => kv.Key, 
                    kv => kv.Value.ValueKind == JsonValueKind.String 
                        ? kv.Value.GetString() ?? "" 
                        : kv.Value.GetRawText()) ?? new Dictionary<string, string>();
            }
            else
            {
                // Đọc từ form data
                callbackData = Request.Form.ToDictionary(k => k.Key, v => v.Value.ToString());
                _logger.LogInformation("MoMo Callback received (Form): {Data}", 
                    string.Join(", ", callbackData.Select(kv => $"{kv.Key}={kv.Value}")));
            }

            var moMoService = HttpContext.RequestServices.GetRequiredService<IMoMoService>();
            var (success, errorMessage) = await moMoService.VerifyCallbackAsync(callbackData);

            if (success)
            {
                _logger.LogInformation("MoMo Callback verified successfully");
                return Ok(new { resultCode = 0, message = "Success" });
            }
            else
            {
                _logger.LogWarning("MoMo Callback verification failed: {Error}", errorMessage);
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

    // GET: /Payment/ZaloPayRedirect - Xử lý redirect từ ZaloPay sau khi thanh toán
    [HttpGet("ZaloPayRedirect")]
    public async Task<IActionResult> ZaloPayRedirect([FromQuery] string? app_trans_id, [FromQuery] string? status)
    {
        try
        {
            // Log tất cả query parameters để debug
            var allParams = Request.Query.ToDictionary(k => k.Key, v => v.Value.ToString());
            _logger.LogInformation("ZaloPay Redirect received - All Query Params: {Params}", 
                string.Join(", ", allParams.Select(kv => $"{kv.Key}={kv.Value}")));
            
            // ZaloPay có thể gửi apptransid (không có dấu gạch dưới) hoặc app_trans_id (có dấu gạch dưới)
            // Đọc từ Request.Query để hỗ trợ cả hai format
            var appTransId = app_trans_id ?? Request.Query["apptransid"].ToString();
            var paymentStatus = status ?? Request.Query["status"].ToString();
            
            _logger.LogInformation("ZaloPay Redirect - AppTransId: {AppTransId}, Status: {Status}", 
                appTransId, paymentStatus);

            // Nếu có app_trans_id, verify và cập nhật trạng thái thanh toán
            if (!string.IsNullOrEmpty(appTransId))
            {
                _logger.LogInformation("ZaloPay Redirect - Verifying payment with app_trans_id: {AppTransId}", appTransId);
                
                // Query payment status từ ZaloPay trực tiếp với app_trans_id
                var zaloPayService = HttpContext.RequestServices.GetRequiredService<IZaloPayService>();
                var (success, isPaid, errorMessage) = await zaloPayService.QueryPaymentStatusAsync(appTransId);
                
                _logger.LogInformation("ZaloPay Query Result - Success: {Success}, IsPaid: {IsPaid}, Error: {Error}", 
                    success, isPaid, errorMessage);
                
                // Nếu status = 1 (thanh toán thành công) hoặc query API trả về isPaid = true
                if ((paymentStatus == "1" || success && isPaid))
                {
                    // Extract transaction ID từ app_trans_id để cập nhật
                    string transactionId;
                    if (appTransId.Contains("_"))
                    {
                        var parts = appTransId.Split('_');
                        if (parts.Length >= 3)
                        {
                            // Có timestamp: YYMMDD_<transaction_id>_<timestamp>
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
                    
                    _logger.LogInformation("Extracted TransactionId: {TransactionId} from app_trans_id: {AppTransId}", 
                        transactionId, appTransId);
                    
                    var transaction = await _context.GiaoDiches
                        .FirstOrDefaultAsync(t => t.GiaoDichId == transactionId);

                    if (transaction != null)
                    {
                        transaction.TrangThaiThanhToan = "Completed";
                        transaction.PhuongThucThanhToan = "ZaloPay";
                        await _context.SaveChangesAsync();
                        _logger.LogInformation("Transaction {TransactionId} updated to Completed via query with app_trans_id: {AppTransId}", 
                            transactionId, appTransId);
                    }
                    else
                    {
                        _logger.LogWarning("Transaction not found for app_trans_id: {AppTransId}, extracted transactionId: {TransactionId}", 
                            appTransId, transactionId);
                        
                        // Thử tìm transaction bằng cách khác - tìm tất cả transactions pending gần đây
                        var recentTransactions = await _context.GiaoDiches
                            .Where(t => t.TrangThaiThanhToan == "Pending" && 
                                       (t.PhuongThucThanhToan == "ZaloPay" || t.PhuongThucThanhToan == null) &&
                                       t.NgayGiaoDich != null &&
                                       t.NgayGiaoDich.Value >= DateTime.Now.AddMinutes(-30))
                            .OrderByDescending(t => t.NgayGiaoDich)
                            .Take(5)
                            .ToListAsync();
                        
                        _logger.LogInformation("Found {Count} recent pending ZaloPay transactions, trying to match...", recentTransactions.Count);
                        
                        foreach (var txn in recentTransactions)
                        {
                            // Thử extract transaction ID từ app_trans_id và so sánh
                            var txnDateStr = txn.NgayGiaoDich?.ToString("yyMMdd") ?? "";
                            if (appTransId.StartsWith(txnDateStr + "_" + txn.GiaoDichId) || 
                                appTransId.Contains(txn.GiaoDichId))
                            {
                                txn.TrangThaiThanhToan = "Completed";
                                txn.PhuongThucThanhToan = "ZaloPay";
                                await _context.SaveChangesAsync();
                                _logger.LogInformation("Matched and updated transaction {TransactionId} via pattern matching", txn.GiaoDichId);
                                break;
                            }
                        }
                    }
                }
                else
                {
                    _logger.LogInformation("Payment not yet completed for app_trans_id: {AppTransId}. Status: {Status}, Success: {Success}, IsPaid: {IsPaid}, Error: {Error}", 
                        appTransId, paymentStatus, success, isPaid, errorMessage);
                }
            }
            else
            {
                _logger.LogWarning("ZaloPay Redirect - No app_trans_id or apptransid in query parameters");
            }

            // Redirect về trang danh sách thanh toán với query parameter để trigger refresh
            return RedirectToAction("MyPayments", new { paymentSuccess = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing ZaloPay redirect");
            // Vẫn redirect về MyPayments dù có lỗi
            return RedirectToAction("MyPayments");
        }
    }

    // GET: /Payment/MoMoRedirect - Xử lý redirect từ MoMo sau khi thanh toán
    [HttpGet("MoMoRedirect")]
    public async Task<IActionResult> MoMoRedirect([FromQuery] string? orderId, [FromQuery] string? resultCode)
    {
        try
        {
            // Log tất cả query parameters để debug
            var allParams = Request.Query.ToDictionary(k => k.Key, v => v.Value.ToString());
            _logger.LogInformation("MoMo Redirect received - All Query Params: {Params}", 
                string.Join(", ", allParams.Select(kv => $"{kv.Key}={kv.Value}")));
            
            // MoMo có thể gửi orderId hoặc order_id, resultCode hoặc result_code
            // Đọc từ Request.Query để hỗ trợ cả hai format
            var orderIdValue = orderId ?? Request.Query["order_id"].ToString();
            var resultCodeValue = resultCode ?? Request.Query["result_code"].ToString();
            
            _logger.LogInformation("MoMo Redirect - OrderId: {OrderId}, ResultCode: {ResultCode}", 
                orderIdValue, resultCodeValue);

            // Nếu có orderId và resultCode = 0 (thành công), cập nhật trạng thái thanh toán
            if (!string.IsNullOrEmpty(orderIdValue))
            {
                // Format: YYYYMMDDHHmmss_<transaction_id>
                // Transaction ID có thể chứa nhiều dấu gạch dưới (ví dụ: txn_251115_152cc7)
                // Cần lấy tất cả phần sau dấu _ đầu tiên
                string transactionId;
                if (orderIdValue.Contains("_"))
                {
                    var firstUnderscoreIndex = orderIdValue.IndexOf('_');
                    transactionId = orderIdValue.Substring(firstUnderscoreIndex + 1);
                }
                else
                {
                    transactionId = orderIdValue;
                }
                
                _logger.LogInformation("MoMo Redirect - Extracted TransactionId: {TransactionId} from OrderId: {OrderId}", 
                    transactionId, orderIdValue);
                
                var transaction = await _context.GiaoDiches
                    .FirstOrDefaultAsync(t => t.GiaoDichId == transactionId);

                if (transaction != null)
                {
                    // Nếu resultCode = 0 (thành công) và chưa được cập nhật, cập nhật ngay
                    if (resultCodeValue == "0" && transaction.TrangThaiThanhToan != "Completed")
                    {
                        transaction.TrangThaiThanhToan = "Completed";
                        transaction.PhuongThucThanhToan = "MoMo";
                        await _context.SaveChangesAsync();
                        _logger.LogInformation("Transaction {TransactionId} updated to Completed via redirect with OrderId: {OrderId}", 
                            transactionId, orderIdValue);
                    }
                    else if (transaction.TrangThaiThanhToan == "Completed")
                    {
                        _logger.LogInformation("Transaction {TransactionId} is already Completed", transactionId);
                    }
                    else
                    {
                        _logger.LogInformation("Transaction {TransactionId} status is {Status}, ResultCode: {ResultCode}", 
                            transactionId, transaction.TrangThaiThanhToan, resultCodeValue);
                    }
                }
                else
                {
                    _logger.LogWarning("Transaction not found for OrderId: {OrderId}, extracted transactionId: {TransactionId}", 
                        orderIdValue, transactionId);
                    
                    // Thử tìm transaction bằng cách khác - tìm tất cả transactions pending gần đây
                    var recentTransactions = await _context.GiaoDiches
                        .Where(t => t.TrangThaiThanhToan == "Pending" && 
                                   (t.PhuongThucThanhToan == "MoMo" || t.PhuongThucThanhToan == null) &&
                                   t.NgayGiaoDich != null &&
                                   t.NgayGiaoDich.Value >= DateTime.Now.AddMinutes(-30))
                        .OrderByDescending(t => t.NgayGiaoDich)
                        .Take(5)
                        .ToListAsync();
                    
                    _logger.LogInformation("Found {Count} recent pending MoMo transactions, trying to match...", recentTransactions.Count);
                    
                    foreach (var txn in recentTransactions)
                    {
                        // Thử extract transaction ID từ orderId và so sánh
                        // OrderId format: YYYYMMDDHHmmss_<transaction_id>
                        // So sánh transaction ID đã extract với GiaoDichId
                        if (transactionId == txn.GiaoDichId)
                        {
                            if (resultCodeValue == "0")
                            {
                                txn.TrangThaiThanhToan = "Completed";
                                txn.PhuongThucThanhToan = "MoMo";
                                await _context.SaveChangesAsync();
                                _logger.LogInformation("Matched and updated transaction {TransactionId} via pattern matching", txn.GiaoDichId);
                                break;
                            }
                        }
                        // Fallback: kiểm tra nếu orderId chứa transaction ID
                        else if (orderIdValue.Contains("_" + txn.GiaoDichId) || 
                                 orderIdValue.EndsWith("_" + txn.GiaoDichId))
                        {
                            if (resultCodeValue == "0")
                            {
                                txn.TrangThaiThanhToan = "Completed";
                                txn.PhuongThucThanhToan = "MoMo";
                                await _context.SaveChangesAsync();
                                _logger.LogInformation("Matched and updated transaction {TransactionId} via fallback pattern matching", txn.GiaoDichId);
                                break;
                            }
                        }
                    }
                }
            }
            else
            {
                _logger.LogWarning("MoMo Redirect - No orderId or order_id in query parameters");
            }

            // Redirect về trang danh sách thanh toán với query parameter để trigger refresh
            return RedirectToAction("MyPayments", new { paymentSuccess = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing MoMo redirect");
            // Vẫn redirect về MyPayments dù có lỗi
            return RedirectToAction("MyPayments");
        }
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
