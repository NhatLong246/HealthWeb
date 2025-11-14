using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HealthWeb.Models.ViewModels.Admin;

public class NutritionDashboardDto
{
    public IEnumerable<NutritionFoodItemDto> Foods { get; set; } = new List<NutritionFoodItemDto>();

    public NutritionSummaryDto Summary { get; set; } = new();
}

public class NutritionSummaryDto
{
    public int TotalFoods { get; set; }

    public int ActiveFoods { get; set; }

    public int HiddenFoods { get; set; }

    public double AverageCalories { get; set; }

    public double TotalProtein { get; set; }

    public double TotalFat { get; set; }

    public double TotalCarb { get; set; }
}

public class NutritionFoodItemDto
{
    public string FoodId { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public string? ImageUrl { get; set; }

    public double Calories { get; set; }

    public double Protein { get; set; }

    public double Fat { get; set; }

    public double Carb { get; set; }

    public bool Hidden { get; set; }
}

public class NutritionFoodDetailDto : NutritionFoodItemDto
{
    public double ProteinPercentage { get; set; }

    public double FatPercentage { get; set; }

    public double CarbPercentage { get; set; }
}

public class NutritionFoodUpsertRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Unit { get; set; } = string.Empty;

    // ImageUrl có thể là null hoặc URL hợp lệ, nhưng không bắt buộc
    public string? ImageUrl { get; set; }

    [Range(0, double.MaxValue)]
    public double Calories { get; set; }

    [Range(0, double.MaxValue)]
    public double Protein { get; set; }

    [Range(0, double.MaxValue)]
    public double Fat { get; set; }

    [Range(0, double.MaxValue)]
    public double Carb { get; set; }

    public bool Hidden { get; set; }
}

public class ToggleFoodVisibilityRequest
{
    public bool Hidden { get; set; }
}

