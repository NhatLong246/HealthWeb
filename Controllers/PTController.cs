using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using HealthWeb.Services;

namespace HealthWeb.Controllers
{
    public class PTController : Controller
    {
        private readonly ILogger<PTController> _logger;
        private readonly IPTService _ptService;

        public PTController(ILogger<PTController> logger, IPTService ptService)
        {
            _logger = logger;
            _ptService = ptService;
        }

        // GET: /PT/RegisterPT - render form đăng ký PT (frontend xử lý hiển thị)
        [HttpGet("PT/RegisterPT")]
        public IActionResult RegisterPT()
        {
            return View();
        }

        // POST: /PT/RegisterPT - tạo mới tài khoản User + HuanLuyenVien từ dữ liệu form
        [HttpPost("PT/RegisterPT")]
        public async Task<IActionResult> RegisterPT(RegisterPTViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var (success, errorMessage) = await _ptService.RegisterPTAsync(model);
            
            if (!success)
            {
                if (errorMessage != null)
                {
                    if (errorMessage.Contains("Tên đăng nhập"))
                        ModelState.AddModelError("Username", errorMessage);
                    else if (errorMessage.Contains("Email"))
                        ModelState.AddModelError("UserEmail", errorMessage);
                    else if (errorMessage.Contains("Mật khẩu"))
                        ModelState.AddModelError("UserConfirmPassword", errorMessage);
                    else
                        ModelState.AddModelError("", errorMessage);
                }
                return View(model);
            }

            TempData["SuccessMessage"] = "Đăng ký thành công! Tài khoản của bạn đang chờ xác minh.";
            return RedirectToAction("Login", "Account");
        }

        // GET: /PT/Dashboard - trả view dashboard (dữ liệu fetch qua API)
        [HttpGet("PT/DashboardPT")]
        public IActionResult Dashboard()
        {
            return View();
        }

        // Thống kê chính trên dashboard PT (khách, lịch hôm nay, doanh thu, rating)
        [HttpGet("PT/Dashboard/StatsData")]
        public async Task<IActionResult> GetDashboardStatsData()
        {
            try
            {
                var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                var stats = await _ptService.GetDashboardStatsAsync(userId);
                if (stats == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy thông tin PT" });
                }

                return Json(new { success = true, data = stats });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving PT dashboard stats");
                return Json(new { success = false, message = "Không thể tải thống kê" });
            }
        }

        // Danh sách lịch hẹn gần nhất cho dashboard PT
        [HttpGet("PT/Dashboard/RecentBookings")]
        public async Task<IActionResult> GetRecentBookingsData()
        {
            try
            {
                var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                var bookings = await _ptService.GetRecentBookingsAsync(userId);
                return Json(new { success = true, data = bookings });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving PT recent bookings");
                return Json(new { success = false, message = "Không thể tải danh sách lịch hẹn" });
            }
        }

        // Thống kê tổng quan khách hàng (dùng trong trang quản lý khách)
        [HttpGet("PT/Clients/Stats")]
        public async Task<IActionResult> GetClientsStats()
        {
            try
            {
                var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                var stats = await _ptService.GetClientsStatsAsync(userId);
                if (stats == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy thông tin PT" });
                }

                return Json(new { success = true, data = stats });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving PT client stats");
                return Json(new { success = false, message = "Không thể tải thống kê khách hàng" });
            }
        }

        // Danh sách khách hàng đang quản lý cùng thông tin chi tiết
        [HttpGet("PT/Clients/List")]
        public async Task<IActionResult> GetClientsList()
        {
            try
            {
                var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                var clients = await _ptService.GetClientsListAsync(userId);
                return Json(new { success = true, data = clients });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving PT clients list");
                return Json(new { success = false, message = "Không thể tải danh sách khách hàng" });
            }
        }

        // Tìm kiếm khách hàng tiềm năng chưa thuộc quyền quản lý của PT
        [HttpGet("PT/SearchClients/List")]
        public async Task<IActionResult> GetPotentialClients(
            [FromQuery] string? search,
            [FromQuery] string? goal,
            [FromQuery] string? location,
            [FromQuery] string? time,
            [FromQuery] string? budget)
        {
            try
            {
                var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                var results = await _ptService.GetPotentialClientsAsync(userId, search, goal, location, time, budget);
                return Json(new { success = true, data = results });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching potential clients");
                return Json(new { success = false, message = "Không thể tải danh sách khách hàng tiềm năng" });
            }
        }

        // Lấy danh sách lịch hẹn của PT trong tuần (phục vụ view lịch biểu)
        [HttpGet("PT/Schedule/Week")]
        public async Task<IActionResult> GetScheduleForWeek([FromQuery] DateOnly? start)
        {
            try
            {
                var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                var result = await _ptService.GetScheduleForWeekAsync(userId, start);
                return Json(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving PT schedule");
                return Json(new { success = false, message = "Không thể tải lịch trình" });
            }
        }

        // GET: /PT/Schedule
        [HttpGet("PT/SchedulePT")]
        public IActionResult Schedule()
        {
            return View();
        }

        // GET: /PT/SearchClients - hiển thị giao diện tìm khách hàng tiềm năng
        [HttpGet("PT/SearchClients")]
        public IActionResult SearchClients()
        {
            return View();
        }

        // GET: /PT/ManageClients - giao diện quản lý khách hiện hữu
        [HttpGet("PT/ManageClients")]
        public IActionResult ManageClients()
        {
            return View();
        }

        // GET: /PT/Settings
        [HttpGet("PT/Settings")]
        public async Task<IActionResult> Settings()
        {
            // Get current user from session/localStorage (to be implemented)
            // For now, return view
            return View();
        }

        // POST: /PT/Settings/Profile
        [HttpPost("PT/Settings/Profile")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UpdateProfile([FromBody] ProfileSettingsViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return Json(new { success = false, message = "Dữ liệu không hợp lệ" });
            }

            try
            {
                var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                var (success, message) = await _ptService.UpdateProfileAsync(userId, model);
                return Json(new { success, message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating profile");
                return Json(new { success = false, message = "Có lỗi xảy ra" });
            }
        }

        // POST: /PT/Settings/Professional
        [HttpPost("PT/Settings/Professional")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UpdateProfessional([FromBody] ProfessionalSettingsViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return Json(new { success = false, message = "Dữ liệu không hợp lệ" });
            }

            try
            {
                var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                var (success, message) = await _ptService.UpdateProfessionalAsync(userId, model);
                return Json(new { success, message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating professional info");
                return Json(new { success = false, message = "Có lỗi xảy ra" });
            }
        }

        // POST: /PT/Settings/Schedule
        [HttpPost("PT/Settings/Schedule")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UpdateSchedule([FromBody] ScheduleSettingsViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return Json(new { success = false, message = "Dữ liệu không hợp lệ" });
            }

            try
            {
                var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                var (success, message) = await _ptService.UpdateScheduleAsync(userId, model);
                return Json(new { success, message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating schedule");
                return Json(new { success = false, message = "Có lỗi xảy ra" });
            }
        }

        // POST: /PT/Settings/ChangePassword
        [HttpPost("PT/Settings/ChangePassword")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return Json(new { success = false, message = "Dữ liệu không hợp lệ" });
            }

            try
            {
                var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                var (success, message) = await _ptService.ChangePasswordAsync(userId, model);
                return Json(new { success, message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing password");
                return Json(new { success = false, message = "Có lỗi xảy ra" });
            }
        }
    }
}

