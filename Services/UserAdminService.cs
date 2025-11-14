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

public class UserAdminService : IUserAdminService
{
    private readonly ApplicationDbContext _context;

    public UserAdminService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<UserManagementDataDto> GetUserManagementDataAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            // Only get Client users (exclude PT and Admin)
            // Client: Role is null, "Client", or any value other than "PT" or "Admin"
            // Optimized: Use AsNoTracking() and eager load all needed navigation properties in one query
            var clientUsers = await _context.Users
                .AsNoTracking()
                .Where(u => u.Role == null || (u.Role != "PT" && u.Role != "Admin"))
                .Include(u => u.MucTieus)
                .Include(u => u.PhanCongKeHoachAnUongs)
                .Include(u => u.GiaoBaiTapChoUsers)
                    .ThenInclude(g => g.TheoDoiHoanThanhBaiTaps)
                .Include(u => u.NhatKyHoanThanhBaiTaps)
                .Include(u => u.NhatKyDinhDuongs)
                .Include(u => u.AicanhBaoSucKhoes)
                .Include(u => u.NhatKyUngDungs)
                .Include(u => u.GoiThanhViens)
                .Include(u => u.LuuTruSucKhoes)
                .ToListAsync(cancellationToken);

            // Get list of client user IDs for filtering statistics
            var clientUserIds = clientUsers.Select(u => u.UserId).ToList();

            var userDtos = clientUsers
                .Select(MapToUserCardDto)
                .OrderBy(u => u.FullName)
                .ThenBy(u => u.Username)
                .ToList();

            // Calculate statistics only for Client users
            var goalProgressValues = await _context.MucTieus
                .AsNoTracking()
                .Where(m => m.TienDoHienTai.HasValue && clientUserIds.Contains(m.UserId))
                .Select(m => m.TienDoHienTai!.Value)
                .ToListAsync(cancellationToken);

            var averageGoalCompletion = goalProgressValues.Count > 0
                ? Math.Round(goalProgressValues.Average(), 2)
                : 0;

            var totalHealthAlerts = await _context.LuuTruSucKhoes
                .AsNoTracking()
                .Where(l => !string.IsNullOrWhiteSpace(l.BenhId) && clientUserIds.Contains(l.UserId))
                .Select(l => l.UserId)
                .Distinct()
                .CountAsync(cancellationToken);

            var totalExercises = await _context.NhatKyHoanThanhBaiTaps
                .AsNoTracking()
                .Where(e => clientUserIds.Contains(e.UserId))
                .CountAsync(cancellationToken);

            var totalMenus = await _context.PhanCongKeHoachAnUongs
                .AsNoTracking()
                .Where(p => (p.TrangThai == null || p.TrangThai == "Active") && clientUserIds.Contains(p.UserId))
                .CountAsync(cancellationToken);

            var totalMissedWorkoutAlerts = userDtos.Sum(u => u.MissedWorkoutAlerts);

            return new UserManagementDataDto
            {
                Users = userDtos,
                GeneratedAt = DateTime.UtcNow,
                Summary = new UserManagementSummaryDto
                {
                    TotalUsers = userDtos.Count,
                    AverageGoalCompletion = averageGoalCompletion,
                    TotalHealthAlerts = totalHealthAlerts,
                    TotalExercises = totalExercises,
                    TotalMissedWorkoutAlerts = totalMissedWorkoutAlerts,
                    TotalMenus = totalMenus
                }
            };
        }
        catch (OperationCanceledException)
        {
            // Request was cancelled, return empty data
            return new UserManagementDataDto
            {
                Users = new List<UserCardDto>(),
                GeneratedAt = DateTime.UtcNow,
                Summary = new UserManagementSummaryDto
                {
                    TotalUsers = 0,
                    AverageGoalCompletion = 0,
                    TotalHealthAlerts = 0,
                    TotalExercises = 0,
                    TotalMissedWorkoutAlerts = 0,
                    TotalMenus = 0
                }
            };
        }
    }

    private static UserCardDto MapToUserCardDto(User user)
    {
        var goalCompletion = SafeAverage(user.MucTieus.Select(m => m.TienDoHienTai));
        var openGoals = user.MucTieus.Count(m => m.DaHoanThanh != true);
        var nutritionCompliance = SafeAverage(user.PhanCongKeHoachAnUongs.Select(p => p.TiLeTuanThu));
        var workoutCompliance = SafeAverage(user.GiaoBaiTapChoUsers.Select(p => p.TiLeHoanThanh));
        var healthAlerts = user.LuuTruSucKhoes.Count(l => !string.IsNullOrWhiteSpace(l.BenhId));
        var exercises = user.NhatKyHoanThanhBaiTaps.Count;
        var completedAssignments = user.GiaoBaiTapChoUsers.Sum(g => g.TheoDoiHoanThanhBaiTaps.Count);
        var plannedAssignments = user.GiaoBaiTapChoUsers.Sum(g => g.TuanHienTai ?? 0);
        var missedWorkoutAlerts = Math.Max(0, plannedAssignments - completedAssignments);
        var menus = user.PhanCongKeHoachAnUongs.Count(p => p.TrangThai == null || p.TrangThai == "Active");
        var language = string.IsNullOrWhiteSpace(user.NgonNgu) ? "vi" : user.NgonNgu!;
        var timezone = string.IsNullOrWhiteSpace(user.TimeZone) ? "SE Asia Standard Time" : user.TimeZone!;
        var createdDate = user.CreatedDate;
        var lastLogin = user.NhatKyUngDungs
            .Where(n => n.ThoiGian.HasValue)
            .OrderByDescending(n => n.ThoiGian)
            .Select(n => n.ThoiGian)
            .FirstOrDefault();
        var lastLogDate = user.NhatKyHoanThanhBaiTaps
            .OrderByDescending(n => n.NgayHoanThanh)
            .Select(n => (DateTime?)n.NgayHoanThanh.ToDateTime(TimeOnly.MinValue))
            .FirstOrDefault();
        var streak = ComputeCurrentStreak(user.NhatKyHoanThanhBaiTaps.Select(n => n.NgayHoanThanh));
        var dateOfBirth = user.NgaySinh?.ToDateTime(TimeOnly.MinValue);
        var status = ResolveStatus(user);
        var trainingGoal = BuildTrainingGoal(user);
        var avatarUrl = string.IsNullOrWhiteSpace(user.AnhDaiDien) ? null : user.AnhDaiDien;

        return new UserCardDto
        {
            UserId = user.UserId,
            Username = user.Username,
            Email = user.Email,
            Phone = null,
            FullName = string.IsNullOrWhiteSpace(user.HoTen) ? user.Username : user.HoTen!,
            Role = string.IsNullOrWhiteSpace(user.Role) ? "Client" : user.Role!,
            Status = status,
            CreatedDate = createdDate,
            LastLogin = lastLogin,
            Streak = streak,
            LastLogDate = lastLogDate,
            GoalCompletion = goalCompletion,
            OpenGoals = openGoals,
            NutritionCompliance = nutritionCompliance,
            WorkoutCompliance = workoutCompliance,
            HealthAlerts = healthAlerts,
            Exercises = exercises,
            MissedWorkoutAlerts = missedWorkoutAlerts,
            Menus = menus,
            Language = language,
            Timezone = timezone,
            DateOfBirth = dateOfBirth,
            Gender = user.GioiTinh,
            TrainingGoal = trainingGoal,
            AvatarUrl = avatarUrl
        };
    }

    private static double SafeAverage(IEnumerable<double?> values)
    {
        var filtered = values
            .Where(v => v.HasValue)
            .Select(v => v!.Value)
            .ToList();

        if (filtered.Count == 0)
        {
            return 0;
        }

        return Math.Round(filtered.Average(), 2);
    }

    private static int ComputeCurrentStreak(IEnumerable<DateOnly> dates)
    {
        var ordered = dates
            .Select(d => d.ToDateTime(TimeOnly.MinValue).Date)
            .Distinct()
            .OrderByDescending(d => d)
            .ToList();

        if (ordered.Count == 0)
        {
            return 0;
        }

        var streak = 1;

        for (var i = 1; i < ordered.Count; i++)
        {
            var difference = (ordered[i - 1] - ordered[i]).TotalDays;

            if (difference == 1)
            {
                streak++;
            }
            else if (difference > 1)
            {
                break;
            }
        }

        if ((DateTime.Today - ordered[0]).TotalDays > 1)
        {
            streak = 0;
        }

        return streak;
    }

    private static string ResolveStatus(User user)
    {
        var subscriptionStatus = user.GoiThanhViens
            .OrderByDescending(g => g.NgayDangKy ?? DateTime.MinValue)
            .Select(g => g.TrangThai)
            .FirstOrDefault(status => !string.IsNullOrWhiteSpace(status));

        if (!string.IsNullOrWhiteSpace(subscriptionStatus))
        {
            return subscriptionStatus!;
        }

        var workoutStatus = user.GiaoBaiTapChoUsers
            .OrderByDescending(g => g.NgayGiao ?? DateTime.MinValue)
            .Select(g => g.TrangThai)
            .FirstOrDefault(status => !string.IsNullOrWhiteSpace(status));

        if (!string.IsNullOrWhiteSpace(workoutStatus))
        {
            return workoutStatus!;
        }

        return "Active";
    }

    private static string? BuildTrainingGoal(User user)
    {
        var goals = user.MucTieus
            .OrderBy(m => m.ThuTuHienThi ?? int.MaxValue)
            .Select(m => m.LoaiMucTieu)
            .Where(goal => !string.IsNullOrWhiteSpace(goal))
            .Distinct()
            .Take(3)
            .ToList();

        return goals.Count == 0 ? null : string.Join(", ", goals);
    }

    public async Task<UserProfileDetailDto?> GetUserProfileAsync(string userId, CancellationToken cancellationToken = default)
    {
        var userExists = await _context.Users
            .AsNoTracking()
            .AnyAsync(u => u.UserId == userId, cancellationToken);

        if (!userExists)
        {
            return null;
        }

        var healthRecordEntities = await _context.LuuTruSucKhoes
            .AsNoTracking()
            .Where(r => r.UserId == userId)
            .Include(r => r.Benh)
            .OrderByDescending(r => r.NgayGhiNhan)
            .Take(30)
            .ToListAsync(cancellationToken);

        var healthRecords = healthRecordEntities
            .Select(r => new UserHealthRecordDto
            {
                RecordId = r.MaBanGhi,
                Date = r.NgayGhiNhan.ToDateTime(TimeOnly.MinValue),
                Steps = r.SoBuoc,
                Calories = r.CaloTieuThu,
                SleepHours = r.SoGioNgu,
                Weight = r.CanNang,
                Height = r.ChieuCao,
                Bmi = r.Bmi,
                WaterIntake = r.LuongNuocUong,
                DiseaseCode = r.BenhId,
                DiseaseName = r.Benh?.TenBenh,
                Notes = r.GhiChu
            })
            .ToList();

        var goalEntities = await _context.MucTieus
            .AsNoTracking()
            .Where(g => g.UserId == userId)
            .OrderBy(g => g.NgayBatDau)
            .ToListAsync(cancellationToken);

        var goals = goalEntities
            .Select(g => new UserGoalDto
            {
                GoalId = g.MucTieuId,
                GoalType = g.LoaiMucTieu,
                TargetValue = g.GiaTriMucTieu,
                CurrentProgress = g.TienDoHienTai,
                StartDate = g.NgayBatDau.ToDateTime(TimeOnly.MinValue),
                EndDate = g.NgayKetThuc.HasValue ? g.NgayKetThuc.Value.ToDateTime(TimeOnly.MinValue) : (DateTime?)null,
                IsCompleted = g.DaHoanThanh ?? false,
                Notes = g.GhiChu
            })
            .ToList();

        var workoutPlanEntities = await _context.GiaoBaiTapChoUsers
            .AsNoTracking()
            .Where(p => p.UserId == userId)
            .Include(p => p.MauTapLuyen)
            .Include(p => p.NguoiGiaoNavigation)
                .ThenInclude(pt => pt.User)
            .OrderByDescending(p => p.NgayBatDau)
            .ToListAsync(cancellationToken);

        var workoutPlans = workoutPlanEntities
            .Select(p => new UserWorkoutPlanDto
            {
                AssignmentId = p.GiaBtId,
                PlanName = p.MauTapLuyen?.TenMauTapLuyen ?? "-",
                PlanGoal = p.MauTapLuyen?.MucTieu,
                Status = p.TrangThai ?? "Active",
                StartDate = p.NgayBatDau.ToDateTime(TimeOnly.MinValue),
                EndDate = p.NgayKetThuc.HasValue ? p.NgayKetThuc.Value.ToDateTime(TimeOnly.MinValue) : (DateTime?)null,
                CurrentWeek = p.TuanHienTai,
                CompletionRate = p.TiLeHoanThanh,
                AssignedBy = (p.NguoiGiaoNavigation != null && p.NguoiGiaoNavigation.User != null) 
                    ? p.NguoiGiaoNavigation.User.HoTen 
                    : (p.NguoiGiao ?? "-")
            })
            .ToList();

        var nutritionPlanEntities = await _context.PhanCongKeHoachAnUongs
            .AsNoTracking()
            .Where(p => p.UserId == userId)
            .Include(p => p.KeHoachAnUong)
            .Include(p => p.NguoiGiaoNavigation)
                .ThenInclude(pt => pt.User)
            .OrderByDescending(p => p.NgayBatDau)
            .ToListAsync(cancellationToken);

        var nutritionPlans = nutritionPlanEntities
            .Select(p => new UserNutritionPlanDto
            {
                AssignmentId = p.PhanCongId,
                PlanName = p.KeHoachAnUong?.TenKeHoach ?? "-",
                PlanType = p.KeHoachAnUong?.LoaiKeHoach,
                Status = p.TrangThai ?? "Active",
                StartDate = p.NgayBatDau.ToDateTime(TimeOnly.MinValue),
                EndDate = p.NgayKetThuc.HasValue ? p.NgayKetThuc.Value.ToDateTime(TimeOnly.MinValue) : (DateTime?)null,
                AdherenceRate = p.TiLeTuanThu,
                AssignedBy = (p.NguoiGiaoNavigation != null && p.NguoiGiaoNavigation.User != null) 
                    ? p.NguoiGiaoNavigation.User.HoTen 
                    : (p.NguoiGiao ?? "-")
            })
            .ToList();

        var achievementEntities = await _context.ThanhTuus
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.NgayDatDuoc)
            .ToListAsync(cancellationToken);

        var achievements = achievementEntities
            .Select(a => new UserAchievementDto
            {
                AchievementId = a.ThanhTuuId,
                BadgeName = a.TenBadge,
                Score = a.Diem ?? 0,
                AchievedAt = a.NgayDatDuoc,
                Description = a.MoTa
            })
            .ToList();

        var notificationEntities = await _context.ThongBaos
            .AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.NgayTao)
            .Take(50)
            .ToListAsync(cancellationToken);

        var notifications = notificationEntities
            .Select(n => new UserNotificationDto
            {
                NotificationId = n.ThongBaoId,
                Type = n.Loai,
                Content = n.NoiDung ?? string.Empty,
                CreatedAt = n.NgayTao,
                IsRead = n.DaDoc ?? false
            })
            .ToList();

        var transactionEntities = await _context.GiaoDiches
            .AsNoTracking()
            .Where(t => t.KhachHangId == userId)
            .OrderByDescending(t => t.NgayGiaoDich)
            .ToListAsync(cancellationToken);

        var transactions = transactionEntities
            .Select(t => new UserTransactionDto
            {
                TransactionId = t.GiaoDichId,
                BookingId = t.DatLichId,
                Amount = t.SoTien,
                Commission = t.HoaHongApp,
                NetAmount = t.SoTienPtnhan,
                Method = t.PhuongThucThanhToan,
                Status = t.TrangThaiThanhToan ?? "Pending",
                CreatedAt = t.NgayGiaoDich
            })
            .ToList();

        var ptAccessEntities = await _context.QuyenPtKhachHangs
            .AsNoTracking()
            .Where(q => q.KhachHangId == userId)
            .Include(q => q.Pt)
                .ThenInclude(pt => pt.User)
            .OrderByDescending(q => q.NgayCapQuyen)
            .ToListAsync(cancellationToken);

        var ptAccesses = ptAccessEntities
            .Select(q => new UserPtAccessDto
            {
                AccessId = q.QuyenId,
                PtId = q.Ptid,
                PtName = q.Pt?.User?.HoTen ?? q.Ptid,
                GrantedAt = q.NgayCapQuyen,
                IsActive = q.DangHoatDong ?? false
            })
            .ToList();

        return new UserProfileDetailDto
        {
            HealthRecords = healthRecords,
            Goals = goals,
            WorkoutPlans = workoutPlans,
            NutritionPlans = nutritionPlans,
            Achievements = achievements,
            Notifications = notifications,
            Transactions = transactions,
            PtAccesses = ptAccesses
        };
    }

    public async Task<bool> GrantPTAccessAsync(string userId, string ptId, CancellationToken cancellationToken = default)
    {
        // Check if access already exists
        var existingAccess = await _context.QuyenPtKhachHangs
            .FirstOrDefaultAsync(q => q.KhachHangId == userId && q.Ptid == ptId, cancellationToken);

        if (existingAccess != null)
        {
            // If exists, just activate it
            existingAccess.DangHoatDong = true;
            if (existingAccess.NgayCapQuyen == null)
            {
                existingAccess.NgayCapQuyen = DateTime.UtcNow;
            }
        }
        else
        {
            // Create new access
            var newAccess = new Models.Entities.QuyenPtKhachHang
            {
                KhachHangId = userId,
                Ptid = ptId,
                NgayCapQuyen = DateTime.UtcNow,
                DangHoatDong = true
            };
            _context.QuyenPtKhachHangs.Add(newAccess);
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> RevokePTAccessAsync(string userId, string ptId, CancellationToken cancellationToken = default)
    {
        var access = await _context.QuyenPtKhachHangs
            .FirstOrDefaultAsync(q => q.KhachHangId == userId && q.Ptid == ptId, cancellationToken);

        if (access == null)
        {
            return false;
        }

        // Deactivate instead of deleting (soft delete)
        access.DangHoatDong = false;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
