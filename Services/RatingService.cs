using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HealthWeb.Models.EF;
using HealthWeb.Models.ViewModels;
using HealthWeb.Models.Entities;

namespace HealthWeb.Services;

public class RatingService : IRatingService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<RatingService> _logger;

    public RatingService(ApplicationDbContext context, ILogger<RatingService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<CompletedSessionViewModel>> GetCompletedSessionsForRatingAsync(string userId)
    {
        try
        {
            var now = DateTime.Now;
            
            // Lấy các buổi tập đã hoàn thành (Completed) và đã qua thời gian tập
            var completedSessions = await _context.DatLichPts
                .Include(d => d.Pt)
                    .ThenInclude(p => p!.User)
                .Where(d => d.KhacHangId == userId 
                    && d.Ptid != null
                    && (d.TrangThai == "Completed" || d.TrangThai == "Hoàn thành")
                    && d.NgayGioDat < now)
                .OrderByDescending(d => d.NgayGioDat)
                .Select(d => new CompletedSessionViewModel
                {
                    BookingId = d.DatLichId,
                    PtId = d.Ptid!,
                    PtName = d.Pt != null 
                        ? (string.IsNullOrWhiteSpace(d.Pt.User.HoTen) ? d.Pt.User.Username : d.Pt.User.HoTen)
                        : "N/A",
                    PtAvatar = d.Pt != null 
                        ? (d.Pt.AnhDaiDien ?? d.Pt.User.AnhDaiDien ?? "/images/default-avatar.png")
                        : "/images/default-avatar.png",
                    SessionDate = d.NgayGioDat,
                    SessionType = d.LoaiBuoiTap ?? "Online",
                    Notes = d.GhiChu,
                    HasRated = false // Sẽ được cập nhật sau
                })
                .ToListAsync();

            // Kiểm tra xem user đã đánh giá buổi tập nào chưa (dựa trên DatLichID)
            var ratedBookingIds = await _context.DanhGiaPts
                .Where(r => r.KhachHangId == userId && r.DatLichId != null)
                .Select(r => r.DatLichId!)
                .ToListAsync();

            foreach (var session in completedSessions)
            {
                session.HasRated = ratedBookingIds.Contains(session.BookingId);
            }

            return completedSessions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting completed sessions for rating for user {UserId}", userId);
            return new List<CompletedSessionViewModel>();
        }
    }

    public async Task<List<SessionHistoryViewModel>> GetSessionHistoryAsync(string userId)
    {
        try
        {
            _logger.LogInformation("GetSessionHistoryAsync called with userId: {UserId}", userId);
            
            var now = DateTime.Now;
            
            // Lấy các buổi tập đã qua (trước thời gian hiện tại)
            var query = _context.DatLichPts
                .Include(d => d.Pt)
                    .ThenInclude(p => p!.User)
                .Where(d => d.KhacHangId == userId 
                    && d.Ptid != null 
                    && d.NgayGioDat < now);
            
            var totalCount = await query.CountAsync();
            _logger.LogInformation("Total past bookings found for userId {UserId}: {Count}", userId, totalCount);
            
            var allSessions = await query
                .OrderByDescending(d => d.NgayGioDat)
                .Select(d => new SessionHistoryViewModel
                {
                    BookingId = d.DatLichId,
                    PtId = d.Ptid!,
                    PtName = d.Pt != null 
                        ? (string.IsNullOrWhiteSpace(d.Pt.User.HoTen) ? d.Pt.User.Username : d.Pt.User.HoTen)
                        : "N/A",
                    PtAvatar = d.Pt != null 
                        ? (d.Pt.AnhDaiDien ?? d.Pt.User.AnhDaiDien ?? "/images/default-avatar.png")
                        : "/images/default-avatar.png",
                    SessionDate = d.NgayGioDat,
                    SessionType = d.LoaiBuoiTap ?? "Online",
                    Status = d.TrangThai ?? "Pending",
                    Notes = d.GhiChu,
                    HasRated = false,
                    Rating = null,
                    RatingComment = null
                })
                .ToListAsync();
            
            _logger.LogInformation("Mapped {Count} sessions for userId {UserId}", allSessions.Count, userId);

            // Lấy các đánh giá đã có (dựa trên DatLichID)
            var ratings = await _context.DanhGiaPts
                .Where(r => r.KhachHangId == userId && r.DatLichId != null)
                .ToListAsync();

            // Cập nhật thông tin đánh giá cho từng buổi tập
            foreach (var session in allSessions)
            {
                // Tìm đánh giá cho buổi tập này (dựa trên DatLichID)
                var rating = ratings.FirstOrDefault(r => r.DatLichId == session.BookingId);
                if (rating != null)
                {
                    session.HasRated = true;
                    session.Rating = rating.Diem;
                    session.RatingComment = rating.BinhLuan;
                }
            }

            return allSessions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting session history for user {UserId}", userId);
            return new List<SessionHistoryViewModel>();
        }
    }

    public async Task<bool> HasRatedSessionAsync(string userId, string ptId, string? bookingId = null)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(bookingId))
            {
                // Nếu không có bookingId, kiểm tra xem có đánh giá nào cho PT này không
                return await _context.DanhGiaPts
                    .AnyAsync(r => r.KhachHangId == userId && r.Ptid == ptId);
            }

            // Kiểm tra xem đã đánh giá buổi tập này chưa (dựa trên DatLichID)
            return await _context.DanhGiaPts
                .AnyAsync(r => r.KhachHangId == userId && r.DatLichId == bookingId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if user has rated session");
            return false;
        }
    }

    public async Task<(bool success, string message)> SubmitRatingAsync(string userId, string ptId, int rating, string? comment, string? bookingId = null)
    {
        try
        {
            // Validate rating
            if (rating < 1 || rating > 5)
            {
                return (false, "Điểm đánh giá phải từ 1 đến 5 sao");
            }

            // Validate bookingId
            if (string.IsNullOrWhiteSpace(bookingId))
            {
                return (false, "Booking ID không được để trống");
            }

            // Kiểm tra booking có tồn tại và thuộc về user này không
            var booking = await _context.DatLichPts
                .FirstOrDefaultAsync(b => b.DatLichId == bookingId 
                    && b.KhacHangId == userId 
                    && b.Ptid == ptId
                    && b.NgayGioDat < DateTime.Now);

            if (booking == null)
            {
                return (false, "Không tìm thấy buổi tập hoặc bạn không có quyền đánh giá buổi tập này");
            }

            // Kiểm tra xem user đã đánh giá buổi tập này chưa (dựa trên DatLichID)
            var existingRating = await _context.DanhGiaPts
                .FirstOrDefaultAsync(r => r.DatLichId == bookingId);

            if (existingRating != null)
            {
                // Cập nhật đánh giá cũ
                existingRating.Diem = rating;
                existingRating.BinhLuan = comment;
                existingRating.NgayDanhGia = DateTime.Now;
                
                _logger.LogInformation("Updating existing rating: RatingId={RatingId}, BookingId={BookingId}, Rating={Rating}", 
                    existingRating.DanhGiaId, bookingId, rating);
            }
            else
            {
                // Tạo đánh giá mới cho buổi tập này
                var newRating = new DanhGiaPt
                {
                    KhachHangId = userId,
                    Ptid = ptId,
                    DatLichId = bookingId, // Liên kết với buổi tập cụ thể
                    Diem = rating,
                    BinhLuan = comment,
                    NgayDanhGia = DateTime.Now
                };

                _context.DanhGiaPts.Add(newRating);
                
                _logger.LogInformation("Creating new rating: BookingId={BookingId}, Rating={Rating}", bookingId, rating);
            }

            // Lưu vào database
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Rating saved successfully: UserId={UserId}, PTId={PtId}, BookingId={BookingId}, Rating={Rating}", 
                userId, ptId, bookingId, rating);

            // Cập nhật điểm trung bình của PT
            await UpdatePtRatingStats(ptId);
            
            _logger.LogInformation("PT rating stats updated: PTId={PtId}", ptId);

            return (true, "Đánh giá đã được lưu thành công");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting rating for user {UserId}, PT {PtId}, Booking {BookingId}", userId, ptId, bookingId);
            return (false, "Có lỗi xảy ra khi lưu đánh giá: " + ex.Message);
        }
    }

    private async Task UpdatePtRatingStats(string ptId)
    {
        try
        {
            var pt = await _context.HuanLuyenViens.FirstOrDefaultAsync(p => p.Ptid == ptId);
            if (pt != null)
            {
                // Lấy tất cả đánh giá của PT này (mỗi buổi tập = 1 đánh giá)
                var ratings = await _context.DanhGiaPts
                    .Where(r => r.Ptid == ptId && r.Diem.HasValue)
                    .ToListAsync();

                // Tính tổng số đánh giá (số lượng buổi tập đã được đánh giá)
                pt.TongDanhGia = ratings.Count;
                
                // Tính điểm trung bình từ tất cả các đánh giá
                if (ratings.Any())
                {
                    pt.DiemTrungBinh = (float)ratings.Average(r => r.Diem!.Value);
                }
                else
                {
                    pt.DiemTrungBinh = 0;
                }
                
                _context.HuanLuyenViens.Update(pt);
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("PT stats updated: PTId={PtId}, TotalRatings={TotalRatings}, AvgRating={AvgRating}", 
                    ptId, pt.TongDanhGia, pt.DiemTrungBinh);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating PT rating stats for PT {PtId}", ptId);
        }
    }
}

