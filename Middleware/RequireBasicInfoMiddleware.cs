using HealthWeb.Models.EF;
using Microsoft.EntityFrameworkCore;
using System.Linq;

namespace HealthWeb.Middleware;

public class RequireBasicInfoMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequireBasicInfoMiddleware> _logger;

    public RequireBasicInfoMiddleware(RequestDelegate next, ILogger<RequireBasicInfoMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, ApplicationDbContext dbContext)
    {
        // Bỏ qua static files (css, js, images, etc.)
        var path = context.Request.Path.Value?.ToLower() ?? "";
        
        // Kiểm tra các đường dẫn static files phổ biến
        if (path.StartsWith("/css/") || 
            path.StartsWith("/js/") || 
            path.StartsWith("/lib/") || 
            path.StartsWith("/images/") || 
            path.StartsWith("/img/") || 
            path.StartsWith("/assets/") ||
            path.StartsWith("/asset/") ||
            path.StartsWith("/favicon") ||
            path.StartsWith("/_content/") ||
            path.StartsWith("/_framework/"))
        {
            await _next(context);
            return;
        }
        
        // Bỏ qua các file có extension (css, js, png, jpg, etc.)
        if (path.Contains(".") && 
            (path.EndsWith(".css") || path.EndsWith(".js") || path.EndsWith(".png") || 
             path.EndsWith(".jpg") || path.EndsWith(".jpeg") || path.EndsWith(".gif") || 
             path.EndsWith(".svg") || path.EndsWith(".ico") || path.EndsWith(".woff") || 
             path.EndsWith(".woff2") || path.EndsWith(".ttf") || path.EndsWith(".eot")))
        {
            await _next(context);
            return;
        }

        // Chỉ kiểm tra nếu user đã đăng nhập
        var isAuthenticated = context.User?.Identity?.IsAuthenticated == true;
        var userId = context.Session.GetString("UserId");

        // Nếu chưa đăng nhập, bỏ qua
        if (!isAuthenticated && string.IsNullOrEmpty(userId))
        {
            await _next(context);
            return;
        }

        // Lấy userId từ session hoặc claims
        if (string.IsNullOrEmpty(userId) && isAuthenticated)
        {
            userId = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        }

        // Nếu vẫn không có userId, bỏ qua
        if (string.IsNullOrEmpty(userId))
        {
            await _next(context);
            return;
        }

        // Danh sách các route được phép truy cập mà không cần thông tin cơ bản
        var allowedPaths = new[]
        {
            "/account/setupprofile",
            "/account/logout",
            "/account/logoutget",
            "/account/login",
            "/account/register",
            "/account/forgotpassword",
            "/home/error"
        };

        // Nếu đang ở các route được phép, bỏ qua
        if (allowedPaths.Any(allowedPath => path.StartsWith(allowedPath)))
        {
            await _next(context);
            return;
        }

        // Kiểm tra xem user đã có thông tin cơ bản chưa
        try
        {
            var hasBasicInfo = await dbContext.LuuTruSucKhoes
                .AnyAsync(l => l.UserId == userId && l.ChieuCao.HasValue && l.CanNang.HasValue);

            if (!hasBasicInfo)
            {
                // Chưa có thông tin cơ bản, redirect đến SetupProfile
                context.Response.Redirect("/Account/SetupProfile");
                return;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi kiểm tra thông tin cơ bản trong middleware");
            // Nếu có lỗi, cho phép tiếp tục để tránh block user
        }

        await _next(context);
    }
}

