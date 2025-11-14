using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HealthWeb.Models.ViewModels.Admin;

public class ExerciseDashboardDto
{
    public IEnumerable<ExerciseItemDto> Exercises { get; set; } = new List<ExerciseItemDto>();

    public ExerciseSummaryDto Summary { get; set; } = new();
}

public class ExerciseSummaryDto
{
    public int TotalExercises { get; set; }

    public int ActiveExercises { get; set; }

    public int HiddenExercises { get; set; }

    public double AverageDifficulty { get; set; }
}

public class ExerciseItemDto
{
    public int ExerciseId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string MuscleGroup { get; set; } = string.Empty;

    public int Difficulty { get; set; }

    public string DifficultyText { get; set; } = string.Empty;

    public string Equipment { get; set; } = string.Empty;

    public double CaloriesPerMinute { get; set; }

    public string? ImageUrl { get; set; }

    public string? VideoUrl { get; set; }

    public string? Warnings { get; set; }

    public string? Instructions { get; set; }

    public string? Description { get; set; }

    public bool Hidden { get; set; }

    public string CreatedAt { get; set; } = string.Empty;

    public int TimesUsed { get; set; }
}

public class ExerciseDetailDto : ExerciseItemDto
{
    // Có thể thêm các thuộc tính chi tiết khác nếu cần
}

public class ExerciseUpsertRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string MuscleGroup { get; set; } = string.Empty;

    [Range(1, 5)]
    public int Difficulty { get; set; }

    [Required]
    [MaxLength(200)]
    public string Equipment { get; set; } = string.Empty;

    [Range(0, double.MaxValue)]
    public double CaloriesPerMinute { get; set; }

    public string? ImageUrl { get; set; }

    public string? VideoUrl { get; set; }

    [MaxLength(500)]
    public string? Warnings { get; set; }

    [MaxLength(1000)]
    public string? Instructions { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    public bool Hidden { get; set; }
}

public class ToggleExerciseVisibilityRequest
{
    public bool Hidden { get; set; }
}
