using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using HealthWeb.Models.ViewModels.Admin;
using HealthWeb.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using OfficeOpenXml;
using OfficeOpenXml.Style;
using System.Drawing;

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

        [HttpGet("QuanLiUser/ExportExcel")]
        public async Task<IActionResult> ExportUsersToExcel(
            [FromQuery] string? search = null,
            [FromQuery] DateTime? dateFrom = null,
            [FromQuery] DateTime? dateTo = null,
            CancellationToken cancellationToken = default)
        {
            try
            {
                ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
                var data = await _userAdminService.GetUserManagementDataAsync(cancellationToken);
                
                var users = data.Users.ToList();
                
                // Apply filters if provided
                if (!string.IsNullOrWhiteSpace(search))
                {
                    var searchLower = search.ToLower();
                    users = users.Where(u => 
                        (u.Username?.ToLower().Contains(searchLower) ?? false) ||
                        (u.Email?.ToLower().Contains(searchLower) ?? false) ||
                        (u.UserId?.ToLower().Contains(searchLower) ?? false) ||
                        (u.FullName?.ToLower().Contains(searchLower) ?? false)
                    ).ToList();
                }
                
                if (dateFrom.HasValue || dateTo.HasValue)
                {
                    users = users.Where(u => 
                        (!dateFrom.HasValue || (u.CreatedDate.HasValue && u.CreatedDate.Value >= dateFrom.Value)) &&
                        (!dateTo.HasValue || (u.CreatedDate.HasValue && u.CreatedDate.Value <= dateTo.Value.AddDays(1)))
                    ).ToList();
                }

                using var package = new ExcelPackage();
                var worksheet = package.Workbook.Worksheets.Add("Danh sách người dùng");

                // Header row
                var headers = new[] { "UserID", "Username", "Họ tên", "Email", "Số điện thoại", "Role", "Trạng thái", 
                    "Ngày tạo", "Lần đăng nhập cuối", "Streak", "Ngày log cuối", "% Hoàn thành mục tiêu", 
                    "Số mục tiêu mở", "% Tuân thủ ăn", "% Tuân thủ tập", "Số bài tập", "Cảnh báo bỏ lỡ", "Số thực đơn" };
                
                for (int i = 0; i < headers.Length; i++)
                {
                    worksheet.Cells[1, i + 1].Value = headers[i];
                    worksheet.Cells[1, i + 1].Style.Font.Bold = true;
                    worksheet.Cells[1, i + 1].Style.Fill.PatternType = ExcelFillStyle.Solid;
                    worksheet.Cells[1, i + 1].Style.Fill.BackgroundColor.SetColor(Color.FromArgb(79, 129, 189));
                    worksheet.Cells[1, i + 1].Style.Font.Color.SetColor(Color.White);
                }

                // Data rows
                int row = 2;
                foreach (var user in users)
                {
                    worksheet.Cells[row, 1].Value = user.UserId;
                    worksheet.Cells[row, 2].Value = user.Username;
                    worksheet.Cells[row, 3].Value = user.FullName;
                    worksheet.Cells[row, 4].Value = user.Email;
                    worksheet.Cells[row, 5].Value = user.Phone;
                    worksheet.Cells[row, 6].Value = user.Role;
                    worksheet.Cells[row, 7].Value = user.Status;
                    worksheet.Cells[row, 8].Value = user.CreatedDate?.ToString("dd/MM/yyyy HH:mm");
                    worksheet.Cells[row, 9].Value = user.LastLogin?.ToString("dd/MM/yyyy HH:mm");
                    worksheet.Cells[row, 10].Value = user.Streak;
                    worksheet.Cells[row, 11].Value = user.LastLogDate?.ToString("dd/MM/yyyy");
                    worksheet.Cells[row, 12].Value = user.GoalCompletion;
                    worksheet.Cells[row, 13].Value = user.OpenGoals;
                    worksheet.Cells[row, 14].Value = user.NutritionCompliance;
                    worksheet.Cells[row, 15].Value = user.WorkoutCompliance;
                    worksheet.Cells[row, 16].Value = user.Exercises;
                    worksheet.Cells[row, 17].Value = user.MissedWorkoutAlerts;
                    worksheet.Cells[row, 18].Value = user.Menus;
                    row++;
                }

                // Auto-fit columns
                worksheet.Cells[worksheet.Dimension.Address].AutoFitColumns();

                var fileName = $"Danh_sach_nguoi_dung_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";
                var fileBytes = package.GetAsByteArray();
                return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi xuất Excel: {ex.Message}" });
            }
        }

        [HttpGet("QuanLiPT/ExportExcel")]
        public async Task<IActionResult> ExportPTsToExcel(
            [FromQuery] string? search = null,
            [FromQuery] string? specialty = null,
            [FromQuery] string? city = null,
            [FromQuery] bool? acceptingClients = null,
            [FromQuery] double? minRating = null,
            CancellationToken cancellationToken = default)
        {
            try
            {
                ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
                var data = await _ptAdminService.GetPTManagementDataAsync(
                    search, specialty, city, acceptingClients, minRating, verifiedOnly: true, cancellationToken);
                
                var pts = data.Trainers.ToList();

                using var package = new ExcelPackage();
                var worksheet = package.Workbook.Worksheets.Add("Danh sách huấn luyện viên");

                // Header row
                var headers = new[] { "PTID", "UserID", "Họ tên", "Email", "Chuyên môn", "Thành phố", "Giá/giờ (VNĐ)", 
                    "Điểm TB", "Số đánh giá", "Số khách hiện tại", "Xác minh", "Nhận khách", "Kinh nghiệm (năm)", 
                    "Chứng chỉ", "Tỷ lệ thành công", "Doanh thu tháng này", "Tổng lịch đặt", "Tỷ lệ hủy", 
                    "Số buổi/tuần", "Ngày đăng ký" };
                
                for (int i = 0; i < headers.Length; i++)
                {
                    worksheet.Cells[1, i + 1].Value = headers[i];
                    worksheet.Cells[1, i + 1].Style.Font.Bold = true;
                    worksheet.Cells[1, i + 1].Style.Fill.PatternType = ExcelFillStyle.Solid;
                    worksheet.Cells[1, i + 1].Style.Fill.BackgroundColor.SetColor(Color.FromArgb(79, 129, 189));
                    worksheet.Cells[1, i + 1].Style.Font.Color.SetColor(Color.White);
                }

                // Data rows
                int row = 2;
                foreach (var pt in pts)
                {
                    worksheet.Cells[row, 1].Value = pt.PTId;
                    worksheet.Cells[row, 2].Value = pt.UserId;
                    worksheet.Cells[row, 3].Value = pt.Name;
                    worksheet.Cells[row, 4].Value = pt.Email;
                    worksheet.Cells[row, 5].Value = pt.Specialty;
                    worksheet.Cells[row, 6].Value = pt.City;
                    worksheet.Cells[row, 7].Value = pt.PricePerHour;
                    worksheet.Cells[row, 8].Value = pt.Rating;
                    worksheet.Cells[row, 9].Value = pt.TotalReviews;
                    worksheet.Cells[row, 10].Value = pt.CurrentClients;
                    worksheet.Cells[row, 11].Value = pt.Verified ? "Đã xác minh" : "Chưa xác minh";
                    worksheet.Cells[row, 12].Value = pt.AcceptingClients ? "Đang nhận" : "Không nhận";
                    worksheet.Cells[row, 13].Value = pt.Experience;
                    worksheet.Cells[row, 14].Value = pt.Certificate;
                    worksheet.Cells[row, 15].Value = pt.SuccessRate;
                    worksheet.Cells[row, 16].Value = pt.RevenueThisMonth;
                    worksheet.Cells[row, 17].Value = pt.TotalBookings;
                    worksheet.Cells[row, 18].Value = pt.CancelRate;
                    worksheet.Cells[row, 19].Value = pt.BookingsPerWeek;
                    worksheet.Cells[row, 20].Value = pt.RegistrationDate?.ToString("dd/MM/yyyy");
                    row++;
                }

                // Auto-fit columns
                worksheet.Cells[worksheet.Dimension.Address].AutoFitColumns();

                var fileName = $"Danh_sach_huyn_luyen_vien_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";
                var fileBytes = package.GetAsByteArray();
                return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi xuất Excel: {ex.Message}" });
            }
        }

        [HttpGet("QuanLiGiaoDich/ExportExcel")]
        public async Task<IActionResult> ExportTransactionsToExcel(
            [FromQuery] string? search = null,
            [FromQuery] string? paymentMethod = null,
            [FromQuery] DateTime? dateFrom = null,
            [FromQuery] DateTime? dateTo = null,
            CancellationToken cancellationToken = default)
        {
            try
            {
                ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
                var data = await _transactionAdminService.GetTransactionManagementDataAsync(
                    search, paymentMethod, dateFrom, dateTo, cancellationToken);
                
                var transactions = data.Transactions.ToList();

                using var package = new ExcelPackage();
                var worksheet = package.Workbook.Worksheets.Add("Danh sách giao dịch");

                // Header row
                var headers = new[] { "Mã GD", "Mã Booking", "Mã khách hàng", "Tên khách hàng", "Mã PT", "Tên PT", 
                    "Tổng tiền (VNĐ)", "Hoa hồng App (VNĐ)", "PT nhận (VNĐ)", "Phương thức thanh toán", 
                    "Trạng thái thanh toán", "Ngày giờ giao dịch", "Tên dịch vụ", "Loại booking", 
                    "Ngày giờ booking", "Trạng thái booking" };
                
                for (int i = 0; i < headers.Length; i++)
                {
                    worksheet.Cells[1, i + 1].Value = headers[i];
                    worksheet.Cells[1, i + 1].Style.Font.Bold = true;
                    worksheet.Cells[1, i + 1].Style.Fill.PatternType = ExcelFillStyle.Solid;
                    worksheet.Cells[1, i + 1].Style.Fill.BackgroundColor.SetColor(Color.FromArgb(79, 129, 189));
                    worksheet.Cells[1, i + 1].Style.Font.Color.SetColor(Color.White);
                }

                // Data rows
                int row = 2;
                foreach (var trans in transactions)
                {
                    worksheet.Cells[row, 1].Value = trans.TransactionId;
                    worksheet.Cells[row, 2].Value = trans.BookingId;
                    worksheet.Cells[row, 3].Value = trans.CustomerId;
                    worksheet.Cells[row, 4].Value = trans.CustomerName;
                    worksheet.Cells[row, 5].Value = trans.PTId;
                    worksheet.Cells[row, 6].Value = trans.PTName;
                    worksheet.Cells[row, 7].Value = trans.Amount;
                    worksheet.Cells[row, 8].Value = trans.Commission ?? 0;
                    worksheet.Cells[row, 9].Value = trans.PTRevenue ?? 0;
                    worksheet.Cells[row, 10].Value = trans.PaymentMethod;
                    worksheet.Cells[row, 11].Value = trans.PaymentStatus;
                    worksheet.Cells[row, 12].Value = trans.TransactionDate?.ToString("dd/MM/yyyy HH:mm");
                    worksheet.Cells[row, 13].Value = trans.ServiceName;
                    worksheet.Cells[row, 14].Value = trans.BookingType;
                    worksheet.Cells[row, 15].Value = trans.BookingDateTime?.ToString("dd/MM/yyyy HH:mm");
                    worksheet.Cells[row, 16].Value = trans.BookingStatus;
                    row++;
                }

                // Auto-fit columns
                worksheet.Cells[worksheet.Dimension.Address].AutoFitColumns();

                var fileName = $"Danh_sach_giao_dich_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";
                var fileBytes = package.GetAsByteArray();
                return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Lỗi khi xuất Excel: {ex.Message}" });
            }
        }
    }
}
