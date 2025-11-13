using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using HealthWeb.Models.Entities;
using HealthWeb.Models.EF;

namespace HealthWeb.Services
{
    public interface IFindPTService
    {
        Task<List<object>> SearchPTsAsync(string? search, string? location, string? specialization, double? maxPrice, int? minExperience);
        Task<object?> GetPTDetailsAsync(string ptId);
        Task<(bool success, string message)> SendTrainingRequestAsync(string userId, string ptId, DateTime dateTime, string? sessionType, string? notes);
        Task<List<object>> GetMyRequestsAsync(string userId);
        Task<object?> GetRequestDetailsAsync(string bookingId, string userId);
        Task<(bool success, string message)> CancelRequestAsync(string bookingId, string userId);
        Task<string?> GetCurrentUserIdAsync(HttpContext httpContext);
    }

    public class FindPTService : IFindPTService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<FindPTService> _logger;

        public FindPTService(ApplicationDbContext context, ILogger<FindPTService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<object>> SearchPTsAsync(string? search, string? location, string? specialization, double? maxPrice, int? minExperience)
        {
            try
            {
                var query = _context.HuanLuyenViens
                    .Include(p => p.User)
                    .Where(p => p.DaXacMinh == true && p.NhanKhach == true);

                // Tìm kiếm theo tên, chuyên môn
                if (!string.IsNullOrWhiteSpace(search))
                {
                    var keyword = search.Trim().ToLower();
                    query = query.Where(p =>
                        (p.User.HoTen != null && p.User.HoTen.ToLower().Contains(keyword)) ||
                        (p.User.Username != null && p.User.Username.ToLower().Contains(keyword)) ||
                        (p.ChuyenMon != null && p.ChuyenMon.ToLower().Contains(keyword)) ||
                        (p.TieuSu != null && p.TieuSu.ToLower().Contains(keyword)));
                }

                // Lọc theo thành phố
                if (!string.IsNullOrWhiteSpace(location))
                {
                    var locationLower = location.Trim().ToLower();
                    query = query.Where(p => p.ThanhPho != null && p.ThanhPho.ToLower().Contains(locationLower));
                }

                // Lọc theo chuyên môn
                if (!string.IsNullOrWhiteSpace(specialization))
                {
                    var specLower = specialization.Trim().ToLower();
                    query = query.Where(p => p.ChuyenMon != null && p.ChuyenMon.ToLower().Contains(specLower));
                }

                // Lọc theo giá tối đa
                if (maxPrice.HasValue && maxPrice.Value > 0)
                {
                    query = query.Where(p => p.GiaTheoGio == null || p.GiaTheoGio <= maxPrice.Value);
                }

                // Lọc theo kinh nghiệm tối thiểu
                if (minExperience.HasValue && minExperience.Value > 0)
                {
                    query = query.Where(p => p.SoNamKinhNghiem == null || p.SoNamKinhNghiem >= minExperience.Value);
                }

                var pts = await query
                    .OrderByDescending(p => p.DiemTrungBinh ?? 0)
                    .ThenByDescending(p => p.SoNamKinhNghiem ?? 0)
                    .Take(50)
                    .ToListAsync();

                var ptIds = pts.Select(p => p.Ptid).ToList();

                // Lấy số lượng đánh giá
                var reviewCounts = await _context.DanhGiaPts
                    .Where(r => ptIds.Contains(r.Ptid))
                    .GroupBy(r => r.Ptid)
                    .Select(g => new { PtId = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.PtId, x => x.Count);

                // Lấy số khách hàng hiện tại
                var clientCounts = await _context.QuyenPtKhachHangs
                    .Where(q => ptIds.Contains(q.Ptid) && q.DangHoatDong == true)
                    .GroupBy(q => q.Ptid)
                    .Select(g => new { PtId = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.PtId, x => x.Count);

                var results = pts.Select(pt =>
                {
                    reviewCounts.TryGetValue(pt.Ptid, out var reviewCount);
                    clientCounts.TryGetValue(pt.Ptid, out var clientCount);

                    return new
                    {
                        ptId = pt.Ptid,
                        userId = pt.UserId,
                        name = string.IsNullOrWhiteSpace(pt.User.HoTen) ? pt.User.Username : pt.User.HoTen,
                        username = pt.User.Username,
                        avatar = pt.AnhDaiDien ?? pt.User.AnhDaiDien ?? "/images/default-avatar.png",
                        specialization = pt.ChuyenMon ?? "Chưa cập nhật",
                        experience = pt.SoNamKinhNghiem ?? 0,
                        location = pt.ThanhPho ?? "Chưa cập nhật",
                        pricePerHour = pt.GiaTheoGio ?? 0,
                        rating = pt.DiemTrungBinh ?? 0,
                        reviewCount = reviewCount,
                        currentClients = clientCount,
                        bio = pt.TieuSu ?? "Chưa có tiểu sử",
                        certificates = pt.ChungChi ?? "Chưa cập nhật",
                        available = pt.NhanKhach == true && (pt.SoKhachHienTai == null || pt.SoKhachHienTai < 50)
                    };
                }).Cast<object>().ToList();

                return results;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching PTs");
                return new List<object>();
            }
        }

        public async Task<object?> GetPTDetailsAsync(string ptId)
        {
            try
            {
                var pt = await _context.HuanLuyenViens
                    .Include(p => p.User)
                    .FirstOrDefaultAsync(p => p.Ptid == ptId);

                if (pt == null)
                {
                    return null;
                }

                var reviewCount = await _context.DanhGiaPts
                    .CountAsync(r => r.Ptid == ptId);

                var clientCount = await _context.QuyenPtKhachHangs
                    .CountAsync(q => q.Ptid == ptId && q.DangHoatDong == true);

                var reviews = await _context.DanhGiaPts
                    .Include(r => r.KhachHang)
                    .Where(r => r.Ptid == ptId)
                    .OrderByDescending(r => r.NgayDanhGia)
                    .Take(10)
                    .Select(r => new
                    {
                        clientName = string.IsNullOrWhiteSpace(r.KhachHang.HoTen) ? r.KhachHang.Username : r.KhachHang.HoTen,
                        rating = r.Diem ?? 0,
                        comment = r.BinhLuan ?? "",
                        date = r.NgayDanhGia
                    })
                    .ToListAsync();

                return new
                {
                    ptId = pt.Ptid,
                    userId = pt.UserId,
                    name = string.IsNullOrWhiteSpace(pt.User.HoTen) ? pt.User.Username : pt.User.HoTen,
                    username = pt.User.Username,
                    avatar = pt.AnhDaiDien ?? pt.User.AnhDaiDien ?? "/images/default-avatar.png",
                    specialization = pt.ChuyenMon ?? "Chưa cập nhật",
                    experience = pt.SoNamKinhNghiem ?? 0,
                    location = pt.ThanhPho ?? "Chưa cập nhật",
                    pricePerHour = pt.GiaTheoGio ?? 0,
                    rating = pt.DiemTrungBinh ?? 0,
                    reviewCount = reviewCount,
                    currentClients = clientCount,
                    bio = pt.TieuSu ?? "Chưa có tiểu sử",
                    certificates = pt.ChungChi ?? "Chưa cập nhật",
                    availableHours = pt.GioRanh ?? "Chưa cập nhật",
                    verified = pt.DaXacMinh == true,
                    available = pt.NhanKhach == true && (pt.SoKhachHienTai == null || pt.SoKhachHienTai < 50),
                    reviews = reviews
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting PT details");
                return null;
            }
        }

        public async Task<(bool success, string message)> SendTrainingRequestAsync(string userId, string ptId, DateTime dateTime, string? sessionType, string? notes)
        {
            try
            {
                // Validate userId
                if (string.IsNullOrWhiteSpace(userId))
                {
                    return (false, "Vui lòng đăng nhập để gửi yêu cầu");
                }

                // Validate ptId
                if (string.IsNullOrWhiteSpace(ptId))
                {
                    return (false, "Huấn luyện viên không hợp lệ");
                }

                // Validate dateTime - không được đặt trong quá khứ
                if (dateTime <= DateTime.Now)
                {
                    return (false, "Thời gian đặt lịch phải trong tương lai");
                }

                // Kiểm tra user có tồn tại không
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return (false, "Người dùng không tồn tại");
                }

                // Kiểm tra PT có tồn tại và đang nhận khách không
                var pt = await _context.HuanLuyenViens
                    .Include(p => p.User)
                    .FirstOrDefaultAsync(p => p.Ptid == ptId);

                if (pt == null)
                {
                    return (false, "Không tìm thấy huấn luyện viên");
                }

                if (pt.DaXacMinh != true)
                {
                    return (false, "Huấn luyện viên chưa được xác minh");
                }

                if (pt.NhanKhach != true)
                {
                    return (false, "Huấn luyện viên hiện không nhận khách mới");
                }

                // Kiểm tra xem đã có yêu cầu chưa được xử lý chưa (trong cùng ngày)
                var dateOnly = dateTime.Date;
                var existingRequest = await _context.DatLichPts
                    .Where(d => d.KhacHangId == userId && 
                               d.Ptid == ptId && 
                               d.NgayGioDat.Date == dateOnly &&
                               d.TrangThai != null &&
                               d.TrangThai != "Cancelled" &&
                               d.TrangThai != "Completed")
                    .FirstOrDefaultAsync();

                if (existingRequest != null)
                {
                    return (false, "Bạn đã có yêu cầu với huấn luyện viên này trong ngày này rồi");
                }

                // Kiểm tra xem user có phải là PT không (PT không thể đặt lịch với PT khác)
                if (user.Role == "PT")
                {
                    return (false, "Huấn luyện viên không thể đặt lịch với huấn luyện viên khác");
                }

                // Tạo DatLichId mới
                var lastBooking = await _context.DatLichPts
                    .OrderByDescending(d => d.DatLichId)
                    .FirstOrDefaultAsync();

                var bookingId = "bkg_0001";
                if (lastBooking != null)
                {
                    try
                    {
                        var number = int.Parse(lastBooking.DatLichId.Split('_')[1]) + 1;
                        bookingId = $"bkg_{number:D4}";
                    }
                    catch
                    {
                        // Fallback nếu parse lỗi
                        bookingId = $"bkg_{DateTime.Now:yyyyMMddHHmmss}";
                    }
                }

                // Tạo yêu cầu mới
                var booking = new DatLichPt
                {
                    DatLichId = bookingId,
                    KhacHangId = userId,
                    Ptid = ptId,
                    NgayGioDat = dateTime,
                    LoaiBuoiTap = sessionType ?? "Online",
                    TrangThai = "Pending",
                    GhiChu = notes,
                    NgayTao = DateTime.Now
                };

                _context.DatLichPts.Add(booking);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Training request created: {BookingId} for user {UserId} with PT {PtId}", bookingId, userId, ptId);

                return (true, "Đã gửi yêu cầu thành công! Huấn luyện viên sẽ xem xét và phản hồi.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending training request for user {UserId} with PT {PtId}", userId, ptId);
                return (false, "Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.");
            }
        }

        public async Task<List<object>> GetMyRequestsAsync(string userId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(userId))
                {
                    return new List<object>();
                }

                var requests = await _context.DatLichPts
                    .Include(d => d.Pt)
                        .ThenInclude(p => p!.User)
                    .Where(d => d.KhacHangId == userId)
                    .OrderByDescending(d => d.NgayTao)
                    .Select(d => new
                    {
                        bookingId = d.DatLichId,
                        ptId = d.Ptid,
                        ptName = d.Pt != null ? (string.IsNullOrWhiteSpace(d.Pt.User.HoTen) ? d.Pt.User.Username : d.Pt.User.HoTen) : "N/A",
                        ptAvatar = d.Pt != null ? (d.Pt.AnhDaiDien ?? d.Pt.User.AnhDaiDien ?? "/images/default-avatar.png") : "/images/default-avatar.png",
                        dateTime = d.NgayGioDat,
                        sessionType = d.LoaiBuoiTap ?? "Online",
                        status = d.TrangThai ?? "Pending",
                        notes = d.GhiChu,
                        createdAt = d.NgayTao,
                        canCancel = (d.TrangThai == null || d.TrangThai == "Pending" || d.TrangThai == "Confirmed") && d.NgayGioDat > DateTime.Now
                    })
                    .ToListAsync();

                return requests.Cast<object>().ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user requests for user {UserId}", userId);
                return new List<object>();
            }
        }

        public async Task<object?> GetRequestDetailsAsync(string bookingId, string userId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(bookingId) || string.IsNullOrWhiteSpace(userId))
                {
                    return null;
                }

                var request = await _context.DatLichPts
                    .Include(d => d.Pt)
                        .ThenInclude(p => p!.User)
                    .Include(d => d.KhacHang)
                    .Where(d => d.DatLichId == bookingId && d.KhacHangId == userId)
                    .FirstOrDefaultAsync();

                if (request == null)
                {
                    return null;
                }

                return new
                {
                    bookingId = request.DatLichId,
                    ptId = request.Ptid,
                    ptName = request.Pt != null ? (string.IsNullOrWhiteSpace(request.Pt.User.HoTen) ? request.Pt.User.Username : request.Pt.User.HoTen) : "N/A",
                    ptUsername = request.Pt != null ? request.Pt.User.Username : "N/A",
                    ptAvatar = request.Pt != null ? (request.Pt.AnhDaiDien ?? request.Pt.User.AnhDaiDien ?? "/images/default-avatar.png") : "/images/default-avatar.png",
                    ptSpecialization = request.Pt?.ChuyenMon ?? "Chưa cập nhật",
                    ptPhone = request.Pt?.User.Email ?? "Chưa cập nhật",
                    dateTime = request.NgayGioDat,
                    sessionType = request.LoaiBuoiTap ?? "Online",
                    status = request.TrangThai ?? "Pending",
                    notes = request.GhiChu,
                    rejectionReason = request.LyDoTuChoi,
                    createdAt = request.NgayTao,
                    canCancel = (request.TrangThai == null || request.TrangThai == "Pending" || request.TrangThai == "Confirmed") && request.NgayGioDat > DateTime.Now
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting request details for booking {BookingId}", bookingId);
                return null;
            }
        }

        public async Task<(bool success, string message)> CancelRequestAsync(string bookingId, string userId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(bookingId) || string.IsNullOrWhiteSpace(userId))
                {
                    return (false, "Thông tin không hợp lệ");
                }

                var request = await _context.DatLichPts
                    .FirstOrDefaultAsync(d => d.DatLichId == bookingId && d.KhacHangId == userId);

                if (request == null)
                {
                    return (false, "Không tìm thấy yêu cầu");
                }

                // Chỉ cho phép hủy nếu status là Pending hoặc Confirmed và chưa quá thời gian
                if (request.TrangThai != null && 
                    request.TrangThai != "Pending" && 
                    request.TrangThai != "Confirmed")
                {
                    return (false, $"Không thể hủy yêu cầu với trạng thái: {request.TrangThai}");
                }

                if (request.NgayGioDat <= DateTime.Now)
                {
                    return (false, "Không thể hủy yêu cầu đã quá thời gian");
                }

                // Cập nhật trạng thái
                request.TrangThai = "Cancelled";
                request.NguoiHuy = userId;
                request.LyDoTuChoi = "Khách hàng hủy yêu cầu";

                await _context.SaveChangesAsync();

                _logger.LogInformation("Request {BookingId} cancelled by user {UserId}", bookingId, userId);

                return (true, "Đã hủy yêu cầu thành công");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling request {BookingId} for user {UserId}", bookingId, userId);
                return (false, "Có lỗi xảy ra khi hủy yêu cầu. Vui lòng thử lại.");
            }
        }

        public Task<string?> GetCurrentUserIdAsync(HttpContext httpContext)
        {
            try
            {
                // Thử lấy từ session trước
                var userId = httpContext.Session.GetString("UserId");
                
                if (!string.IsNullOrEmpty(userId))
                {
                    return Task.FromResult<string?>(userId);
                }

                // Nếu không có trong session, có thể lấy từ header hoặc cookie
                // (Tùy vào cách implement authentication)
                return Task.FromResult<string?>(null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting current user ID");
                return Task.FromResult<string?>(null);
            }
        }
    }
}

