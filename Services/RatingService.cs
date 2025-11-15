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

            // Kiểm tra xem user đã đánh giá PT nào chưa
            var ratedPtIds = await _context.DanhGiaPts
                .Where(r => r.KhachHangId == userId)
                .Select(r => r.Ptid)
                .ToListAsync();

            foreach (var session in completedSessions)
            {
                session.HasRated = ratedPtIds.Contains(session.PtId);
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

            // Lấy các đánh giá đã có
            var ratings = await _context.DanhGiaPts
                .Where(r => r.KhachHangId == userId)
                .ToListAsync();

            // Cập nhật thông tin đánh giá cho từng buổi tập
            // Lưu bookingId vào BinhLuan dưới dạng JSON: {"bookings": {"bookingId": {"rating": 5, "comment": "..."}}}
            foreach (var session in allSessions)
            {
                // Tìm đánh giá cho PT này từ user này
                var rating = ratings.FirstOrDefault(r => r.Ptid == session.PtId && r.KhachHangId == userId);
                if (rating != null && !string.IsNullOrWhiteSpace(rating.BinhLuan))
                {
                    try
                    {
                        // Parse JSON từ BinhLuan
                        var ratingData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, Dictionary<string, RatingData>>>(
                            rating.BinhLuan);
                        
                        if (ratingData != null && ratingData.ContainsKey("bookings"))
                        {
                            var bookings = ratingData["bookings"];
                            if (bookings.ContainsKey(session.BookingId))
                            {
                                var bookingRating = bookings[session.BookingId];
                                session.HasRated = true;
                                session.Rating = bookingRating.Rating;
                                session.RatingComment = bookingRating.Comment;
                            }
                        }
                    }
                    catch
                    {
                        // Nếu không parse được JSON, có thể là format cũ - bỏ qua
                    }
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
                return await _context.DanhGiaPts
                    .AnyAsync(r => r.KhachHangId == userId && r.Ptid == ptId);
            }

            var rating = await _context.DanhGiaPts
                .FirstOrDefaultAsync(r => r.KhachHangId == userId && r.Ptid == ptId);

            if (rating == null || string.IsNullOrWhiteSpace(rating.BinhLuan))
            {
                return false;
            }

            try
            {
                var ratingData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, Dictionary<string, RatingData>>>(
                    rating.BinhLuan);
                
                return ratingData != null 
                    && ratingData.ContainsKey("bookings") 
                    && ratingData["bookings"].ContainsKey(bookingId);
            }
            catch
            {
                return false;
            }
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

            // Kiểm tra xem user đã đánh giá PT này chưa
            var existingRating = await _context.DanhGiaPts
                .FirstOrDefaultAsync(r => r.KhachHangId == userId && r.Ptid == ptId);

            Dictionary<string, Dictionary<string, RatingData>> ratingData;
            
            if (existingRating != null && !string.IsNullOrWhiteSpace(existingRating.BinhLuan))
            {
                try
                {
                    // Parse JSON hiện có
                    ratingData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, Dictionary<string, RatingData>>>(
                        existingRating.BinhLuan) ?? new Dictionary<string, Dictionary<string, RatingData>>();
                }
                catch
                {
                    // Nếu không parse được, tạo mới
                    ratingData = new Dictionary<string, Dictionary<string, RatingData>>();
                }
            }
            else
            {
                ratingData = new Dictionary<string, Dictionary<string, RatingData>>();
            }

            // Đảm bảo có key "bookings"
            if (!ratingData.ContainsKey("bookings"))
            {
                ratingData["bookings"] = new Dictionary<string, RatingData>();
            }

            // Cập nhật hoặc thêm đánh giá cho booking này
            ratingData["bookings"][bookingId] = new RatingData
            {
                Rating = rating,
                Comment = comment ?? string.Empty
            };

            // Tính điểm trung bình từ tất cả các booking
            var allRatings = ratingData["bookings"].Values.Select(r => r.Rating).ToList();
            var averageRating = allRatings.Any() ? (int)Math.Round(allRatings.Average()) : rating;

            // Lưu JSON vào BinhLuan
            var jsonBinhLuan = System.Text.Json.JsonSerializer.Serialize(ratingData);

            if (existingRating != null)
            {
                // Cập nhật đánh giá cũ
                existingRating.Diem = averageRating; // Lưu điểm trung bình
                existingRating.BinhLuan = jsonBinhLuan;
                existingRating.NgayDanhGia = DateTime.Now;
            }
            else
            {
                // Tạo đánh giá mới
                var newRating = new DanhGiaPt
                {
                    KhachHangId = userId,
                    Ptid = ptId,
                    Diem = averageRating, // Lưu điểm trung bình
                    BinhLuan = jsonBinhLuan,
                    NgayDanhGia = DateTime.Now
                };

                _context.DanhGiaPts.Add(newRating);
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
                // Lấy tất cả đánh giá của PT này (tính từ điểm trung bình trong mỗi record)
                var ratings = await _context.DanhGiaPts
                    .Where(r => r.Ptid == ptId && r.Diem.HasValue)
                    .ToListAsync();

                // Tính tổng số đánh giá (số lượng record)
                pt.TongDanhGia = ratings.Count;
                
                // Tính điểm trung bình từ tất cả các record
                if (ratings.Any())
                {
                    pt.DiemTrungBinh = ratings.Average(r => r.Diem!.Value);
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

    // Helper class để deserialize JSON
    private class RatingData
    {
        public int Rating { get; set; }
        public string Comment { get; set; } = string.Empty;
    }
}

