using System;
using System.Collections.Generic;

namespace HealthWeb.Models.ViewModels.Admin;

public class StatisticsOverviewDto
{
    public int TotalUsers { get; set; }
    public int TotalTrainers { get; set; }
    public decimal MonthlyRevenue { get; set; }
    public int TodayActivity { get; set; }
    public double UserGrowthPercent { get; set; }
    public double TrainerGrowthPercent { get; set; }
    public double RevenueGrowthPercent { get; set; }
    public double ActivityGrowthPercent { get; set; }
}

public class UserAnalyticsDto
{
    public int TotalUsers { get; set; }
    public int NewRegistrationsToday { get; set; }
    public int NewRegistrationsThisMonth { get; set; }
    public int DailyActiveUsers { get; set; }
    public int MonthlyActiveUsers { get; set; }
    public double DailyActiveUsersPercent { get; set; }
    public double MonthlyActiveUsersPercent { get; set; }
    public double RetentionRate7Days { get; set; }
    public double RetentionRate30Days { get; set; }
    public int ActiveUsers { get; set; }
    public int LockedUsers { get; set; }
    public int SuspendedUsers { get; set; }
    public int UnverifiedUsers { get; set; }
    public GenderDistributionDto GenderDistribution { get; set; } = new();
    public AgeDistributionDto AgeDistribution { get; set; } = new();
    public List<RegistrationTrendDto> RegistrationTrend { get; set; } = new();
    public List<TopUserDto> TopUsers { get; set; } = new();
}

public class GenderDistributionDto
{
    public int Male { get; set; }
    public int Female { get; set; }
    public int Other { get; set; }
}

public class AgeDistributionDto
{
    public int Under18 { get; set; }
    public int Age18_25 { get; set; }
    public int Age26_45 { get; set; }
    public int Over45 { get; set; }
}

public class RegistrationTrendDto
{
    public DateTime Date { get; set; }
    public int Count { get; set; }
}

public class TopUserDto
{
    public string UserId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int HealthLogs { get; set; }
    public int Goals { get; set; }
}

public class PTAnalyticsDto
{
    public int TotalPTs { get; set; }
    public int NewRegistrations { get; set; }
    public int Verified { get; set; }
    public int Active { get; set; }
    public int OnLeave { get; set; }
    public int NotAcceptingClients { get; set; }
    public double AverageClientsPerPT { get; set; }
    public decimal AverageRevenuePerPT { get; set; }
    public double AverageRating { get; set; }
    public double CancelRate { get; set; }
    public int TotalBookings { get; set; }
    public int CancelledBookings { get; set; }
    public List<PTRevenueDto> PTRevenue { get; set; } = new();
    public List<TopPTDto> TopPTs { get; set; } = new();
}

public class PTRevenueDto
{
    public string PTId { get; set; } = string.Empty;
    public string PTName { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
}

public class TopPTDto
{
    public string PTId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public double Rating { get; set; }
}

public class HealthAnalyticsDto
{
    public double AverageBMI { get; set; }
    public double AverageHeight { get; set; }
    public double AverageWeight { get; set; }
    public double AverageSleepHours { get; set; }
    public double AverageWaterIntake { get; set; }
    public BMIDistributionDto BMIDistribution { get; set; } = new();
    public double HealthLogRate { get; set; }
    public int UsersLogging5DaysPerWeek { get; set; }
    public List<BMITrendDto> BMITrend { get; set; } = new();
    public List<DiseaseTrendDto> DiseaseTrend { get; set; } = new();
    public List<UserLevelDto> UserLevels { get; set; } = new();
}

public class BMIDistributionDto
{
    public double Normal { get; set; }
    public double Overweight { get; set; }
    public double Obese { get; set; }
    public double Underweight { get; set; }
}

public class BMITrendDto
{
    public DateTime Date { get; set; }
    public double AverageBMI { get; set; }
}

public class NutritionTrendDto
{
    public DateTime Date { get; set; }
    public double AverageCalories { get; set; }
}

public class ActivityTrendDto
{
    public DateTime Date { get; set; }
    public double AverageSteps { get; set; }
}

public class DiseaseTrendDto
{
    public DateTime Date { get; set; }
    public int UserCount { get; set; }
}

public class UserLevelDto
{
    public string Level { get; set; } = string.Empty;
    public int UserCount { get; set; }
}

public class GoalsAnalyticsDto
{
    public int TotalGoals { get; set; }
    public int CompletedGoals { get; set; }
    public int InProgressGoals { get; set; }
    public int CancelledGoals { get; set; }
    public double CompletedPercent { get; set; }
    public double InProgressPercent { get; set; }
    public double CancelledPercent { get; set; }
    public int AverageCompletionDays { get; set; }
    public List<GoalTypeDistributionDto> GoalTypeDistribution { get; set; } = new();
    public List<GoalCompletionByTypeDto> GoalCompletionByType { get; set; } = new();
    public List<TopGoalTypeDto> TopGoalTypes { get; set; } = new();
}

public class GoalTypeDistributionDto
{
    public string GoalType { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class GoalCompletionByTypeDto
{
    public string GoalType { get; set; } = string.Empty;
    public double CompletionRate { get; set; }
}

public class TopGoalTypeDto
{
    public string GoalType { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class WorkoutAnalyticsDto
{
    public int ActivePlans { get; set; }
    public double AverageExercisesPerPlan { get; set; }
    public double CompletionRate { get; set; }
    public int SystemCreatedPlans { get; set; }
    public int PTCreatedPlans { get; set; }
    public int UserCreatedPlans { get; set; }
    public double AverageCaloriesPerSession { get; set; }
    public List<WorkoutCompletionTrendDto> CompletionTrend { get; set; } = new();
    public List<WorkoutTypeDistributionDto> TypeDistribution { get; set; } = new();
    public List<TopExerciseDto> TopExercises { get; set; } = new();
}

public class WorkoutCompletionTrendDto
{
    public DateTime Date { get; set; }
    public double CompletionRate { get; set; }
}

public class WorkoutTypeDistributionDto
{
    public string Type { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class TopExerciseDto
{
    public string ExerciseName { get; set; } = string.Empty;
    public int CompletionCount { get; set; }
}

public class NutritionAnalyticsDto
{
    public int ActivePlans { get; set; }
    public int NewFoodsThisMonth { get; set; }
    public double AverageCaloriesPerDay { get; set; }
    public double CalorieGoalAchievementRate { get; set; }
    public MacroDistributionDto MacroDistribution { get; set; } = new();
    public List<CalorieTrendDto> CalorieTrend { get; set; } = new();
    public List<MacroDistributionDto> MacroTrend { get; set; } = new();
    public List<TopFoodDto> TopFoods { get; set; } = new();
    public List<TopFoodDto> Top3FavoriteFoods { get; set; } = new();
}

public class MacroDistributionDto
{
    public double Protein { get; set; }
    public double Carbs { get; set; }
    public double Fat { get; set; }
}

public class CalorieTrendDto
{
    public DateTime Date { get; set; }
    public double AverageCalories { get; set; }
}

public class TopFoodDto
{
    public string FoodName { get; set; } = string.Empty;
    public int LogCount { get; set; }
}

public class FinanceAnalyticsDto
{
    public decimal TotalRevenue { get; set; }
    public int TotalTransactions { get; set; }
    public int SuccessfulTransactions { get; set; }
    public int FailedTransactions { get; set; }
    public decimal NetRevenue { get; set; }
    public double RefundRate { get; set; }
    public int RefundedTransactions { get; set; }
    public decimal AverageRevenuePerPT { get; set; }
    public decimal ActualProfit { get; set; }
    public List<PaymentMethodDistributionDto> PaymentMethodDistribution { get; set; } = new();
    public List<RevenueTrendDto> RevenueTrend { get; set; } = new();
}

public class PaymentMethodDistributionDto
{
    public string Method { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public int Count { get; set; }
}

public class RevenueTrendDto
{
    public DateTime Date { get; set; }
    public decimal Revenue { get; set; }
    public decimal Profit { get; set; } // Lợi nhuận PT (85% của Revenue)
}

public class SystemAnalyticsDto
{
    public int TotalFiles { get; set; }
    public double TotalStorageGB { get; set; }
    public int SoftDeletedFiles { get; set; }
    public double AverageApiResponseTime { get; set; }
    public double Uptime { get; set; }
    public int ErrorLogs { get; set; }
    public int WarningLogs { get; set; }
    public int InfoLogs { get; set; }
    public double CloudSyncRate { get; set; }
}

public class BehaviorAnalyticsDto
{
    public double PTFeatureActivationRate { get; set; }
    public double MealPlanActivationRate { get; set; }
    public double GoalsActivationRate { get; set; }
    public double AverageSessionTimeMinutes { get; set; }
    public double ChurnRate { get; set; }
    public double AverageSessionsPerDay { get; set; }
    public List<FeatureUsageDto> FeatureUsage { get; set; } = new();
    public List<SessionTimeTrendDto> SessionTimeTrend { get; set; } = new();
    public List<TopFeatureDto> TopFeatures { get; set; } = new();
}

public class FeatureUsageDto
{
    public string FeatureName { get; set; } = string.Empty;
    public double UsageRate { get; set; }
}

public class SessionTimeTrendDto
{
    public DateTime Date { get; set; }
    public double AverageMinutes { get; set; }
}

public class TopFeatureDto
{
    public string FeatureName { get; set; } = string.Empty;
    public int UsageCount { get; set; }
}

public class RecentActivityDto
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // user, finance, workout, pt, nutrition, goal
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string Icon { get; set; } = string.Empty;
}

public class StatisticsDataDto
{
    public StatisticsOverviewDto Overview { get; set; } = new();
    public UserAnalyticsDto UserAnalytics { get; set; } = new();
    public PTAnalyticsDto PTAnalytics { get; set; } = new();
    public HealthAnalyticsDto HealthAnalytics { get; set; } = new();
    public GoalsAnalyticsDto GoalsAnalytics { get; set; } = new();
    public WorkoutAnalyticsDto WorkoutAnalytics { get; set; } = new();
    public NutritionAnalyticsDto NutritionAnalytics { get; set; } = new();
    public FinanceAnalyticsDto FinanceAnalytics { get; set; } = new();
    public SystemAnalyticsDto SystemAnalytics { get; set; } = new();
    public BehaviorAnalyticsDto BehaviorAnalytics { get; set; } = new();
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

