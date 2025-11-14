using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using HealthWeb.Models.EF;
using HealthWeb.Models.ViewModels.Admin;
using Microsoft.EntityFrameworkCore;

namespace HealthWeb.Services;

public class PTAdminService : IPTAdminService
{
    private readonly ApplicationDbContext _context;

    public PTAdminService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PTManagementDataDto> GetPTManagementDataAsync(
        string? search = null,
        string? specialty = null,
        string? city = null,
        bool? acceptingClients = null,
        double? minRating = null,
        bool? verifiedOnly = true,
        CancellationToken cancellationToken = default)
    {
        // Optimized: Load all navigation properties in one query to avoid N+1
        var query = _context.HuanLuyenViens
            .AsNoTracking()
            .Include(pt => pt.User)
            .Include(pt => pt.DatLichPts)
            .Include(pt => pt.DanhGiaPts)
            .Include(pt => pt.QuyenPtKhachHangs)
            .Include(pt => pt.GiaoDiches)
            .AsQueryable();

        // Filter by verified status
        if (verifiedOnly == true)
        {
            query = query.Where(pt => pt.DaXacMinh == true);
        }

        // Apply filters
        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(pt =>
                (pt.User != null && pt.User.HoTen != null && pt.User.HoTen.ToLower().Contains(searchLower)) ||
                (pt.User != null && pt.User.Email != null && pt.User.Email.ToLower().Contains(searchLower)) ||
                pt.Ptid.ToLower().Contains(searchLower));
        }

        if (!string.IsNullOrWhiteSpace(specialty))
        {
            query = query.Where(pt => pt.ChuyenMon != null && pt.ChuyenMon.Contains(specialty));
        }

        if (!string.IsNullOrWhiteSpace(city))
        {
            query = query.Where(pt => pt.ThanhPho == city);
        }

        if (acceptingClients.HasValue)
        {
            query = query.Where(pt => pt.NhanKhach == acceptingClients.Value);
        }

        if (minRating.HasValue)
        {
            query = query.Where(pt => pt.DiemTrungBinh >= minRating.Value);
        }

        var ptEntities = await query.ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1);

        var ptDtos = ptEntities.Select(pt => MapToPTCardDto(pt, startOfMonth)).ToList();

        // Calculate summary statistics - only for verified PTs
        var verifiedPTs = verifiedOnly == true ? ptEntities : ptEntities.Where(pt => pt.DaXacMinh == true).ToList();
        var total = verifiedPTs.Count;
        var avgRevenue = verifiedPTs.Any() 
            ? verifiedPTs.Select(pt => CalculateRevenueThisMonth(pt, startOfMonth)).Average() 
            : 0;
        var avgClients = verifiedPTs.Any() 
            ? verifiedPTs.Average(pt => pt.SoKhachHienTai ?? 0) 
            : 0;
        
        var totalBookings = verifiedPTs.Sum(pt => pt.DatLichPts?.Count ?? 0);
        var totalCancelled = verifiedPTs.Sum(pt => 
            (pt.DatLichPts?.Count(b => b.TrangThai == "Cancelled" || b.TrangThai == "Đã hủy")) ?? 0);
        var cancelRate = totalBookings > 0 ? (totalCancelled / (double)totalBookings * 100) : 0;
        
        var avgRating = verifiedPTs.Any() 
            ? verifiedPTs.Where(pt => pt.DiemTrungBinh.HasValue).Average(pt => pt.DiemTrungBinh!.Value) 
            : 0;
        
        var totalUsersWithPT = verifiedPTs.Sum(pt => pt.SoKhachHienTai ?? 0);
        var totalUsers = await _context.Users.CountAsync(u => u.Role != "PT" && u.Role != "Admin", cancellationToken);
        var ptHiringRate = totalUsers > 0 ? (totalUsersWithPT / (double)totalUsers * 100) : 0;
        
        var avgBookingsPerWeek = verifiedPTs.Any()
            ? verifiedPTs.Select(pt => CalculateBookingsPerWeek(pt)).Average()
            : 0;

        return new PTManagementDataDto
        {
            Trainers = ptDtos,
            GeneratedAt = DateTime.UtcNow,
            Summary = new PTManagementSummaryDto
            {
                TotalTrainers = total,
                AverageRevenuePerPT = Math.Round(avgRevenue, 0),
                AverageActiveClients = Math.Round(avgClients, 1),
                CancelRate = Math.Round(cancelRate, 1),
                AverageRating = Math.Round(avgRating, 1),
                PTHiringRate = Math.Round(ptHiringRate, 1),
                AverageBookingsPerWeek = Math.Round(avgBookingsPerWeek, 1)
            }
        };
    }

    public async Task<PTProfile360Dto?> GetPTProfile360Async(string ptId, CancellationToken cancellationToken = default)
    {
        // Optimized: Load all related data in one query with proper includes
        var pt = await _context.HuanLuyenViens
            .AsNoTracking()
            .Include(pt => pt.User)
            .Include(pt => pt.DatLichPts)
                .ThenInclude(b => b.KhacHang)
            .Include(pt => pt.DanhGiaPts)
                .ThenInclude(r => r.KhachHang)
            .Include(pt => pt.QuyenPtKhachHangs)
                .ThenInclude(q => q.KhachHang)
            .Include(pt => pt.GiaoDiches)
            .Where(pt => pt.Ptid == ptId)
            .FirstOrDefaultAsync(cancellationToken);

        if (pt == null)
        {
            return null;
        }

        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1);

        var basicInfo = MapToPTCardDto(pt, startOfMonth);

        // Schedule data - Filter out Pending and map status correctly
        var today = DateOnly.FromDateTime(now);
        var schedule = (pt.DatLichPts ?? new List<Models.Entities.DatLichPt>())
            .Where(b => b.TrangThai != "Pending" && b.TrangThai != "Chờ xác nhận")
            .OrderBy(b => b.NgayGioDat)
            .Select(b => {
                var bookingDate = DateOnly.FromDateTime(b.NgayGioDat);
                var status = MapBookingStatusWithDate(b.TrangThai, bookingDate, today);
                return new PTScheduleDto
                {
                    ScheduleId = b.DatLichId,
                    UserId = b.KhacHangId,
                    UserName = b.KhacHang?.HoTen ?? b.KhacHang?.Username ?? "",
                    UserEmail = b.KhacHang?.Email ?? "",
                    DateTime = b.NgayGioDat,
                    Duration = null, // Not stored in DB
                    Status = status,
                    Type = b.LoaiBuoiTap,
                    Location = null, // Not stored in DB
                    Rating = null,
                    Review = null,
                    ReviewDate = null
                };
            })
            .ToList();

        // Bookings
        var bookings = (pt.DatLichPts ?? new List<Models.Entities.DatLichPt>())
            .OrderByDescending(b => b.NgayGioDat)
            .Select(b => new PTBookingDto
            {
                BookingId = b.DatLichId,
                CustomerId = b.KhacHangId,
                CustomerName = b.KhacHang?.HoTen ?? b.KhacHang?.Username ?? "",
                DateTime = b.NgayGioDat,
                Type = b.LoaiBuoiTap,
                Status = b.TrangThai ?? "Pending"
            })
            .ToList();

        // Reviews
        var reviews = (pt.DanhGiaPts ?? new List<Models.Entities.DanhGiaPt>())
            .OrderByDescending(r => r.NgayDanhGia)
            .Select(r => new PTReviewDto
            {
                ReviewId = r.DanhGiaId,
                CustomerId = r.KhachHangId,
                CustomerName = r.KhachHang?.HoTen ?? r.KhachHang?.Username ?? "",
                Rating = r.Diem,
                Comment = r.BinhLuan,
                ReviewDate = r.NgayDanhGia
            })
            .ToList();

        // Clients - Get from both QuyenPtKhachHangs (granted access) and DatLichPts (booked sessions)
        var clientsFromAccess = (pt.QuyenPtKhachHangs ?? new List<Models.Entities.QuyenPtKhachHang>())
            .Select(q => new PTClientDto
            {
                UserId = q.KhachHangId,
                Name = q.KhachHang?.HoTen ?? q.KhachHang?.Username ?? "",
                Email = q.KhachHang?.Email,
                AccessGrantedDate = q.NgayCapQuyen,
                IsActive = q.DangHoatDong ?? false
            })
            .ToList();

        // Get unique clients from bookings who are not already in access list
        var bookingClients = (pt.DatLichPts ?? new List<Models.Entities.DatLichPt>())
            .Where(b => b.KhacHang != null)
            .Select(b => new
            {
                UserId = b.KhacHangId,
                Name = b.KhacHang?.HoTen ?? b.KhacHang?.Username ?? "",
                Email = b.KhacHang?.Email,
                FirstBookingDate = b.NgayGioDat
            })
            .GroupBy(b => b.UserId)
            .Select(g => new PTClientDto
            {
                UserId = g.Key,
                Name = g.First().Name,
                Email = g.First().Email,
                AccessGrantedDate = g.Min(b => b.FirstBookingDate), // Use first booking date
                IsActive = clientsFromAccess.Any(c => c.UserId == g.Key && c.IsActive) || true // Active if in access list or has bookings
            })
            .Where(c => !clientsFromAccess.Any(a => a.UserId == c.UserId)) // Exclude already in access list
            .ToList();

        // Combine and order by access date or first booking date
        var clients = clientsFromAccess
            .Concat(bookingClients)
            .GroupBy(c => c.UserId)
            .Select(g => g.OrderByDescending(c => c.AccessGrantedDate).First())
            .OrderByDescending(c => c.AccessGrantedDate)
            .ToList();

        // Performance
        var bookingsList = pt.DatLichPts ?? new List<Models.Entities.DatLichPt>();
        var performance = new PTPerformanceDto
        {
            RevenueThisMonth = CalculateRevenueThisMonth(pt, startOfMonth),
            TotalBookings = bookingsList.Count,
            CancelRate = bookingsList.Count > 0
                ? (bookingsList.Count(b => b.TrangThai == "Cancelled" || b.TrangThai == "Đã hủy") / (double)bookingsList.Count * 100)
                : 0,
            BookingsPerWeek = CalculateBookingsPerWeek(pt)
        };

        return new PTProfile360Dto
        {
            BasicInfo = basicInfo,
            Schedule = schedule,
            Bookings = bookings,
            Reviews = reviews,
            Clients = clients,
            Performance = performance
        };
    }

    public async Task<PTCardDto?> ToggleAcceptingClientsAsync(string ptId, bool acceptingClients, CancellationToken cancellationToken = default)
    {
        var pt = await _context.HuanLuyenViens
            .Include(pt => pt.User)
            .FirstOrDefaultAsync(pt => pt.Ptid == ptId, cancellationToken);

        if (pt == null)
        {
            return null;
        }

        pt.NhanKhach = acceptingClients;
        await _context.SaveChangesAsync(cancellationToken);

        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1);
        return MapToPTCardDto(pt, startOfMonth);
    }

    public async Task<PTCardDto?> ApprovePTAsync(string userId, string? note, CancellationToken cancellationToken = default)
    {
        var pt = await _context.HuanLuyenViens
            .Include(pt => pt.User)
            .FirstOrDefaultAsync(pt => pt.UserId == userId, cancellationToken);

        if (pt == null)
        {
            return null;
        }

        // Generate PT ID if not exists
        if (string.IsNullOrWhiteSpace(pt.Ptid))
        {
            var maxId = await _context.HuanLuyenViens
                .Where(p => !string.IsNullOrEmpty(p.Ptid))
                .Select(p => p.Ptid)
                .ToListAsync(cancellationToken);

            var maxNum = 0;
            foreach (var id in maxId)
            {
                if (id.StartsWith("ptr_") && int.TryParse(id.Substring(4), out var num))
                {
                    maxNum = Math.Max(maxNum, num);
                }
            }

            pt.Ptid = $"ptr_{String.Format("{0:D4}", maxNum + 1)}";
        }

        pt.DaXacMinh = true;
        await _context.SaveChangesAsync(cancellationToken);

        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1);
        return MapToPTCardDto(pt, startOfMonth);
    }

    public async Task<bool> RejectPTAsync(string userId, CancellationToken cancellationToken = default)
    {
        var pt = await _context.HuanLuyenViens
            .FirstOrDefaultAsync(pt => pt.UserId == userId, cancellationToken);

        if (pt == null)
        {
            return false;
        }

        _context.HuanLuyenViens.Remove(pt);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> ConfirmBookingAsync(string bookingId, CancellationToken cancellationToken = default)
    {
        var booking = await _context.DatLichPts
            .FirstOrDefaultAsync(b => b.DatLichId == bookingId, cancellationToken);

        if (booking == null)
        {
            return false;
        }

        booking.TrangThai = "Confirmed";
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> CancelBookingAsync(string bookingId, string? reason, CancellationToken cancellationToken = default)
    {
        var booking = await _context.DatLichPts
            .FirstOrDefaultAsync(b => b.DatLichId == bookingId, cancellationToken);

        if (booking == null)
        {
            return false;
        }

        booking.TrangThai = "Cancelled";
        if (!string.IsNullOrWhiteSpace(reason))
        {
            booking.LyDoTuChoi = reason;
        }
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static PTCardDto MapToPTCardDto(Models.Entities.HuanLuyenVien pt, DateTime startOfMonth)
    {
        var bookings = pt.DatLichPts ?? new List<Models.Entities.DatLichPt>();
        var reviews = pt.DanhGiaPts ?? new List<Models.Entities.DanhGiaPt>();
        var transactions = pt.GiaoDiches ?? new List<Models.Entities.GiaoDich>();
        
        if (pt.User == null)
        {
            throw new InvalidOperationException($"PT {pt.Ptid} has no associated User");
        }

        var revenueThisMonth = CalculateRevenueThisMonth(pt, startOfMonth);
        var totalBookings = bookings.Count;
        var cancelledBookings = bookings.Count(b => b.TrangThai == "Cancelled" || b.TrangThai == "Đã hủy");
        var cancelRate = totalBookings > 0 ? (cancelledBookings / (double)totalBookings * 100) : 0;
        var bookingsPerWeek = CalculateBookingsPerWeek(pt);
        var completionRate = pt.TiLeThanhCong ?? 0;

        // Parse availability JSON if exists
        var availability = pt.GioRanh ?? "";

        return new PTCardDto
        {
            PTId = pt.Ptid,
            UserId = pt.UserId,
            Name = pt.User.HoTen ?? pt.User.Username ?? "",
            Email = pt.User.Email ?? "",
            Specialty = pt.ChuyenMon,
            City = pt.ThanhPho,
            PricePerHour = pt.GiaTheoGio,
            Rating = pt.DiemTrungBinh,
            TotalReviews = reviews.Count,
            CurrentClients = pt.SoKhachHienTai ?? 0,
            Verified = pt.DaXacMinh ?? false,
            AcceptingClients = pt.NhanKhach ?? false,
            Experience = pt.SoNamKinhNghiem,
            Certificate = pt.ChungChi,
            Bio = pt.TieuSu,
            Availability = availability,
            SuccessRate = pt.TiLeThanhCong,
            RevenueThisMonth = revenueThisMonth,
            TotalBookings = totalBookings,
            CancelRate = cancelRate,
            ResponseTime = 0, // Not stored in DB
            BookingsPerWeek = bookingsPerWeek,
            CompletionRate = completionRate,
            RegistrationDate = pt.User.CreatedDate,
            AvatarUrl = pt.AnhDaiDien,
            CCCDUrl = pt.AnhCccd,
            PortraitUrl = pt.AnhChanDung,
            DocumentUrl = pt.FileTaiLieu
        };
    }

    private static double CalculateRevenueThisMonth(Models.Entities.HuanLuyenVien pt, DateTime startOfMonth)
    {
        var transactions = pt.GiaoDiches ?? new List<Models.Entities.GiaoDich>();
        return transactions
            .Where(t => t.NgayGiaoDich >= startOfMonth && 
                       (t.TrangThaiThanhToan == "Completed" || t.TrangThaiThanhToan == "Hoàn thành"))
            .Sum(t => t.SoTienPtnhan ?? 0);
    }

    private static double CalculateBookingsPerWeek(Models.Entities.HuanLuyenVien pt)
    {
        var bookings = pt.DatLichPts ?? new List<Models.Entities.DatLichPt>();
        if (bookings.Count == 0)
        {
            return 0;
        }

        var oldestBooking = bookings.Min(b => b.NgayGioDat);
        var daysDiff = (DateTime.UtcNow - oldestBooking).TotalDays;
        var weeks = Math.Max(1, daysDiff / 7.0);
        return bookings.Count / weeks;
    }

    private static string MapBookingStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return "upcoming";
        }

        return status.ToLower() switch
        {
            "confirmed" or "đã xác nhận" => "upcoming",
            "completed" or "đã hoàn thành" => "completed",
            "cancelled" or "đã hủy" => "cancelled",
            "ongoing" or "đang diễn ra" => "ongoing",
            _ => "upcoming"
        };
    }

    private static string MapBookingStatusWithDate(string? status, DateOnly bookingDate, DateOnly today)
    {
        var statusLower = string.IsNullOrWhiteSpace(status) ? "" : status.ToLower();
        
        // Cancelled can be in past or future - always return cancelled
        if (statusLower == "cancelled" || statusLower == "đã hủy")
        {
            return "cancelled";
        }
        
        // Determine based on date
        if (bookingDate < today)
        {
            // Past date - must be completed (cannot be confirmed in past)
            return "completed";
        }
        else if (bookingDate == today)
        {
            // Today - can be confirmed or ongoing
            if (statusLower == "ongoing" || statusLower == "đang diễn ra")
            {
                return "ongoing";
            }
            return "confirmed";
        }
        else
        {
            // Future - can only be confirmed (cannot be completed in future)
            return "confirmed";
        }
    }

    public async Task<PTCardDto?> UpdatePTAsync(string ptId, UpdatePTRequest request, CancellationToken cancellationToken = default)
    {
        var pt = await _context.HuanLuyenViens
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Ptid == ptId, cancellationToken);

        if (pt == null || pt.User == null)
        {
            return null;
        }

        // Update PT fields
        if (request.Specialty != null)
        {
            pt.ChuyenMon = request.Specialty;
        }

        if (request.City != null)
        {
            pt.ThanhPho = request.City;
        }

        if (request.PricePerHour.HasValue)
        {
            pt.GiaTheoGio = request.PricePerHour.Value;
        }

        if (request.Bio != null)
        {
            pt.TieuSu = request.Bio;
        }

        if (request.Experience.HasValue)
        {
            pt.SoNamKinhNghiem = request.Experience.Value;
        }

        if (request.Certificate != null)
        {
            pt.ChungChi = request.Certificate;
        }

        if (request.Availability != null)
        {
            pt.GioRanh = request.Availability;
        }

        if (request.AcceptingClients.HasValue)
        {
            pt.NhanKhach = request.AcceptingClients.Value;
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Calculate start of month for revenue calculation
        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1);

        // Return updated PT card
        return MapToPTCardDto(pt, startOfMonth);
    }

    public async Task<bool> DeletePTAsync(string ptId, CancellationToken cancellationToken = default)
    {
        var pt = await _context.HuanLuyenViens
            .FirstOrDefaultAsync(p => p.Ptid == ptId, cancellationToken);

        if (pt == null)
        {
            return false;
        }

        // Check if PT has active bookings or clients
        var hasActiveBookings = await _context.DatLichPts
            .AnyAsync(d => d.Ptid == ptId && 
                (d.TrangThai == "Confirmed" || d.TrangThai == "Đã xác nhận" || 
                 d.TrangThai == "Pending" || d.TrangThai == "Chờ xác nhận"),
                cancellationToken);

        if (hasActiveBookings)
        {
            throw new InvalidOperationException("Không thể xóa PT đang có lịch đặt đang chờ xử lý hoặc đã xác nhận.");
        }

        // Delete related records first (if needed)
        // Note: Depending on your database constraints, you may need to handle cascading deletes
        
        // Delete PT
        _context.HuanLuyenViens.Remove(pt);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}

