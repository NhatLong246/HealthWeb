using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using HealthWeb.Models;
using Microsoft.AspNetCore.Authorization;
using HealthWeb.Models.EF;
using Microsoft.EntityFrameworkCore;

namespace HealthWeb.Controllers;

public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;
    private readonly ApplicationDbContext _context;

    public HomeController(ILogger<HomeController> logger, ApplicationDbContext context)
    {
        _logger = logger;
        _context = context;
    }

    public async Task<IActionResult> Index()
    {
        // Trang chủ có thể truy cập khi chưa đăng nhập
        // Chỉ kiểm tra thông tin cơ bản nếu user đã đăng nhập
        var userId = HttpContext.Session.GetString("UserId");
        var isAuthenticated = HttpContext.User?.Identity?.IsAuthenticated == true || !string.IsNullOrEmpty(userId);

        // Load theme từ database nếu user đã đăng nhập
        // Ưu tiên TempData (khi vừa lưu cài đặt), sau đó mới load từ database
        if (isAuthenticated && !string.IsNullOrEmpty(userId))
        {
            // Kiểm tra TempData trước (khi vừa lưu cài đặt)
            if (TempData["Theme"] != null)
            {
                ViewData["UserTheme"] = TempData["Theme"].ToString();
            }
            else
            {
                // Load từ database
                var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
                if (user != null && !string.IsNullOrEmpty(user.Theme))
                {
                    ViewData["UserTheme"] = user.Theme;
                }
            }
        }

        if (isAuthenticated && !string.IsNullOrEmpty(userId))
        {
            // Kiểm tra xem user đã có thông tin cơ bản chưa
            var hasBasicInfo = await _context.LuuTruSucKhoes
                .AnyAsync(l => l.UserId == userId && l.ChieuCao.HasValue && l.CanNang.HasValue);

            // Lấy dữ liệu sức khỏe hôm nay
            var today = DateOnly.FromDateTime(DateTime.Today);
            var healthToday = await _context.LuuTruSucKhoes
                .FirstOrDefaultAsync(l => l.UserId == userId && l.NgayGhiNhan == today);

            // Lấy mục tiêu của user
            var mucTieu = await _context.MucTieus
                .Where(m => m.UserId == userId)
                .OrderByDescending(m => m.NgayBatDau)
                .FirstOrDefaultAsync();

            // Lấy nhật ký dinh dưỡng hôm nay
            var nhatKyDinhDuongToday = await _context.NhatKyDinhDuongs
                .Include(n => n.MonAn)
                .Where(n => n.UserId == userId && n.NgayGhiLog == today)
                .ToListAsync();

            var tongCalo = nhatKyDinhDuongToday.Sum(n => HealthWeb.Helpers.NutritionCalculationHelper.CalculateNutritionValue(n.MonAn?.LuongCalo, n.LuongThucAn, n.MonAn?.DonViTinh));

            // Truyền thông tin vào View
            ViewData["HasBasicInfo"] = hasBasicInfo;
            ViewData["ShowSetupPrompt"] = !hasBasicInfo;
            ViewData["IsAuthenticated"] = true;
            ViewData["HealthToday"] = healthToday;
            ViewData["MucTieu"] = mucTieu;
            ViewData["TongCalo"] = tongCalo;
        }
        else
        {
            ViewData["IsAuthenticated"] = false;
        }

        return View();
    }

    public IActionResult Privacy()
    {
        return View();
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
