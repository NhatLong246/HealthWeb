using System;
using HealthWeb.Models.EF;
using Microsoft.AspNetCore.Authentication.Cookies;
using HealthWeb.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews()
    .AddJsonOptions(options =>
    {
        // Giữ nguyên PascalCase cho JSON (không convert sang camelCase)
        options.JsonSerializerOptions.PropertyNamingPolicy = null;
        options.JsonSerializerOptions.WriteIndented = false;
    });

// Add HttpClient for OpenAI API
builder.Services.AddHttpClient();

// Kết nối DB
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
);
builder.Services.AddControllersWithViews();
builder.Services.AddScoped<IUserAdminService, UserAdminService>();
builder.Services.AddScoped<INutritionAdminService, NutritionAdminService>();
builder.Services.AddScoped<IExerciseAdminService, ExerciseAdminService>();
builder.Services.AddScoped<ITransactionAdminService, TransactionAdminService>();
builder.Services.AddScoped<IPTAdminService, PTAdminService>();
builder.Services.AddScoped<IStatisticsService, StatisticsService>();

// ✅ Thêm Cookie Authentication
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Account/Login";
        options.LogoutPath = "/Account/Logout";
        options.AccessDeniedPath = "/Account/Denied";
        options.Cookie.Name = "HealthWeb.Auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;      // Lax cho dev (None chỉ dùng với HTTPS)
        options.Cookie.SecurePolicy = CookieSecurePolicy.None; // Cho phép HTTP trong lúc dev
        options.ExpireTimeSpan = TimeSpan.FromHours(1);
        options.SlidingExpiration = true;
    });

// ✅ Thêm Session
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.SameSite = SameSiteMode.Lax;  // Lax cho dev
    options.Cookie.SecurePolicy = CookieSecurePolicy.None;
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseRouting();

// ✅ Middleware thứ tự chính xác
app.UseAuthentication();
app.UseAuthorization();
app.UseSession();

// ✅ Middleware kiểm tra thông tin cơ bản (sau khi đã có session và auth)
app.UseMiddleware<HealthWeb.Middleware.RequireBasicInfoMiddleware>();

app.MapStaticAssets();

app.MapControllers();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}")
    .WithStaticAssets();

app.Run();
