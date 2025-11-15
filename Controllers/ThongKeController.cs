using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HealthWeb.Models.EF;
using HealthWeb.Models.Entities;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace HealthWeb.Controllers
{
    public class ThongKeController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ThongKeController> _logger;

        public ThongKeController(ApplicationDbContext context, ILogger<ThongKeController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [Route("/ThongKe")]
        public IActionResult Index()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                ViewData["RequireLogin"] = true;
                ViewData["LoginMessage"] = "Vui lòng đăng nhập để sử dụng tính năng này.";
            }
            return View("ThongKe");
        }

        // Helper: Lấy userId từ session
        private string? GetUserId()
        {
            var userId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(userId) && HttpContext.User?.Identity?.IsAuthenticated == true)
            {
                userId = HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            }
            return userId;
        }

        // API: Lấy userId hiện tại
        [HttpGet("ThongKe/GetCurrentUserId")]
        public IActionResult GetCurrentUserId()
        {
            var userId = GetUserId();
            _logger.LogInformation("GetCurrentUserId API called, userId: {UserId}", userId ?? "null");
            
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Chưa đăng nhập" });
            }
            return Json(new { success = true, userId = userId });
        }

        // API: Lấy thống kê tổng quan
        [HttpGet("ThongKe/GetOverview")]
        public async Task<IActionResult> GetOverview()
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("GetOverview: UserId is null or empty");
                    return Json(new { success = false, message = "Chưa đăng nhập" });
                }

                _logger.LogInformation("GetOverview: Loading data for userId: {UserId}", userId);

                // Tổng số buổi tập
                var totalSessions = await _context.NhatKyHoanThanhBaiTaps
                    .Where(x => x.UserId == userId)
                    .CountAsync();

                // Tổng thời gian (giờ) - tính cả NULL (coi như 0)
                var totalTimeMinutes = await _context.NhatKyHoanThanhBaiTaps
                    .Where(x => x.UserId == userId)
                    .SumAsync(x => x.ThoiLuongThucTePhut ?? 0);
                var totalTimeHours = totalTimeMinutes / 60.0;

                // Tổng số thành tựu
                var totalAchievements = await _context.ThanhTuus
                    .Where(x => x.UserId == userId)
                    .CountAsync();

                // Tỷ lệ hoàn thành mục tiêu
                var totalGoals = await _context.MucTieus
                    .Where(x => x.UserId == userId)
                    .CountAsync();
                var completedGoals = await _context.MucTieus
                    .Where(x => x.UserId == userId && x.DaHoanThanh == true)
                    .CountAsync();
                var goalAchievedPercent = totalGoals > 0 ? (completedGoals * 100.0 / totalGoals) : 0;

                _logger.LogInformation("GetOverview: Results - Sessions: {Sessions}, Time: {Time}h, Achievements: {Achievements}, Goals: {Goals}%", 
                    totalSessions, totalTimeHours, totalAchievements, goalAchievedPercent);

                return Json(new
                {
                    success = true,
                    data = new
                    {
                        TotalSessions = totalSessions,
                        TotalTimeHours = Math.Round(totalTimeHours, 1),
                        TotalAchievements = totalAchievements,
                        GoalAchievedPercent = Math.Round(goalAchievedPercent, 1)
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading overview stats");
                return Json(new { success = false, message = "Không thể tải thống kê tổng quan" });
            }
        }

        // API: Lấy tiến độ tập luyện 7 ngày
        [HttpGet("ThongKe/GetWeeklyProgress")]
        public async Task<IActionResult> GetWeeklyProgress()
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("GetWeeklyProgress: UserId is null or empty");
                    return Json(new { success = false, message = "Chưa đăng nhập" });
                }

                var endDate = DateTime.Now.Date;
                var startDate = endDate.AddDays(-6);

                _logger.LogInformation("GetWeeklyProgress: Loading data for userId: {UserId}, from {StartDate} to {EndDate}", 
                    userId, startDate, endDate);

                var progress = new List<object>();
                var dayNames = new[] { "CN", "T2", "T3", "T4", "T5", "T6", "T7" };
                
                for (var date = startDate; date <= endDate; date = date.AddDays(1))
                {
                    var dateOnly = DateOnly.FromDateTime(date);
                    // Tính tổng thời gian, bao gồm cả NULL (coi như 0)
                    var minutes = await _context.NhatKyHoanThanhBaiTaps
                        .Where(x => x.UserId == userId && x.NgayHoanThanh == dateOnly)
                        .SumAsync(x => x.ThoiLuongThucTePhut ?? 0);

                    // DayOfWeek: Sunday = 0, Monday = 1, ..., Saturday = 6
                    var dayIndex = (int)date.DayOfWeek;
                    progress.Add(new
                    {
                        Day = dayNames[dayIndex],
                        Minutes = (int)minutes
                    });
                }

                _logger.LogInformation("GetWeeklyProgress: Found {Count} days with data", progress.Count(p => ((dynamic)p).Minutes > 0));

                return Json(new { success = true, data = progress });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading weekly progress");
                return Json(new { success = false, message = "Không thể tải tiến độ tập luyện" });
            }
        }

        // API: Lấy phân bố loại tập luyện
        [HttpGet("ThongKe/GetTrainingDistribution")]
        public async Task<IActionResult> GetTrainingDistribution()
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("GetTrainingDistribution: UserId is null or empty");
                    return Json(new { success = false, message = "Chưa đăng nhập" });
                }

                _logger.LogInformation("GetTrainingDistribution: Loading data for userId: {UserId}", userId);

                // Lấy tất cả nhật ký hoàn thành bài tập
                var nhatKyList = await _context.NhatKyHoanThanhBaiTaps
                    .Where(x => x.UserId == userId)
                    .Include(x => x.ChiTiet)
                        .ThenInclude(x => x.KeHoach)
                    .ToListAsync();

                // Group by LoaiKeHoach, xử lý null safety
                var distribution = nhatKyList
                    .Where(x => x.ChiTiet != null && x.ChiTiet.KeHoach != null)
                    .GroupBy(x => x.ChiTiet.KeHoach.LoaiKeHoach ?? "Khác")
                    .Select(g => new
                    {
                        Type = g.Key,
                        Count = g.Count()
                    })
                    .ToList();

                _logger.LogInformation("GetTrainingDistribution: Found {Count} training types", distribution.Count);

                // Nếu không có dữ liệu, trả về mảng rỗng (frontend sẽ xử lý)
                return Json(new { success = true, data = distribution });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading training distribution: {Message}", ex.Message);
                return Json(new { success = false, message = "Không thể tải phân bố loại tập luyện" });
            }
        }

        // API: Lấy thành tựu đã đạt được
        [HttpGet("ThongKe/GetAchievements")]
        public async Task<IActionResult> GetAchievements()
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("GetAchievements: UserId is null or empty");
                    return Json(new { success = false, message = "Chưa đăng nhập" });
                }

                _logger.LogInformation("GetAchievements: Loading data for userId: {UserId}", userId);

                var achievements = await _context.ThanhTuus
                    .Where(x => x.UserId == userId)
                    .OrderByDescending(x => x.NgayDatDuoc)
                    .Take(10)
                    .Select(x => new
                    {
                        x.TenBadge,
                        x.MoTa,
                        x.NgayDatDuoc
                    })
                    .ToListAsync();

                _logger.LogInformation("GetAchievements: Found {Count} achievements", achievements.Count);

                return Json(new { success = true, data = achievements });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading achievements: {Message}", ex.Message);
                return Json(new { success = false, message = "Không thể tải thành tựu" });
            }
        }

        // API: Lấy thống kê chi tiết
        [HttpGet("ThongKe/GetDetailedStats")]
        public async Task<IActionResult> GetDetailedStats()
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("GetDetailedStats: UserId is null or empty");
                    return Json(new { success = false, message = "Chưa đăng nhập" });
                }

                _logger.LogInformation("GetDetailedStats: Loading data for userId: {UserId}", userId);

                var totalSessions = await _context.NhatKyHoanThanhBaiTaps
                    .Where(x => x.UserId == userId)
                    .CountAsync();

                var totalTimeMinutes = await _context.NhatKyHoanThanhBaiTaps
                    .Where(x => x.UserId == userId)
                    .SumAsync(x => x.ThoiLuongThucTePhut ?? 0);

                var totalCalories = await _context.NhatKyHoanThanhBaiTaps
                    .Where(x => x.UserId == userId && x.CaloTieuHao != null)
                    .SumAsync(x => x.CaloTieuHao ?? 0);

                // Tính số ngày liên tiếp
                var consecutiveDays = await CalculateConsecutiveDays(userId);

                // Tính trung bình thời gian/buổi
                var avgTimePerSession = totalSessions > 0 ? totalTimeMinutes / totalSessions / 60.0 : 0;

                // Tính số buổi/tuần (7 ngày gần nhất)
                var weekStart = DateTime.Now.Date.AddDays(-6);
                var sessionsThisWeek = await _context.NhatKyHoanThanhBaiTaps
                    .Where(x => x.UserId == userId && 
                               DateOnly.FromDateTime(weekStart) <= x.NgayHoanThanh &&
                               x.NgayHoanThanh <= DateOnly.FromDateTime(DateTime.Now))
                    .CountAsync();

                return Json(new
                {
                    success = true,
                    data = new
                    {
                        AvgTimePerSession = Math.Round(avgTimePerSession, 1),
                        SessionsPerWeek = Math.Round(sessionsThisWeek / 7.0, 1),
                        TotalCalories = Math.Round(totalCalories, 0),
                        ConsecutiveDays = consecutiveDays
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading detailed stats");
                return Json(new { success = false, message = "Không thể tải thống kê chi tiết" });
            }
        }

        // API: So sánh hiệu suất tuần này vs tuần trước
        [HttpGet("ThongKe/GetPerformanceComparison")]
        public async Task<IActionResult> GetPerformanceComparison()
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("GetPerformanceComparison: UserId is null or empty");
                    return Json(new { success = false, message = "Chưa đăng nhập" });
                }

                _logger.LogInformation("GetPerformanceComparison: Loading data for userId: {UserId}", userId);

                var now = DateTime.Now.Date;
                var thisWeekStart = now.AddDays(-(int)now.DayOfWeek + 1); // Monday
                var lastWeekStart = thisWeekStart.AddDays(-7);
                var lastWeekEnd = thisWeekStart.AddDays(-1);

                // Tuần này - tính cả NULL (coi như 0)
                var thisWeekMinutes = await _context.NhatKyHoanThanhBaiTaps
                    .Where(x => x.UserId == userId &&
                               DateOnly.FromDateTime(thisWeekStart) <= x.NgayHoanThanh &&
                               x.NgayHoanThanh <= DateOnly.FromDateTime(now))
                    .SumAsync(x => x.ThoiLuongThucTePhut ?? 0);

                // Tuần trước - tính cả NULL (coi như 0)
                var lastWeekMinutes = await _context.NhatKyHoanThanhBaiTaps
                    .Where(x => x.UserId == userId &&
                               DateOnly.FromDateTime(lastWeekStart) <= x.NgayHoanThanh &&
                               x.NgayHoanThanh <= DateOnly.FromDateTime(lastWeekEnd))
                    .SumAsync(x => x.ThoiLuongThucTePhut ?? 0);

                return Json(new
                {
                    success = true,
                    data = new
                    {
                        LastWeek = (int)lastWeekMinutes,
                        ThisWeek = (int)thisWeekMinutes
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading performance comparison");
                return Json(new { success = false, message = "Không thể tải so sánh hiệu suất" });
            }
        }

        // Helper: Tính số ngày liên tiếp
        private async Task<int> CalculateConsecutiveDays(string userId)
        {
            var today = DateOnly.FromDateTime(DateTime.Now);
            var consecutiveDays = 0;
            var checkDate = today;

            while (true)
            {
                var hasWorkout = await _context.NhatKyHoanThanhBaiTaps
                    .AnyAsync(x => x.UserId == userId && x.NgayHoanThanh == checkDate);

                if (hasWorkout)
                {
                    consecutiveDays++;
                    checkDate = checkDate.AddDays(-1);
                }
                else
                {
                    break;
                }
            }

            return consecutiveDays;
        }

        // API: Lấy thống kê sức khỏe (cân nặng, BMI) theo thời gian
        [HttpGet("ThongKe/GetHealthStats")]
        public async Task<IActionResult> GetHealthStats(string period = "7days")
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Chưa đăng nhập" });
                }

                DateOnly startDate;
                switch (period)
                {
                    case "7days":
                        startDate = DateOnly.FromDateTime(DateTime.Now.AddDays(-7));
                        break;
                    case "1month":
                        startDate = DateOnly.FromDateTime(DateTime.Now.AddMonths(-1));
                        break;
                    case "3months":
                        startDate = DateOnly.FromDateTime(DateTime.Now.AddMonths(-3));
                        break;
                    default:
                        startDate = DateOnly.FromDateTime(DateTime.Now.AddDays(-7));
                        break;
                }

                var healthData = await _context.LuuTruSucKhoes
                    .Where(x => x.UserId == userId && x.NgayGhiNhan >= startDate)
                    .OrderBy(x => x.NgayGhiNhan)
                    .Select(x => new
                    {
                        Date = x.NgayGhiNhan.ToString("yyyy-MM-dd"),
                        Weight = x.CanNang ?? 0,
                        BMI = x.Bmi ?? (x.CanNang.HasValue && x.ChieuCao.HasValue && x.ChieuCao > 0 
                            ? Math.Round((double)x.CanNang.Value / Math.Pow((double)x.ChieuCao.Value / 100, 2), 1) 
                            : 0)
                    })
                    .ToListAsync();

                _logger.LogInformation("GetHealthStats: Found {Count} health records for userId: {UserId}", 
                    healthData.Count, userId);

                // Tính tốc độ thay đổi trung bình (kg/tuần)
                double avgChangePerWeek = 0;
                if (healthData.Count >= 2)
                {
                    var firstWeight = healthData.First().Weight;
                    var lastWeight = healthData.Last().Weight;
                    var daysDiff = (DateTime.Parse(healthData.Last().Date) - DateTime.Parse(healthData.First().Date)).Days;
                    if (daysDiff > 0)
                    {
                        var totalChange = lastWeight - firstWeight;
                        avgChangePerWeek = (totalChange / daysDiff) * 7;
                    }
                }

                return Json(new
                {
                    success = true,
                    data = healthData,
                    avgChangePerWeek = Math.Round(avgChangePerWeek, 2)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading health stats");
                return Json(new { success = false, message = "Không thể tải thống kê sức khỏe" });
            }
        }

        // API: Lấy mục tiêu cân nặng
        [HttpGet("ThongKe/GetWeightGoals")]
        public async Task<IActionResult> GetWeightGoals()
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Chưa đăng nhập" });
                }

                var goals = await _context.MucTieus
                    .Where(x => x.UserId == userId && 
                                (x.LoaiMucTieu.Contains("Weight") || x.LoaiMucTieu.Contains("Cân nặng")))
                    .Select(x => new
                    {
                        GoalId = x.MucTieuId,
                        TargetValue = x.GiaTriMucTieu,
                        StartDate = x.NgayBatDau.ToString("yyyy-MM-dd"),
                        EndDate = x.NgayKetThuc.HasValue ? x.NgayKetThuc.Value.ToString("yyyy-MM-dd") : null,
                        CurrentProgress = x.TienDoHienTai ?? 0,
                        IsCompleted = x.DaHoanThanh ?? false
                    })
                    .ToListAsync();

                return Json(new { success = true, data = goals });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading weight goals");
                return Json(new { success = false, message = "Không thể tải mục tiêu cân nặng" });
            }
        }

        // API: Lấy thống kê dinh dưỡng (calo tiêu thụ vs đốt cháy)
        [HttpGet("ThongKe/GetNutritionStats")]
        public async Task<IActionResult> GetNutritionStats(string period = "7days")
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Chưa đăng nhập" });
                }

                DateOnly startDate;
                switch (period)
                {
                    case "7days":
                        startDate = DateOnly.FromDateTime(DateTime.Now.AddDays(-7));
                        break;
                    case "1month":
                        startDate = DateOnly.FromDateTime(DateTime.Now.AddMonths(-1));
                        break;
                    case "3months":
                        startDate = DateOnly.FromDateTime(DateTime.Now.AddMonths(-3));
                        break;
                    default:
                        startDate = DateOnly.FromDateTime(DateTime.Now.AddDays(-7));
                        break;
                }

                // Calo tiêu thụ từ dinh dưỡng
                var consumedCalories = await _context.NhatKyDinhDuongs
                    .Where(x => x.UserId == userId && x.NgayGhiLog >= startDate)
                    .Include(x => x.MonAn)
                    .GroupBy(x => x.NgayGhiLog)
                    .Select(g => new
                    {
                        Date = g.Key.ToString("yyyy-MM-dd"),
                        Calories = g.Sum(x => x.MonAn != null 
                            ? ((x.MonAn.LuongCalo ?? 0) * (x.LuongThucAn ?? 0) / 100.0)
                            : 0)
                    })
                    .ToListAsync();

                _logger.LogInformation("GetNutritionStats: Found {Count} days with consumed calories for userId: {UserId}", 
                    consumedCalories.Count, userId);

                // Calo đốt cháy từ tập luyện
                var burnedCalories = await _context.NhatKyHoanThanhBaiTaps
                    .Where(x => x.UserId == userId && x.NgayHoanThanh >= startDate)
                    .GroupBy(x => x.NgayHoanThanh)
                    .Select(g => new
                    {
                        Date = g.Key.ToString("yyyy-MM-dd"),
                        Calories = g.Sum(x => x.CaloTieuHao ?? 0)
                    })
                    .ToListAsync();

                _logger.LogInformation("GetNutritionStats: Found {Count} days with burned calories for userId: {UserId}", 
                    burnedCalories.Count, userId);

                // Tổng hợp theo ngày
                var allDates = consumedCalories.Select(x => x.Date)
                    .Union(burnedCalories.Select(x => x.Date))
                    .Distinct()
                    .OrderBy(x => x)
                    .ToList();

                var dailyStats = allDates.Select(date =>
                {
                    var consumed = consumedCalories.FirstOrDefault(x => x.Date == date)?.Calories ?? 0;
                    var burned = burnedCalories.FirstOrDefault(x => x.Date == date)?.Calories ?? 0;
                    var deficit = consumed - burned;
                    return new
                    {
                        Date = date,
                        Consumed = Math.Round(consumed, 0),
                        Burned = Math.Round(burned, 0),
                        Deficit = Math.Round(deficit, 0)
                    };
                }).ToList();

                // Tổng
                var totalConsumed = dailyStats.Sum(x => x.Consumed);
                var totalBurned = dailyStats.Sum(x => x.Burned);
                var totalDeficit = totalConsumed - totalBurned;

                return Json(new
                {
                    success = true,
                    data = dailyStats,
                    summary = new
                    {
                        totalConsumed = Math.Round(totalConsumed, 0),
                        totalBurned = Math.Round(totalBurned, 0),
                        totalDeficit = Math.Round(totalDeficit, 0)
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading nutrition stats");
                return Json(new { success = false, message = "Không thể tải thống kê dinh dưỡng" });
            }
        }

        // API: Lấy tỷ lệ macro (Protein/Carbs/Fat) thực tế vs mục tiêu
        [HttpGet("ThongKe/GetMacroRatio")]
        public async Task<IActionResult> GetMacroRatio(string period = "7days")
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Chưa đăng nhập" });
                }

                DateOnly startDate;
                switch (period)
                {
                    case "7days":
                        startDate = DateOnly.FromDateTime(DateTime.Now.AddDays(-7));
                        break;
                    case "1month":
                        startDate = DateOnly.FromDateTime(DateTime.Now.AddMonths(-1));
                        break;
                    case "3months":
                        startDate = DateOnly.FromDateTime(DateTime.Now.AddMonths(-3));
                        break;
                    default:
                        startDate = DateOnly.FromDateTime(DateTime.Now.AddDays(-7));
                        break;
                }

                // Thực tế: Tính từ nhật ký dinh dưỡng
                var actualMacros = await _context.NhatKyDinhDuongs
                    .Where(x => x.UserId == userId && x.NgayGhiLog >= startDate)
                    .Include(x => x.MonAn)
                    .Select(x => new
                    {
                        Protein = (x.MonAn.Protein ?? 0) * (x.LuongThucAn ?? 0) / 100,
                        Carbs = (x.MonAn.Carbohydrate ?? 0) * (x.LuongThucAn ?? 0) / 100,
                        Fat = (x.MonAn.ChatBeo ?? 0) * (x.LuongThucAn ?? 0) / 100
                    })
                    .ToListAsync();

                var totalProtein = actualMacros.Sum(x => x.Protein);
                var totalCarbs = actualMacros.Sum(x => x.Carbs);
                var totalFat = actualMacros.Sum(x => x.Fat);
                var totalMacros = totalProtein + totalCarbs + totalFat;

                var actualRatio = new
                {
                    Protein = totalMacros > 0 ? Math.Round((totalProtein / totalMacros) * 100, 1) : 0,
                    Carbs = totalMacros > 0 ? Math.Round((totalCarbs / totalMacros) * 100, 1) : 0,
                    Fat = totalMacros > 0 ? Math.Round((totalFat / totalMacros) * 100, 1) : 0
                };

                // Mục tiêu: Lấy từ kế hoạch ăn uống đang active
                var activeMealPlan = await _context.PhanCongKeHoachAnUongs
                    .Where(x => x.UserId == userId && x.TrangThai == "Active")
                    .Include(x => x.KeHoachAnUong)
                    .OrderByDescending(x => x.NgayGiao)
                    .FirstOrDefaultAsync();

                var targetRatio = new { Protein = 30.0, Carbs = 40.0, Fat = 30.0 }; // Default
                if (activeMealPlan?.KeHoachAnUong?.TiLeMacro != null)
                {
                    var macroParts = activeMealPlan.KeHoachAnUong.TiLeMacro.Split(':');
                    if (macroParts.Length == 3)
                    {
                        targetRatio = new
                        {
                            Protein = double.Parse(macroParts[0]),
                            Carbs = double.Parse(macroParts[1]),
                            Fat = double.Parse(macroParts[2])
                        };
                    }
                }

                return Json(new
                {
                    success = true,
                    data = new
                    {
                        actual = actualRatio,
                        target = targetRatio
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading macro ratio");
                return Json(new { success = false, message = "Không thể tải tỷ lệ macro" });
            }
        }
    }
}
