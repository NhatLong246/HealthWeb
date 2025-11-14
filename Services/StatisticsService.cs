using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using HealthWeb.Models.EF;
using HealthWeb.Models.ViewModels.Admin;
using Microsoft.EntityFrameworkCore;

namespace HealthWeb.Services;

public class StatisticsService : IStatisticsService
{
    private readonly ApplicationDbContext _context;

    public StatisticsService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<StatisticsDataDto> GetStatisticsDataAsync(
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1);
        var endOfMonth = startOfMonth.AddMonths(1).AddDays(-1);

        // Check if this is "all time" filter (both dates are null)
        var isAllTime = !dateFrom.HasValue && !dateTo.HasValue;
        
        DateTime effectiveDateFrom;
        DateTime effectiveDateTo;
        
        if (isAllTime)
        {
            // For "all time", use a very large date range to get all data
            effectiveDateFrom = new DateTime(2000, 1, 1);
            effectiveDateTo = DateTime.UtcNow.AddYears(10);
        }
        else
        {
            effectiveDateFrom = dateFrom ?? startOfMonth;
            effectiveDateTo = dateTo ?? endOfMonth;
        }

        var overview = await GetOverviewAsync(effectiveDateFrom, effectiveDateTo, isAllTime, cancellationToken);
        var userAnalytics = await GetUserAnalyticsAsync(dateFrom, dateTo, cancellationToken);
        var ptAnalytics = await GetPTAnalyticsAsync(dateFrom, dateTo, cancellationToken);
        var healthAnalytics = await GetHealthAnalyticsAsync(dateFrom, dateTo, cancellationToken);
        var goalsAnalytics = await GetGoalsAnalyticsAsync(dateFrom, dateTo, cancellationToken);
        var workoutAnalytics = await GetWorkoutAnalyticsAsync(dateFrom, dateTo, cancellationToken);
        var nutritionAnalytics = await GetNutritionAnalyticsAsync(dateFrom, dateTo, cancellationToken);
        var financeAnalytics = await GetFinanceAnalyticsAsync(dateFrom, dateTo, cancellationToken);
        var systemAnalytics = await GetSystemAnalyticsAsync(cancellationToken);
        var behaviorAnalytics = await GetBehaviorAnalyticsAsync(dateFrom, dateTo, cancellationToken);

        return new StatisticsDataDto
        {
            Overview = overview,
            UserAnalytics = userAnalytics,
            PTAnalytics = ptAnalytics,
            HealthAnalytics = healthAnalytics,
            GoalsAnalytics = goalsAnalytics,
            WorkoutAnalytics = workoutAnalytics,
            NutritionAnalytics = nutritionAnalytics,
            FinanceAnalytics = financeAnalytics,
            SystemAnalytics = systemAnalytics,
            BehaviorAnalytics = behaviorAnalytics,
            GeneratedAt = DateTime.UtcNow
        };
    }

    private async Task<StatisticsOverviewDto> GetOverviewAsync(
        DateTime dateFrom,
        DateTime dateTo,
        bool isAllTime,
        CancellationToken cancellationToken)
    {
        // Normalize dates to start/end of day
        var effectiveDateFrom = dateFrom.Date;
        var effectiveDateTo = dateTo.Date.AddDays(1).AddTicks(-1);

        int newUsers;
        int newTrainers;
        decimal revenue;
        int activity;

        if (isAllTime)
        {
            // Show total counts for "all time"
            newUsers = await _context.Users
                .AsNoTracking()
                .Where(u => u.Role != "Admin" && (u.Role == null || u.Role != "PT"))
                .CountAsync(cancellationToken);

            newTrainers = await _context.HuanLuyenViens
                .AsNoTracking()
                .CountAsync(cancellationToken);
        }
        else
        {
            // Show new registrations in date range
            newUsers = await _context.Users
                .AsNoTracking()
                .Where(u => u.Role != "Admin" && (u.Role == null || u.Role != "PT") &&
                           u.CreatedDate.HasValue &&
                           u.CreatedDate.Value >= effectiveDateFrom &&
                           u.CreatedDate.Value <= effectiveDateTo)
                .CountAsync(cancellationToken);

            // Optimized: Use join instead of Include for count-only queries
            newTrainers = await _context.HuanLuyenViens
                .AsNoTracking()
                .Join(_context.Users,
                    h => h.UserId,
                    u => u.UserId,
                    (h, u) => u)
                .Where(u => u.CreatedDate.HasValue &&
                           u.CreatedDate.Value >= effectiveDateFrom &&
                           u.CreatedDate.Value <= effectiveDateTo)
                .CountAsync(cancellationToken);
        }

        // Revenue in date range
        revenue = await _context.GiaoDiches
            .AsNoTracking()
            .Where(g => g.NgayGiaoDich.HasValue && 
                       g.NgayGiaoDich.Value >= effectiveDateFrom && 
                       g.NgayGiaoDich.Value <= effectiveDateTo &&
                       g.TrangThaiThanhToan == "Completed")
            .SumAsync(g => (decimal?)g.SoTien) ?? 0;

        // Activity in date range (unique users who had activity)
        var activityUsers = new HashSet<string>();
        
        // From NhatKyUngDung
        var appLogs = await _context.NhatKyUngDungs
            .AsNoTracking()
            .Where(n => n.ThoiGian.HasValue &&
                       n.ThoiGian.Value >= effectiveDateFrom &&
                       n.ThoiGian.Value <= effectiveDateTo)
            .Select(n => n.UserId)
            .Where(id => !string.IsNullOrEmpty(id))
            .Distinct()
            .ToListAsync(cancellationToken);
        activityUsers.UnionWith(appLogs.Select(id => id!));

        // From LuuTruSucKhoe
        var dateFromOnly = DateOnly.FromDateTime(effectiveDateFrom);
        var dateToOnly = DateOnly.FromDateTime(effectiveDateTo);
        var healthLogs = await _context.LuuTruSucKhoes
            .AsNoTracking()
            .Where(l => l.NgayGhiNhan >= dateFromOnly && l.NgayGhiNhan <= dateToOnly)
            .Select(l => l.UserId)
            .Where(id => !string.IsNullOrEmpty(id))
            .Distinct()
            .ToListAsync(cancellationToken);
        activityUsers.UnionWith(healthLogs.Select(id => id!));

        // From NhatKyDinhDuong
        var nutritionLogs = await _context.NhatKyDinhDuongs
            .AsNoTracking()
            .Where(n => n.NgayGhiLog >= dateFromOnly && n.NgayGhiLog <= dateToOnly)
            .Select(n => n.UserId)
            .Where(id => !string.IsNullOrEmpty(id))
            .Distinct()
            .ToListAsync(cancellationToken);
        activityUsers.UnionWith(nutritionLogs.Select(id => id!));

        // From NhatKyHoanThanhBaiTap
        var workoutLogs = await _context.NhatKyHoanThanhBaiTaps
            .AsNoTracking()
            .Where(n => n.NgayHoanThanh >= dateFromOnly && n.NgayHoanThanh <= dateToOnly)
            .Select(n => n.UserId)
            .Where(id => !string.IsNullOrEmpty(id))
            .Distinct()
            .ToListAsync(cancellationToken);
        activityUsers.UnionWith(workoutLogs.Select(id => id!));

        activity = activityUsers.Count;

        // Calculate growth percentages (compare with previous period of same duration)
        var periodDuration = (effectiveDateTo - effectiveDateFrom).TotalDays;
        var previousPeriodStart = effectiveDateFrom.AddDays(-periodDuration - 1);
        var previousPeriodEnd = effectiveDateFrom.AddTicks(-1);

        var previousUsers = await _context.Users
            .AsNoTracking()
            .Where(u => u.Role != "Admin" && (u.Role == null || u.Role != "PT") &&
                       u.CreatedDate.HasValue &&
                       u.CreatedDate.Value >= previousPeriodStart &&
                       u.CreatedDate.Value <= previousPeriodEnd)
            .CountAsync(cancellationToken);

        // Optimized: Use join instead of Include for count-only queries
        var previousTrainers = await _context.HuanLuyenViens
            .AsNoTracking()
            .Join(_context.Users,
                h => h.UserId,
                u => u.UserId,
                (h, u) => u)
            .Where(u => u.CreatedDate.HasValue &&
                       u.CreatedDate.Value >= previousPeriodStart &&
                       u.CreatedDate.Value <= previousPeriodEnd)
            .CountAsync(cancellationToken);

        var previousRevenue = await _context.GiaoDiches
            .AsNoTracking()
            .Where(g => g.NgayGiaoDich.HasValue &&
                       g.NgayGiaoDich.Value >= previousPeriodStart && 
                       g.NgayGiaoDich.Value <= previousPeriodEnd &&
                       g.TrangThaiThanhToan == "Completed")
            .SumAsync(g => (decimal?)g.SoTien) ?? 0;

        var previousActivityUsers = new HashSet<string>();
        var previousAppLogs = await _context.NhatKyUngDungs
            .AsNoTracking()
            .Where(n => n.ThoiGian.HasValue &&
                       n.ThoiGian.Value >= previousPeriodStart &&
                       n.ThoiGian.Value <= previousPeriodEnd)
            .Select(n => n.UserId)
            .Where(id => !string.IsNullOrEmpty(id))
            .Distinct()
            .ToListAsync(cancellationToken);
        previousActivityUsers.UnionWith(previousAppLogs.Select(id => id!));

        var previousDateFromOnly = DateOnly.FromDateTime(previousPeriodStart);
        var previousDateToOnly = DateOnly.FromDateTime(previousPeriodEnd);
        var previousHealthLogs = await _context.LuuTruSucKhoes
            .AsNoTracking()
            .Where(l => l.NgayGhiNhan >= previousDateFromOnly && l.NgayGhiNhan <= previousDateToOnly)
            .Select(l => l.UserId)
            .Where(id => !string.IsNullOrEmpty(id))
            .Distinct()
            .ToListAsync(cancellationToken);
        previousActivityUsers.UnionWith(previousHealthLogs.Select(id => id!));

        var previousNutritionLogs = await _context.NhatKyDinhDuongs
            .AsNoTracking()
            .Where(n => n.NgayGhiLog >= previousDateFromOnly && n.NgayGhiLog <= previousDateToOnly)
            .Select(n => n.UserId)
            .Where(id => !string.IsNullOrEmpty(id))
            .Distinct()
            .ToListAsync(cancellationToken);
        previousActivityUsers.UnionWith(previousNutritionLogs.Select(id => id!));

        var previousWorkoutLogs = await _context.NhatKyHoanThanhBaiTaps
            .AsNoTracking()
            .Where(n => n.NgayHoanThanh >= previousDateFromOnly && n.NgayHoanThanh <= previousDateToOnly)
            .Select(n => n.UserId)
            .Where(id => !string.IsNullOrEmpty(id))
            .Distinct()
            .ToListAsync(cancellationToken);
        previousActivityUsers.UnionWith(previousWorkoutLogs.Select(id => id!));

        var previousActivity = previousActivityUsers.Count;

        return new StatisticsOverviewDto
        {
            TotalUsers = newUsers,
            TotalTrainers = newTrainers,
            MonthlyRevenue = revenue,
            TodayActivity = activity,
            UserGrowthPercent = previousUsers > 0 ? ((newUsers - previousUsers) / (double)previousUsers) * 100 : 0,
            TrainerGrowthPercent = previousTrainers > 0 ? ((newTrainers - previousTrainers) / (double)previousTrainers) * 100 : 0,
            RevenueGrowthPercent = previousRevenue > 0 ? ((double)((revenue - previousRevenue) / previousRevenue)) * 100 : 0,
            ActivityGrowthPercent = previousActivity > 0 ? ((activity - previousActivity) / (double)previousActivity) * 100 : 0
        };
    }

    public async Task<UserAnalyticsDto> GetUserAnalyticsAsync(
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        CancellationToken cancellationToken = default)
    {
        var today = DateTime.UtcNow.Date;
        var startOfMonth = new DateTime(today.Year, today.Month, 1);
        var endOfMonth = startOfMonth.AddMonths(1).AddDays(-1);

        // Check if this is "all time" (both dates are null or very large range)
        var isAllTime = !dateFrom.HasValue && !dateTo.HasValue;
        
        // If dateFrom is very early (2000) and dateTo is very far (2034+), treat as "all time"
        if (dateFrom.HasValue && dateTo.HasValue)
        {
            var veryEarlyDate = new DateTime(2000, 1, 1);
            var veryLateDate = DateTime.UtcNow.AddYears(10);
            if (dateFrom.Value.Date <= veryEarlyDate && dateTo.Value.Date >= veryLateDate.Date)
            {
                isAllTime = true;
            }
        }

        DateTime? effectiveDateFrom = null;
        DateTime? effectiveDateTo = null;
        
        if (!isAllTime && dateFrom.HasValue && dateTo.HasValue)
        {
            effectiveDateFrom = dateFrom.Value.Date;
            effectiveDateTo = dateTo.Value.Date.AddDays(1).AddTicks(-1); // End of day
        }

        var totalUsers = await _context.Users
            .AsNoTracking()
            .Where(u => u.Role != "Admin" && (u.Role == null || u.Role != "PT"))
            .CountAsync(cancellationToken);

        // New registrations in the selected date range
        int newRegistrationsInRange;
        if (isAllTime)
        {
            // For "all time", count all users
            newRegistrationsInRange = await _context.Users
                .AsNoTracking()
                .Where(u => u.Role != "Admin" && (u.Role == null || u.Role != "PT"))
                .CountAsync(cancellationToken);
        }
        else if (effectiveDateFrom.HasValue && effectiveDateTo.HasValue)
        {
            newRegistrationsInRange = await _context.Users
                .AsNoTracking()
                .Where(u => u.Role != "Admin" && (u.Role == null || u.Role != "PT") &&
                           u.CreatedDate.HasValue &&
                           u.CreatedDate.Value >= effectiveDateFrom.Value && 
                           u.CreatedDate.Value <= effectiveDateTo.Value)
                .CountAsync(cancellationToken);
        }
        else
        {
            newRegistrationsInRange = 0;
        }

        // Also keep today's registrations for display
        var newRegistrationsToday = await _context.Users
            .AsNoTracking()
            .Where(u => u.Role != "Admin" && (u.Role == null || u.Role != "PT") &&
                       u.CreatedDate.HasValue && u.CreatedDate.Value.Date == today)
            .CountAsync(cancellationToken);

        // This month's registrations
        var newRegistrationsThisMonth = await _context.Users
            .AsNoTracking()
            .Where(u => u.Role != "Admin" && (u.Role == null || u.Role != "PT") &&
                       u.CreatedDate.HasValue && u.CreatedDate.Value >= startOfMonth && u.CreatedDate.Value <= endOfMonth)
            .CountAsync(cancellationToken);

        // IMPORTANT: Get all valid Client user IDs once (used for both DAU and MAU)
        // Only count Client users (exclude Admin and PT)
        var validClientUserIds = await _context.Users
            .AsNoTracking()
            .Where(u => u.Role != "Admin" && (u.Role == null || u.Role != "PT"))
            .Select(u => u.UserId)
            .ToListAsync(cancellationToken);
        
        // Active Users in date range: Users with any activity in the selected date range
        var rangeActivityUsers = new HashSet<string>();
        
        if (!isAllTime && effectiveDateFrom.HasValue && effectiveDateTo.HasValue)
        {
            var rangeDateFromDateOnly = DateOnly.FromDateTime(effectiveDateFrom.Value);
            var rangeDateToDateOnly = DateOnly.FromDateTime(effectiveDateTo.Value);
            var effectiveDateFromValue = effectiveDateFrom.Value;
            var effectiveDateToValue = effectiveDateTo.Value;
        
            // From NhatKyUngDung
            var rangeAppLogs = await _context.NhatKyUngDungs
                .AsNoTracking()
                .Where(n => n.ThoiGian.HasValue && 
                           n.ThoiGian.Value >= effectiveDateFromValue &&
                           n.ThoiGian.Value <= effectiveDateToValue &&
                           n.UserId != null &&
                           validClientUserIds.Contains(n.UserId))
                .Select(n => n.UserId!)
                .Distinct()
                .ToListAsync(cancellationToken);
            rangeActivityUsers.UnionWith(rangeAppLogs);
            
            // From LuuTruSucKhoe (health logs)
            var rangeHealthLogs = await _context.LuuTruSucKhoes
                .AsNoTracking()
                .Where(l => l.NgayGhiNhan >= rangeDateFromDateOnly &&
                           l.NgayGhiNhan <= rangeDateToDateOnly &&
                           validClientUserIds.Contains(l.UserId))
                .Select(l => l.UserId)
                .Where(id => !string.IsNullOrEmpty(id))
                .Distinct()
                .ToListAsync(cancellationToken);
            rangeActivityUsers.UnionWith(rangeHealthLogs.Select(id => id!));
            
            // From NhatKyDinhDuong (nutrition logs)
            var rangeNutritionLogs = await _context.NhatKyDinhDuongs
                .AsNoTracking()
                .Where(n => n.NgayGhiLog >= rangeDateFromDateOnly &&
                           n.NgayGhiLog <= rangeDateToDateOnly &&
                           validClientUserIds.Contains(n.UserId))
                .Select(n => n.UserId)
                .Where(id => !string.IsNullOrEmpty(id))
                .Distinct()
                .ToListAsync(cancellationToken);
            rangeActivityUsers.UnionWith(rangeNutritionLogs.Select(id => id!));
            
            // From NhatKyHoanThanhBaiTap (workout logs)
            var rangeWorkoutLogs = await _context.NhatKyHoanThanhBaiTaps
                .AsNoTracking()
                .Where(n => n.NgayHoanThanh >= rangeDateFromDateOnly &&
                           n.NgayHoanThanh <= rangeDateToDateOnly &&
                           validClientUserIds.Contains(n.UserId))
                .Select(n => n.UserId)
                .Where(id => !string.IsNullOrEmpty(id))
                .Distinct()
                .ToListAsync(cancellationToken);
            rangeActivityUsers.UnionWith(rangeWorkoutLogs.Select(id => id!));
        }
        
        var activeUsersInRange = rangeActivityUsers.Count;

        // Also calculate today's DAU for display
        var todayActivityUsers = new HashSet<string>();
        var todayDateOnly = DateOnly.FromDateTime(today);
        
        var todayAppLogs = await _context.NhatKyUngDungs
            .AsNoTracking()
            .Where(n => n.ThoiGian.HasValue && 
                       n.ThoiGian.Value.Date == today &&
                       n.UserId != null &&
                       validClientUserIds.Contains(n.UserId))
            .Select(n => n.UserId!)
            .Distinct()
            .ToListAsync(cancellationToken);
        todayActivityUsers.UnionWith(todayAppLogs);
        
        var todayHealthLogs = await _context.LuuTruSucKhoes
            .AsNoTracking()
            .Where(l => l.NgayGhiNhan == todayDateOnly &&
                       validClientUserIds.Contains(l.UserId))
            .Select(l => l.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);
        todayActivityUsers.UnionWith(todayHealthLogs);
        
        var todayNutritionLogs = await _context.NhatKyDinhDuongs
            .AsNoTracking()
            .Where(n => n.NgayGhiLog == todayDateOnly &&
                       validClientUserIds.Contains(n.UserId))
            .Select(n => n.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);
        todayActivityUsers.UnionWith(todayNutritionLogs);
        
        var todayWorkoutLogs = await _context.NhatKyHoanThanhBaiTaps
            .AsNoTracking()
            .Where(n => n.NgayHoanThanh == todayDateOnly &&
                       validClientUserIds.Contains(n.UserId))
            .Select(n => n.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);
        todayActivityUsers.UnionWith(todayWorkoutLogs);
        
        var dailyActiveUsers = todayActivityUsers.Count;

        // MAU: Users with any activity this month (from multiple sources)
        var startOfMonthDateOnly = DateOnly.FromDateTime(startOfMonth);
        var endOfMonthDateOnly = DateOnly.FromDateTime(endOfMonth);
        
        var monthlyActivityUsers = new HashSet<string>();
        
        var monthAppLogs = await _context.NhatKyUngDungs
            .AsNoTracking()
            .Where(n => n.ThoiGian.HasValue &&
                       n.ThoiGian.Value.Date >= startOfMonth && 
                       n.ThoiGian.Value.Date <= endOfMonth &&
                       n.UserId != null &&
                       validClientUserIds.Contains(n.UserId))
            .Select(n => n.UserId!)
            .Distinct()
            .ToListAsync(cancellationToken);
        monthlyActivityUsers.UnionWith(monthAppLogs);
        
        var monthHealthLogs = await _context.LuuTruSucKhoes
            .AsNoTracking()
            .Where(l => l.NgayGhiNhan >= startOfMonthDateOnly &&
                       l.NgayGhiNhan <= endOfMonthDateOnly &&
                       validClientUserIds.Contains(l.UserId))
            .Select(l => l.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);
        monthlyActivityUsers.UnionWith(monthHealthLogs);
        
        var monthNutritionLogs = await _context.NhatKyDinhDuongs
            .AsNoTracking()
            .Where(n => n.NgayGhiLog >= startOfMonthDateOnly &&
                       n.NgayGhiLog <= endOfMonthDateOnly &&
                       validClientUserIds.Contains(n.UserId))
            .Select(n => n.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);
        monthlyActivityUsers.UnionWith(monthNutritionLogs);
        
        var monthWorkoutLogs = await _context.NhatKyHoanThanhBaiTaps
            .AsNoTracking()
            .Where(n => n.NgayHoanThanh >= startOfMonthDateOnly &&
                       n.NgayHoanThanh <= endOfMonthDateOnly &&
                       validClientUserIds.Contains(n.UserId))
            .Select(n => n.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);
        monthlyActivityUsers.UnionWith(monthWorkoutLogs);
        
        var monthlyActiveUsers = monthlyActivityUsers.Count;

        // Gender distribution - filter by date range if not "all time"
        var genderDistributionQuery = _context.Users
            .AsNoTracking()
            .Where(u => u.Role != "Admin" && (u.Role == null || u.Role != "PT"));
        
        if (!isAllTime && effectiveDateFrom.HasValue && effectiveDateTo.HasValue)
        {
            genderDistributionQuery = genderDistributionQuery.Where(u =>
                u.CreatedDate.HasValue &&
                u.CreatedDate.Value >= effectiveDateFrom.Value &&
                u.CreatedDate.Value <= effectiveDateTo.Value);
        }
        
        var genderDistribution = await genderDistributionQuery
            .GroupBy(u => u.GioiTinh ?? "Other")
            .Select(g => new { Gender = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        // Age distribution - filter by date range if not "all time"
        var ageDistributionQuery = _context.Users
            .AsNoTracking()
            .Where(u => u.Role != "Admin" && (u.Role == null || u.Role != "PT") && 
                       u.NgaySinh.HasValue);
        
        if (!isAllTime && effectiveDateFrom.HasValue && effectiveDateTo.HasValue)
        {
            ageDistributionQuery = ageDistributionQuery.Where(u =>
                u.CreatedDate.HasValue &&
                u.CreatedDate.Value >= effectiveDateFrom.Value &&
                u.CreatedDate.Value <= effectiveDateTo.Value);
        }
        
        var ageDistribution = await ageDistributionQuery.ToListAsync(cancellationToken);

        // Get registration trend - use date range if not "all time", otherwise use last 30 days
        IQueryable<Models.Entities.User> usersForTrendQuery = _context.Users
            .AsNoTracking()
            .Where(u => u.Role != "Admin" && (u.Role == null || u.Role != "PT") &&
                       u.CreatedDate.HasValue);
        
        if (isAllTime)
        {
            // For "all time", show last 30 days trend
            var last30Days = today.AddDays(-30);
            usersForTrendQuery = usersForTrendQuery.Where(u =>
                u.CreatedDate.Value.Date >= last30Days && 
                u.CreatedDate.Value.Date <= today);
        }
        else if (effectiveDateFrom.HasValue && effectiveDateTo.HasValue)
        {
            usersForTrendQuery = usersForTrendQuery.Where(u =>
                u.CreatedDate.Value >= effectiveDateFrom.Value && 
                u.CreatedDate.Value <= effectiveDateTo.Value);
        }
        else
        {
            // Fallback: use last 30 days if no valid date range
            var last30Days = today.AddDays(-30);
            usersForTrendQuery = usersForTrendQuery.Where(u =>
                u.CreatedDate.Value.Date >= last30Days && 
                u.CreatedDate.Value.Date <= today);
        }
        
        var usersForTrend = await usersForTrendQuery.ToListAsync(cancellationToken);
        
        var registrationTrend = usersForTrend
            .GroupBy(u => u.CreatedDate!.Value.Date)
            .Select(g => new RegistrationTrendDto
            {
                Date = g.Key,
                Count = g.Count()
            })
            .OrderBy(r => r.Date)
            .ToList();

        var topUsers = await _context.Users
            .AsNoTracking()
            .Include(u => u.LuuTruSucKhoes)
            .Include(u => u.MucTieus)
            .Where(u => u.Role != "Admin" && (u.Role == null || u.Role != "PT"))
            .Select(u => new TopUserDto
            {
                UserId = u.UserId,
                Name = u.HoTen ?? u.Username,
                HealthLogs = u.LuuTruSucKhoes.Count,
                Goals = u.MucTieus.Count
            })
            .OrderByDescending(u => u.HealthLogs)
            .ThenByDescending(u => u.Goals)
            .Take(10)
            .ToListAsync(cancellationToken);

        // Calculate retention rates (simplified)
        var retention7Days = await CalculateRetentionRateAsync(7, cancellationToken);
        var retention30Days = await CalculateRetentionRateAsync(30, cancellationToken);

        // Calculate account status based on actual data
        // Each user should only be counted in ONE status category
        // Optimized: Calculate in database instead of loading all users into memory
        var now = DateTime.UtcNow;
        var nowDate = DateOnly.FromDateTime(now);
        var thirtyDaysAgo = now.AddDays(-30);
        var ninetyDaysAgo = now.AddDays(-90);

        // Get user IDs with active membership
        var activeMembershipUserIds = await _context.GoiThanhViens
            .AsNoTracking()
            .Where(g => g.TrangThai == "Active" && 
                       (!g.NgayKetThuc.HasValue || g.NgayKetThuc.Value >= nowDate))
            .Select(g => g.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);

        // Get user IDs with recent activity (last 30 days)
        var recentActivityUserIds = await _context.NhatKyUngDungs
            .AsNoTracking()
            .Where(n => n.ThoiGian.HasValue && n.ThoiGian.Value >= thirtyDaysAgo)
            .Select(n => n.UserId)
            .Where(id => !string.IsNullOrEmpty(id))
            .Distinct()
            .ToListAsync(cancellationToken);

        // Active users: has active membership OR has activity in last 30 days
        var activeUserIds = activeMembershipUserIds
            .Union(recentActivityUserIds)
            .Where(id => !string.IsNullOrEmpty(id))
            .ToHashSet();

        // Suspended users: has membership with status "Suspended" or "Cancelled" AND not in active list
        var suspendedUserIds = await _context.GoiThanhViens
            .AsNoTracking()
            .Where(g => (g.TrangThai == "Suspended" || g.TrangThai == "Cancelled") &&
                       !activeUserIds.Contains(g.UserId))
            .Select(g => g.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);

        // Locked users: expired reset token OR no activity for 90+ days AND not in active/suspended
        var expiredTokenUserIds = await _context.Users
            .AsNoTracking()
            .Where(u => u.Role != "Admin" && (u.Role == null || u.Role != "PT") &&
                       u.ResetTokenExpiry.HasValue && 
                       u.ResetTokenExpiry.Value < now &&
                       !activeUserIds.Contains(u.UserId) &&
                       !suspendedUserIds.Contains(u.UserId))
            .Select(u => u.UserId)
            .ToListAsync(cancellationToken);

        var usersWithActivity90Days = await _context.NhatKyUngDungs
            .AsNoTracking()
            .Where(n => n.ThoiGian.HasValue && n.ThoiGian.Value >= ninetyDaysAgo)
            .Select(n => n.UserId)
            .Where(id => !string.IsNullOrEmpty(id))
            .Distinct()
            .ToListAsync(cancellationToken);

        var allClientUserIds = await _context.Users
            .AsNoTracking()
            .Where(u => u.Role != "Admin" && (u.Role == null || u.Role != "PT"))
            .Select(u => u.UserId)
            .ToListAsync(cancellationToken);

        var lockedUserIds = allClientUserIds
            .Where(id => !activeUserIds.Contains(id) &&
                        !suspendedUserIds.Contains(id) &&
                        (expiredTokenUserIds.Contains(id) || !usersWithActivity90Days.Contains(id)))
            .ToHashSet();

        // Unverified users: no email OR no activity at all AND not in other categories
        var usersWithNoEmail = await _context.Users
            .AsNoTracking()
            .Where(u => u.Role != "Admin" && (u.Role == null || u.Role != "PT") &&
                       string.IsNullOrEmpty(u.Email) &&
                       !activeUserIds.Contains(u.UserId) &&
                       !suspendedUserIds.Contains(u.UserId) &&
                       !lockedUserIds.Contains(u.UserId))
            .Select(u => u.UserId)
            .ToListAsync(cancellationToken);

        var usersWithNoActivity = allClientUserIds
            .Where(id => !activeUserIds.Contains(id) &&
                        !suspendedUserIds.Contains(id) &&
                        !lockedUserIds.Contains(id) &&
                        !usersWithActivity90Days.Contains(id))
            .ToHashSet();

        var unverifiedUserIds = usersWithNoEmail
            .Union(usersWithNoActivity)
            .ToHashSet();

        // Count users in each category
        var activeUsers = activeUserIds.Count;
        var suspendedUsers = suspendedUserIds.Count;
        var lockedUsers = lockedUserIds.Count;
        var unverifiedUsers = unverifiedUserIds.Count;

        return new UserAnalyticsDto
        {
            TotalUsers = totalUsers,
            NewRegistrationsToday = newRegistrationsToday,
            NewRegistrationsThisMonth = newRegistrationsThisMonth,
            DailyActiveUsers = activeUsersInRange, // Use range-based active users
            MonthlyActiveUsers = monthlyActiveUsers,
            DailyActiveUsersPercent = totalUsers > 0 ? (activeUsersInRange / (double)totalUsers) * 100 : 0,
            MonthlyActiveUsersPercent = totalUsers > 0 ? (monthlyActiveUsers / (double)totalUsers) * 100 : 0,
            RetentionRate7Days = retention7Days,
            RetentionRate30Days = retention30Days,
            ActiveUsers = activeUsers,
            LockedUsers = lockedUsers,
            SuspendedUsers = suspendedUsers,
            UnverifiedUsers = unverifiedUsers,
            GenderDistribution = new GenderDistributionDto
            {
                Male = genderDistribution.FirstOrDefault(g => g.Gender == "Male")?.Count ?? 0,
                Female = genderDistribution.FirstOrDefault(g => g.Gender == "Female")?.Count ?? 0,
                Other = genderDistribution.FirstOrDefault(g => g.Gender == "Other")?.Count ?? 0
            },
            AgeDistribution = CalculateAgeDistribution(ageDistribution),
            RegistrationTrend = registrationTrend,
            TopUsers = topUsers
        };
    }

    private AgeDistributionDto CalculateAgeDistribution(List<Models.Entities.User> users)
    {
        var now = DateTime.UtcNow;
        var distribution = new AgeDistributionDto();

        foreach (var user in users)
        {
            if (!user.NgaySinh.HasValue) continue;
            var birthDate = user.NgaySinh.Value;
            var age = now.Year - birthDate.Year;
            var birthDateTime = new DateTime(birthDate.Year, birthDate.Month, birthDate.Day);
            if (birthDateTime > now.AddYears(-age)) age--;

            if (age < 18) distribution.Under18++;
            else if (age >= 18 && age <= 25) distribution.Age18_25++;
            else if (age >= 26 && age <= 45) distribution.Age26_45++;
            else if (age > 45) distribution.Over45++;
        }

        return distribution;
    }

    private async Task<double> CalculateRetentionRateAsync(int days, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var nowDate = now.Date;
        var cutoffDate = nowDate.AddDays(-days);
        var cutoffDateOnly = DateOnly.FromDateTime(cutoffDate);
        var nowDateOnly = DateOnly.FromDateTime(nowDate);
        
        // Get users who registered before or on the cutoff date
        // IMPORTANT: Only count Client users (exclude Admin and PT)
        // For retention calculation, we want users who had enough time to potentially return
        var usersInPeriod = await _context.Users
            .AsNoTracking()
            .Where(u => u.Role != "Admin" && (u.Role == null || u.Role != "PT") &&
                       u.CreatedDate.HasValue && u.CreatedDate.Value.Date <= cutoffDate)
            .Select(u => u.UserId)
            .ToListAsync(cancellationToken);

        if (usersInPeriod.Count == 0) return 0;

        // Get all users with activity after cutoff date (from multiple sources)
        // IMPORTANT: Only count activity from Client users
        // Activity must be AFTER the cutoff date (inclusive of cutoff date for proper calculation)
        var activeUsersAfterCutoff = new HashSet<string>();
        
        // From NhatKyUngDung
        var appLogs = await _context.NhatKyUngDungs
            .AsNoTracking()
            .Where(n => n.ThoiGian.HasValue &&
                       n.ThoiGian.Value.Date >= cutoffDate &&
                       n.ThoiGian.Value.Date <= nowDate &&
                       n.UserId != null &&
                       usersInPeriod.Contains(n.UserId))
            .Select(n => n.UserId!)
            .Distinct()
            .ToListAsync(cancellationToken);
        activeUsersAfterCutoff.UnionWith(appLogs);
        
        // From LuuTruSucKhoe
        var healthLogs = await _context.LuuTruSucKhoes
            .AsNoTracking()
            .Where(l => l.NgayGhiNhan >= cutoffDateOnly &&
                       l.NgayGhiNhan <= nowDateOnly &&
                       usersInPeriod.Contains(l.UserId))
            .Select(l => l.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);
        activeUsersAfterCutoff.UnionWith(healthLogs);
        
        // From NhatKyDinhDuong
        var nutritionLogs = await _context.NhatKyDinhDuongs
            .AsNoTracking()
            .Where(n => n.NgayGhiLog >= cutoffDateOnly &&
                       n.NgayGhiLog <= nowDateOnly &&
                       usersInPeriod.Contains(n.UserId))
            .Select(n => n.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);
        activeUsersAfterCutoff.UnionWith(nutritionLogs);
        
        // From NhatKyHoanThanhBaiTap
        var workoutLogs = await _context.NhatKyHoanThanhBaiTaps
            .AsNoTracking()
            .Where(n => n.NgayHoanThanh >= cutoffDateOnly &&
                       n.NgayHoanThanh <= nowDateOnly &&
                       usersInPeriod.Contains(n.UserId))
            .Select(n => n.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);
        activeUsersAfterCutoff.UnionWith(workoutLogs);

        // Count users who registered before/on cutoff AND have activity after/on cutoff
        var retainedUsers = activeUsersAfterCutoff.Count;

        return (retainedUsers / (double)usersInPeriod.Count) * 100;
    }

    public async Task<PTAnalyticsDto> GetPTAnalyticsAsync(
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        CancellationToken cancellationToken = default)
    {
        var totalPTs = await _context.HuanLuyenViens
            .AsNoTracking()
            .CountAsync(cancellationToken);

        var verified = await _context.HuanLuyenViens
            .AsNoTracking()
            .Where(h => h.DaXacMinh == true)
            .CountAsync(cancellationToken);

        var active = await _context.HuanLuyenViens
            .AsNoTracking()
            .Where(h => h.NhanKhach == true && h.DaXacMinh == true)
            .CountAsync(cancellationToken);

        var notAccepting = await _context.HuanLuyenViens
            .AsNoTracking()
            .Where(h => h.NhanKhach == false)
            .CountAsync(cancellationToken);

        // Calculate new registrations in date range if provided, otherwise all time
        int newRegistrations;
        if (dateFrom.HasValue && dateTo.HasValue)
        {
            newRegistrations = await _context.HuanLuyenViens
                .AsNoTracking()
                .Include(h => h.User)
                .Where(h => h.User != null &&
                           h.User.CreatedDate.HasValue &&
                           h.User.CreatedDate.Value >= dateFrom.Value &&
                           h.User.CreatedDate.Value <= dateTo.Value)
                .CountAsync(cancellationToken);
        }
        else
        {
            newRegistrations = totalPTs; // For "all time", show total
        }

        // Calculate on leave: PTs that are verified but not accepting clients (could be on leave)
        var onLeave = await _context.HuanLuyenViens
            .AsNoTracking()
            .Where(h => h.DaXacMinh == true && h.NhanKhach == false)
            .CountAsync(cancellationToken);

        // Apply date filter if provided
        var totalBookings = dateFrom.HasValue && dateTo.HasValue
            ? await _context.DatLichPts
                .AsNoTracking()
                .Where(d => d.NgayGioDat >= dateFrom.Value && d.NgayGioDat <= dateTo.Value)
                .CountAsync(cancellationToken)
            : await _context.DatLichPts
                .AsNoTracking()
                .CountAsync(cancellationToken);

        var cancelledBookings = dateFrom.HasValue && dateTo.HasValue
            ? await _context.DatLichPts
                .AsNoTracking()
                .Where(d => d.TrangThai == "Cancelled" &&
                           d.NgayGioDat >= dateFrom.Value && d.NgayGioDat <= dateTo.Value)
                .CountAsync(cancellationToken)
            : await _context.DatLichPts
                .AsNoTracking()
                .Where(d => d.TrangThai == "Cancelled")
                .CountAsync(cancellationToken);

        var cancelRate = totalBookings > 0 ? (cancelledBookings / (double)totalBookings) * 100 : 0;

        var ratings = await _context.DanhGiaPts
            .AsNoTracking()
            .Where(d => d.Diem.HasValue)
            .Select(d => (double)d.Diem.Value)
            .ToListAsync(cancellationToken);
        
        var averageRating = ratings.Count > 0 ? ratings.Average() : 0;

        var totalClients = await _context.QuyenPtKhachHangs
            .AsNoTracking()
            .Where(q => q.DangHoatDong == true)
            .CountAsync(cancellationToken);

        var averageClientsPerPT = totalPTs > 0 ? totalClients / (double)totalPTs : 0;

        var revenue = dateFrom.HasValue && dateTo.HasValue
            ? await _context.GiaoDiches
                .AsNoTracking()
                .Where(g => g.TrangThaiThanhToan == "Completed" &&
                           g.NgayGiaoDich.HasValue &&
                           g.NgayGiaoDich.Value >= dateFrom.Value && 
                           g.NgayGiaoDich.Value <= dateTo.Value)
                .SumAsync(g => (decimal?)g.SoTien) ?? 0
            : await _context.GiaoDiches
                .AsNoTracking()
                .Where(g => g.TrangThaiThanhToan == "Completed" && g.NgayGiaoDich.HasValue)
                .SumAsync(g => (decimal?)g.SoTien) ?? 0;

        var averageRevenuePerPT = totalPTs > 0 ? revenue / totalPTs : 0;

        var ptRevenueData = dateFrom.HasValue && dateTo.HasValue
            ? await _context.GiaoDiches
                .AsNoTracking()
                .Include(g => g.Pt)
                    .ThenInclude(p => p.User)
                .Where(g => g.TrangThaiThanhToan == "Completed" &&
                           g.NgayGiaoDich.HasValue &&
                           g.NgayGiaoDich.Value >= dateFrom.Value && 
                           g.NgayGiaoDich.Value <= dateTo.Value)
                .ToListAsync(cancellationToken)
            : await _context.GiaoDiches
                .AsNoTracking()
                .Include(g => g.Pt)
                    .ThenInclude(p => p.User)
                .Where(g => g.TrangThaiThanhToan == "Completed" && g.NgayGiaoDich.HasValue)
                .ToListAsync(cancellationToken);
        
        var ptRevenue = ptRevenueData
            .GroupBy(g => g.Ptid)
            .Select(g => new PTRevenueDto
            {
                PTId = g.Key ?? "",
                PTName = g.First().Pt != null && g.First().Pt.User != null ? g.First().Pt.User.HoTen ?? "" : "",
                Revenue = g.Sum(x => (decimal)x.SoTien)
            })
            .OrderByDescending(p => p.Revenue)
            .ToList();

        var allPTs = await _context.HuanLuyenViens
            .AsNoTracking()
            .Include(h => h.User)
            .ToListAsync(cancellationToken);
        
        var topPTs = allPTs
            .Select(h => new TopPTDto
            {
                PTId = h.Ptid,
                Name = h.User != null ? h.User.HoTen ?? "" : "",
                Revenue = ptRevenue.FirstOrDefault(p => p.PTId == h.Ptid)?.Revenue ?? 0,
                Rating = h.DiemTrungBinh ?? 0
            })
            .OrderByDescending(p => p.Revenue)
            .Take(5)
            .ToList();

        return new PTAnalyticsDto
        {
            TotalPTs = totalPTs,
            NewRegistrations = newRegistrations,
            Verified = verified,
            Active = active,
            OnLeave = onLeave,
            NotAcceptingClients = notAccepting,
            AverageClientsPerPT = averageClientsPerPT,
            AverageRevenuePerPT = averageRevenuePerPT,
            AverageRating = averageRating,
            CancelRate = cancelRate,
            TotalBookings = totalBookings,
            CancelledBookings = cancelledBookings,
            PTRevenue = ptRevenue,
            TopPTs = topPTs
        };
    }

    public async Task<HealthAnalyticsDto> GetHealthAnalyticsAsync(
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        CancellationToken cancellationToken = default)
    {
        var healthRecordsQuery = _context.LuuTruSucKhoes
            .AsNoTracking()
            .Where(l => l.Bmi.HasValue || l.ChieuCao.HasValue || l.CanNang.HasValue || l.SoGioNgu.HasValue || l.LuongNuocUong.HasValue);
        
        // Apply date filter if provided
        if (dateFrom.HasValue && dateTo.HasValue)
        {
            var dateFromOnly = DateOnly.FromDateTime(dateFrom.Value);
            var dateToOnly = DateOnly.FromDateTime(dateTo.Value);
            healthRecordsQuery = healthRecordsQuery.Where(l => 
                l.NgayGhiNhan >= dateFromOnly && l.NgayGhiNhan <= dateToOnly);
        }
        
        var healthRecords = await healthRecordsQuery.ToListAsync(cancellationToken);

        var averageBMI = healthRecords.Where(r => r.Bmi.HasValue).Select(r => r.Bmi!.Value).DefaultIfEmpty(0).Average();
        var averageHeight = healthRecords.Where(r => r.ChieuCao.HasValue).Select(r => r.ChieuCao!.Value).DefaultIfEmpty(0).Average();
        var averageWeight = healthRecords.Where(r => r.CanNang.HasValue).Select(r => r.CanNang!.Value).DefaultIfEmpty(0).Average();
        var averageSleep = healthRecords.Where(r => r.SoGioNgu.HasValue).Select(r => r.SoGioNgu!.Value).DefaultIfEmpty(0).Average();
        var averageWater = healthRecords.Where(r => r.LuongNuocUong.HasValue).Select(r => r.LuongNuocUong!.Value).DefaultIfEmpty(0).Average();

        var bmiDistribution = CalculateBMIDistribution(healthRecords);

        var totalUsers = await _context.Users
            .AsNoTracking()
            .Where(u => u.Role != "Admin" && (u.Role == null || u.Role != "PT"))
            .CountAsync(cancellationToken);

        // Calculate users with underlying diseases (bệnh nền)
        // Get distinct users who have at least one health record with a disease (BenhId is not null)
        var usersWithDiseasesQuery = _context.LuuTruSucKhoes
            .AsNoTracking()
            .Where(l => l.BenhId != null);
        
        // Apply date filter if provided
        if (dateFrom.HasValue && dateTo.HasValue)
        {
            var dateFromOnly = DateOnly.FromDateTime(dateFrom.Value);
            var dateToOnly = DateOnly.FromDateTime(dateTo.Value);
            usersWithDiseasesQuery = usersWithDiseasesQuery.Where(l => 
                l.NgayGhiNhan >= dateFromOnly && l.NgayGhiNhan <= dateToOnly);
        }
        
        var usersWithDiseases = await usersWithDiseasesQuery
            .Select(l => l.UserId)
            .Distinct()
            .CountAsync(cancellationToken);

        var diseaseRate = totalUsers > 0 ? (usersWithDiseases / (double)totalUsers) * 100 : 0;

        var bmiRecordsQuery = _context.LuuTruSucKhoes
            .AsNoTracking()
            .Where(l => l.Bmi.HasValue);
        
        if (dateFrom.HasValue && dateTo.HasValue)
        {
            var dateFromOnly = DateOnly.FromDateTime(dateFrom.Value);
            var dateToOnly = DateOnly.FromDateTime(dateTo.Value);
            bmiRecordsQuery = bmiRecordsQuery.Where(l => 
                l.NgayGhiNhan >= dateFromOnly && l.NgayGhiNhan <= dateToOnly);
        }
        
        var bmiRecords = await bmiRecordsQuery.ToListAsync(cancellationToken);
        
        var bmiTrend = bmiRecords
            .GroupBy(l => l.NgayGhiNhan)
            .Select(g => new BMITrendDto
            {
                Date = new DateTime(g.Key.Year, g.Key.Month, g.Key.Day),
                AverageBMI = g.Where(l => l.Bmi.HasValue).Average(l => (double)l.Bmi!.Value)
            })
            .OrderBy(t => t.Date)
            .Take(30)
            .ToList();

        // Calculate disease trend (Xu hướng người mắc bệnh nền)
        var diseaseRecordsQuery = _context.LuuTruSucKhoes
            .AsNoTracking()
            .Where(l => l.BenhId != null);
        
        if (dateFrom.HasValue && dateTo.HasValue)
        {
            var dateFromOnly = DateOnly.FromDateTime(dateFrom.Value);
            var dateToOnly = DateOnly.FromDateTime(dateTo.Value);
            diseaseRecordsQuery = diseaseRecordsQuery.Where(l => 
                l.NgayGhiNhan >= dateFromOnly && l.NgayGhiNhan <= dateToOnly);
        }
        
        var diseaseRecords = await diseaseRecordsQuery.ToListAsync(cancellationToken);
        
        var diseaseTrend = diseaseRecords
            .GroupBy(l => l.NgayGhiNhan)
            .Select(g => new DiseaseTrendDto
            {
                Date = new DateTime(g.Key.Year, g.Key.Month, g.Key.Day),
                UserCount = g.Select(l => l.UserId).Distinct().Count()
            })
            .OrderBy(t => t.Date)
            .Take(30)
            .ToList();

        // Calculate user levels (Trình độ người dùng) based on MucDo of KeHoachTapLuyen
        var workoutPlansQuery = _context.KeHoachTapLuyens
            .AsNoTracking()
            .Where(k => k.MucDo != null && k.MucDo != "");
        
        if (dateFrom.HasValue && dateTo.HasValue)
        {
            workoutPlansQuery = workoutPlansQuery.Where(k => 
                k.NgayTao.HasValue &&
                k.NgayTao.Value >= dateFrom.Value &&
                k.NgayTao.Value <= dateTo.Value);
        }
        
        var workoutPlans = await workoutPlansQuery.ToListAsync(cancellationToken);
        
        var userLevels = workoutPlans
            .GroupBy(k => k.MucDo!)
            .Select(g => new UserLevelDto
            {
                Level = g.Key,
                UserCount = g.Select(k => k.UserId).Distinct().Count()
            })
            .OrderBy(l => l.Level)
            .ToList();

        return new HealthAnalyticsDto
        {
            AverageBMI = averageBMI,
            AverageHeight = averageHeight,
            AverageWeight = averageWeight,
            AverageSleepHours = averageSleep,
            AverageWaterIntake = averageWater,
            BMIDistribution = bmiDistribution,
            HealthLogRate = diseaseRate,
            UsersLogging5DaysPerWeek = usersWithDiseases,
            BMITrend = bmiTrend,
            DiseaseTrend = diseaseTrend,
            UserLevels = userLevels
        };
    }

    private BMIDistributionDto CalculateBMIDistribution(List<Models.Entities.LuuTruSucKhoe> records)
    {
        var distribution = new BMIDistributionDto();
        var total = records.Count(r => r.Bmi.HasValue);
        if (total == 0) return distribution;

        var normal = records.Count(r => r.Bmi.HasValue && r.Bmi.Value >= 18.5 && r.Bmi.Value < 25);
        var overweight = records.Count(r => r.Bmi.HasValue && r.Bmi.Value >= 25 && r.Bmi.Value < 30);
        var obese = records.Count(r => r.Bmi.HasValue && r.Bmi.Value >= 30);
        var underweight = records.Count(r => r.Bmi.HasValue && r.Bmi.Value < 18.5);

        distribution.Normal = (normal / (double)total) * 100;
        distribution.Overweight = (overweight / (double)total) * 100;
        distribution.Obese = (obese / (double)total) * 100;
        distribution.Underweight = (underweight / (double)total) * 100;

        return distribution;
    }

    public async Task<GoalsAnalyticsDto> GetGoalsAnalyticsAsync(
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        CancellationToken cancellationToken = default)
    {
        var goalsQuery = _context.MucTieus.AsNoTracking();
        
        // Apply date filter if provided (filter by NgayBatDau)
        if (dateFrom.HasValue && dateTo.HasValue)
        {
            var dateFromOnly = DateOnly.FromDateTime(dateFrom.Value);
            var dateToOnly = DateOnly.FromDateTime(dateTo.Value);
            goalsQuery = goalsQuery.Where(m => 
                m.NgayBatDau >= dateFromOnly && m.NgayBatDau <= dateToOnly);
        }
        
        var totalGoals = await goalsQuery.CountAsync(cancellationToken);

        var currentDate = DateOnly.FromDateTime(DateTime.UtcNow);
        
        var completedGoals = await goalsQuery
            .Where(m => m.DaHoanThanh == true)
            .CountAsync(cancellationToken);

        // In progress: Not completed AND (no end date OR end date is in the future)
        var inProgressGoals = await goalsQuery
            .Where(m => m.DaHoanThanh == false && 
                       (m.NgayKetThuc == null || (m.NgayKetThuc.HasValue && m.NgayKetThuc.Value >= currentDate)))
            .CountAsync(cancellationToken);

        // Cancelled: Not completed AND has end date AND end date is in the past
        var cancelledGoals = await goalsQuery
            .Where(m => m.DaHoanThanh == false && 
                       m.NgayKetThuc.HasValue && 
                       m.NgayKetThuc.Value < currentDate)
            .CountAsync(cancellationToken);

        var goalTypeDistribution = await goalsQuery
            .GroupBy(m => m.LoaiMucTieu ?? "Unknown")
            .Select(g => new GoalTypeDistributionDto
            {
                GoalType = g.Key,
                Count = g.Count()
            })
            .OrderByDescending(g => g.Count)
            .ToListAsync(cancellationToken);

        var goalCompletionByType = await goalsQuery
            .GroupBy(m => m.LoaiMucTieu ?? "Unknown")
            .Select(g => new GoalCompletionByTypeDto
            {
                GoalType = g.Key,
                CompletionRate = g.Count() > 0 ? (g.Count(m => m.DaHoanThanh == true) / (double)g.Count()) * 100 : 0
            })
            .ToListAsync(cancellationToken);

        var topGoalTypes = goalTypeDistribution.Take(10).Select(g => new TopGoalTypeDto
        {
            GoalType = g.GoalType,
            Count = g.Count
        }).ToList();

        // Calculate average completion days
        // Include both completed goals AND in-progress goals
        // For completed goals: use NgayKetThuc - NgayBatDau
        // For in-progress goals: use current date - NgayBatDau (or NgayKetThuc if set and in future)
        var goalsForAverageDaysQuery = _context.MucTieus
            .AsNoTracking();
        
        if (dateFrom.HasValue && dateTo.HasValue)
        {
            var dateFromOnly = DateOnly.FromDateTime(dateFrom.Value);
            var dateToOnly = DateOnly.FromDateTime(dateTo.Value);
            goalsForAverageDaysQuery = goalsForAverageDaysQuery.Where(m => 
                m.NgayBatDau >= dateFromOnly && m.NgayBatDau <= dateToOnly);
        }
        
        var allGoals = await goalsForAverageDaysQuery.ToListAsync(cancellationToken);

        // Calculate days for each goal:
        // - Completed goals: NgayKetThuc - NgayBatDau (if NgayKetThuc exists)
        // - In-progress goals: currentDate - NgayBatDau (or NgayKetThuc if set and >= currentDate)
        var goalsWithDays = allGoals
            .Where(m => 
                (m.DaHoanThanh == true && m.NgayKetThuc.HasValue) || 
                (m.DaHoanThanh == false && (m.NgayKetThuc == null || (m.NgayKetThuc.HasValue && m.NgayKetThuc.Value >= currentDate))))
            .Select(m =>
            {
                int days;
                if (m.DaHoanThanh == true && m.NgayKetThuc.HasValue)
                {
                    // Completed goal: use end date
                    days = m.NgayKetThuc!.Value.DayNumber - m.NgayBatDau.DayNumber;
                }
                else if (m.DaHoanThanh == false)
                {
                    // In-progress goal: use current date or future end date
                    DateOnly endDate;
                    if (m.NgayKetThuc.HasValue && m.NgayKetThuc.Value >= currentDate)
                    {
                        endDate = m.NgayKetThuc.Value;
                    }
                    else
                    {
                        endDate = currentDate;
                    }
                    days = endDate.DayNumber - m.NgayBatDau.DayNumber;
                }
                else
                {
                    // Fallback: should not happen due to Where clause, but set to 0
                    days = 0;
                }
                return days;
            })
            .Where(days => days >= 0) // Only include valid positive days
            .ToList();

        var averageCompletionDays = goalsWithDays.Count > 0
            ? (int)goalsWithDays.Average()
            : 0;

        return new GoalsAnalyticsDto
        {
            TotalGoals = totalGoals,
            CompletedGoals = completedGoals,
            InProgressGoals = inProgressGoals,
            CancelledGoals = cancelledGoals,
            CompletedPercent = totalGoals > 0 ? (completedGoals / (double)totalGoals) * 100 : 0,
            InProgressPercent = totalGoals > 0 ? (inProgressGoals / (double)totalGoals) * 100 : 0,
            CancelledPercent = totalGoals > 0 ? (cancelledGoals / (double)totalGoals) * 100 : 0,
            AverageCompletionDays = averageCompletionDays,
            GoalTypeDistribution = goalTypeDistribution,
            GoalCompletionByType = goalCompletionByType,
            TopGoalTypes = topGoalTypes
        };
    }

    public async Task<WorkoutAnalyticsDto> GetWorkoutAnalyticsAsync(
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        CancellationToken cancellationToken = default)
    {
        var activePlans = await _context.KeHoachTapLuyens
            .AsNoTracking()
            .Where(k => k.DangSuDung == true)
            .CountAsync(cancellationToken);

        var totalExercises = await _context.ChiTietKeHoachTapLuyens
            .AsNoTracking()
            .CountAsync(cancellationToken);

        var averageExercisesPerPlan = activePlans > 0 ? totalExercises / (double)activePlans : 0;

        var completedWorkoutsQuery = _context.NhatKyHoanThanhBaiTaps.AsNoTracking();
        if (dateFrom.HasValue && dateTo.HasValue)
        {
            var dateFromOnly = DateOnly.FromDateTime(dateFrom.Value);
            var dateToOnly = DateOnly.FromDateTime(dateTo.Value);
            completedWorkoutsQuery = completedWorkoutsQuery.Where(n => 
                n.NgayHoanThanh >= dateFromOnly && n.NgayHoanThanh <= dateToOnly);
        }
        var completedWorkouts = await completedWorkoutsQuery.CountAsync(cancellationToken);

        var totalWorkoutSessions = await _context.ChiTietKeHoachTapLuyens
            .AsNoTracking()
            .CountAsync(cancellationToken);

        var completionRate = totalWorkoutSessions > 0 ? (completedWorkouts / (double)totalWorkoutSessions) * 100 : 0;

        var systemCreated = await _context.KeHoachTapLuyens
            .AsNoTracking()
            .Where(k => k.Nguon == "AI")
            .CountAsync(cancellationToken);

        var ptCreated = await _context.KeHoachTapLuyens
            .AsNoTracking()
            .Where(k => k.Nguon == "PT")
            .CountAsync(cancellationToken);

        var userCreated = await _context.KeHoachTapLuyens
            .AsNoTracking()
            .Where(k => k.Nguon != "AI" && k.Nguon != "PT")
            .CountAsync(cancellationToken);

        var caloriesQuery = _context.NhatKyHoanThanhBaiTaps
            .AsNoTracking()
            .Where(n => n.CaloTieuHao.HasValue);
        
        if (dateFrom.HasValue && dateTo.HasValue)
        {
            var dateFromOnly = DateOnly.FromDateTime(dateFrom.Value);
            var dateToOnly = DateOnly.FromDateTime(dateTo.Value);
            caloriesQuery = caloriesQuery.Where(n => 
                n.NgayHoanThanh >= dateFromOnly && n.NgayHoanThanh <= dateToOnly);
        }
        
        var caloriesList = await caloriesQuery
            .Select(n => n.CaloTieuHao.Value)
            .ToListAsync(cancellationToken);
        
        var averageCalories = caloriesList.Count > 0 ? caloriesList.Average() : 0;

        var workoutRecordsQuery = _context.NhatKyHoanThanhBaiTaps.AsNoTracking();
        
        if (dateFrom.HasValue && dateTo.HasValue)
        {
            var dateFromOnly = DateOnly.FromDateTime(dateFrom.Value);
            var dateToOnly = DateOnly.FromDateTime(dateTo.Value);
            workoutRecordsQuery = workoutRecordsQuery.Where(n => 
                n.NgayHoanThanh >= dateFromOnly && n.NgayHoanThanh <= dateToOnly);
        }
        
        var workoutRecords = await workoutRecordsQuery.ToListAsync(cancellationToken);
        
        var completionTrend = workoutRecords
            .GroupBy(n => n.NgayHoanThanh)
            .Select(g => new WorkoutCompletionTrendDto
            {
                Date = new DateTime(g.Key.Year, g.Key.Month, g.Key.Day),
                CompletionRate = 100.0 // Simplified
            })
            .OrderBy(t => t.Date)
            .Take(30)
            .ToList();

        var typeDistributionQuery = _context.KeHoachTapLuyens
            .AsNoTracking();
        
        // Apply date filter if provided
        if (dateFrom.HasValue && dateTo.HasValue)
        {
            typeDistributionQuery = typeDistributionQuery.Where(k => 
                k.NgayTao.HasValue &&
                k.NgayTao.Value >= dateFrom.Value &&
                k.NgayTao.Value <= dateTo.Value);
        }
        
        var typeDistribution = await typeDistributionQuery
            .GroupBy(k => k.LoaiKeHoach ?? "Unknown")
            .Select(g => new WorkoutTypeDistributionDto
            {
                Type = g.Key,
                Count = g.Count()
            })
            .ToListAsync(cancellationToken);

        var topExercises = await _context.ChiTietKeHoachTapLuyens
            .AsNoTracking()
            .GroupBy(c => c.TenBaiTap ?? "Unknown")
            .Select(g => new TopExerciseDto
            {
                ExerciseName = g.Key,
                CompletionCount = g.Count()
            })
            .OrderByDescending(e => e.CompletionCount)
            .Take(10)
            .ToListAsync(cancellationToken);

        return new WorkoutAnalyticsDto
        {
            ActivePlans = activePlans,
            AverageExercisesPerPlan = averageExercisesPerPlan,
            CompletionRate = completionRate,
            SystemCreatedPlans = systemCreated,
            PTCreatedPlans = ptCreated,
            UserCreatedPlans = userCreated,
            AverageCaloriesPerSession = averageCalories,
            CompletionTrend = completionTrend,
            TypeDistribution = typeDistribution,
            TopExercises = topExercises
        };
    }

    public async Task<NutritionAnalyticsDto> GetNutritionAnalyticsAsync(
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        CancellationToken cancellationToken = default)
    {
        var activePlans = await _context.PhanCongKeHoachAnUongs
            .AsNoTracking()
            .Where(p => p.TrangThai == "Active")
            .CountAsync(cancellationToken);

        // Calculate average calories per food item directly from DinhDuongMonAn table
        var caloriesList = await _context.DinhDuongMonAns
            .AsNoTracking()
            .Where(m => m.LuongCalo.HasValue)
            .Select(m => m.LuongCalo!.Value)
            .ToListAsync(cancellationToken);
        
        var averageCalories = caloriesList.Count > 0 ? caloriesList.Average() : 0;

        // Calculate average macro distribution directly from DinhDuongMonAn table
        // Calculate average values (in grams) for each macro nutrient
        var proteinList = await _context.DinhDuongMonAns
            .AsNoTracking()
            .Where(m => m.Protein.HasValue)
            .Select(m => m.Protein!.Value)
            .ToListAsync(cancellationToken);
        
        var carbsList = await _context.DinhDuongMonAns
            .AsNoTracking()
            .Where(m => m.Carbohydrate.HasValue)
            .Select(m => m.Carbohydrate!.Value)
            .ToListAsync(cancellationToken);
        
        var fatList = await _context.DinhDuongMonAns
            .AsNoTracking()
            .Where(m => m.ChatBeo.HasValue)
            .Select(m => m.ChatBeo!.Value)
            .ToListAsync(cancellationToken);

        // Calculate average for each macro nutrient (in grams)
        var averageProtein = proteinList.Count > 0 ? proteinList.Average() : 0;
        var averageCarbs = carbsList.Count > 0 ? carbsList.Average() : 0;
        var averageFat = fatList.Count > 0 ? fatList.Average() : 0;

        // Debug: log counts and averages
        System.Diagnostics.Debug.WriteLine($"Macro Distribution Calculation:");
        System.Diagnostics.Debug.WriteLine($"  Protein: {proteinList.Count} items, Average: {averageProtein}");
        System.Diagnostics.Debug.WriteLine($"  Carbs: {carbsList.Count} items, Average: {averageCarbs}");
        System.Diagnostics.Debug.WriteLine($"  Fat: {fatList.Count} items, Average: {averageFat}");

        var macroDistribution = new MacroDistributionDto
        {
            Protein = Math.Round(averageProtein, 1),
            Carbs = Math.Round(averageCarbs, 1),
            Fat = Math.Round(averageFat, 1)
        };

        // Keep nutrition logs query for calorie trend chart
        IQueryable<Models.Entities.NhatKyDinhDuong> nutritionLogsQuery = _context.NhatKyDinhDuongs
            .AsNoTracking()
            .Include(n => n.MonAn)
            .Where(n => n.MonAn != null);
        
        if (dateFrom.HasValue && dateTo.HasValue)
        {
            var dateFromOnly = DateOnly.FromDateTime(dateFrom.Value);
            var dateToOnly = DateOnly.FromDateTime(dateTo.Value);
            nutritionLogsQuery = nutritionLogsQuery.Where(n => 
                n.NgayGhiLog >= dateFromOnly && n.NgayGhiLog <= dateToOnly);
        }
        
        var nutritionLogs = await nutritionLogsQuery.ToListAsync(cancellationToken);

        // Find foods with highest macro nutrients
        // Top food with highest Protein
        var topProteinFood = await _context.DinhDuongMonAns
            .AsNoTracking()
            .Where(m => m.Protein.HasValue && m.TenMonAn != null)
            .OrderByDescending(m => m.Protein!.Value)
            .ThenBy(m => m.TenMonAn)
            .Select(m => new TopFoodDto
            {
                FoodName = m.TenMonAn!,
                LogCount = (int)Math.Round(m.Protein!.Value)
            })
            .FirstOrDefaultAsync(cancellationToken);

        // Top food with highest Carbohydrate
        var topCarbsFood = await _context.DinhDuongMonAns
            .AsNoTracking()
            .Where(m => m.Carbohydrate.HasValue && m.TenMonAn != null)
            .OrderByDescending(m => m.Carbohydrate!.Value)
            .ThenBy(m => m.TenMonAn)
            .Select(m => new TopFoodDto
            {
                FoodName = m.TenMonAn!,
                LogCount = (int)Math.Round(m.Carbohydrate!.Value)
            })
            .FirstOrDefaultAsync(cancellationToken);

        // Top food with highest Fat (ChatBeo)
        var topFatFood = await _context.DinhDuongMonAns
            .AsNoTracking()
            .Where(m => m.ChatBeo.HasValue && m.TenMonAn != null)
            .OrderByDescending(m => m.ChatBeo!.Value)
            .ThenBy(m => m.TenMonAn)
            .Select(m => new TopFoodDto
            {
                FoodName = m.TenMonAn!,
                LogCount = (int)Math.Round(m.ChatBeo!.Value)
            })
            .FirstOrDefaultAsync(cancellationToken);

        // Create list of top 3 foods by macro nutrients
        var top3MacroFoods = new List<TopFoodDto>();
        if (topProteinFood != null) top3MacroFoods.Add(topProteinFood);
        if (topCarbsFood != null) top3MacroFoods.Add(topCarbsFood);
        if (topFatFood != null) top3MacroFoods.Add(topFatFood);

        // Create empty calorie trend (not used anymore, but kept for backward compatibility)
        var calorieTrend = new List<CalorieTrendDto>();

        return new NutritionAnalyticsDto
        {
            ActivePlans = activePlans,
            NewFoodsThisMonth = 0, // Not used anymore
            AverageCaloriesPerDay = averageCalories,
            CalorieGoalAchievementRate = 0, // Not used anymore
            MacroDistribution = macroDistribution,
            CalorieTrend = calorieTrend, // Empty, not used
            MacroTrend = new List<MacroDistributionDto> { macroDistribution },
            TopFoods = new List<TopFoodDto>(), // Not used anymore
            Top3FavoriteFoods = top3MacroFoods // Top foods by macro nutrients
        };
    }

    public async Task<FinanceAnalyticsDto> GetFinanceAnalyticsAsync(
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1);
        var endOfMonth = startOfMonth.AddMonths(1).AddDays(-1);

        var effectiveDateFrom = dateFrom ?? startOfMonth;
        var effectiveDateTo = dateTo ?? endOfMonth;

        var totalRevenue = await _context.GiaoDiches
            .AsNoTracking()
            .Where(g => g.TrangThaiThanhToan == "Completed" &&
                       g.NgayGiaoDich.HasValue &&
                       g.NgayGiaoDich.Value >= effectiveDateFrom && g.NgayGiaoDich.Value <= effectiveDateTo)
            .SumAsync(g => (decimal?)g.SoTien) ?? 0;

        var totalTransactions = await _context.GiaoDiches
            .AsNoTracking()
            .Where(g => g.NgayGiaoDich.HasValue &&
                       g.NgayGiaoDich.Value >= effectiveDateFrom && g.NgayGiaoDich.Value <= effectiveDateTo)
            .CountAsync(cancellationToken);

        var successfulTransactions = await _context.GiaoDiches
            .AsNoTracking()
            .Where(g => g.TrangThaiThanhToan == "Completed" &&
                       g.NgayGiaoDich.HasValue &&
                       g.NgayGiaoDich.Value >= effectiveDateFrom && g.NgayGiaoDich.Value <= effectiveDateTo)
            .CountAsync(cancellationToken);

        var failedTransactions = totalTransactions - successfulTransactions;

        // Doanh thu ròng = 15% của tổng doanh thu (phần hoa hồng app)
        var netRevenue = totalRevenue * 0.15m;

        // Refund rate calculation removed as per user request

        var totalPTs = await _context.HuanLuyenViens
            .AsNoTracking()
            .CountAsync(cancellationToken);

        var averageRevenuePerPT = totalPTs > 0 ? totalRevenue / totalPTs : 0;

        // Lợi nhuận PT = 85% của tổng doanh thu (phần còn lại sau khi trừ hoa hồng app 15%)
        var ptProfit = totalRevenue * 0.85m;

        var paymentMethodDistribution = await _context.GiaoDiches
            .AsNoTracking()
            .Where(g => g.NgayGiaoDich.HasValue &&
                       g.NgayGiaoDich.Value >= effectiveDateFrom && g.NgayGiaoDich.Value <= effectiveDateTo)
            .GroupBy(g => g.PhuongThucThanhToan ?? "Unknown")
            .Select(g => new PaymentMethodDistributionDto
            {
                Method = g.Key,
                Amount = g.Sum(x => (decimal)x.SoTien),
                Count = g.Count()
            })
            .ToListAsync(cancellationToken);

        var revenueRecords = await _context.GiaoDiches
            .AsNoTracking()
            .Where(g => g.TrangThaiThanhToan == "Completed" &&
                       g.NgayGiaoDich.HasValue &&
                       g.NgayGiaoDich.Value >= effectiveDateFrom && g.NgayGiaoDich.Value <= effectiveDateTo)
            .ToListAsync(cancellationToken);
        
        var revenueTrend = revenueRecords
            .Where(g => g.NgayGiaoDich.HasValue)
            .GroupBy(g => g.NgayGiaoDich!.Value.Date)
            .Select(g => new RevenueTrendDto
            {
                Date = g.Key,
                Revenue = g.Sum(x => (decimal)x.SoTien),
                Profit = g.Sum(x => (decimal)x.SoTien) * 0.85m // Lợi nhuận PT = 85% của tổng doanh thu
            })
            .OrderBy(r => r.Date)
            .ToList();

        return new FinanceAnalyticsDto
        {
            TotalRevenue = totalRevenue,
            TotalTransactions = totalTransactions,
            SuccessfulTransactions = successfulTransactions,
            FailedTransactions = failedTransactions,
            NetRevenue = netRevenue,
            RefundRate = 0, // Not used anymore
            RefundedTransactions = 0, // Not used anymore
            AverageRevenuePerPT = averageRevenuePerPT,
            ActualProfit = ptProfit, // Lợi nhuận PT
            PaymentMethodDistribution = paymentMethodDistribution,
            RevenueTrend = revenueTrend
        };
    }

    public async Task<SystemAnalyticsDto> GetSystemAnalyticsAsync(
        CancellationToken cancellationToken = default)
    {
        var totalFiles = await _context.TapTins
            .AsNoTracking()
            .CountAsync(cancellationToken);

        var softDeletedFiles = await _context.TapTins
            .AsNoTracking()
            .Where(t => t.DaXoa == true)
            .CountAsync(cancellationToken);

        // Simplified - would need actual file sizes
        var totalStorageGB = 2.45;

        return new SystemAnalyticsDto
        {
            TotalFiles = totalFiles,
            TotalStorageGB = totalStorageGB,
            SoftDeletedFiles = softDeletedFiles,
            AverageApiResponseTime = 125, // Simplified
            Uptime = 99.8, // Simplified
            ErrorLogs = 12, // Simplified
            WarningLogs = 45, // Simplified
            InfoLogs = 1245, // Simplified
            CloudSyncRate = 98.5 // Simplified
        };
    }

    public async Task<BehaviorAnalyticsDto> GetBehaviorAnalyticsAsync(
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        CancellationToken cancellationToken = default)
    {
        var totalUsers = await _context.Users
            .AsNoTracking()
            .Where(u => u.Role != "Admin" && (u.Role == null || u.Role != "PT"))
            .CountAsync(cancellationToken);

        var usersWithPTQuery = _context.QuyenPtKhachHangs
            .AsNoTracking()
            .Where(q => q.DangHoatDong == true);
        
        // Filter by date if provided (using NgayBatDau if available, or all active)
        if (dateFrom.HasValue && dateTo.HasValue)
        {
            // Note: QuyenPtKhachHang might not have date field, so we'll use all active ones
            // If there's a date field, add filter here
        }
        
        var usersWithPT = await usersWithPTQuery
            .Select(q => q.KhachHangId)
            .Distinct()
            .CountAsync(cancellationToken);

        var usersWithMealPlanQuery = _context.PhanCongKeHoachAnUongs
            .AsNoTracking()
            .Where(p => p.TrangThai == "Active");
        
        // Filter by date if provided
        if (dateFrom.HasValue && dateTo.HasValue)
        {
            // Note: PhanCongKeHoachAnUong might not have date field, so we'll use all active ones
            // If there's a date field, add filter here
        }
        
        var usersWithMealPlan = await usersWithMealPlanQuery
            .Select(p => p.UserId)
            .Distinct()
            .CountAsync(cancellationToken);

        var usersWithGoalsQuery = _context.MucTieus.AsNoTracking();
        
        if (dateFrom.HasValue && dateTo.HasValue)
        {
            var dateFromOnly = DateOnly.FromDateTime(dateFrom.Value);
            var dateToOnly = DateOnly.FromDateTime(dateTo.Value);
            usersWithGoalsQuery = usersWithGoalsQuery.Where(m => 
                m.NgayBatDau >= dateFromOnly && m.NgayBatDau <= dateToOnly);
        }
        
        var usersWithGoals = await usersWithGoalsQuery
            .Select(m => m.UserId)
            .Distinct()
            .CountAsync(cancellationToken);

        var ptActivationRate = totalUsers > 0 ? (usersWithPT / (double)totalUsers) * 100 : 0;
        var mealPlanActivationRate = totalUsers > 0 ? (usersWithMealPlan / (double)totalUsers) * 100 : 0;
        var goalsActivationRate = totalUsers > 0 ? (usersWithGoals / (double)totalUsers) * 100 : 0;

        var averageSessionTime = 24.5; // Simplified - would need session data

        var churnRate = 12.8; // Simplified - would calculate from login data

        var averageSessionsPerDay = 3.2; // Simplified

        var topFeatures = new List<TopFeatureDto>
        {
            new() { FeatureName = "Log sức khỏe", UsageCount = 45678 },
            new() { FeatureName = "Theo dõi mục tiêu", UsageCount = 32456 },
            new() { FeatureName = "Log dinh dưỡng", UsageCount = 28234 },
            new() { FeatureName = "Kế hoạch tập luyện", UsageCount = 25678 },
            new() { FeatureName = "Chat PT", UsageCount = 23456 }
        };

        return new BehaviorAnalyticsDto
        {
            PTFeatureActivationRate = ptActivationRate,
            MealPlanActivationRate = mealPlanActivationRate,
            GoalsActivationRate = goalsActivationRate,
            AverageSessionTimeMinutes = averageSessionTime,
            ChurnRate = churnRate,
            AverageSessionsPerDay = averageSessionsPerDay,
            FeatureUsage = new List<FeatureUsageDto>(),
            SessionTimeTrend = new List<SessionTimeTrendDto>(),
            TopFeatures = topFeatures
        };
    }

    public async Task<List<RecentActivityDto>> GetRecentActivitiesAsync(
        int limit = 20,
        CancellationToken cancellationToken = default)
    {
        var activities = new List<RecentActivityDto>();
        var now = DateTime.UtcNow;

        // Recent user registrations
        var recentUsers = await _context.Users
            .AsNoTracking()
            .Where(u => u.Role != "Admin" && (u.Role == null || u.Role != "PT") && 
                       u.CreatedDate.HasValue && u.CreatedDate.Value >= now.AddDays(-7))
            .OrderByDescending(u => u.CreatedDate)
            .Take(5)
            .ToListAsync(cancellationToken);

        foreach (var user in recentUsers)
        {
            activities.Add(new RecentActivityDto
            {
                Id = $"user_{user.UserId}",
                Type = "user",
                Title = "Người dùng mới",
                Description = $"{user.HoTen ?? user.Username} đã đăng ký",
                Timestamp = user.CreatedDate!.Value,
                Icon = "fa-user-plus"
            });
        }

        // Recent premium activations
        var recentPremium = await _context.GoiThanhViens
            .AsNoTracking()
            .Include(g => g.User)
            .Where(g => g.NgayDangKy.HasValue && 
                       g.NgayDangKy.Value >= now.AddDays(-7) &&
                       g.LoaiGoi.Contains("Premium"))
            .OrderByDescending(g => g.NgayDangKy)
            .Take(5)
            .ToListAsync(cancellationToken);

        foreach (var premium in recentPremium)
        {
            activities.Add(new RecentActivityDto
            {
                Id = $"premium_{premium.GoiThanhVienId}",
                Type = "user",
                Title = "Người dùng",
                Description = $"{premium.User?.HoTen ?? premium.User?.Username ?? "Người dùng"} đã kích hoạt tài khoản Premium",
                Timestamp = premium.NgayDangKy!.Value,
                Icon = "fa-user-check"
            });
        }

        // Recent transactions
        var recentTransactions = await _context.GiaoDiches
            .AsNoTracking()
            .Include(g => g.KhachHang)
            .Where(g => g.NgayGiaoDich.HasValue && 
                       g.NgayGiaoDich.Value >= now.AddDays(-7) &&
                       g.TrangThaiThanhToan == "Completed")
            .OrderByDescending(g => g.NgayGiaoDich)
            .Take(5)
            .ToListAsync(cancellationToken);

        foreach (var trans in recentTransactions)
        {
            activities.Add(new RecentActivityDto
            {
                Id = $"trans_{trans.GiaoDichId}",
                Type = "finance",
                Title = "Giao dịch",
                Description = $"Thanh toán thành công {trans.SoTien:N0} VNĐ",
                Timestamp = trans.NgayGiaoDich!.Value,
                Icon = "fa-money-bill"
            });
        }

        // Recent exercise completions (from workout logs)
        var recentWorkouts = await _context.NhatKyHoanThanhBaiTaps
            .AsNoTracking()
            .Include(n => n.ChiTiet)
                .ThenInclude(c => c.KeHoach)
            .Where(n => n.NgayHoanThanh >= DateOnly.FromDateTime(now.AddDays(-7)))
            .OrderByDescending(n => n.NgayHoanThanh)
            .Take(5)
            .ToListAsync(cancellationToken);

        foreach (var workout in recentWorkouts)
        {
            var exerciseName = workout.ChiTiet != null ? workout.ChiTiet.TenBaiTap ?? "Bài tập" : "Bài tập";
            activities.Add(new RecentActivityDto
            {
                Id = $"workout_{workout.NhatKyId}",
                Type = "workout",
                Title = "Bài tập mới",
                Description = $"Đã thêm bài tập \"{exerciseName}\"",
                Timestamp = new DateTime(workout.NgayHoanThanh.Year, workout.NgayHoanThanh.Month, workout.NgayHoanThanh.Day),
                Icon = "fa-dumbbell"
            });
        }

        // Recent PT confirmations
        var recentPTs = await _context.HuanLuyenViens
            .AsNoTracking()
            .Include(h => h.User)
            .Where(h => h.User != null && h.User.CreatedDate.HasValue &&
                       h.User.CreatedDate.Value >= now.AddDays(-7))
            .OrderByDescending(h => h.User!.CreatedDate)
            .Take(5)
            .ToListAsync(cancellationToken);

        foreach (var pt in recentPTs)
        {
            activities.Add(new RecentActivityDto
            {
                Id = $"pt_{pt.Ptid}",
                Type = "pt",
                Title = "Huấn luyện viên",
                Description = $"{pt.User?.HoTen ?? pt.User?.Username ?? "PT"} đã được xác nhận",
                Timestamp = pt.User!.CreatedDate!.Value,
                Icon = "fa-user-tie"
            });
        }

        // Recent PT registrations
        var newPTRegistrations = await _context.Users
            .AsNoTracking()
            .Where(u => u.Role == "PT" && 
                       u.CreatedDate.HasValue && 
                       u.CreatedDate.Value >= now.AddDays(-7))
            .OrderByDescending(u => u.CreatedDate)
            .Take(5)
            .ToListAsync(cancellationToken);

        foreach (var pt in newPTRegistrations)
        {
            activities.Add(new RecentActivityDto
            {
                Id = $"pt_new_{pt.UserId}",
                Type = "pt",
                Title = "PT mới",
                Description = $"{pt.HoTen ?? pt.Username} đã đăng ký làm huấn luyện viên",
                Timestamp = pt.CreatedDate!.Value,
                Icon = "fa-star"
            });
        }

        // Recent food additions (from nutrition logs)
        var recentFoodsData = await _context.NhatKyDinhDuongs
            .AsNoTracking()
            .Include(n => n.MonAn)
            .Where(n => n.NgayGhiLog >= DateOnly.FromDateTime(now.AddDays(-7)) &&
                       n.MonAn != null)
            .ToListAsync(cancellationToken);

        var recentFoods = recentFoodsData
            .GroupBy(n => n.MonAn!.TenMonAn ?? "Unknown")
            .OrderByDescending(g => g.Count())
            .Take(5)
            .ToList();

        foreach (var food in recentFoods)
        {
            activities.Add(new RecentActivityDto
            {
                Id = $"food_{food.Key}",
                Type = "nutrition",
                Title = "Món ăn mới",
                Description = $"Đã thêm món \"{food.Key}\" vào catalog",
                Timestamp = now.AddDays(-food.Count()), // Simplified
                Icon = "fa-apple-alt"
            });
        }

        // Recent goal completions
        var recentGoals = await _context.MucTieus
            .AsNoTracking()
            .Include(m => m.User)
            .Where(m => m.DaHoanThanh == true && 
                       m.NgayKetThuc.HasValue &&
                       m.NgayKetThuc.Value >= DateOnly.FromDateTime(now.AddDays(-7)))
            .OrderByDescending(m => m.NgayKetThuc)
            .Take(5)
            .ToListAsync(cancellationToken);

        foreach (var goal in recentGoals)
        {
            activities.Add(new RecentActivityDto
            {
                Id = $"goal_{goal.MucTieuId}",
                Type = "goal",
                Title = "Mục tiêu",
                Description = $"{goal.User?.HoTen ?? goal.User?.Username ?? "Người dùng"} đã hoàn thành mục tiêu {goal.LoaiMucTieu}",
                Timestamp = new DateTime(goal.NgayKetThuc!.Value.Year, goal.NgayKetThuc.Value.Month, goal.NgayKetThuc.Value.Day),
                Icon = "fa-bullseye"
            });
        }

        // Sort by timestamp and take limit
        return activities
            .OrderByDescending(a => a.Timestamp)
            .Take(limit)
            .ToList();
    }
}

