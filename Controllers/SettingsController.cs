using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HealthWeb.Models.EF;
using Microsoft.EntityFrameworkCore;

namespace HealthWeb.Controllers
{
    [Authorize]
    public class SettingsController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SettingsController> _logger;

        public SettingsController(ApplicationDbContext context, ILogger<SettingsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> Index()
        {
            var userId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(userId))
            {
                return RedirectToAction("Login", "Account");
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
            {
                return RedirectToAction("Login", "Account");
            }

            var model = new SettingsViewModel
            {
                EnableNotifications = true, // Mặc định true, có thể lưu vào database sau
                Theme = user.Theme ?? "Dark"
            };

            return View("Settings", model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Index(SettingsViewModel model)
        {
            var userId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(userId))
            {
                return RedirectToAction("Login", "Account");
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
            {
                return RedirectToAction("Login", "Account");
            }

            // Parse EnableNotifications từ form
            var enableNotificationsStr = Request.Form["EnableNotifications"].ToString();
            var enableNotifications = enableNotificationsStr == "true";

            // Parse Theme từ form - ưu tiên từ model, nếu không có thì từ Request.Form
            var themeStr = model?.Theme;
            if (string.IsNullOrWhiteSpace(themeStr))
            {
                themeStr = Request.Form["Theme"].ToString();
            }
            if (string.IsNullOrWhiteSpace(themeStr))
            {
                themeStr = "Dark"; // Default
            }

            try
            {
                // Cập nhật theme
                user.Theme = themeStr;

                await _context.SaveChangesAsync();

                // Cập nhật theme trên client-side
                TempData["SuccessMessage"] = "Cập nhật cài đặt thành công!";
                TempData["Theme"] = themeStr;

                return RedirectToAction("Index", "Home");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating settings");
                TempData["ErrorMessage"] = "Đã xảy ra lỗi khi cập nhật cài đặt. Vui lòng thử lại.";
                return RedirectToAction("Index");
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult SendFeedback([FromForm] string feedback)
        {
            if (string.IsNullOrWhiteSpace(feedback))
            {
                TempData["ErrorMessage"] = "Vui lòng nhập phản hồi của bạn";
                return RedirectToAction("Index");
            }

            // TODO: Lưu feedback vào database hoặc gửi email
            _logger.LogInformation("User feedback: {Feedback}", feedback);
            
            TempData["SuccessMessage"] = "Cảm ơn bạn đã gửi phản hồi! Chúng tôi sẽ xem xét và cải thiện dịch vụ.";
            return RedirectToAction("Index", "Home");
        }
    }

    public class SettingsViewModel
    {
        public bool EnableNotifications { get; set; } = true;
        public string Theme { get; set; } = "Dark";
    }
}

