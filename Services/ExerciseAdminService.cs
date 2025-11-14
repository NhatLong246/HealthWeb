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

public class ExerciseAdminService : IExerciseAdminService
{
    private readonly ApplicationDbContext _context;

    public ExerciseAdminService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ExerciseDashboardDto> GetExerciseDashboardAsync(CancellationToken cancellationToken = default)
    {
        // Lấy tất cả các mẫu bài tập và chi tiết của chúng
        // Optimized: AsNoTracking() first, then Include() to avoid tracking overhead
        var templates = await _context.MauTapLuyens
            .AsNoTracking()
            .Include(t => t.ChiTietMauTapLuyens)
            .OrderBy(t => t.TenMauTapLuyen)
            .ToListAsync(cancellationToken);

        var exercises = new List<ExerciseItemDto>();
        foreach (var template in templates)
        {
            // Nếu có chi tiết bài tập, tạo các item từ chi tiết
            if (template.ChiTietMauTapLuyens != null && template.ChiTietMauTapLuyens.Any())
            {
                foreach (var detail in template.ChiTietMauTapLuyens)
                {
                    exercises.Add(ToExerciseItemDto(template, detail));
                }
            }
            else
            {
                // Nếu không có chi tiết, sử dụng chính mẫu bài tập
                exercises.Add(ToExerciseItemDto(template));
            }
        }

        var summary = BuildSummary(exercises);

        return new ExerciseDashboardDto
        {
            Exercises = exercises,
            Summary = summary
        };
    }

    public async Task<ExerciseDetailDto?> GetExerciseDetailAsync(int exerciseId, CancellationToken cancellationToken = default)
    {
        // Tìm chi tiết bài tập
        // Optimized: AsNoTracking() first, then Include()
        var detail = await _context.ChiTietMauTapLuyens
            .AsNoTracking()
            .Include(d => d.MauTapLuyen)
            .Where(d => d.BaiTapId == exerciseId)
            .FirstOrDefaultAsync(cancellationToken);

        if (detail == null)
        {
            // Nếu không tìm thấy chi tiết, tìm trong mẫu bài tập
            var template = await _context.MauTapLuyens
                .AsNoTracking()
                .Where(t => t.MauTapLuyenId == exerciseId)
                .FirstOrDefaultAsync(cancellationToken);

            if (template == null)
            {
                return null;
            }

            return ToExerciseDetailDto(template);
        }

        return ToExerciseDetailDto(detail.MauTapLuyen, detail);
    }

    public async Task<ExerciseItemDto> CreateExerciseAsync(ExerciseUpsertRequest request, CancellationToken cancellationToken = default)
    {
        if (request == null)
        {
            throw new ArgumentNullException(nameof(request));
        }

        // Tạo mẫu bài tập mới
        var template = new MauTapLuyen
        {
            TenMauTapLuyen = request.Name?.Trim() ?? string.Empty,
            MoTa = request.Description?.Trim(),
            DoKho = MapDifficultyToString(request.Difficulty),
            MucTieu = request.MuscleGroup?.Trim(),
            CaloUocTinh = (int)Math.Round(request.CaloriesPerMinute * 60), // Chuyển từ calo/phút sang calo/giờ
            ThietBiCan = request.Equipment?.Trim(),
            CongKhai = !request.Hidden,
            DaXacThuc = true,
            SoLanSuDung = 0,
            DiemTrungBinh = 0,
            NgayTao = DateTime.UtcNow,
            NgayChinhSua = DateTime.UtcNow
        };

        _context.MauTapLuyens.Add(template);
        await _context.SaveChangesAsync(cancellationToken);

        // Tạo chi tiết bài tập
        var detail = new ChiTietMauTapLuyen
        {
            MauTapLuyenId = template.MauTapLuyenId,
            TenbaiTap = request.Name?.Trim() ?? string.Empty,
            VideoUrl = NormalizeVideoUrl(request.VideoUrl),
            GhiChu = request.Warnings?.Trim() ?? request.Instructions?.Trim(),
            ThoiLuongPhut = 30, // Mặc định 30 phút
            ThuTuHienThi = 1,
            Tuan = 1,
            NgayTrongTuan = 1
        };

        _context.ChiTietMauTapLuyens.Add(detail);
        await _context.SaveChangesAsync(cancellationToken);

        return ToExerciseItemDto(template, detail);
    }

    public async Task<ExerciseItemDto?> UpdateExerciseAsync(int exerciseId, ExerciseUpsertRequest request, CancellationToken cancellationToken = default)
    {
        if (request == null)
        {
            return null;
        }

        // Tìm chi tiết bài tập
        var detail = await _context.ChiTietMauTapLuyens
            .Include(d => d.MauTapLuyen)
            .Where(d => d.BaiTapId == exerciseId)
            .FirstOrDefaultAsync(cancellationToken);

        if (detail == null)
        {
            // Nếu không tìm thấy chi tiết, tìm trong mẫu bài tập
            var template = await _context.MauTapLuyens
                .Where(t => t.MauTapLuyenId == exerciseId)
                .FirstOrDefaultAsync(cancellationToken);

            if (template == null)
            {
                return null;
            }

            // Cập nhật mẫu bài tập
            template.TenMauTapLuyen = request.Name?.Trim() ?? string.Empty;
            template.MoTa = request.Description?.Trim();
            template.DoKho = MapDifficultyToString(request.Difficulty);
            template.MucTieu = request.MuscleGroup?.Trim();
            template.CaloUocTinh = (int)Math.Round(request.CaloriesPerMinute * 60);
            template.ThietBiCan = request.Equipment?.Trim();
            template.CongKhai = !request.Hidden;
            template.NgayChinhSua = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            return ToExerciseItemDto(template);
        }

        // Cập nhật mẫu bài tập
        detail.MauTapLuyen.TenMauTapLuyen = request.Name?.Trim() ?? string.Empty;
        detail.MauTapLuyen.MoTa = request.Description?.Trim();
        detail.MauTapLuyen.DoKho = MapDifficultyToString(request.Difficulty);
        detail.MauTapLuyen.MucTieu = request.MuscleGroup?.Trim();
        detail.MauTapLuyen.CaloUocTinh = (int)Math.Round(request.CaloriesPerMinute * 60);
        detail.MauTapLuyen.ThietBiCan = request.Equipment?.Trim();
        detail.MauTapLuyen.CongKhai = !request.Hidden;
        detail.MauTapLuyen.NgayChinhSua = DateTime.UtcNow;

        // Cập nhật chi tiết bài tập
        detail.TenbaiTap = request.Name?.Trim() ?? string.Empty;
        detail.VideoUrl = NormalizeVideoUrl(request.VideoUrl);
        detail.GhiChu = request.Warnings?.Trim() ?? request.Instructions?.Trim();

        await _context.SaveChangesAsync(cancellationToken);

        return ToExerciseItemDto(detail.MauTapLuyen, detail);
    }

    public async Task<bool> DeleteExerciseAsync(int exerciseId, CancellationToken cancellationToken = default)
    {
        // Tìm chi tiết bài tập
        var detail = await _context.ChiTietMauTapLuyens
            .Include(d => d.MauTapLuyen)
            .Where(d => d.BaiTapId == exerciseId)
            .FirstOrDefaultAsync(cancellationToken);

        if (detail != null)
        {
            // Xóa chi tiết bài tập
            _context.ChiTietMauTapLuyens.Remove(detail);

            // Kiểm tra xem mẫu bài tập còn chi tiết nào không
            var hasOtherDetails = await _context.ChiTietMauTapLuyens
                .AnyAsync(d => d.MauTapLuyenId == detail.MauTapLuyenId && d.BaiTapId != exerciseId, cancellationToken);

            // Nếu không còn chi tiết nào, xóa mẫu bài tập
            if (!hasOtherDetails)
            {
                _context.MauTapLuyens.Remove(detail.MauTapLuyen);
            }

            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        // Nếu không tìm thấy chi tiết, tìm trong mẫu bài tập
        var template = await _context.MauTapLuyens
            .Where(t => t.MauTapLuyenId == exerciseId)
            .FirstOrDefaultAsync(cancellationToken);

        if (template != null)
        {
            _context.MauTapLuyens.Remove(template);
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        return false;
    }

    public async Task<ExerciseItemDto?> SetExerciseVisibilityAsync(int exerciseId, bool hidden, CancellationToken cancellationToken = default)
    {
        // Tìm chi tiết bài tập
        var detail = await _context.ChiTietMauTapLuyens
            .Include(d => d.MauTapLuyen)
            .Where(d => d.BaiTapId == exerciseId)
            .FirstOrDefaultAsync(cancellationToken);

        if (detail != null)
        {
            detail.MauTapLuyen.CongKhai = !hidden;
            detail.MauTapLuyen.NgayChinhSua = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
            return ToExerciseItemDto(detail.MauTapLuyen, detail);
        }

        // Nếu không tìm thấy chi tiết, tìm trong mẫu bài tập
        var template = await _context.MauTapLuyens
            .Where(t => t.MauTapLuyenId == exerciseId)
            .FirstOrDefaultAsync(cancellationToken);

        if (template != null)
        {
            template.CongKhai = !hidden;
            template.NgayChinhSua = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
            return ToExerciseItemDto(template);
        }

        return null;
    }

    private static ExerciseItemDto ToExerciseItemDto(MauTapLuyen template, ChiTietMauTapLuyen? detail = null)
    {
        var exerciseName = detail?.TenbaiTap ?? template.TenMauTapLuyen;
        var videoUrl = detail?.VideoUrl ?? null;
        var warnings = detail?.GhiChu ?? null;
        // Instructions có thể từ GhiChu của ChiTietMauTapLuyen hoặc MoTa của MauTapLuyen
        // Nếu có GhiChu, dùng nó, nếu không có thì dùng MoTa
        var instructions = !string.IsNullOrWhiteSpace(detail?.GhiChu) 
            ? detail.GhiChu 
            : template.MoTa;

        // Sử dụng MucTieu trực tiếp từ database
        var muscleGroup = !string.IsNullOrWhiteSpace(template.MucTieu) 
            ? template.MucTieu.Trim() 
            : "Toàn thân";
        var difficulty = MapDifficultyToInt(template.DoKho);
        var equipment = !string.IsNullOrWhiteSpace(template.ThietBiCan) 
            ? template.ThietBiCan.Trim() 
            : "Không cần";
        // CaloUocTinh trong database là calo/giờ, chuyển sang calo/phút
        var caloriesPerMinute = template.CaloUocTinh.HasValue && template.CaloUocTinh.Value > 0
            ? Math.Round(template.CaloUocTinh.Value / 60.0, 1)
            : 0;
        var hidden = !(template.CongKhai ?? true);
        var createdAt = template.NgayTao?.ToString("yyyy-MM-dd") ?? DateTime.UtcNow.ToString("yyyy-MM-dd");
        var timesUsed = template.SoLanSuDung ?? 0;
        var difficultyText = MapDifficultyToVietnamese(template.DoKho);

        return new ExerciseItemDto
        {
            ExerciseId = detail?.BaiTapId ?? template.MauTapLuyenId,
            Name = exerciseName,
            MuscleGroup = muscleGroup,
            Difficulty = difficulty,
            DifficultyText = difficultyText,
            Equipment = equipment,
            CaloriesPerMinute = caloriesPerMinute,
            ImageUrl = null, // Database không có image URL
            VideoUrl = videoUrl,
            Warnings = warnings,
            Instructions = instructions,
            Description = template.MoTa,
            Hidden = hidden,
            CreatedAt = createdAt,
            TimesUsed = timesUsed
        };
    }

    private static ExerciseDetailDto ToExerciseDetailDto(MauTapLuyen template, ChiTietMauTapLuyen? detail = null)
    {
        var item = ToExerciseItemDto(template, detail);
        return new ExerciseDetailDto
        {
            ExerciseId = item.ExerciseId,
            Name = item.Name,
            MuscleGroup = item.MuscleGroup,
            Difficulty = item.Difficulty,
            Equipment = item.Equipment,
            CaloriesPerMinute = item.CaloriesPerMinute,
            ImageUrl = item.ImageUrl,
            VideoUrl = item.VideoUrl,
            Warnings = item.Warnings,
            Instructions = item.Instructions,
            Description = item.Description,
            Hidden = item.Hidden,
            CreatedAt = item.CreatedAt,
            TimesUsed = item.TimesUsed
        };
    }

    private static int MapDifficultyToInt(string? doKho)
    {
        if (string.IsNullOrWhiteSpace(doKho))
            return 3;

        var difficulty = doKho.ToLower();
        if (difficulty.Contains("beginner") || difficulty.Contains("rất dễ") || difficulty.Contains("dễ"))
            return 2;
        if (difficulty.Contains("intermediate") || difficulty.Contains("trung bình"))
            return 3;
        if (difficulty.Contains("advanced") || difficulty.Contains("khó") || difficulty.Contains("rất khó"))
            return 4;

        return 3;
    }

    public static string MapDifficultyToVietnamese(string? doKho)
    {
        if (string.IsNullOrWhiteSpace(doKho))
            return "Trung bình";

        var difficulty = doKho.ToLower();
        if (difficulty.Contains("beginner"))
            return "Dễ";
        if (difficulty.Contains("intermediate"))
            return "Trung bình";
        if (difficulty.Contains("advanced"))
            return "Khó";

        // Nếu đã là tiếng Việt, trả về nguyên bản
        return doKho;
    }

    private static string MapDifficultyToString(int difficulty)
    {
        return difficulty switch
        {
            1 => "Beginner",
            2 => "Beginner",
            3 => "Intermediate",
            4 => "Advanced",
            5 => "Advanced",
            _ => "Intermediate"
        };
    }

    private static ExerciseSummaryDto BuildSummary(IReadOnlyCollection<ExerciseItemDto> exercises)
    {
        if (exercises.Count == 0)
        {
            return new ExerciseSummaryDto();
        }

        var activeExercises = exercises.Where(e => !e.Hidden).ToList();
        var hiddenExercises = exercises.Count - activeExercises.Count;

        var avgDifficulty = activeExercises.Count > 0
            ? activeExercises.Average(e => e.Difficulty)
            : 0;

        return new ExerciseSummaryDto
        {
            TotalExercises = exercises.Count,
            ActiveExercises = activeExercises.Count,
            HiddenExercises = hiddenExercises,
            AverageDifficulty = Math.Round(avgDifficulty, 1)
        };
    }

    private static string? NormalizeVideoUrl(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return null;
        }

        return input.Trim();
    }

    public async Task<List<string>> GetDistinctMuscleGroupsAsync(CancellationToken cancellationToken = default)
    {
        var muscleGroups = await _context.MauTapLuyens
            .Where(m => !string.IsNullOrWhiteSpace(m.MucTieu))
            .Select(m => m.MucTieu!.Trim())
            .Distinct()
            .OrderBy(m => m)
            .ToListAsync(cancellationToken);

        return muscleGroups;
    }

    public async Task<List<string>> GetDistinctEquipmentAsync(CancellationToken cancellationToken = default)
    {
        var equipment = await _context.MauTapLuyens
            .Where(m => !string.IsNullOrWhiteSpace(m.ThietBiCan))
            .Select(m => m.ThietBiCan!.Trim())
            .Distinct()
            .OrderBy(m => m)
            .ToListAsync(cancellationToken);

        return equipment;
    }
}
