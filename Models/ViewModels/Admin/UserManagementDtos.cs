using System;
using System.Collections.Generic;

namespace HealthWeb.Models.ViewModels.Admin;

public class UserManagementDataDto
{
    public IEnumerable<UserCardDto> Users { get; set; } = Array.Empty<UserCardDto>();

    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

    public UserManagementSummaryDto Summary { get; set; } = new();
}

public class UserManagementSummaryDto
{
    public int TotalUsers { get; set; }

    public double AverageGoalCompletion { get; set; }

    public int TotalHealthAlerts { get; set; }

    public int TotalExercises { get; set; }

    public int TotalMissedWorkoutAlerts { get; set; }

    public int TotalMenus { get; set; }
}

public class UserCardDto
{
    public string UserId { get; set; } = string.Empty;

    public string Username { get; set; } = string.Empty;

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Role { get; set; } = "Client";

    public string Status { get; set; } = "Active";

    public DateTime? CreatedDate { get; set; }

    public DateTime? LastLogin { get; set; }

    public int Streak { get; set; }

    public DateTime? LastLogDate { get; set; }

    public double GoalCompletion { get; set; }

    public int OpenGoals { get; set; }

    public double NutritionCompliance { get; set; }

    public double WorkoutCompliance { get; set; }

    public int HealthAlerts { get; set; }

    public int Exercises { get; set; }

    public int MissedWorkoutAlerts { get; set; }

    public int Menus { get; set; }

    public string Language { get; set; } = "vi";

    public string Timezone { get; set; } = "SE Asia Standard Time";

    public DateTime? DateOfBirth { get; set; }

    public string? Gender { get; set; }

    public string? TrainingGoal { get; set; }

    public string? AvatarUrl { get; set; }
}

public class UserProfileDetailDto
{
    public IEnumerable<UserHealthRecordDto> HealthRecords { get; set; } = Array.Empty<UserHealthRecordDto>();

    public IEnumerable<UserGoalDto> Goals { get; set; } = Array.Empty<UserGoalDto>();

    public IEnumerable<UserWorkoutPlanDto> WorkoutPlans { get; set; } = Array.Empty<UserWorkoutPlanDto>();

    public IEnumerable<UserNutritionPlanDto> NutritionPlans { get; set; } = Array.Empty<UserNutritionPlanDto>();

    public IEnumerable<UserAchievementDto> Achievements { get; set; } = Array.Empty<UserAchievementDto>();

    public IEnumerable<UserNotificationDto> Notifications { get; set; } = Array.Empty<UserNotificationDto>();

    public IEnumerable<UserTransactionDto> Transactions { get; set; } = Array.Empty<UserTransactionDto>();

    public IEnumerable<UserPtAccessDto> PtAccesses { get; set; } = Array.Empty<UserPtAccessDto>();
}

public class UserHealthRecordDto
{
    public string RecordId { get; set; } = string.Empty;

    public DateTime? Date { get; set; }

    public int? Steps { get; set; }

    public double? Calories { get; set; }

    public double? SleepHours { get; set; }

    public double? Weight { get; set; }

    public double? Height { get; set; }

    public double? Bmi { get; set; }

    public double? WaterIntake { get; set; }

    public string? DiseaseCode { get; set; }

    public string? DiseaseName { get; set; }

    public string? Notes { get; set; }
}

public class UserGoalDto
{
    public string GoalId { get; set; } = string.Empty;

    public string GoalType { get; set; } = string.Empty;

    public double TargetValue { get; set; }

    public double? CurrentProgress { get; set; }

    public DateTime StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    public bool IsCompleted { get; set; }

    public string? Notes { get; set; }
}

public class UserWorkoutPlanDto
{
    public int AssignmentId { get; set; }

    public string PlanName { get; set; } = string.Empty;

    public string? PlanGoal { get; set; }

    public string Status { get; set; } = string.Empty;

    public DateTime StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    public int? CurrentWeek { get; set; }

    public double? CompletionRate { get; set; }

    public string? AssignedBy { get; set; }
}

public class UserNutritionPlanDto
{
    public int AssignmentId { get; set; }

    public string PlanName { get; set; } = string.Empty;

    public string? PlanType { get; set; }

    public string Status { get; set; } = string.Empty;

    public DateTime StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    public double? AdherenceRate { get; set; }

    public string? AssignedBy { get; set; }
}

public class UserAchievementDto
{
    public int AchievementId { get; set; }

    public string BadgeName { get; set; } = string.Empty;

    public int Score { get; set; }

    public DateTime? AchievedAt { get; set; }

    public string? Description { get; set; }
}

public class UserNotificationDto
{
    public int NotificationId { get; set; }

    public string? Type { get; set; }

    public string Content { get; set; } = string.Empty;

    public DateTime? CreatedAt { get; set; }

    public bool IsRead { get; set; }
}

public class UserTransactionDto
{
    public string TransactionId { get; set; } = string.Empty;

    public string? BookingId { get; set; }

    public double Amount { get; set; }

    public double? Commission { get; set; }

    public double? NetAmount { get; set; }

    public string? Method { get; set; }

    public string Status { get; set; } = string.Empty;

    public DateTime? CreatedAt { get; set; }
}

public class UserPtAccessDto
{
    public int AccessId { get; set; }

    public string PtId { get; set; } = string.Empty;

    public string PtName { get; set; } = string.Empty;

    public DateTime? GrantedAt { get; set; }

    public bool IsActive { get; set; }
}

