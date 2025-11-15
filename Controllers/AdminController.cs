using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using HealthWeb.Models.ViewModels.Admin;
using HealthWeb.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;

namespace HealthWeb.Controllers
{
    [Route("Admin")]
    public class AdminController : Controller
    {
        private readonly IUserAdminService _userAdminService;
        private readonly INutritionAdminService _nutritionAdminService;
        private readonly IExerciseAdminService _exerciseAdminService;
        private readonly ITransactionAdminService _transactionAdminService;
        private readonly IPTAdminService _ptAdminService;
        private readonly IStatisticsService _statisticsService;

        public AdminController(
            IUserAdminService userAdminService,
            INutritionAdminService nutritionAdminService,
            IExerciseAdminService exerciseAdminService,
            ITransactionAdminService transactionAdminService,
            IPTAdminService ptAdminService,
            IStatisticsService statisticsService)
        {
            _userAdminService = userAdminService;
            _nutritionAdminService = nutritionAdminService;
            _exerciseAdminService = exerciseAdminService;
            _transactionAdminService = transactionAdminService;
            _ptAdminService = ptAdminService;
            _statisticsService = statisticsService;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            return RedirectToAction(nameof(ThongKe));
        }

        [HttpGet("QuanLiDinhDuong")]
        [HttpGet("QuanLiDinhDuong/Index")]
        public IActionResult QuanLiDinhDuong()
        {
            return View();
        }

        [HttpGet("QuanLiGiaoDich")]
        public IActionResult QuanLiGiaoDich()
        {
            return View();
        }

        [HttpGet("QuanLiGiaoDich/Data")]
        public async Task<IActionResult> GetQuanLiGiaoDichData(
            [FromQuery] string? search = null,
            [FromQuery] string? paymentMethod = null,
            [FromQuery] DateTime? dateFrom = null,
            [FromQuery] DateTime? dateTo = null,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var data = await _transactionAdminService.GetTransactionManagementDataAsync(
                    search,
                    paymentMethod,
                    dateFrom,
                    dateTo,
                    cancellationToken);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi tải dữ liệu giao dịch: {ex.Message}" });
            }
        }

        [HttpGet("QuanLiGiaoDich/{transactionId}/Detail")]
        public async Task<IActionResult> GetQuanLiGiaoDichDetail(string transactionId, CancellationToken cancellationToken)
        {
            try
            {
                var data = await _transactionAdminService.GetTransactionDetailAsync(transactionId, cancellationToken);
                if (data == null)
                {
                    return NotFound(new { error = "Transaction not found" });
                }

                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi tải chi tiết giao dịch: {ex.Message}" });
            }
        }

        [HttpGet("QuanLiPT")]
        public IActionResult QuanLiPT()
        {
            return View();
        }

        [HttpGet("QuanLiPT/Data")]
        public async Task<IActionResult> GetQuanLiPTData(
            [FromQuery] string? search = null,
            [FromQuery] string? specialty = null,
            [FromQuery] string? city = null,
            [FromQuery] bool? acceptingClients = null,
            [FromQuery] double? minRating = null,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var data = await _ptAdminService.GetPTManagementDataAsync(
                    search,
                    specialty,
                    city,
                    acceptingClients,
                    minRating,
                    verifiedOnly: true,
                    cancellationToken);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi tải dữ liệu PT: {ex.Message}" });
            }
        }

        [HttpGet("QuanLiPT/Pending")]
        public async Task<IActionResult> GetPendingPTData(
            [FromQuery] string? search = null,
            [FromQuery] string? specialty = null,
            CancellationToken cancellationToken = default)
        {
            try
            {
                // Get pending PTs directly from service (unverified only)
                var data = await _ptAdminService.GetPendingPTDataAsync(
                    search,
                    specialty,
                    cancellationToken);
                
                // Log results
                var pendingCount = data.Trainers?.Count() ?? 0;
                Console.WriteLine($"[GetPendingPTData] Pending PTs count: {pendingCount}");
                if (data.Trainers != null && data.Trainers.Any())
                {
                    var firstPT = data.Trainers.First();
                    Console.WriteLine($"[GetPendingPTData] First pending PT: UserId={firstPT.UserId}, PTId={firstPT.PTId}, Verified={firstPT.Verified}");
                }
                
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi tải dữ liệu PT chờ xác minh: {ex.Message}" });
            }
        }

        [HttpGet("QuanLiPT/{ptId}/Profile360")]
        public async Task<IActionResult> GetPTProfile360(string ptId, CancellationToken cancellationToken = default)
        {
            try
            {
                var data = await _ptAdminService.GetPTProfile360Async(ptId, cancellationToken);
                if (data == null)
                {
                    return NotFound(new { error = "PT not found" });
                }
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi tải thông tin PT: {ex.Message}" });
            }
        }

        [HttpPatch("QuanLiPT/{ptId}/ToggleAcceptingClients")]
        public async Task<IActionResult> ToggleAcceptingClients(
            string ptId,
            [FromBody] ToggleAcceptingClientsRequest request,
            CancellationToken cancellationToken = default)
        {
            if (request == null)
            {
                return BadRequest(new { error = "Request body is required" });
            }

            try
            {
                var updated = await _ptAdminService.ToggleAcceptingClientsAsync(ptId, request.AcceptingClients, cancellationToken);
                if (updated == null)
                {
                    return NotFound(new { error = "PT not found" });
                }
                return Ok(updated);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi cập nhật trạng thái nhận khách: {ex.Message}" });
            }
        }

        [HttpPost("QuanLiPT/{userId}/Approve")]
        public async Task<IActionResult> ApprovePT(
            string userId,
            [FromBody] ApprovePTRequest? request,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var approved = await _ptAdminService.ApprovePTAsync(userId, request?.Note, cancellationToken);
                if (approved == null)
                {
                    return NotFound(new { error = "PT not found" });
                }
                return Ok(approved);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi duyệt PT: {ex.Message}" });
            }
        }

        [HttpPost("QuanLiPT/{userId}/Reject")]
        public async Task<IActionResult> RejectPT(string userId, CancellationToken cancellationToken = default)
        {
            try
            {
                var rejected = await _ptAdminService.RejectPTAsync(userId, cancellationToken);
                if (!rejected)
                {
                    return NotFound(new { error = "PT not found" });
                }
                return Ok(new { message = "Đã từ chối hồ sơ PT" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi từ chối PT: {ex.Message}" });
            }
        }

        [HttpPost("QuanLiPT/Booking/{bookingId}/Confirm")]
        public async Task<IActionResult> ConfirmBooking(string bookingId, CancellationToken cancellationToken = default)
        {
            try
            {
                var confirmed = await _ptAdminService.ConfirmBookingAsync(bookingId, cancellationToken);
                if (!confirmed)
                {
                    return NotFound(new { error = "Booking not found" });
                }
                return Ok(new { success = true, message = "Đã xác nhận lịch đặt" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi xác nhận lịch đặt: {ex.Message}" });
            }
        }

        [HttpPost("QuanLiPT/Booking/{bookingId}/Cancel")]
        public async Task<IActionResult> CancelBooking(
            string bookingId,
            [FromBody] CancelBookingRequest? request,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var cancelled = await _ptAdminService.CancelBookingAsync(bookingId, request?.Reason, cancellationToken);
                if (!cancelled)
                {
                    return NotFound(new { error = "Booking not found" });
                }
                return Ok(new { success = true, message = "Đã hủy lịch đặt" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi hủy lịch đặt: {ex.Message}" });
            }
        }

        [HttpPut("QuanLiPT/{ptId}")]
        public async Task<IActionResult> UpdatePT(
            string ptId,
            [FromBody] UpdatePTRequest request,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var updated = await _ptAdminService.UpdatePTAsync(ptId, request, cancellationToken);
                if (updated == null)
                {
                    return NotFound(new { error = "PT not found" });
                }
                return Ok(updated);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi cập nhật PT: {ex.Message}" });
            }
        }

        [HttpDelete("QuanLiPT/{ptId}")]
        public async Task<IActionResult> DeletePT(string ptId, CancellationToken cancellationToken = default)
        {
            try
            {
                var deleted = await _ptAdminService.DeletePTAsync(ptId, cancellationToken);
                if (!deleted)
                {
                    return NotFound(new { error = "PT not found" });
                }
                return Ok(new { success = true, message = "Đã xóa PT thành công" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi xóa PT: {ex.Message}" });
            }
        }

        [HttpGet("QuanLiUser")]
        public IActionResult QuanLiUser()
        {
            return View();
        }

        [HttpGet("QuanLiUser/Data")]
        public async Task<IActionResult> GetQuanLiUserData(CancellationToken cancellationToken)
        {
            var data = await _userAdminService.GetUserManagementDataAsync(cancellationToken);
            return Ok(data);
        }

        [HttpGet("QuanLiUser/{userId}/Detail")]
        public async Task<IActionResult> GetQuanLiUserDetail(string userId, CancellationToken cancellationToken)
        {
            var data = await _userAdminService.GetUserProfileAsync(userId, cancellationToken);
            if (data == null)
            {
                return NotFound();
            }

            return Ok(data);
        }

        [HttpPost("QuanLiUser/{userId}/GrantPT/{ptId}")]
        public async Task<IActionResult> GrantPTAccess(string userId, string ptId, CancellationToken cancellationToken = default)
        {
            try
            {
                var granted = await _userAdminService.GrantPTAccessAsync(userId, ptId, cancellationToken);
                if (!granted)
                {
                    return BadRequest(new { error = "Không thể cấp quyền PT" });
                }
                return Ok(new { success = true, message = "Đã cấp quyền PT thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi cấp quyền PT: {ex.Message}" });
            }
        }

        [HttpPost("QuanLiUser/{userId}/RevokePT/{ptId}")]
        public async Task<IActionResult> RevokePTAccess(string userId, string ptId, CancellationToken cancellationToken = default)
        {
            try
            {
                var revoked = await _userAdminService.RevokePTAccessAsync(userId, ptId, cancellationToken);
                if (!revoked)
                {
                    return NotFound(new { error = "Không tìm thấy quyền truy cập PT" });
                }
                return Ok(new { success = true, message = "Đã thu hồi quyền PT thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi thu hồi quyền PT: {ex.Message}" });
            }
        }

        // Routes cụ thể hơn phải đứng trước routes chung hơn
        [HttpGet("QuanLiDinhDuong/Data")]
        public async Task<IActionResult> GetQuanLiDinhDuongData(CancellationToken cancellationToken)
        {
            var data = await _nutritionAdminService.GetNutritionDashboardAsync(cancellationToken);
            return Ok(data);
        }

        [HttpPatch("QuanLiDinhDuong/{foodId}/Visibility")]
        public async Task<IActionResult> SetFoodVisibility(string foodId, [FromBody] ToggleFoodVisibilityRequest request, CancellationToken cancellationToken)
        {
            if (request == null)
            {
                return BadRequest(new { error = "Request body is required" });
            }

            var updated = await _nutritionAdminService.SetFoodVisibilityAsync(foodId, request.Hidden, cancellationToken);
            if (updated == null)
            {
                return NotFound(new { error = "Food not found" });
            }

            return Ok(updated);
        }

        [HttpGet("QuanLiDinhDuong/{foodId}/Detail")]
        public async Task<IActionResult> GetQuanLiDinhDuongDetail(string foodId, CancellationToken cancellationToken)
        {
            var data = await _nutritionAdminService.GetFoodDetailAsync(foodId, cancellationToken);
            if (data == null)
            {
                return NotFound(new { error = "Food not found" });
            }

            return Ok(data);
        }

        [HttpPost("QuanLiDinhDuong")]
        public async Task<IActionResult> CreateFood([FromBody] NutritionFoodUpsertRequest request, CancellationToken cancellationToken)
        {
            if (request == null)
            {
                return BadRequest(new { error = "Request body is required" });
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var created = await _nutritionAdminService.CreateFoodAsync(request, cancellationToken);
                return CreatedAtAction(nameof(GetQuanLiDinhDuongDetail), new { foodId = created.FoodId }, created);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPut("QuanLiDinhDuong/{foodId}")]
        public async Task<IActionResult> UpdateFood(string foodId, [FromBody] NutritionFoodUpsertRequest request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(foodId))
            {
                return BadRequest(new { error = "Food ID is required" });
            }

            if (request == null)
            {
                return BadRequest(new { error = "Request body is required" });
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var updated = await _nutritionAdminService.UpdateFoodAsync(foodId, request, cancellationToken);
                if (updated == null)
                {
                    return NotFound(new { error = "Food not found" });
                }

                return Ok(updated);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpDelete("QuanLiDinhDuong/{foodId}")]
        public async Task<IActionResult> DeleteFood(string foodId, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(foodId))
            {
                return BadRequest(new { error = "Food ID is required" });
            }

            try
            {
                var deleted = await _nutritionAdminService.DeleteFoodAsync(foodId, cancellationToken);
                if (!deleted)
                {
                    return NotFound(new { error = "Food not found" });
                }

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("ThongKe")]
        public IActionResult ThongKe()
        {
            return View();
        }

        [HttpGet("ThongKe/Data")]
        public async Task<IActionResult> GetStatisticsData(
            [FromQuery] DateTime? dateFrom = null,
            [FromQuery] DateTime? dateTo = null,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var data = await _statisticsService.GetStatisticsDataAsync(dateFrom, dateTo, cancellationToken);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi tải dữ liệu thống kê: {ex.Message}" });
            }
        }

        [HttpGet("ThongKe/UserAnalytics")]
        public async Task<IActionResult> GetUserAnalytics(
            [FromQuery] DateTime? dateFrom = null,
            [FromQuery] DateTime? dateTo = null,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var data = await _statisticsService.GetUserAnalyticsAsync(dateFrom, dateTo, cancellationToken);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi tải thống kê người dùng: {ex.Message}" });
            }
        }

        [HttpGet("ThongKe/PTAnalytics")]
        public async Task<IActionResult> GetPTAnalytics(
            [FromQuery] DateTime? dateFrom = null,
            [FromQuery] DateTime? dateTo = null,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var data = await _statisticsService.GetPTAnalyticsAsync(dateFrom, dateTo, cancellationToken);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi tải thống kê PT: {ex.Message}" });
            }
        }

        [HttpGet("ThongKe/HealthAnalytics")]
        public async Task<IActionResult> GetHealthAnalytics(
            [FromQuery] DateTime? dateFrom = null,
            [FromQuery] DateTime? dateTo = null,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var data = await _statisticsService.GetHealthAnalyticsAsync(dateFrom, dateTo, cancellationToken);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi tải thống kê sức khỏe: {ex.Message}" });
            }
        }

        [HttpGet("ThongKe/GoalsAnalytics")]
        public async Task<IActionResult> GetGoalsAnalytics(
            [FromQuery] DateTime? dateFrom = null,
            [FromQuery] DateTime? dateTo = null,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var data = await _statisticsService.GetGoalsAnalyticsAsync(dateFrom, dateTo, cancellationToken);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi tải thống kê mục tiêu: {ex.Message}" });
            }
        }

        [HttpGet("ThongKe/WorkoutAnalytics")]
        public async Task<IActionResult> GetWorkoutAnalytics(
            [FromQuery] DateTime? dateFrom = null,
            [FromQuery] DateTime? dateTo = null,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var data = await _statisticsService.GetWorkoutAnalyticsAsync(dateFrom, dateTo, cancellationToken);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi tải thống kê tập luyện: {ex.Message}" });
            }
        }

        [HttpGet("ThongKe/NutritionAnalytics")]
        public async Task<IActionResult> GetNutritionAnalytics(
            [FromQuery] DateTime? dateFrom = null,
            [FromQuery] DateTime? dateTo = null,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var data = await _statisticsService.GetNutritionAnalyticsAsync(dateFrom, dateTo, cancellationToken);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi tải thống kê dinh dưỡng: {ex.Message}" });
            }
        }

        [HttpGet("ThongKe/FinanceAnalytics")]
        public async Task<IActionResult> GetFinanceAnalytics(
            [FromQuery] DateTime? dateFrom = null,
            [FromQuery] DateTime? dateTo = null,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var data = await _statisticsService.GetFinanceAnalyticsAsync(dateFrom, dateTo, cancellationToken);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi tải thống kê tài chính: {ex.Message}" });
            }
        }

        [HttpGet("ThongKe/SystemAnalytics")]
        public async Task<IActionResult> GetSystemAnalytics(CancellationToken cancellationToken = default)
        {
            try
            {
                var data = await _statisticsService.GetSystemAnalyticsAsync(cancellationToken);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi tải thống kê hệ thống: {ex.Message}" });
            }
        }

        [HttpGet("ThongKe/BehaviorAnalytics")]
        public async Task<IActionResult> GetBehaviorAnalytics(
            [FromQuery] DateTime? dateFrom = null,
            [FromQuery] DateTime? dateTo = null,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var data = await _statisticsService.GetBehaviorAnalyticsAsync(dateFrom, dateTo, cancellationToken);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi tải thống kê hành vi: {ex.Message}" });
            }
        }

        [HttpGet("ThongKe/RecentActivities")]
        public async Task<IActionResult> GetRecentActivities(
            [FromQuery] int limit = 20,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var data = await _statisticsService.GetRecentActivitiesAsync(limit, cancellationToken);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi tải hoạt động gần đây: {ex.Message}" });
            }
        }

        [HttpGet("HeThongBaoMat")]
        public IActionResult HeThongBaoMat()
        {
            return View();
        }

        // POST: /Admin/Logout - Đăng xuất admin và quay về giao diện user
        [HttpPost("Logout")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Logout()
        {
            HttpContext.Session.Clear();
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return RedirectToAction("Index", "Home");
        }

        // GET: /Admin/Logout - Đăng xuất admin (hỗ trợ GET để dùng từ button)
        [HttpGet("Logout")]
        public async Task<IActionResult> LogoutGet()
        {
            HttpContext.Session.Clear();
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return RedirectToAction("Index", "Home");
        }

        // Routes cụ thể hơn phải đứng trước routes chung hơn
        [HttpGet("QuanLiBaiTap/Data")]
        public async Task<IActionResult> GetQuanLiBaiTapData(CancellationToken cancellationToken)
        {
            try
            {
                var data = await _exerciseAdminService.GetExerciseDashboardAsync(cancellationToken);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi tải dữ liệu bài tập: {ex.Message}" });
            }
        }

        [HttpGet("QuanLiBaiTap/{exerciseId}/Detail")]
        public async Task<IActionResult> GetQuanLiBaiTapDetail(int exerciseId, CancellationToken cancellationToken)
        {
            var data = await _exerciseAdminService.GetExerciseDetailAsync(exerciseId, cancellationToken);
            if (data == null)
            {
                return NotFound(new { error = "Exercise not found" });
            }

            return Ok(data);
        }

        [HttpGet("QuanLiBaiTap")]
        public IActionResult QuanLiBaiTap()
        {
            return View();
        }

        [HttpPost("QuanLiBaiTap")]
        public async Task<IActionResult> CreateExercise([FromBody] ExerciseUpsertRequest request, CancellationToken cancellationToken)
        {
            if (request == null)
            {
                return BadRequest(new { error = "Request body is required" });
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var created = await _exerciseAdminService.CreateExerciseAsync(request, cancellationToken);
                return CreatedAtAction(nameof(GetQuanLiBaiTapDetail), new { exerciseId = created.ExerciseId }, created);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPut("QuanLiBaiTap/{exerciseId}")]
        public async Task<IActionResult> UpdateExercise(int exerciseId, [FromBody] ExerciseUpsertRequest request, CancellationToken cancellationToken)
        {
            if (request == null)
            {
                return BadRequest(new { error = "Request body is required" });
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var updated = await _exerciseAdminService.UpdateExerciseAsync(exerciseId, request, cancellationToken);
                if (updated == null)
                {
                    return NotFound(new { error = "Exercise not found" });
                }

                return Ok(updated);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpDelete("QuanLiBaiTap/{exerciseId}")]
        public async Task<IActionResult> DeleteExercise(int exerciseId, CancellationToken cancellationToken)
        {
            try
            {
                var deleted = await _exerciseAdminService.DeleteExerciseAsync(exerciseId, cancellationToken);
                if (!deleted)
                {
                    return NotFound(new { error = "Exercise not found" });
                }

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPatch("QuanLiBaiTap/{exerciseId}/Visibility")]
        public async Task<IActionResult> SetExerciseVisibility(int exerciseId, [FromBody] ToggleExerciseVisibilityRequest request, CancellationToken cancellationToken)
        {
            if (request == null)
            {
                return BadRequest(new { error = "Request body is required" });
            }

            var updated = await _exerciseAdminService.SetExerciseVisibilityAsync(exerciseId, request.Hidden, cancellationToken);
            if (updated == null)
            {
                return NotFound(new { error = "Exercise not found" });
            }

            return Ok(updated);
        }

        [HttpGet("QuanLiBaiTap/MuscleGroups")]
        public async Task<IActionResult> GetMuscleGroups(CancellationToken cancellationToken)
        {
            try
            {
                var muscleGroups = await _exerciseAdminService.GetDistinctMuscleGroupsAsync(cancellationToken);
                return Ok(muscleGroups);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi tải danh sách nhóm cơ: {ex.Message}" });
            }
        }

        [HttpGet("QuanLiBaiTap/Equipment")]
        public async Task<IActionResult> GetEquipment(CancellationToken cancellationToken)
        {
            try
            {
                var equipment = await _exerciseAdminService.GetDistinctEquipmentAsync(cancellationToken);
                return Ok(equipment);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi tải danh sách thiết bị: {ex.Message}" });
            }
        }
    }
}
