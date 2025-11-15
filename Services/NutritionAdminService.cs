using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using HealthWeb.Models.EF;
using HealthWeb.Models.Entities;
using HealthWeb.Models.ViewModels.Admin;
using Microsoft.EntityFrameworkCore;

namespace HealthWeb.Services;

public class NutritionAdminService : INutritionAdminService
{
    private readonly ApplicationDbContext _context;

    public NutritionAdminService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<NutritionDashboardDto> GetNutritionDashboardAsync(CancellationToken cancellationToken = default)
    {
        var foods = await _context.DinhDuongMonAns
            .AsNoTracking()
            .OrderBy(f => f.TenMonAn)
            .ToListAsync(cancellationToken);

        var items = foods.Select(ToFoodItemDto).ToList();

        var summary = BuildSummary(items);

        return new NutritionDashboardDto
        {
            Foods = items,
            Summary = summary
        };
    }

    public async Task<NutritionFoodDetailDto?> GetFoodDetailAsync(string foodId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(foodId))
        {
            return null;
        }

        var food = await _context.DinhDuongMonAns
            .AsNoTracking()
            .Where(f => f.MonAnId == foodId)
            .FirstOrDefaultAsync(cancellationToken);

        return food == null ? null : BuildDetail(ToFoodItemDto(food));
    }

    public async Task<NutritionFoodItemDto> CreateFoodAsync(NutritionFoodUpsertRequest request, CancellationToken cancellationToken = default)
    {
        if (request == null)
        {
            throw new ArgumentNullException(nameof(request));
        }

        var entity = new DinhDuongMonAn
        {
            MonAnId = await GenerateFoodIdAsync(cancellationToken),
            TenMonAn = request.Name?.Trim(),
            DonViTinh = request.Unit?.Trim(),
            HinhAnh = NormalizeImageUrl(request.ImageUrl),
            LuongCalo = request.Calories,
            Protein = request.Protein,
            ChatBeo = request.Fat,
            Carbohydrate = request.Carb
            // IsHidden không tồn tại trong database, không lưu
        };

        _context.DinhDuongMonAns.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return ToFoodItemDto(entity);
    }

    public async Task<NutritionFoodItemDto?> UpdateFoodAsync(string foodId, NutritionFoodUpsertRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(foodId) || request == null)
        {
            return null;
        }

        var entity = await _context.DinhDuongMonAns
            .Where(f => f.MonAnId == foodId)
            .FirstOrDefaultAsync(cancellationToken);

        if (entity == null)
        {
            return null;
        }

        entity.TenMonAn = request.Name?.Trim();
        entity.DonViTinh = request.Unit?.Trim();
        entity.HinhAnh = NormalizeImageUrl(request.ImageUrl);
        entity.LuongCalo = request.Calories;
        entity.Protein = request.Protein;
        entity.ChatBeo = request.Fat;
        entity.Carbohydrate = request.Carb;
        // IsHidden không tồn tại trong database, không lưu

        await _context.SaveChangesAsync(cancellationToken);

        return ToFoodItemDto(entity);
    }

    public async Task<bool> DeleteFoodAsync(string foodId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(foodId))
        {
            return false;
        }

        var entity = await _context.DinhDuongMonAns
            .Where(f => f.MonAnId == foodId)
            .FirstOrDefaultAsync(cancellationToken);

        if (entity == null)
        {
            return false;
        }

        _context.DinhDuongMonAns.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<NutritionFoodItemDto?> SetFoodVisibilityAsync(string foodId, bool hidden, CancellationToken cancellationToken = default)
    {
        // Chức năng ẩn/hiện không được hỗ trợ vì database không có cột IsHidden
        // Trả về food item hiện tại với trạng thái không thay đổi
        if (string.IsNullOrWhiteSpace(foodId))
        {
            return null;
        }

        var entity = await _context.DinhDuongMonAns
            .Where(f => f.MonAnId == foodId)
            .FirstOrDefaultAsync(cancellationToken);

        if (entity == null)
        {
            return null;
        }

        // Không lưu vào database vì không có cột IsHidden
        // Chỉ trả về DTO với Hidden = false (vì tất cả đều hiển thị)
        return ToFoodItemDto(entity);
    }

    private static NutritionFoodItemDto ToFoodItemDto(DinhDuongMonAn entity)
    {
        if (entity == null)
    {
            throw new ArgumentNullException(nameof(entity));
        }

        return new NutritionFoodItemDto
        {
            FoodId = entity.MonAnId ?? string.Empty,
            Name = entity.TenMonAn ?? string.Empty,
            Unit = entity.DonViTinh ?? string.Empty,
            ImageUrl = string.IsNullOrWhiteSpace(entity.HinhAnh) ? null : entity.HinhAnh,
            Calories = entity.LuongCalo ?? 0,
            Protein = entity.Protein ?? 0,
            Fat = entity.ChatBeo ?? 0,
            Carb = entity.Carbohydrate ?? 0,
            Hidden = false // Database không có cột IsHidden, luôn trả về false (hiển thị)
        };
    }

    private static NutritionSummaryDto BuildSummary(IReadOnlyCollection<NutritionFoodItemDto> foods)
    {
        if (foods.Count == 0)
        {
            return new NutritionSummaryDto();
        }

        var activeCount = foods.Count(f => !f.Hidden);
        var hiddenCount = foods.Count - activeCount;

        var avgCalories = foods.Count > 0 ? foods.Average(f => f.Calories) : 0;
        var totalProtein = foods.Sum(f => f.Protein);
        var totalFat = foods.Sum(f => f.Fat);
        var totalCarb = foods.Sum(f => f.Carb);

        return new NutritionSummaryDto
        {
            TotalFoods = foods.Count,
            ActiveFoods = activeCount,
            HiddenFoods = hiddenCount,
            AverageCalories = Math.Round(avgCalories, 2),
            TotalProtein = Math.Round(totalProtein, 2),
            TotalFat = Math.Round(totalFat, 2),
            TotalCarb = Math.Round(totalCarb, 2)
        };
    }

    private static NutritionFoodDetailDto BuildDetail(NutritionFoodItemDto item)
    {
        var totalMacro = item.Protein + item.Fat + item.Carb;
        double SafePercent(double value) => totalMacro > 0 ? Math.Round(value / totalMacro * 100, 2) : 0;

        return new NutritionFoodDetailDto
        {
            FoodId = item.FoodId,
            Name = item.Name,
            Unit = item.Unit,
            ImageUrl = item.ImageUrl,
            Calories = item.Calories,
            Protein = item.Protein,
            Fat = item.Fat,
            Carb = item.Carb,
            Hidden = item.Hidden,
            ProteinPercentage = SafePercent(item.Protein),
            FatPercentage = SafePercent(item.Fat),
            CarbPercentage = SafePercent(item.Carb)
        };
    }

    private async Task<string> GenerateFoodIdAsync(CancellationToken cancellationToken)
    {
        const string prefix = "monan_";
        while (true)
        {
            var suffix = Guid.NewGuid().ToString("N")[..8];
            var candidate = $"{prefix}{suffix}";
            var exists = await _context.DinhDuongMonAns
                .AnyAsync(f => f.MonAnId == candidate, cancellationToken);

            if (!exists)
            {
                return candidate;
            }
        }
    }

    private static string? NormalizeImageUrl(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return null;
        }

        var trimmed = input.Trim();
        
        // Đảm bảo URL hợp lệ (có thể là URL từ Unsplash hoặc đường dẫn local)
        if (trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("/", StringComparison.OrdinalIgnoreCase))
        {
            return trimmed;
        }
        
        // Nếu không phải URL hợp lệ, trả về null
        return null;
    }
}

