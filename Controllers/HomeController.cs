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

        if (isAuthenticated && !string.IsNullOrEmpty(userId))
        {
            // Kiểm tra xem user đã có thông tin cơ bản chưa
            var hasBasicInfo = await _context.LuuTruSucKhoes
                .AnyAsync(l => l.UserId == userId && l.ChieuCao.HasValue && l.CanNang.HasValue);

            // Truyền thông tin vào View để hiển thị thông báo nếu cần
            ViewData["HasBasicInfo"] = hasBasicInfo;
            ViewData["ShowSetupPrompt"] = !hasBasicInfo;
            ViewData["IsAuthenticated"] = true;
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
