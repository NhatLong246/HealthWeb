using Microsoft.EntityFrameworkCore;
using HealthWeb.Models.EF;

namespace HealthWeb.Services
{
    public interface IRankingService
    {
        Task<(int rank, int points, int sessions, double totalMinutes)> GetPersonalStatsAsync(string userId, string period);
        Task<List<dynamic>> GetLeaderboardAsync(string period);
    }

    public class RankingService : IRankingService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<RankingService> _logger;

        public RankingService(ApplicationDbContext context, ILogger<RankingService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<(int rank, int points, int sessions, double totalMinutes)> GetPersonalStatsAsync(string userId, string period)
        {
            int rank = 0;
            int points = 0;
            int sessionsCount = 0;
            double totalMinutes = 0.0;

            // Xử lý period "All" - tổng hợp từ tất cả các chu kỳ
            if (period.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                // Tính tổng điểm từ tất cả các chu kỳ
                points = await _context.XepHangs
                    .Where(x => x.UserId == userId && x.TongDiem != null)
                    .SumAsync(x => x.TongDiem ?? 0);

                // Tính rank dựa trên tổng điểm so với tất cả users
                var allUserPoints = await _context.XepHangs
                    .Where(x => x.TongDiem != null)
                    .GroupBy(x => x.UserId)
                    .Select(g => new { UserId = g.Key, TotalPoints = g.Sum(x => x.TongDiem ?? 0) })
                    .OrderByDescending(x => x.TotalPoints)
                    .ToListAsync();
                
                var userRankIndex = allUserPoints.Select((x, index) => new { x.UserId, Index = index })
                    .FirstOrDefault(x => x.UserId == userId);
                rank = userRankIndex != null ? userRankIndex.Index + 1 : 0;

                // Lấy tất cả dữ liệu (không filter theo thời gian)
                sessionsCount = await _context.LuuTruSucKhoes
                    .Where(h => h.UserId == userId && 
                               h.GhiChu != null && h.GhiChu != "")
                    .Select(h => h.NgayGhiNhan)
                    .Distinct()
                    .CountAsync();

                totalMinutes = await _context.NhatKyHoanThanhBaiTaps
                    .Where(n => n.UserId == userId && n.ThoiLuongThucTePhut != null)
                    .SumAsync(n => (double?)n.ThoiLuongThucTePhut) ?? 0.0;

                if (totalMinutes == 0)
                {
                    var estimatedSessions = await _context.LuuTruSucKhoes
                        .Where(h => h.UserId == userId && 
                                   h.GhiChu != null && h.GhiChu != "")
                        .CountAsync();
                    totalMinutes = estimatedSessions * 30.0;
                }
            }
            else
            {
                // Xử lý các chu kỳ cụ thể (Daily, Weekly, Monthly)
                var (startDate, endDate) = GetPeriodDates(period);
                var startDateOnly = DateOnly.FromDateTime(startDate);
                var endDateOnly = DateOnly.FromDateTime(endDate);
                
                // Lấy ranking cho chu kỳ hiện tại (khớp với ngày tháng)
                var personalRanking = await _context.XepHangs
                    .Include(x => x.User)
                    .Where(x => x.UserId == userId && 
                               x.ChuKy == period &&
                               x.NgayBatDauChuKy != null &&
                               x.NgayKetThucChuKy != null &&
                               x.NgayBatDauChuKy <= endDateOnly &&
                               x.NgayKetThucChuKy >= startDateOnly)
                    .OrderByDescending(x => x.NgayCapNhat) // Lấy bản ghi mới nhất nếu có nhiều
                    .FirstOrDefaultAsync();

                if (personalRanking != null)
                {
                    rank = personalRanking.ThuHang ?? 0;
                    points = personalRanking.TongDiem ?? 0;
                }
                else
                {
                    // Nếu không tìm thấy ranking cho chu kỳ hiện tại, thử tìm bất kỳ ranking nào của chu kỳ này
                    var anyRanking = await _context.XepHangs
                        .Where(x => x.UserId == userId && x.ChuKy == period)
                        .OrderByDescending(x => x.NgayCapNhat)
                        .FirstOrDefaultAsync();
                    
                    if (anyRanking != null)
                    {
                        rank = anyRanking.ThuHang ?? 0;
                        points = anyRanking.TongDiem ?? 0;
                    }
                }
                
                sessionsCount = await _context.LuuTruSucKhoes
                    .Where(h => h.UserId == userId && 
                               h.NgayGhiNhan >= startDateOnly && 
                               h.NgayGhiNhan < endDateOnly &&
                               h.GhiChu != null && h.GhiChu != "")
                    .Select(h => h.NgayGhiNhan)
                    .Distinct()
                    .CountAsync();

                totalMinutes = await _context.NhatKyHoanThanhBaiTaps
                    .Where(n => n.UserId == userId && 
                               n.NgayHoanThanh >= startDateOnly && 
                               n.NgayHoanThanh < endDateOnly &&
                               n.ThoiLuongThucTePhut != null)
                    .SumAsync(n => (double?)n.ThoiLuongThucTePhut) ?? 0.0;

                if (totalMinutes == 0)
                {
                    var estimatedSessions = await _context.LuuTruSucKhoes
                        .Where(h => h.UserId == userId && 
                                   h.NgayGhiNhan >= startDateOnly && 
                                   h.NgayGhiNhan < endDateOnly &&
                                   h.GhiChu != null && h.GhiChu != "")
                        .CountAsync();
                    totalMinutes = estimatedSessions * 30.0;
                }
            }

            return (rank, points, sessionsCount, totalMinutes);
        }

        public async Task<List<dynamic>> GetLeaderboardAsync(string period)
        {
            List<dynamic> rankings;

            // Nếu period là "All", tổng hợp điểm từ tất cả các chu kỳ
            if (period.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                var allRankings = await _context.XepHangs
                    .Include(x => x.User)
                    .Where(x => x.User != null && x.TongDiem != null)
                    .GroupBy(x => x.UserId)
                    .Select(g => new
                    {
                        UserId = g.Key,
                        User = g.First().User,
                        TongDiem = g.Sum(x => x.TongDiem ?? 0),
                        Username = g.First().User != null ? g.First().User.Username : "Unknown",
                        HoTen = g.First().User != null ? g.First().User.HoTen : "Unknown",
                        AnhDaiDien = g.First().User != null ? g.First().User.AnhDaiDien : null
                    })
                    .OrderByDescending(x => x.TongDiem)
                    .Take(100)
                    .ToListAsync();

                rankings = allRankings
                    .Select((x, index) => new
                    {
                        XepHangId = index + 1,
                        x.UserId,
                        x.Username,
                        x.HoTen,
                        x.AnhDaiDien,
                        TongDiem = x.TongDiem,
                        ThuHang = index + 1,
                        ChuKy = "All"
                    } as dynamic)
                    .ToList<dynamic>();
            }
            else
            {
                var (startDate, endDate) = GetPeriodDates(period);
                var startDateOnly = DateOnly.FromDateTime(startDate);
                var endDateOnly = DateOnly.FromDateTime(endDate);
                
                // Lọc ranking theo chu kỳ và ngày tháng hiện tại
                var periodRankings = await _context.XepHangs
                    .Include(x => x.User)
                    .Where(x => x.ChuKy == period &&
                               x.NgayBatDauChuKy != null &&
                               x.NgayKetThucChuKy != null &&
                               x.NgayBatDauChuKy <= endDateOnly &&
                               x.NgayKetThucChuKy >= startDateOnly &&
                               x.User != null)
                    .OrderBy(x => x.ThuHang ?? int.MaxValue)
                    .ThenByDescending(x => x.TongDiem ?? 0)
                    .ThenByDescending(x => x.NgayCapNhat) // Ưu tiên bản ghi mới nhất
                    .Take(100)
                    .Select(x => new
                    {
                        x.XepHangId,
                        x.UserId,
                        Username = x.User != null ? x.User.Username : "Unknown",
                        HoTen = x.User != null ? x.User.HoTen : "Unknown",
                        AnhDaiDien = x.User != null ? x.User.AnhDaiDien : null,
                        TongDiem = x.TongDiem ?? 0,
                        ThuHang = x.ThuHang ?? 0,
                        ChuKy = x.ChuKy ?? period
                    })
                    .ToListAsync();
                
                // Nếu không có ranking cho chu kỳ hiện tại, lấy ranking gần nhất
                if (!periodRankings.Any())
                {
                    periodRankings = await _context.XepHangs
                        .Include(x => x.User)
                        .Where(x => x.ChuKy == period && x.User != null)
                        .OrderByDescending(x => x.NgayCapNhat)
                        .ThenBy(x => x.ThuHang ?? int.MaxValue)
                        .ThenByDescending(x => x.TongDiem ?? 0)
                        .Take(100)
                        .Select(x => new
                        {
                            x.XepHangId,
                            x.UserId,
                            Username = x.User != null ? x.User.Username : "Unknown",
                            HoTen = x.User != null ? x.User.HoTen : "Unknown",
                            AnhDaiDien = x.User != null ? x.User.AnhDaiDien : null,
                            TongDiem = x.TongDiem ?? 0,
                            ThuHang = x.ThuHang ?? 0,
                            ChuKy = x.ChuKy ?? period
                        })
                        .ToListAsync();
                }
                
                rankings = periodRankings.Cast<dynamic>().ToList();
            }

            return rankings;
        }

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
    }
}

