using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HealthWeb.Services;
using Microsoft.AspNetCore.Http;

namespace HealthWeb.Controllers
{
    public class PaymentController : Controller
    {
        private readonly IPaymentService _paymentService;
        private readonly ILogger<PaymentController> _logger;

        public PaymentController(IPaymentService paymentService, ILogger<PaymentController> logger)
        {
            _paymentService = paymentService;
            _logger = logger;
        }

        // GET: Payment/Index?bookingId=xxx
        public async Task<IActionResult> Index(string bookingId)
        {
            if (string.IsNullOrWhiteSpace(bookingId))
            {
                return RedirectToAction("Index", "FindPT");
            }

            var userId = await _paymentService.GetCurrentUserIdAsync(HttpContext);
            if (string.IsNullOrEmpty(userId))
            {
                return RedirectToAction("Login", "Account");
            }

            var bookingInfo = await _paymentService.GetBookingForPaymentAsync(bookingId, userId);
            if (bookingInfo == null)
            {
                TempData["ErrorMessage"] = "Không tìm thấy booking hoặc bạn không có quyền truy cập.";
                return RedirectToAction("Index", "FindPT");
            }

            // Kiểm tra nếu có error
            var bookingInfoType = bookingInfo.GetType();
            var errorProperty = bookingInfoType.GetProperty("error");
            if (errorProperty != null)
            {
                var error = errorProperty.GetValue(bookingInfo)?.ToString();
                if (!string.IsNullOrEmpty(error))
                {
                    TempData["ErrorMessage"] = error;
                    return RedirectToAction("Index", "FindPT");
                }
            }

            ViewBag.BookingInfo = bookingInfo;
            return View();
        }

        // POST: Payment/CreatePayment
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreatePayment([FromBody] CreatePaymentRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.BookingId))
                {
                    return Json(new { success = false, message = "Booking ID không hợp lệ" });
                }

                var userId = await _paymentService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                var (success, message, paymentUrl) = await _paymentService.CreateMoMoPaymentAsync(request.BookingId, userId);

                if (success && paymentUrl != null)
                {
                    return Json(new { success = true, message, paymentUrl });
                }
                else
                {
                    return Json(new { success = false, message });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating payment");
                return Json(new { success = false, message = "Có lỗi xảy ra khi tạo thanh toán" });
            }
        }

        // GET: Payment/Callback?orderId=xxx&resultCode=0
        [HttpGet]
        public async Task<IActionResult> Callback(string orderId, long resultCode, string? extraData)
        {
            try
            {
                var (success, message) = await _paymentService.ProcessMoMoCallbackAsync(orderId, resultCode, extraData);

                if (success && resultCode == 0)
                {
                    TempData["SuccessMessage"] = "Thanh toán thành công!";
                    return RedirectToAction("Index", "FindPT");
                }
                else
                {
                    TempData["ErrorMessage"] = message ?? "Thanh toán thất bại. Vui lòng thử lại.";
                    return RedirectToAction("Index", "Payment", new { bookingId = orderId });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing payment callback");
                TempData["ErrorMessage"] = "Có lỗi xảy ra khi xử lý thanh toán.";
                return RedirectToAction("Index", "FindPT");
            }
        }

        // POST: Payment/Callback (IPN from MoMo)
        [HttpPost]
        [IgnoreAntiforgeryToken]
        public async Task<IActionResult> Callback([FromBody] MoMoCallbackRequest request)
        {
            try
            {
                if (request == null || string.IsNullOrWhiteSpace(request.OrderId))
                {
                    return BadRequest();
                }

                var (success, message) = await _paymentService.ProcessMoMoCallbackAsync(
                    request.OrderId,
                    request.ResultCode,
                    request.ExtraData);

                // MoMo expects HTTP 200 response
                return Ok(new { success, message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing MoMo IPN callback");
                return StatusCode(500);
            }
        }

        // GET: Payment/Status?bookingId=xxx
        [HttpGet]
        public async Task<IActionResult> GetStatus(string bookingId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(bookingId))
                {
                    return Json(new { success = false, message = "Booking ID không hợp lệ" });
                }

                var userId = await _paymentService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                var status = await _paymentService.GetPaymentStatusAsync(bookingId, userId);
                return Json(new { success = true, data = status });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting payment status");
                return Json(new { success = false, message = "Có lỗi xảy ra" });
            }
        }
    }

    public class CreatePaymentRequest
    {
        public string BookingId { get; set; } = "";
    }

    public class MoMoCallbackRequest
    {
        public string OrderId { get; set; } = "";
        public long ResultCode { get; set; }
        public string? ExtraData { get; set; }
    }
}

