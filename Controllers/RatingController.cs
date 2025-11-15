using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HealthWeb.Services;
using HealthWeb.Models.ViewModels;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace HealthWeb.Controllers;

[Authorize]
public class RatingController : Controller
{
    private readonly IRatingService _ratingService;
    private readonly ILogger<RatingController> _logger;

    public RatingController(
        IRatingService ratingService,
        ILogger<RatingController> logger)
    {
        _ratingService = ratingService;
        _logger = logger;
    }

    // GET: /Rating - Trang đánh giá sau buổi tập
    [HttpGet("Rating")]
    public async Task<IActionResult> Index()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return RedirectToAction("Login", "Account");
            }

            var sessions = await _ratingService.GetCompletedSessionsForRatingAsync(userId);
            var viewModel = new RatingViewModel
            {
                Sessions = sessions
            };

            return View(viewModel);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading rating page");
            return View(new RatingViewModel());
        }
    }

    // API: Lấy danh sách buổi tập cần đánh giá
    [HttpGet("Rating/Sessions")]
    public async Task<IActionResult> GetSessions()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Chưa đăng nhập" });
            }

            var sessions = await _ratingService.GetCompletedSessionsForRatingAsync(userId);
            return Json(new { success = true, data = sessions });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting sessions for rating");
            return Json(new { success = false, message = "Có lỗi xảy ra: " + ex.Message });
        }
    }

    // API: Lấy lịch sử buổi tập
    [HttpGet("Rating/History")]
    public async Task<IActionResult> GetSessionHistory()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            _logger.LogInformation("GetSessionHistory called. UserId from claims: {UserId}", userId);
            
            // Fallback: thử lấy từ session nếu claims không có
            if (string.IsNullOrEmpty(userId))
            {
                userId = HttpContext.Session.GetString("UserId");
                _logger.LogInformation("UserId from session: {UserId}", userId);
            }
            
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("No userId found in claims or session");
                return Json(new { success = false, message = "Chưa đăng nhập" });
            }

            _logger.LogInformation("Fetching session history for userId: {UserId}", userId);
            var history = await _ratingService.GetSessionHistoryAsync(userId);
            _logger.LogInformation("Found {Count} sessions for userId: {UserId}", history.Count, userId);
            
            return Json(new { success = true, data = history });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting session history");
            return Json(new { success = false, message = "Có lỗi xảy ra: " + ex.Message });
        }
    }

    // API: Gửi đánh giá
    [HttpPost("Rating/Submit")]
    public async Task<IActionResult> SubmitRating([FromBody] SubmitRatingRequest request)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Chưa đăng nhập" });
            }

            if (request == null || string.IsNullOrEmpty(request.PtId))
            {
                return Json(new { success = false, message = "Thông tin không hợp lệ" });
            }

            var result = await _ratingService.SubmitRatingAsync(
                userId,
                request.PtId,
                request.Rating,
                request.Comment,
                request.BookingId
            );

            if (result.success)
            {
                return Json(new { success = true, message = result.message });
            }
            else
            {
                return Json(new { success = false, message = result.message });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting rating");
            return Json(new { success = false, message = "Có lỗi xảy ra: " + ex.Message });
        }
    }
}

