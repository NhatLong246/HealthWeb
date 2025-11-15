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

        // GET: /PT/SwitchToPT - chuyển sang giao diện PT (kiểm tra và redirect)
        [HttpGet("PT/SwitchToPT")]
        public async Task<IActionResult> SwitchToPT()
        {
            try
            {
                var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    // Chưa đăng nhập → redirect đến login
                    return RedirectToAction("Login", "Account");
                }

                // Kiểm tra xem user đã đăng ký làm PT chưa
                var trainer = await _ptService.GetCurrentTrainerAsync(userId);
                if (trainer != null)
                {
                    // Đã là PT → redirect đến Dashboard PT
                    return RedirectToAction("Dashboard", "PT");
                }
                else
                {
                    // Chưa đăng ký → redirect đến trang đăng ký PT
                    return RedirectToAction("RegisterPT", "PT");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error switching to PT mode");
                return RedirectToAction("RegisterPT", "PT");
            }
        }

        // GET: /PT/RegisterPT - render form đăng ký PT (frontend xử lý hiển thị)
        [HttpGet("PT/RegisterPT")]
        public async Task<IActionResult> RegisterPT()
        {
            // Load dữ liệu user hiện tại nếu đã đăng nhập
            var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
            if (!string.IsNullOrEmpty(userId))
            {
                var user = await _ptService.GetCurrentUserAsync(userId);
                if (user != null)
                {
                    ViewBag.UserData = new
                    {
                        UserHoTen = user.HoTen ?? "",
                        UserEmail = user.Email ?? "",
                        Username = user.Username ?? "",
                        UserNgaySinh = user.NgaySinh?.ToString("yyyy-MM-dd") ?? ""
                    };
                }
            }
            return View();
        }

        // POST: /PT/RegisterPT - tạo mới tài khoản User + HuanLuyenVien từ dữ liệu form
        [HttpPost("PT/RegisterPT")]
        public async Task<IActionResult> RegisterPT(RegisterPTViewModel model)
        {
            _logger.LogInformation("RegisterPT POST: Received registration request");
            
            // Log ModelState errors if any
            if (!ModelState.IsValid)
            {
                _logger.LogWarning("RegisterPT POST: ModelState is invalid");
                foreach (var error in ModelState)
                {
                    foreach (var modelError in error.Value.Errors)
                    {
                        _logger.LogWarning("RegisterPT POST: ModelState error - {Key}: {Message}", error.Key, modelError.ErrorMessage);
                    }
                }
                return View(model);
            }

            _logger.LogInformation("RegisterPT POST: Calling RegisterPTAsync service");
            var (success, errorMessage) = await _ptService.RegisterPTAsync(model, HttpContext);
            
            if (!success)
            {
                _logger.LogWarning("RegisterPT POST: Registration failed - {ErrorMessage}", errorMessage);
                if (errorMessage != null)
                {
                    if (errorMessage.Contains("Tên đăng nhập"))
                        ModelState.AddModelError("Username", errorMessage);
                    else if (errorMessage.Contains("Email"))
                        ModelState.AddModelError("UserEmail", errorMessage);
                    else if (errorMessage.Contains("Mật khẩu"))
                        ModelState.AddModelError("UserConfirmPassword", errorMessage);
                    else if (errorMessage.Contains("Chuyên môn"))
                        ModelState.AddModelError("ChuyenMon", errorMessage);
                    else if (errorMessage.Contains("Tỉnh/Thành phố") || errorMessage.Contains("Thành phố"))
                        ModelState.AddModelError("ThanhPho", errorMessage);
                    else if (errorMessage.Contains("Tiểu sử"))
                        ModelState.AddModelError("TieuSu", errorMessage);
                    else if (errorMessage.Contains("Giờ rảnh"))
                        ModelState.AddModelError("GioRanh", errorMessage);
                    else
                        ModelState.AddModelError("", errorMessage);
                }
                return View(model);
            }

            _logger.LogInformation("RegisterPT POST: Registration successful");
            TempData["SuccessMessage"] = "Đăng ký thành công! Tài khoản của bạn đang chờ xác minh. Vui lòng đăng nhập sau khi được admin phê duyệt.";
            
            // Load lại user data nếu cần
            var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
            if (!string.IsNullOrEmpty(userId))
            {
                var user = await _ptService.GetCurrentUserAsync(userId);
                if (user != null)
                {
                    ViewBag.UserData = new
                    {
                        UserHoTen = user.HoTen ?? "",
                        UserEmail = user.Email ?? "",
                        Username = user.Username ?? "",
                        UserNgaySinh = user.NgaySinh?.ToString("yyyy-MM-dd") ?? ""
                    };
                }
            }
            
            // Hiển thị lại form với thông báo thành công
            return View(model);
        }

        // GET: /PT/Dashboard - trả view dashboard với dữ liệu từ server
        [HttpGet("PT/DashboardPT")]
        public async Task<IActionResult> Dashboard()
        {
            try
            {
                var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("Dashboard: No userId found, redirecting to login");
                    return RedirectToAction("Login", "Account");
                }

                _logger.LogInformation("Dashboard: Loading dashboard for userId: {UserId}", userId);
                var viewModel = await _ptService.GetDashboardViewModelAsync(userId);
                if (viewModel == null)
                {
                    _logger.LogWarning("Dashboard: ViewModel is null for userId: {UserId}", userId);
                    return View(new DashboardViewModel());
                }

                _logger.LogInformation("Dashboard: Loaded dashboard with {TotalClients} clients, {TodayBookings} bookings, {Revenue} revenue", 
                    viewModel.TotalClients, viewModel.TodayBookings, viewModel.MonthlyRevenue);
                return View(viewModel);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading dashboard");
                return View(new DashboardViewModel());
            }
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
                _logger.LogInformation("GetClientsStats: userId from session: {UserId}", userId ?? "NULL");
                
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("GetClientsStats: No userId found in session");
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                var stats = await _ptService.GetClientsStatsAsync(userId);
                if (stats == null)
                {
                    _logger.LogWarning("GetClientsStats: GetClientsStatsAsync returned null for userId: {UserId}", userId);
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
                _logger.LogInformation("GetClientsList: userId from session: {UserId}", userId ?? "NULL");
                
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("GetClientsList: No userId found in session");
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                var clients = await _ptService.GetClientsListAsync(userId);
                _logger.LogInformation("GetClientsList: Returning {Count} clients for userId: {UserId}", clients.Count, userId);
                return Json(new { success = true, data = clients });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving PT clients list");
                return Json(new { success = false, message = "Không thể tải danh sách khách hàng" });
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
        public async Task<IActionResult> Schedule([FromQuery] DateOnly? start)
        {
            try
            {
                var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return RedirectToAction("Login", "Account");
                }

                var viewModel = await _ptService.GetScheduleViewModelAsync(userId, start);
                return View(viewModel);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading schedule");
                return View(new HealthWeb.Services.ScheduleViewModel());
            }
        }

        // GET: /PT/ManageClients - giao diện quản lý khách hiện hữu với dữ liệu từ server
        [HttpGet("PT/ManageClients")]
        public async Task<IActionResult> ManageClients()
        {
            try
            {
                var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("ManageClients: No userId found, redirecting to login");
                    return RedirectToAction("Login", "Account");
                }

                _logger.LogInformation("ManageClients: Loading clients for userId: {UserId}", userId);
                var viewModel = await _ptService.GetManageClientsViewModelAsync(userId);
                if (viewModel == null)
                {
                    _logger.LogWarning("ManageClients: ViewModel is null for userId: {UserId}", userId);
                    return View(new ManageClientsViewModel());
                }

                _logger.LogInformation("ManageClients: Loaded {TotalClients} clients, {ActiveClients} active, {Sessions} sessions", 
                    viewModel.TotalClients, viewModel.ActiveClients, viewModel.TotalSessions);
                return View(viewModel);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading manage clients");
                return View(new ManageClientsViewModel());
            }
        }

        // GET: /PT/Clients/Detail/{clientId} - lấy thông tin chi tiết khách hàng (trả về PartialView)
        [HttpGet("PT/Clients/Detail/{clientId}")]
        public async Task<IActionResult> GetClientDetail(string clientId)
        {
            try
            {
                var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return PartialView("_Error", (object)"Vui lòng đăng nhập");
                }

                var detail = await _ptService.GetClientDetailViewModelAsync(userId, clientId);
                if (detail == null)
                {
                    return PartialView("_Error", (object)"Không tìm thấy thông tin khách hàng");
                }

                return PartialView("_ClientDetail", detail);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving client detail");
                return PartialView("_Error", (object)"Không thể tải thông tin khách hàng");
            }
        }

        // GET: /PT/Settings
        [HttpGet("PT/Settings")]
        public async Task<IActionResult> Settings()
        {
            try
            {
                var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return RedirectToAction("Login", "Account");
                }

                var viewModel = await _ptService.GetSettingsViewModelAsync(userId);
                return View(viewModel ?? new HealthWeb.Services.SettingsViewModel());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading settings");
                return View(new HealthWeb.Services.SettingsViewModel());
            }
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

        // GET: /PT/Requests - trang quản lý yêu cầu
        [HttpGet("PT/Requests")]
        public async Task<IActionResult> Requests()
        {
            try
            {
                var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return RedirectToAction("Login", "Account");
                }

                var requests = await _ptService.GetPendingRequestsAsync(userId);
                return View(requests);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading requests");
                return View(new List<PendingRequestViewModel>());
            }
        }

        // GET: /PT/Requests/List - API lấy danh sách yêu cầu
        [HttpGet("PT/Requests/List")]
        public async Task<IActionResult> GetRequestsList()
        {
            try
            {
                var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                var requests = await _ptService.GetPendingRequestsAsync(userId);
                return Json(new { success = true, data = requests });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving requests list");
                return Json(new { success = false, message = "Không thể tải danh sách yêu cầu" });
            }
        }

        // POST: /PT/Requests/Accept - chấp nhận yêu cầu
        [HttpPost("PT/Requests/Accept")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> AcceptRequest([FromBody] AcceptRequestModel model)
        {
            try
            {
                var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                if (string.IsNullOrWhiteSpace(model.RequestId))
                {
                    return Json(new { success = false, message = "Yêu cầu không hợp lệ" });
                }

                var (success, message) = await _ptService.AcceptRequestAsync(userId, model.RequestId);
                return Json(new { success, message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error accepting request");
                return Json(new { success = false, message = "Có lỗi xảy ra khi chấp nhận yêu cầu" });
            }
        }

        // POST: /PT/Requests/Reject - từ chối yêu cầu
        [HttpPost("PT/Requests/Reject")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> RejectRequest([FromBody] RejectRequestModel model)
        {
            try
            {
                var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                if (string.IsNullOrWhiteSpace(model.RequestId))
                {
                    return Json(new { success = false, message = "Yêu cầu không hợp lệ" });
                }

                if (string.IsNullOrWhiteSpace(model.Reason))
                {
                    return Json(new { success = false, message = "Vui lòng nhập lý do từ chối" });
                }

                var (success, message) = await _ptService.RejectRequestAsync(userId, model.RequestId, model.Reason);
                return Json(new { success, message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error rejecting request");
                return Json(new { success = false, message = "Có lỗi xảy ra khi từ chối yêu cầu" });
            }
        }

        // GET: /PT/WorkoutTemplates - Lấy danh sách template (có thể filter theo goal)
        [HttpGet("PT/WorkoutTemplates")]
        public async Task<IActionResult> GetWorkoutTemplates([FromQuery] string? goal = null)
        {
            try
            {
                var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                List<WorkoutTemplateViewModel> templates;
                if (!string.IsNullOrWhiteSpace(goal))
                {
                    templates = await _ptService.GetWorkoutTemplatesByGoalAsync(goal);
                }
                else
                {
                    templates = await _ptService.GetAllWorkoutTemplatesAsync();
                }
                
                return Json(new { success = true, data = templates });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting workout templates");
                return Json(new { success = false, message = "Không thể tải danh sách template" });
            }
        }

        // GET: /PT/WorkoutTemplate/{templateId} - Lấy chi tiết template
        [HttpGet("PT/WorkoutTemplate/{templateId}")]
        public async Task<IActionResult> GetWorkoutTemplateDetail(int templateId)
        {
            try
            {
                var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                var template = await _ptService.GetWorkoutTemplateDetailAsync(templateId);
                if (template == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy template" });
                }

                return Json(new { success = true, data = template });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting workout template detail");
                return Json(new { success = false, message = "Không thể tải chi tiết template" });
            }
        }

        // GET: /PT/ClientBookings/{clientId} - Lấy danh sách lịch hẹn của client
        [HttpGet("PT/ClientBookings/{clientId}")]
        public async Task<IActionResult> GetClientBookings(string clientId)
        {
            try
            {
                var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                var bookings = await _ptService.GetClientBookingsForWorkoutAsync(userId, clientId);
                return Json(new { success = true, data = bookings });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting client bookings");
                return Json(new { success = false, message = "Không thể tải danh sách lịch hẹn" });
            }
        }

        // POST: /PT/WorkoutPlan/Create - Tạo kế hoạch tập luyện
        [HttpPost("PT/WorkoutPlan/Create")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateWorkoutPlan([FromBody] CreateWorkoutPlanRequestModel model)
        {
            try
            {
                var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                if (string.IsNullOrWhiteSpace(model.ClientId))
                {
                    return Json(new { success = false, message = "Vui lòng chọn khách hàng" });
                }

                var (success, message) = await _ptService.CreateWorkoutPlanAsync(userId, model.ClientId, model.Plan);
                return Json(new { success, message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating workout plan");
                return Json(new { success = false, message = "Có lỗi xảy ra khi tạo kế hoạch" });
            }
        }

        // GET: /PT/WorkoutPlan/{clientId} - Lấy kế hoạch tập luyện của client
        [HttpGet("PT/WorkoutPlan/{clientId}")]
        public async Task<IActionResult> GetClientWorkoutPlan(string clientId)
        {
            try
            {
                var userId = await _ptService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                var plan = await _ptService.GetClientWorkoutPlanAsync(userId, clientId);
                return Json(new { success = true, data = plan });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting client workout plan");
                return Json(new { success = false, message = "Không thể tải kế hoạch tập luyện" });
            }
        }
    }

    public class AcceptRequestModel
    {
        public string RequestId { get; set; } = null!;
    }

    public class RejectRequestModel
    {
        public string RequestId { get; set; } = null!;
        public string Reason { get; set; } = null!;
    }

    public class CreateWorkoutPlanRequestModel
    {
        public string ClientId { get; set; } = null!;
        public HealthWeb.Services.CreateWorkoutPlanViewModel Plan { get; set; } = null!;
    }
}

