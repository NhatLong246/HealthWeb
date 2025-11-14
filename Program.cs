using System;
using HealthWeb.Models.EF;
using HealthWeb.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? builder.Configuration.GetConnectionString("HealthTracker")
    ?? throw new InvalidOperationException("No database connection string configured.");

// Add DbContext with connection retry and error handling
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseSqlServer(connectionString, sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorNumbersToAdd: null);
        sqlOptions.CommandTimeout(60);
    });
    
    // Enable sensitive data logging in development
    if (builder.Environment.IsDevelopment())
    {
        options.EnableSensitiveDataLogging();
        options.EnableDetailedErrors();
    }
});
builder.Services.AddScoped<IUserAdminService, UserAdminService>();
builder.Services.AddScoped<INutritionAdminService, NutritionAdminService>();
builder.Services.AddScoped<IExerciseAdminService, ExerciseAdminService>();
builder.Services.AddScoped<ITransactionAdminService, TransactionAdminService>();
builder.Services.AddScoped<IPTAdminService, PTAdminService>();
builder.Services.AddScoped<IStatisticsService, StatisticsService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseRouting();

app.UseAuthorization();

app.MapStaticAssets();

app.MapControllers();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}")
    .WithStaticAssets();


app.Run();
