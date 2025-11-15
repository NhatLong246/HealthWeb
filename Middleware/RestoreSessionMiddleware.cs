using HealthWeb.Models.EF;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HealthWeb.Middleware;

public class RestoreSessionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RestoreSessionMiddleware> _logger;

    public RestoreSessionMiddleware(RequestDelegate next, ILogger<RestoreSessionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, ApplicationDbContext dbContext)
    {
        // Bỏ qua static files
        var path = context.Request.Path.Value?.ToLower() ?? "";
        if (path.StartsWith("/css/") || 
            path.StartsWith("/js/") || 
            path.StartsWith("/lib/") || 
            path.StartsWith("/images/") || 
            path.StartsWith("/img/") || 
            path.StartsWith("/assets/") ||
            path.StartsWith("/asset/") ||
            path.StartsWith("/favicon") ||
            path.StartsWith("/_content/") ||
            path.StartsWith("/_framework/") ||
            (path.Contains(".") && (path.EndsWith(".css") || path.EndsWith(".js") || path.EndsWith(".png") || 
             path.EndsWith(".jpg") || path.EndsWith(".jpeg") || path.EndsWith(".gif") || 
             path.EndsWith(".svg") || path.EndsWith(".ico") || path.EndsWith(".woff") || 
             path.EndsWith(".woff2") || path.EndsWith(".ttf") || path.EndsWith(".eot"))))
        {
            await _next(context);
            return;
        }

        // Kiểm tra nếu có cookie authentication nhưng chưa có session
        var isAuthenticated = context.User?.Identity?.IsAuthenticated == true;
        var sessionUserId = context.Session.GetString("UserId");

        if (isAuthenticated && string.IsNullOrEmpty(sessionUserId))
        {
            // Có cookie authentication nhưng chưa có session -> restore session từ cookie
            try
            {
                var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var username = context.User.FindFirst(ClaimTypes.Name)?.Value;

                if (!string.IsNullOrEmpty(userId))
                {
                    // Lấy thông tin user từ database
                    var user = await dbContext.Users
                        .AsNoTracking()
                        .FirstOrDefaultAsync(u => u.UserId == userId);

                    if (user != null)
                    {
                        // Restore session
                        context.Session.SetString("UserId", user.UserId);
                        context.Session.SetString("Username", user.Username);
                        context.Session.SetString("HoTen", user.HoTen ?? user.Username);
                        
                        _logger.LogInformation("Restored session for user: {UserId}", userId);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error restoring session from cookie");
                // Không block request nếu có lỗi
            }
        }

        await _next(context);
    }
}

