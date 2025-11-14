using Microsoft.AspNetCore.Mvc;
using HealthWeb.Services;

namespace HealthWeb.Controllers
{
    public class RankingController : Controller
    {
        private readonly IRankingService _rankingService;
        private readonly ILogger<RankingController> _logger;

        public RankingController(IRankingService rankingService, ILogger<RankingController> logger)
        {
            _rankingService = rankingService;
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
        public async Task<IActionResult> GetPersonalStats(string userId, string period = "All")
        {
            try
            {
                _logger.LogInformation("GetPersonalStats called for user: {UserId}, period: {Period}", userId, period);

                var (rank, points, sessionsCount, totalMinutes) = await _rankingService.GetPersonalStatsAsync(userId, period);

                var totalHours = Math.Round(totalMinutes / 60.0, 1);
                var totalMinutesInt = (int)Math.Round(totalMinutes);

                return Json(new 
                { 
                    success = true, 
                    data = new
                    {
                        Rank = rank,
                        Points = points,
                        TotalHours = totalHours,
                        TotalMinutes = totalMinutesInt,
                        Sessions = sessionsCount
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
        public async Task<IActionResult> GetLeaderboard(string period = "All")
        {
            try
            {
                _logger.LogInformation("GetLeaderboard called with period: {Period}", period);
                
                var rankings = await _rankingService.GetLeaderboardAsync(period);

                _logger.LogInformation("Found {Count} rankings for period {Period}", rankings.Count, period);

                return Json(new { success = true, data = rankings, period });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading leaderboard");
                return Json(new { success = false, message = "Không thể tải dữ liệu xếp hạng" });
            }
        }

    }
}

