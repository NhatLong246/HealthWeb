namespace HealthWeb.Helpers;

public static class NutritionCalculationHelper
{
    /// <summary>
    /// Tính toán giá trị dinh dưỡng dựa trên đơn vị
    /// Với đơn vị "cái" hoặc "chén": tính trực tiếp (giá trị DB đã là cho 1 cái/chén)
    /// Với đơn vị "g" hoặc "ml": chia 100 (giá trị DB là cho 100g/ml)
    /// </summary>
    public static double CalculateNutritionValue(double? baseValue, double? quantity, string? unit)
    {
        if (!baseValue.HasValue || !quantity.HasValue || quantity.Value <= 0)
            return 0;

        var unitLower = (unit ?? "").ToLower().Trim();
        // Với đơn vị "cái" hoặc "chén" thì tính trực tiếp (giá trị DB đã là cho 1 cái/chén)
        // Với đơn vị "g" hoặc "ml" thì chia 100 (giá trị DB là cho 100g/ml)
        if (unitLower == "cái" || unitLower == "chén")
        {
            return baseValue.Value * quantity.Value;
        }
        else
        {
            // Mặc định chia 100 cho g, ml, và các đơn vị khác
            return baseValue.Value * quantity.Value / 100;
        }
    }
}

