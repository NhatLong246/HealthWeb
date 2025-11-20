using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HealthWeb.Models.Entities;
using HealthWeb.Models.EF;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Data.SqlClient;
using HealthWeb.Helpers;

namespace HealthWeb.Controllers
{
    public class AddMealRequest
    {
        public string MonAnId { get; set; } = null!;
        public double LuongThucAn { get; set; }
        public string? GhiChu { get; set; }
        public DateTime? NgayGhiLog { get; set; }
    }

    public class RemoveMealRequest
    {
        public string DinhDuongId { get; set; } = null!;
    }
    public class DinhDuongController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<DinhDuongController> _logger;

        public DinhDuongController(ApplicationDbContext context, ILogger<DinhDuongController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: /DinhDuong
        [HttpGet("DinhDuong")]
        public async Task<IActionResult> Index(DateTime? selectedDate = null)
        {
            var userId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(userId))
            {
                ViewData["RequireLogin"] = true;
                ViewData["LoginMessage"] = "Vui lòng đăng nhập để sử dụng tính năng này.";
                return View("DinhDuong");
            }

            // Mặc định là ngày hôm nay
            var date = selectedDate?.Date ?? DateTime.Today;
            var dateOnly = DateOnly.FromDateTime(date);

            // Lấy nhật ký dinh dưỡng của ngày được chọn
            var nhatKyDinhDuong = await _context.NhatKyDinhDuongs
                .Include(n => n.MonAn)
                .Where(n => n.UserId == userId && n.NgayGhiLog == dateOnly)
                .OrderBy(n => n.GhiChu)
                .ToListAsync();

            // Tính tổng calo, protein, carbs, chất béo
            var tongCalo = nhatKyDinhDuong.Sum(n => NutritionCalculationHelper.CalculateNutritionValue(n.MonAn?.LuongCalo, n.LuongThucAn, n.MonAn?.DonViTinh));
            var tongProtein = nhatKyDinhDuong.Sum(n => NutritionCalculationHelper.CalculateNutritionValue(n.MonAn?.Protein, n.LuongThucAn, n.MonAn?.DonViTinh));
            var tongCarbs = nhatKyDinhDuong.Sum(n => NutritionCalculationHelper.CalculateNutritionValue(n.MonAn?.Carbohydrate, n.LuongThucAn, n.MonAn?.DonViTinh));
            var tongChatBeo = nhatKyDinhDuong.Sum(n => NutritionCalculationHelper.CalculateNutritionValue(n.MonAn?.ChatBeo, n.LuongThucAn, n.MonAn?.DonViTinh));

            // Lấy kế hoạch ăn uống được phân công cho user
            var keHoachAnUong = await _context.PhanCongKeHoachAnUongs
                .Include(p => p.KeHoachAnUong)
                .Where(p => p.UserId == userId)
                .Select(p => p.KeHoachAnUong)
                .FirstOrDefaultAsync();

            // Lấy danh sách món ăn phổ biến
            var monAnPhoBien = await _context.DinhDuongMonAns
                .OrderByDescending(m => m.NhatKyDinhDuongs.Count)
                .Take(20)
                .ToListAsync();

            // Lấy dữ liệu 7 ngày gần nhất để vẽ biểu đồ
            var startDate = dateOnly.AddDays(-6);
            var nhatKy7NgayData = await _context.NhatKyDinhDuongs
                .Include(n => n.MonAn)
                .Where(n => n.UserId == userId && n.NgayGhiLog >= startDate && n.NgayGhiLog <= dateOnly)
                .ToListAsync();
            
            var nhatKy7Ngay = nhatKy7NgayData
                .GroupBy(n => n.NgayGhiLog)
                .Select(g => new
                {
                    Ngay = g.Key,
                    TongCalo = g.Sum(n => NutritionCalculationHelper.CalculateNutritionValue(n.MonAn?.LuongCalo, n.LuongThucAn, n.MonAn?.DonViTinh))
                })
                .OrderBy(x => x.Ngay)
                .ToList();

            // Tính tổng calo tuần này
            var startOfWeek = dateOnly.AddDays(-(int)dateOnly.DayOfWeek + 1);
            var endOfWeek = startOfWeek.AddDays(6);
            var nhatKyDinhDuongTuan = await _context.NhatKyDinhDuongs
                .Include(n => n.MonAn)
                .Where(n => n.UserId == userId && n.NgayGhiLog >= startOfWeek && n.NgayGhiLog <= endOfWeek)
                .ToListAsync();
            var tongCaloTuan = nhatKyDinhDuongTuan.Sum(n => NutritionCalculationHelper.CalculateNutritionValue(n.MonAn?.LuongCalo, n.LuongThucAn, n.MonAn?.DonViTinh));

            // Tính tổng calo tháng này
            var startOfMonth = new DateOnly(dateOnly.Year, dateOnly.Month, 1);
            var endOfMonth = startOfMonth.AddMonths(1).AddDays(-1);
            var nhatKyDinhDuongThang = await _context.NhatKyDinhDuongs
                .Include(n => n.MonAn)
                .Where(n => n.UserId == userId && n.NgayGhiLog >= startOfMonth && n.NgayGhiLog <= endOfMonth)
                .ToListAsync();
            var tongCaloThang = nhatKyDinhDuongThang.Sum(n => NutritionCalculationHelper.CalculateNutritionValue(n.MonAn?.LuongCalo, n.LuongThucAn, n.MonAn?.DonViTinh));

            // Lấy lịch sử 7 ngày gần nhất
            var lichSu7Ngay = await _context.NhatKyDinhDuongs
                .Include(n => n.MonAn)
                .Where(n => n.UserId == userId && n.NgayGhiLog >= startDate && n.NgayGhiLog <= dateOnly)
                .OrderByDescending(n => n.NgayGhiLog)
                .ThenBy(n => n.GhiChu)
                .Take(30)
                .ToListAsync();

            ViewData["SelectedDate"] = date;
            ViewData["NhatKyDinhDuong"] = nhatKyDinhDuong;
            ViewData["TongCalo"] = tongCalo;
            ViewData["TongProtein"] = tongProtein;
            ViewData["TongCarbs"] = tongCarbs;
            ViewData["TongChatBeo"] = tongChatBeo;
            ViewData["KeHoachAnUong"] = keHoachAnUong;
            ViewData["MonAnPhoBien"] = monAnPhoBien;
            ViewData["NhatKy7Ngay"] = nhatKy7Ngay;
            ViewData["TongCaloTuan"] = tongCaloTuan;
            ViewData["TongCaloThang"] = tongCaloThang;
            ViewData["LichSu7Ngay"] = lichSu7Ngay;

            return View("DinhDuong");
        }

        // API: Lấy danh sách món ăn
        [HttpGet("DinhDuong/GetMonAn")]
        public async Task<IActionResult> GetMonAn(string search = "")
        {
            var query = _context.DinhDuongMonAns.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(m => m.TenMonAn != null && m.TenMonAn.Contains(search));
            }

            var monAn = await query
                .OrderBy(m => m.TenMonAn)
                .Take(100)
                .Select(m => new
                {
                    monAnId = m.MonAnId,
                    tenMonAn = m.TenMonAn,
                    donViTinh = m.DonViTinh,
                    hinhAnh = m.HinhAnh,
                    luongCalo = m.LuongCalo,
                    protein = m.Protein,
                    chatBeo = m.ChatBeo,
                    carbohydrate = m.Carbohydrate
                })
                .ToListAsync();

            return Json(new { success = true, data = monAn });
        }

        // API: Thêm món ăn vào nhật ký
        [HttpPost("DinhDuong/AddToNhatKy")]
        public async Task<IActionResult> AddToNhatKy([FromBody] AddMealRequest request)
        {
            try
            {
                var userId = HttpContext.Session.GetString("UserId");
                if (string.IsNullOrEmpty(userId))
                {
                    return Json(new { success = false, message = "Vui lòng đăng nhập" });
                }

                if (request == null || string.IsNullOrEmpty(request.MonAnId))
                {
                    return Json(new { success = false, message = "Dữ liệu không hợp lệ" });
                }

                // Kiểm tra món ăn có tồn tại không
                var monAn = await _context.DinhDuongMonAns
                    .FirstOrDefaultAsync(m => m.MonAnId == request.MonAnId);
                
                if (monAn == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy món ăn" });
                }

                var date = request.NgayGhiLog?.Date ?? DateTime.Today;
                var dateOnly = DateOnly.FromDateTime(date);

                // Tạo ID cho nhật ký mới - format: nut_ + 8 ký tự GUID (tổng 12 ký tự, < 20)
                // Đơn giản hóa để tránh conflict và đảm bảo độ dài hợp lệ
                string dinhDuongId;
                int attempts = 0;
                const int maxAttempts = 20;
                
                do
                {
                    // Sử dụng GUID ngắn gọn: nut_ + 8 ký tự hex từ GUID
                    var guidPart = Guid.NewGuid().ToString("N").Substring(0, 8);
                    dinhDuongId = $"nut_{guidPart}";
                    
                    attempts++;
                    if (attempts > maxAttempts)
                    {
                        _logger.LogError("Failed to generate unique DinhDuongId after {Attempts} attempts", maxAttempts);
                        return Json(new { success = false, message = "Không thể tạo ID duy nhất. Vui lòng thử lại." });
                    }
                } while (await _context.NhatKyDinhDuongs.AnyAsync(n => n.DinhDuongId == dinhDuongId));

                var nhatKy = new NhatKyDinhDuong
                {
                    DinhDuongId = dinhDuongId,
                    UserId = userId,
                    NgayGhiLog = dateOnly,
                    MonAnId = request.MonAnId,
                    LuongThucAn = request.LuongThucAn,
                    GhiChu = request.GhiChu ?? "Bữa ăn"
                };

                _context.NhatKyDinhDuongs.Add(nhatKy);
                
                try
                {
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Successfully added nutrition log: {DinhDuongId} for user {UserId}", dinhDuongId, userId);
                    return Json(new { success = true, message = "Đã thêm món ăn vào nhật ký" });
                }
                catch (DbUpdateException dbEx)
                {
                    _logger.LogError(dbEx, "Database error when saving nutrition log. ID: {DinhDuongId}", dinhDuongId);
                    
                    // Nếu lỗi do duplicate key, thử tạo ID mới
                    if (dbEx.InnerException?.Message?.Contains("PRIMARY KEY") == true || 
                        dbEx.InnerException?.Message?.Contains("duplicate key") == true)
                    {
                        // Retry với ID mới
                        var newGuidPart = Guid.NewGuid().ToString("N").Substring(0, 8);
                        nhatKy.DinhDuongId = $"nut_{newGuidPart}";
                        
                        try
                        {
                            await _context.SaveChangesAsync();
                            return Json(new { success = true, message = "Đã thêm món ăn vào nhật ký" });
                        }
                        catch (Exception retryEx)
                        {
                            _logger.LogError(retryEx, "Retry failed when saving nutrition log");
                            return Json(new { success = false, message = "Lỗi khi lưu dữ liệu. Vui lòng thử lại." });
                        }
                    }
                    
                    return Json(new { success = false, message = "Lỗi database: " + dbEx.Message });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding meal to nutrition log");
                return Json(new { success = false, message = $"Lỗi: {ex.Message}" });
            }
        }

        // API: Lấy dữ liệu dinh dưỡng theo ngày (JSON)
        [HttpGet("DinhDuong/GetNutritionData")]
        public async Task<IActionResult> GetNutritionData(DateTime? selectedDate = null)
        {
            var userId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Vui lòng đăng nhập" });
            }

            var date = selectedDate?.Date ?? DateTime.Today;
            var dateOnly = DateOnly.FromDateTime(date);

            // Lấy nhật ký dinh dưỡng của ngày được chọn
            var nhatKyDinhDuong = await _context.NhatKyDinhDuongs
                .Include(n => n.MonAn)
                .Where(n => n.UserId == userId && n.NgayGhiLog == dateOnly)
                .OrderBy(n => n.GhiChu)
                .Select(n => new
                {
                    dinhDuongId = n.DinhDuongId,
                    tenMonAn = n.MonAn.TenMonAn,
                    donViTinh = n.MonAn.DonViTinh,
                    luongThucAn = n.LuongThucAn,
                    ghiChu = n.GhiChu,
                    luongCalo = n.MonAn.LuongCalo ?? 0,
                    protein = n.MonAn.Protein ?? 0,
                    carbohydrate = n.MonAn.Carbohydrate ?? 0,
                    chatBeo = n.MonAn.ChatBeo ?? 0
                })
                .ToListAsync();

            // Tính tổng
            var tongCalo = nhatKyDinhDuong.Sum(n => NutritionCalculationHelper.CalculateNutritionValue(n.luongCalo, n.luongThucAn, n.donViTinh));
            var tongProtein = nhatKyDinhDuong.Sum(n => NutritionCalculationHelper.CalculateNutritionValue(n.protein, n.luongThucAn, n.donViTinh));
            var tongCarbs = nhatKyDinhDuong.Sum(n => NutritionCalculationHelper.CalculateNutritionValue(n.carbohydrate, n.luongThucAn, n.donViTinh));
            var tongChatBeo = nhatKyDinhDuong.Sum(n => NutritionCalculationHelper.CalculateNutritionValue(n.chatBeo, n.luongThucAn, n.donViTinh));

            return Json(new
            {
                success = true,
                data = new
                {
                    meals = nhatKyDinhDuong,
                    summary = new
                    {
                        tongCalo = Math.Round(tongCalo, 0),
                        tongProtein = Math.Round(tongProtein, 1),
                        tongCarbs = Math.Round(tongCarbs, 1),
                        tongChatBeo = Math.Round(tongChatBeo, 1)
                    }
                }
            });
        }

        // API: Xóa món ăn khỏi nhật ký
        [HttpPost("DinhDuong/RemoveFromNhatKy")]
        public async Task<IActionResult> RemoveFromNhatKy([FromBody] RemoveMealRequest request)
        {
            var userId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Vui lòng đăng nhập" });
            }

            if (request == null || string.IsNullOrEmpty(request.DinhDuongId))
            {
                return Json(new { success = false, message = "Dữ liệu không hợp lệ" });
            }

            var nhatKy = await _context.NhatKyDinhDuongs
                .FirstOrDefaultAsync(n => n.DinhDuongId == request.DinhDuongId && n.UserId == userId);

            if (nhatKy == null)
            {
                return Json(new { success = false, message = "Không tìm thấy món ăn" });
            }

            _context.NhatKyDinhDuongs.Remove(nhatKy);
            await _context.SaveChangesAsync();

            return Json(new { success = true, message = "Đã xóa món ăn khỏi nhật ký" });
        }
    }
}

