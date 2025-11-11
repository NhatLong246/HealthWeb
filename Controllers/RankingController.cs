using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HealthWeb.Models.Entities;
using HealthWeb.Models.EF;

namespace HealthWeb.Controllers
{
    public class RankingController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<RankingController> _logger;

        public RankingController(ApplicationDbContext context, ILogger<RankingController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: /Ranking hoặc /Ranking/Ranking
        [HttpGet("Ranking")]
        [HttpGet("Ranking/Ranking")]
        public IActionResult Ranking()
        {
            return View();
        }

        // API endpoint để lấy thống kê cá nhân
        [HttpGet("Ranking/GetPersonalStats")]
        public async Task<IActionResult> GetPersonalStats(string userId, string period = "Weekly")
        {
            try
            {
                _logger.LogInformation("GetPersonalStats called for user: {UserId}, period: {Period}", userId, period);

                // Lấy dữ liệu ranking của user
                var personalRanking = await _context.XepHangs
                    .Include(x => x.User)
                    .Where(x => x.UserId == userId && x.ChuKy == period)
                    .FirstOrDefaultAsync();

                if (personalRanking == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy dữ liệu xếp hạng" });
                }

                // Lấy số lượng health logs trong period để tính số buổi tập
                var (startDate, endDate) = GetPeriodDates(period);
                var startDateOnly = DateOnly.FromDateTime(startDate);
                var endDateOnly = DateOnly.FromDateTime(endDate);
                var healthLogsCount = await _context.LuuTruSucKhoes
                    .Where(h => h.UserId == userId && 
                               h.NgayGhiNhan >= startDateOnly && 
                               h.NgayGhiNhan < endDateOnly)
                    .CountAsync();

                // Tính tổng thời gian (hours) từ health logs có GhiChu (nghĩa là đã tập)
                var totalTimeHours = await _context.LuuTruSucKhoes
                    .Where(h => h.UserId == userId && 
                               h.NgayGhiNhan >= startDateOnly && 
                               h.NgayGhiNhan < endDateOnly &&
                               h.GhiChu != null && h.GhiChu != "")
                    .CountAsync() * 0.5; // Mỗi log = 0.5 giờ (rough estimate)

                return Json(new 
                { 
                    success = true, 
                    data = new
                    {
                        Rank = personalRanking.ThuHang,
                        Points = personalRanking.TongDiem,
                        TotalHours = Math.Round(totalTimeHours, 1),
                        Sessions = healthLogsCount
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading personal stats");
                return Json(new { success = false, message = "Không thể tải thống kê cá nhân" });
            }
        }

        // API endpoint để lấy dữ liệu ranking
        [HttpGet("Ranking/GetLeaderboard")]
        public async Task<IActionResult> GetLeaderboard(string period = "Weekly")
        {
            try
            {
                _logger.LogInformation("GetLeaderboard called with period: {Period}", period);
                
                // Xác định khoảng thời gian
                var (startDate, endDate) = GetPeriodDates(period);
                
                var rankings = await _context.XepHangs
                    .Include(x => x.User)
                    .Where(x => x.ChuKy == period)
                    .OrderBy(x => x.ThuHang)
                    .Take(100)
                    .Select(x => new
                    {
                        x.XepHangId,
                        x.UserId,
                        Username = x.User != null ? x.User.Username : "Unknown",
                        HoTen = x.User != null ? x.User.HoTen : "Unknown",
                        AnhDaiDien = x.User != null ? x.User.AnhDaiDien : null,
                        x.TongDiem,
                        x.ThuHang,
                        x.ChuKy
                    })
                    .ToListAsync();

                _logger.LogInformation("Found {Count} rankings for period {Period}", rankings.Count, period);

                // Nếu không có dữ liệu, tạo sample data
                if (rankings.Count == 0)
                {
                    _logger.LogWarning("No data found, generating sample data");
                    var sampleData = await GenerateSampleRankings(period);
                    return Json(new { success = true, data = sampleData, period });
                }

                return Json(new { success = true, data = rankings, period });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading leaderboard");
                return Json(new { success = false, message = "Không thể tải dữ liệu xếp hạng" });
            }
        }

        // Helper method để xác định khoảng thời gian
        private (DateTime startDate, DateTime endDate) GetPeriodDates(string period)
        {
            var now = DateTime.Now;
            return period.ToLower() switch
            {
                "daily" => (now.Date, now.Date.AddDays(1)),
                "weekly" => (GetStartOfWeek(now), GetStartOfWeek(now).AddDays(7)),
                "monthly" => (new DateTime(now.Year, now.Month, 1), new DateTime(now.Year, now.Month, 1).AddMonths(1)),
                _ => (GetStartOfWeek(now), GetStartOfWeek(now).AddDays(7))
            };
        }

        private DateTime GetStartOfWeek(DateTime date)
        {
            var diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
            return date.AddDays(-1 * diff).Date;
        }

        // Generate sample rankings for demo
        private async Task<dynamic> GenerateSampleRankings(string period)
        {
            var users = await _context.Users
                .Where(u => u.Role == "Client")
                .Take(20)
                .ToListAsync();

            var random = new Random();
            var rankings = users.Select((user, index) => new
            {
                XepHangId = index + 1,
                UserId = user.UserId,
                Username = user.Username,
                HoTen = user.HoTen,
                AnhDaiDien = user.AnhDaiDien,
                TongDiem = random.Next(500, 5000),
                ThuHang = index + 1,
                ChuKy = period
            })
            .OrderByDescending(x => x.TongDiem)
            .Select((x, i) => new
            {
                x.XepHangId,
                x.UserId,
                x.Username,
                x.HoTen,
                x.AnhDaiDien,
                x.TongDiem,
                ThuHang = i + 1,
                x.ChuKy
            })
            .ToList();

            return rankings;
        }
    }
}

