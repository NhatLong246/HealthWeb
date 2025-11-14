using System;
using System.Threading;
using System.Threading.Tasks;
using HealthWeb.Models.ViewModels.Admin;

namespace HealthWeb.Services;

public interface IStatisticsService
{
    Task<StatisticsDataDto> GetStatisticsDataAsync(
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        CancellationToken cancellationToken = default);
    
    Task<UserAnalyticsDto> GetUserAnalyticsAsync(
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        CancellationToken cancellationToken = default);
    
    Task<PTAnalyticsDto> GetPTAnalyticsAsync(
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        CancellationToken cancellationToken = default);
    
    Task<HealthAnalyticsDto> GetHealthAnalyticsAsync(
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        CancellationToken cancellationToken = default);
    
    Task<GoalsAnalyticsDto> GetGoalsAnalyticsAsync(
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        CancellationToken cancellationToken = default);
    
    Task<WorkoutAnalyticsDto> GetWorkoutAnalyticsAsync(
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        CancellationToken cancellationToken = default);
    
    Task<NutritionAnalyticsDto> GetNutritionAnalyticsAsync(
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        CancellationToken cancellationToken = default);
    
    Task<FinanceAnalyticsDto> GetFinanceAnalyticsAsync(
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        CancellationToken cancellationToken = default);
    
    Task<SystemAnalyticsDto> GetSystemAnalyticsAsync(
        CancellationToken cancellationToken = default);
    
    Task<BehaviorAnalyticsDto> GetBehaviorAnalyticsAsync(
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        CancellationToken cancellationToken = default);
    
    Task<List<RecentActivityDto>> GetRecentActivitiesAsync(
        int limit = 20,
        CancellationToken cancellationToken = default);
}

