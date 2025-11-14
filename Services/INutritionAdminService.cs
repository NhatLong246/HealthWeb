using System.Threading;
using System.Threading.Tasks;
using HealthWeb.Models.ViewModels.Admin;

namespace HealthWeb.Services;

public interface INutritionAdminService
{
    Task<NutritionDashboardDto> GetNutritionDashboardAsync(CancellationToken cancellationToken = default);

    Task<NutritionFoodDetailDto?> GetFoodDetailAsync(string foodId, CancellationToken cancellationToken = default);

    Task<NutritionFoodItemDto> CreateFoodAsync(NutritionFoodUpsertRequest request, CancellationToken cancellationToken = default);

    Task<NutritionFoodItemDto?> UpdateFoodAsync(string foodId, NutritionFoodUpsertRequest request, CancellationToken cancellationToken = default);

    Task<bool> DeleteFoodAsync(string foodId, CancellationToken cancellationToken = default);

    Task<NutritionFoodItemDto?> SetFoodVisibilityAsync(string foodId, bool hidden, CancellationToken cancellationToken = default);
}

