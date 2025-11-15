using Microsoft.AspNetCore.Mvc;
using HealthWeb.Services;

namespace HealthWeb.Controllers
{
    public class FindPTController : Controller
    {
        private readonly IFindPTService _findPTService;
        private readonly ILogger<FindPTController> _logger;

        public FindPTController(IFindPTService findPTService, ILogger<FindPTController> logger)
        {
            _findPTService = findPTService;
            _logger = logger;
        }

        // GET: /FindPT - Giao diện tìm kiếm PT
        [HttpGet("FindPT")]
        public IActionResult Index()
        {
            return View();
        }

        // API: Tìm kiếm PT
        [HttpGet("FindPT/Search")]
        public async Task<IActionResult> SearchPTs(
            [FromQuery] string? search,
            [FromQuery] string? location,
            [FromQuery] string? specialization,
            [FromQuery] double? maxPrice,
            [FromQuery] int? minExperience)
        {
            try
            {
                var results = await _findPTService.SearchPTsAsync(search, location, specialization, maxPrice, minExperience);
                return Json(new { success = true, data = results });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching PTs");
                return Json(new { success = false, message = "Không thể tìm kiếm huấn luyện viên" });
            }
        }

        // API: Lấy chi tiết PT
        [HttpGet("FindPT/Details/{ptId}")]
        public async Task<IActionResult> GetPTDetails(string ptId)
        {
            try
            {
                var details = await _findPTService.GetPTDetailsAsync(ptId);
                if (details == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy huấn luyện viên" });
                }
                return Json(new { success = true, data = details });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting PT details");
                return Json(new { success = false, message = "Không thể tải thông tin huấn luyện viên" });
            }
        }

        // API: Gửi yêu cầu tập
        [HttpPost("FindPT/SendRequest")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SendTrainingRequest([FromBody] SendTrainingRequestViewModel model)
        {
            try
            {
                // Validate model
                if (string.IsNullOrWhiteSpace(model.PtId))
                {
                    return Json(new { success = false, message = "Vui lòng chọn huấn luyện viên" });
                }

                if (string.IsNullOrWhiteSpace(model.Goal))
                {
                    return Json(new { success = false, message = "Vui lòng chọn mục tiêu luyện tập" });
                }

                if (model.Schedules == null || model.Schedules.Count == 0)
                {
                    return Json(new { success = false, message = "Vui lòng chọn ít nhất một ngày và nhập thời gian rảnh" });
                }

                // Lấy userId từ session hoặc từ model
                var userId = await _findPTService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId) && !string.IsNullOrEmpty(model.UserId))
                {
                    userId = model.UserId;
                }
                
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập để gửi yêu cầu" });
                }

                var (success, message) = await _findPTService.SendTrainingRequestAsync(
                    userId, 
                    model.PtId, 
                    model.Goal,
                    model.Schedules, 
                    model.Notes);

                return Json(new { success, message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending training request");
                return Json(new { success = false, message = "Có lỗi xảy ra khi gửi yêu cầu" });
            }
        }

        // GET: /FindPT/MyRequests - Trang hiển thị yêu cầu của user
        [HttpGet("FindPT/MyRequests")]
        public IActionResult MyRequests()
        {
            return View();
        }

        // API: Lấy danh sách yêu cầu của user
        [HttpGet("FindPT/MyRequests/Data")]
        public async Task<IActionResult> GetMyRequests()
        {
            try
            {
                var userId = await _findPTService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                var requests = await _findPTService.GetMyRequestsAsync(userId);
                return Json(new { success = true, data = requests });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user requests");
                return Json(new { success = false, message = "Không thể tải danh sách yêu cầu" });
            }
        }

        // API: Lấy chi tiết yêu cầu
        [HttpGet("FindPT/RequestDetails/{bookingId}")]
        public async Task<IActionResult> GetRequestDetails(string bookingId)
        {
            try
            {
                var userId = await _findPTService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                var details = await _findPTService.GetRequestDetailsAsync(bookingId, userId);
                if (details == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy yêu cầu" });
                }

                return Json(new { success = true, data = details });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting request details");
                return Json(new { success = false, message = "Không thể tải chi tiết yêu cầu" });
            }
        }

        // API: Hủy yêu cầu
        [HttpPost("FindPT/CancelRequest/{bookingId}")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CancelRequest(string bookingId)
        {
            try
            {
                var userId = await _findPTService.GetCurrentUserIdAsync(HttpContext);
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                var (success, message) = await _findPTService.CancelRequestAsync(bookingId, userId);
                return Json(new { success, message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling request");
                return Json(new { success = false, message = "Có lỗi xảy ra khi hủy yêu cầu" });
            }
        }
    }

    // View Model
    public class SendTrainingRequestViewModel
    {
        public string PtId { get; set; } = null!;
        public string Goal { get; set; } = null!;
        public List<HealthWeb.Services.ScheduleItem> Schedules { get; set; } = new List<HealthWeb.Services.ScheduleItem>();
        public string? Notes { get; set; }
        public string? UserId { get; set; } // Optional: from client side
    }
}

