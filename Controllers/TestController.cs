using Microsoft.AspNetCore.Mvc;
using HealthWeb.Services;

namespace HealthWeb.Controllers;

[Route("Test")]
public class TestController : Controller
{
    private readonly IZaloPayService _zaloPayService;
    private readonly IMoMoService _moMoService;
    private readonly ILogger<TestController> _logger;

    public TestController(
        IZaloPayService zaloPayService,
        IMoMoService moMoService,
        ILogger<TestController> logger)
    {
        _zaloPayService = zaloPayService;
        _moMoService = moMoService;
        _logger = logger;
    }

    // GET: /Test/PaymentTest hoặc /Test/Payment
    [HttpGet("PaymentTest")]
    [HttpGet("Payment")] // Alias route
    public IActionResult PaymentTest()
    {
        return View();
    }

    // POST: /Test/PaymentTest/CreatePayment
    [HttpPost("PaymentTest/CreatePayment")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> CreateTestPayment([FromBody] TestPaymentRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request.PaymentMethod))
            {
                return Json(new { success = false, message = "Vui lòng chọn phương thức thanh toán" });
            }

            if (request.Amount < 1000)
            {
                return Json(new { success = false, message = "Số tiền tối thiểu là 1,000 VND" });
            }

            var transactionId = request.TransactionId ?? $"test_{DateTime.Now:yyyyMMdd}_{Guid.NewGuid().ToString().Substring(0, 8)}";
            var description = request.Description ?? "Test thanh toán";

            if (request.PaymentMethod == "ZaloPay")
            {
                var (success, paymentUrl, errorMessage) = await _zaloPayService.CreatePaymentAsync(
                    transactionId, request.Amount, description);

                if (success && !string.IsNullOrEmpty(paymentUrl))
                {
                    return Json(new
                    {
                        success = true,
                        paymentUrl = paymentUrl,
                        transactionId = transactionId,
                        message = "Tạo thanh toán ZaloPay thành công!"
                    });
                }
                else
                {
                    return Json(new
                    {
                        success = false,
                        message = errorMessage ?? "Không thể tạo thanh toán ZaloPay",
                        transactionId = transactionId
                    });
                }
            }
            else if (request.PaymentMethod == "MoMo")
            {
                var (success, paymentUrl, errorMessage) = await _moMoService.CreatePaymentAsync(
                    transactionId, request.Amount, description);

                if (success && !string.IsNullOrEmpty(paymentUrl))
                {
                    return Json(new
                    {
                        success = true,
                        paymentUrl = paymentUrl,
                        transactionId = transactionId,
                        message = "Tạo thanh toán MoMo thành công!"
                    });
                }
                else
                {
                    return Json(new
                    {
                        success = false,
                        message = errorMessage ?? "Không thể tạo thanh toán MoMo",
                        transactionId = transactionId
                    });
                }
            }
            else
            {
                return Json(new { success = false, message = "Phương thức thanh toán không được hỗ trợ" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating test payment");
            return Json(new { success = false, message = "Lỗi: " + ex.Message });
        }
    }
}

public class TestPaymentRequest
{
    public string PaymentMethod { get; set; } = null!;
    public double Amount { get; set; }
    public string Description { get; set; } = "Test thanh toán";
    public string? TransactionId { get; set; }
}

