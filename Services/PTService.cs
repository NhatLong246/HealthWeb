using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using HealthWeb.Models.Entities;
using HealthWeb.Models.EF;
using System.Security.Cryptography;
using System.Text;
using System.Reflection;

namespace HealthWeb.Services
{
    public interface IPTService
    {
        Task<(bool success, string? errorMessage)> RegisterPTAsync(RegisterPTViewModel model, HttpContext? httpContext = null);
        Task<object?> GetDashboardStatsAsync(string userId);
        Task<DashboardViewModel?> GetDashboardViewModelAsync(string userId);
        Task<List<object>> GetRecentBookingsAsync(string userId);
        Task<List<RecentBookingViewModel>> GetRecentBookingsViewModelAsync(string userId);
        Task<object?> GetClientsStatsAsync(string userId);
        Task<List<object>> GetClientsListAsync(string userId);
        Task<ManageClientsViewModel?> GetManageClientsViewModelAsync(string userId);
        Task<List<object>> GetScheduleForWeekAsync(string userId, DateOnly? start);
        Task<ScheduleViewModel> GetScheduleViewModelAsync(string userId, DateOnly? start);
        Task<(bool success, string message)> UpdateProfileAsync(string userId, ProfileSettingsViewModel model);
        Task<(bool success, string message)> UpdateProfessionalAsync(string userId, ProfessionalSettingsViewModel model);
        Task<(bool success, string message)> UpdateScheduleAsync(string userId, ScheduleSettingsViewModel model);
        Task<(bool success, string message)> ChangePasswordAsync(string userId, ChangePasswordViewModel model);
        Task<SettingsViewModel?> GetSettingsViewModelAsync(string userId);
        Task<string?> GetCurrentUserIdAsync(HttpContext httpContext);
        Task<User?> GetCurrentUserAsync(string userId);
        Task<HuanLuyenVien?> GetCurrentTrainerAsync(string userId);
        Task<object?> GetClientDetailAsync(string ptUserId, string clientId);
        Task<ClientDetailViewModel?> GetClientDetailViewModelAsync(string ptUserId, string clientId);
        Task<List<PendingRequestViewModel>> GetPendingRequestsAsync(string userId);
        Task<(bool success, string message)> AcceptRequestAsync(string userId, string requestId);
        Task<(bool success, string message)> RejectRequestAsync(string userId, string requestId, string reason);
        Task<List<WorkoutTemplateViewModel>> GetWorkoutTemplatesByGoalAsync(string goal);
        Task<List<WorkoutTemplateViewModel>> GetAllWorkoutTemplatesAsync();
        Task<WorkoutTemplateDetailViewModel?> GetWorkoutTemplateDetailAsync(int templateId);
        Task<List<ClientBookingViewModel>> GetClientBookingsForWorkoutAsync(string ptUserId, string clientId);
        Task<(bool success, string message)> CreateWorkoutPlanAsync(string ptUserId, string clientId, CreateWorkoutPlanViewModel model);
        Task<WorkoutPlanViewModel?> GetClientWorkoutPlanAsync(string ptUserId, string clientId);
    }

    public class PTService : IPTService
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<PTService> _logger;

        public PTService(ApplicationDbContext context, IWebHostEnvironment environment, ILogger<PTService> logger)
        {
            _context = context;
            _environment = environment;
            _logger = logger;
        }

        public async Task<(bool success, string? errorMessage)> RegisterPTAsync(RegisterPTViewModel model, HttpContext? httpContext = null)
        {
            try
            {
                string userId = string.Empty;
                User? user = null;
                bool isExistingUser = false;

                // Kiểm tra xem user đã đăng nhập chưa
                if (httpContext != null)
                {
                    var currentUserId = await GetCurrentUserIdAsync(httpContext);
                    if (!string.IsNullOrEmpty(currentUserId))
                    {
                        user = await GetCurrentUserAsync(currentUserId);
                        if (user != null)
                        {
                            userId = currentUserId;
                            isExistingUser = true;
                            
                            // Kiểm tra xem user đã đăng ký PT chưa
                            var existingPT = await _context.HuanLuyenViens.FirstOrDefaultAsync(p => p.UserId == userId);
                            if (existingPT != null)
                            {
                                return (false, "Bạn đã đăng ký làm PT rồi. Vui lòng chờ xác minh hoặc liên hệ admin.");
                            }
                        }
                    }
                }

                // Nếu chưa đăng nhập, tạo user mới
                if (!isExistingUser)
                {
                    // Validate required fields for new user
                    if (string.IsNullOrEmpty(model.Username))
                    {
                        return (false, "Tên đăng nhập là bắt buộc");
                    }

                    if (string.IsNullOrEmpty(model.UserPassword))
                    {
                        return (false, "Mật khẩu là bắt buộc");
                    }

                    // Validate password match
                    if (model.UserPassword != model.UserConfirmPassword)
                    {
                        return (false, "Mật khẩu xác nhận không khớp");
                    }

                    // Check if username already exists
                    if (await _context.Users.AnyAsync(u => u.Username == model.Username))
                    {
                        return (false, "Tên đăng nhập đã tồn tại");
                    }

                    // Check if email already exists
                    if (!string.IsNullOrEmpty(model.UserEmail) && await _context.Users.AnyAsync(u => u.Email == model.UserEmail))
                    {
                        return (false, "Email đã được sử dụng");
                    }

                    // Generate UserId and PTId
                    userId = await GenerateUserIdAsync();
                    var passwordHash = HashPassword(model.UserPassword);

                    // Create User (KHÔNG đổi role thành PT ngay, giữ nguyên role hiện tại hoặc "Client")
                    user = new User
                    {
                        UserId = userId,
                        Username = model.Username,
                        PasswordHash = passwordHash,
                        Email = model.UserEmail,
                        HoTen = model.UserHoTen,
                        NgaySinh = model.UserNgaySinh.HasValue ? DateOnly.FromDateTime(model.UserNgaySinh.Value) : null,
                        Role = "Client", // Giữ role là Client, chỉ đổi khi admin xác nhận
                        CreatedDate = DateTime.Now
                    };
                    _context.Users.Add(user);
                    
                    // Lưu User vào database TRƯỚC khi tạo HuanLuyenVien (để tránh lỗi foreign key)
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("RegisterPTAsync: Created and saved new User with UserId={UserId}", userId);
                }
                else
                {
                    // Cập nhật thông tin user nếu cần
                    if (!string.IsNullOrEmpty(model.UserHoTen))
                        user.HoTen = model.UserHoTen;
                    if (!string.IsNullOrEmpty(model.UserEmail))
                        user.Email = model.UserEmail;
                    if (model.UserNgaySinh.HasValue)
                        user.NgaySinh = DateOnly.FromDateTime(model.UserNgaySinh.Value);
                    
                    // Lưu thay đổi của User trước khi tạo HuanLuyenVien
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("RegisterPTAsync: Updated existing User with UserId={UserId}", userId);
                }

                // Generate PTId
                var ptId = await GeneratePTIdAsync();
                _logger.LogInformation("RegisterPTAsync: Generated PTId={PTId} for UserId={UserId}", ptId, userId);

                // Handle file uploads
                string? avatarPath = null;
                string? cccdPath = null;
                string? certPath = null;

                if (model.AvatarFile != null && model.AvatarFile.Length > 0)
                {
                    avatarPath = await SaveFileAsync(model.AvatarFile, "avatars", userId);
                    if (user != null)
                        user.AnhDaiDien = avatarPath;
                    _logger.LogInformation("RegisterPTAsync: Saved avatar file: {AvatarPath}", avatarPath);
                }

                if (model.CccdFile != null && model.CccdFile.Length > 0)
                {
                    cccdPath = await SaveFileAsync(model.CccdFile, "cccd", userId);
                    _logger.LogInformation("RegisterPTAsync: Saved CCCD file: {CccdPath}", cccdPath);
                }

                if (model.CertFile != null && model.CertFile.Length > 0)
                {
                    certPath = await SaveFileAsync(model.CertFile, "certificates", userId);
                    _logger.LogInformation("RegisterPTAsync: Saved certificate file: {CertPath}", certPath);
                }

                // Convert SoNamKinhNghiem từ string sang int (nếu form gửi string)
                int? soNamKinhNghiem = model.SoNamKinhNghiem;
                if (soNamKinhNghiem == null)
                {
                    // Nếu null, thử parse từ string (nếu có)
                    // Form có thể gửi string như "1-3", "3-5", etc.
                    // Lấy giá trị trung bình hoặc giá trị đầu tiên
                    soNamKinhNghiem = null; // Giữ null nếu không có giá trị
                }

                // Validate required fields
                if (string.IsNullOrWhiteSpace(model.ChuyenMon))
                {
                    return (false, "Chuyên môn là bắt buộc");
                }
                if (string.IsNullOrWhiteSpace(model.ThanhPho))
                {
                    return (false, "Tỉnh/Thành phố là bắt buộc");
                }
                if (string.IsNullOrWhiteSpace(model.TieuSu))
                {
                    return (false, "Tiểu sử là bắt buộc");
                }
                if (string.IsNullOrWhiteSpace(model.GioRanh))
                {
                    return (false, "Giờ rảnh là bắt buộc");
                }

                // Create HuanLuyenVien với DaXacMinh = false (0) - chờ admin xác nhận
                var huanLuyenVien = new HuanLuyenVien
                {
                    Ptid = ptId,
                    UserId = userId,
                    ChuyenMon = model.ChuyenMon,
                    SoNamKinhNghiem = soNamKinhNghiem,
                    ThanhPho = model.ThanhPho,
                    GiaTheoGio = model.GiaTheoGio,
                    ChungChi = model.ChungChi,
                    TieuSu = model.TieuSu,
                    GioRanh = model.GioRanh,
                    AnhDaiDien = avatarPath,
                    AnhCccd = cccdPath,
                    AnhChanDung = avatarPath,
                    FileTaiLieu = certPath,
                    DaXacMinh = false, // = 0 trong database - chờ admin phê duyệt
                    NhanKhach = true,
                    SoKhachHienTai = 0,
                    TongDanhGia = 0,
                    DiemTrungBinh = 0,
                    TiLeThanhCong = 0
                };

                // Save to database
                _context.HuanLuyenViens.Add(huanLuyenVien);
                
                // Lưu thay đổi của User (nếu có cập nhật avatar) và HuanLuyenVien
                await _context.SaveChangesAsync();
                _logger.LogInformation("RegisterPTAsync: Saved HuanLuyenVien to database - PTId={PTId}", ptId);
                
                // Verify data was saved correctly
                var savedPT = await _context.HuanLuyenViens
                    .FirstOrDefaultAsync(p => p.Ptid == ptId);
                
                if (savedPT == null)
                {
                    _logger.LogError("RegisterPTAsync: Failed to save HuanLuyenVien to database");
                    return (false, "Có lỗi xảy ra khi lưu thông tin PT vào database.");
                }
                
                _logger.LogInformation("RegisterPTAsync: Successfully saved HuanLuyenVien - PTId={PTId}, UserId={UserId}, DaXacMinh={DaXacMinh} (saved value: {SavedValue})", 
                    ptId, userId, huanLuyenVien.DaXacMinh, savedPT.DaXacMinh);

                return (true, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error registering PT");
                return (false, "Có lỗi xảy ra khi đăng ký. Vui lòng thử lại.");
            }
        }

        public async Task<object?> GetDashboardStatsAsync(string userId)
        {
            try
            {
                var trainer = await _context.HuanLuyenViens.FirstOrDefaultAsync(p => p.UserId == userId);
                if (trainer == null)
                {
                    return null;
                }

                var ptId = trainer.Ptid;
                var today = DateTime.Today;
                var tomorrow = today.AddDays(1);
                var startOfMonth = new DateTime(today.Year, today.Month, 1);
                var endOfMonth = startOfMonth.AddMonths(1);

                var totalClients = await _context.QuyenPtKhachHangs
                    .Include(q => q.KhachHang)
                    .Include(q => q.Pt)
                    .CountAsync(q => q.Ptid == ptId && q.DangHoatDong == true);

                var todayBookings = await _context.DatLichPts
                    .Include(d => d.KhacHang)
                    .Include(d => d.Pt)
                    .CountAsync(d =>
                        d.Ptid == ptId &&
                        d.NgayGioDat >= today &&
                        d.NgayGioDat < tomorrow &&
                        (d.TrangThai == null || d.TrangThai != "Cancelled"));

                var monthlyRevenue = await _context.GiaoDiches
                    .Include(g => g.DatLich)
                    .Include(g => g.KhachHang)
                    .Include(g => g.Pt)
                    .Where(g =>
                        g.Ptid == ptId &&
                        g.NgayGiaoDich.HasValue &&
                        g.NgayGiaoDich.Value >= startOfMonth &&
                        g.NgayGiaoDich.Value < endOfMonth)
                    .SumAsync(g => g.SoTienPtnhan ?? 0);

                // Lấy tất cả đánh giá của PT này
                var ratings = await _context.DanhGiaPts
                    .Include(r => r.KhachHang)
                    .Include(r => r.Pt)
                    .Where(r => r.Ptid == ptId && r.Diem.HasValue)
                    .ToListAsync();

                // Tính tổng số đánh giá từ JSON (mỗi record có thể chứa nhiều đánh giá theo booking)
                int totalReviews = CountTotalRatingsFromJson(ratings);

                var averageRating = ratings.Count > 0
                    ? Math.Round(ratings.Average(r => r.Diem!.Value), 1)
                    : 0;

                return new
                {
                    totalClients,
                    todayBookings,
                    monthlyRevenue,
                    rating = averageRating,
                    reviews = totalReviews
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving PT dashboard stats");
                return null;
            }
        }

        public async Task<DashboardViewModel?> GetDashboardViewModelAsync(string userId)
        {
            try
            {
                var trainer = await _context.HuanLuyenViens.FirstOrDefaultAsync(p => p.UserId == userId);
                if (trainer == null)
                {
                    _logger.LogWarning("GetDashboardViewModelAsync: Trainer not found for userId: {UserId}", userId);
                    return null;
                }

                var ptId = trainer.Ptid;
                var today = DateTime.Today;
                var tomorrow = today.AddDays(1);
                var startOfMonth = new DateTime(today.Year, today.Month, 1);
                var endOfMonth = startOfMonth.AddMonths(1);

                var totalClients = await _context.QuyenPtKhachHangs
                    .Include(q => q.KhachHang)
                    .Include(q => q.Pt)
                    .CountAsync(q => q.Ptid == ptId && q.DangHoatDong == true);

                var todayBookings = await _context.DatLichPts
                    .Include(d => d.KhacHang)
                    .Include(d => d.Pt)
                    .CountAsync(d =>
                        d.Ptid == ptId &&
                        d.NgayGioDat >= today &&
                        d.NgayGioDat < tomorrow &&
                        (d.TrangThai == null || d.TrangThai != "Cancelled"));

                var monthlyRevenue = await _context.GiaoDiches
                    .Include(g => g.DatLich)
                    .Include(g => g.KhachHang)
                    .Include(g => g.Pt)
                    .Where(g =>
                        g.Ptid == ptId &&
                        g.NgayGiaoDich.HasValue &&
                        g.NgayGiaoDich.Value >= startOfMonth &&
                        g.NgayGiaoDich.Value < endOfMonth)
                    .SumAsync(g => g.SoTienPtnhan ?? 0);

                // Lấy tất cả đánh giá của PT này
                var ratings = await _context.DanhGiaPts
                    .Include(r => r.KhachHang)
                    .Include(r => r.Pt)
                    .Where(r => r.Ptid == ptId && r.Diem.HasValue)
                    .ToListAsync();

                // Tính tổng số đánh giá từ JSON (mỗi record có thể chứa nhiều đánh giá theo booking)
                int totalReviews = CountTotalRatingsFromJson(ratings);

                var averageRating = ratings.Count > 0
                    ? Math.Round(ratings.Average(r => r.Diem!.Value), 1)
                    : 0;

                var recentBookings = await GetRecentBookingsViewModelAsync(userId);

                return new DashboardViewModel
                {
                    TotalClients = totalClients,
                    TodayBookings = todayBookings,
                    MonthlyRevenue = monthlyRevenue,
                    Rating = averageRating,
                    Reviews = totalReviews,
                    RecentBookings = recentBookings
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving dashboard view model for userId: {UserId}", userId);
                return null;
            }
        }

        public async Task<List<object>> GetRecentBookingsAsync(string userId)
        {
            try
            {
                var trainer = await _context.HuanLuyenViens
                    .FirstOrDefaultAsync(p => p.UserId == userId);

                if (trainer == null)
                {
                    return new List<object>();
                }

                var bookings = await _context.DatLichPts
                    .Include(d => d.KhacHang)
                    .Include(d => d.Pt)
                        .ThenInclude(p => p.User)
                    .Where(d => d.Ptid == trainer.Ptid)
                    .OrderByDescending(d => d.NgayGioDat)
                    .Select(d => new
                    {
                        ClientName = d.KhacHang.HoTen ?? d.KhacHang.Username ?? "Khách hàng",
                        Username = d.KhacHang.Username,
                        StartTime = d.NgayGioDat,
                        Status = d.TrangThai ?? "Pending",
                        Type = d.LoaiBuoiTap ?? "Chưa cập nhật"
                    })
                    .Take(5)
                    .ToListAsync();

                return bookings.Cast<object>().ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving PT recent bookings");
                return new List<object>();
            }
        }

        public async Task<List<RecentBookingViewModel>> GetRecentBookingsViewModelAsync(string userId)
        {
            try
            {
                var trainer = await _context.HuanLuyenViens
                    .FirstOrDefaultAsync(p => p.UserId == userId);

                if (trainer == null)
                {
                    return new List<RecentBookingViewModel>();
                }

                var bookings = await _context.DatLichPts
                    .Include(d => d.KhacHang)
                    .Include(d => d.Pt)
                        .ThenInclude(p => p.User)
                    .Where(d => d.Ptid == trainer.Ptid)
                    .OrderByDescending(d => d.NgayGioDat)
                    .Take(5)
                    .ToListAsync();

                return bookings.Select(d => new RecentBookingViewModel
                {
                    ClientName = d.KhacHang.HoTen ?? d.KhacHang.Username ?? "Khách hàng",
                    Username = d.KhacHang.Username ?? "",
                    StartTime = d.NgayGioDat,
                    Status = d.TrangThai ?? "Pending",
                    Type = d.LoaiBuoiTap ?? "Chưa cập nhật"
                }).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving PT recent bookings view model");
                return new List<RecentBookingViewModel>();
            }
        }

        public async Task<object?> GetClientsStatsAsync(string userId)
        {
            try
            {
                var trainer = await GetCurrentTrainerAsync(userId);
                if (trainer == null)
                {
                    _logger.LogWarning("GetClientsStatsAsync: Trainer not found for userId: {UserId}", userId);
                    return null;
                }

                var ptId = trainer.Ptid;
                _logger.LogInformation("GetClientsStatsAsync: PT ID: {PtId} for userId: {UserId}", ptId, userId);

                // Lấy tất cả khách hàng đã có booking với PT này từ DatLichPt
                var clientIdsFromBookings = await _context.DatLichPts
                    .Where(d => d.Ptid == ptId)
                    .Select(d => d.KhacHangId)
                    .Distinct()
                    .ToListAsync();

                // Lấy tất cả khách hàng từ QuyenPtKhachHang
                var clientIdsFromPermissions = await _context.QuyenPtKhachHangs
                    .Where(q => q.Ptid == ptId)
                    .Select(q => q.KhachHangId)
                    .Distinct()
                    .ToListAsync();

                // Hợp nhất tất cả client IDs (từ cả booking và permission)
                var allClientIds = clientIdsFromBookings
                    .Union(clientIdsFromPermissions)
                    .Distinct()
                    .ToList();

                // Tổng số khách hàng
                var totalClients = allClientIds.Count;

                // Số khách hàng đang hoạt động (có permission và DangHoatDong = true)
                var activeClients = await _context.QuyenPtKhachHangs
                    .Where(q => q.Ptid == ptId && q.DangHoatDong == true)
                    .CountAsync();

                // Tổng số buổi tập (không tính Cancelled)
                var totalSessions = await _context.DatLichPts
                    .Where(d => d.Ptid == ptId && (d.TrangThai == null || d.TrangThai != "Cancelled"))
                    .CountAsync();

                // Đánh giá trung bình
                var ratings = await _context.DanhGiaPts
                    .Where(r => r.Ptid == ptId && r.Diem.HasValue)
                    .Select(r => r.Diem!.Value)
                    .ToListAsync();

                var avgRating = ratings.Count > 0 ? Math.Round(ratings.Average(), 1) : 0;

                _logger.LogInformation("GetClientsStatsAsync: Stats - Total: {Total}, Active: {Active}, Sessions: {Sessions}, Rating: {Rating}", 
                    totalClients, activeClients, totalSessions, avgRating);

                return new
                {
                    totalClients,
                    activeClients,
                    totalSessions,
                    avgRating
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving PT client stats");
                return null;
            }
        }

        public async Task<List<object>> GetClientsListAsync(string userId)
        {
            try
            {
                var trainer = await GetCurrentTrainerAsync(userId);
                if (trainer == null)
                {
                    _logger.LogWarning("GetClientsListAsync: Trainer not found for userId: {UserId}", userId);
                    return new List<object>();
                }

                var ptId = trainer.Ptid;
                _logger.LogInformation("GetClientsListAsync: PT ID: {PtId} for userId: {UserId}", ptId, userId);

                // Lấy tất cả khách hàng đã có booking với PT này từ DatLichPt
                var clientIdsFromBookings = await _context.DatLichPts
                    .Where(d => d.Ptid == ptId)
                    .Select(d => d.KhacHangId)
                    .Distinct()
                    .ToListAsync();

                _logger.LogInformation("GetClientsListAsync: Found {Count} clients from bookings", clientIdsFromBookings.Count);

                // Lấy tất cả khách hàng từ QuyenPtKhachHang
                var clientIdsFromPermissions = await _context.QuyenPtKhachHangs
                    .Where(q => q.Ptid == ptId)
                    .Select(q => q.KhachHangId)
                    .Distinct()
                    .ToListAsync();

                _logger.LogInformation("GetClientsListAsync: Found {Count} clients from permissions", clientIdsFromPermissions.Count);

                // Hợp nhất tất cả client IDs (từ cả booking và permission)
                var allClientIds = clientIdsFromBookings
                    .Union(clientIdsFromPermissions)
                    .Distinct()
                    .ToList();

                _logger.LogInformation("GetClientsListAsync: Total unique clients: {Count}", allClientIds.Count);

                if (!allClientIds.Any())
                {
                    _logger.LogWarning("GetClientsListAsync: No clients found for PT {PtId}", ptId);
                    return new List<object>();
                }

                // Lấy thông tin user cho tất cả khách hàng
                var clients = await _context.Users
                    .Where(u => allClientIds.Contains(u.UserId))
                    .ToListAsync();

                // Lấy thông tin quyền từ QuyenPtKhachHang (nếu có)
                var clientLinks = await _context.QuyenPtKhachHangs
                    .Where(q => q.Ptid == ptId && allClientIds.Contains(q.KhachHangId))
                    .ToListAsync();

                var permissionDict = clientLinks.ToDictionary(
                    q => q.KhachHangId,
                    q => q
                );

                // Lấy thống kê booking
                var bookingStats = await _context.DatLichPts
                    .Where(d => d.Ptid == ptId && allClientIds.Contains(d.KhacHangId))
                    .GroupBy(d => d.KhacHangId)
                    .Select(g => new
                    {
                        ClientId = g.Key,
                        Sessions = g.Count(d => d.TrangThai == null || d.TrangThai != "Cancelled"),
                        LastActivity = g.Max(d => (DateTime?)d.NgayGioDat)
                    })
                    .ToListAsync();

                // Lấy thống kê đánh giá
                var ratingStats = await _context.DanhGiaPts
                    .Where(r => r.Ptid == ptId && allClientIds.Contains(r.KhachHangId) && r.Diem.HasValue)
                    .GroupBy(r => r.KhachHangId)
                    .Select(g => new
                    {
                        ClientId = g.Key,
                        Rating = g.Average(r => r.Diem!.Value)
                    })
                    .ToListAsync();

                // Lấy mục tiêu từ DatLichPt.GhiChu (ưu tiên) - yêu cầu gần nhất với PT này
                var bookingGoals = await _context.DatLichPts
                    .Where(d => d.Ptid == ptId && allClientIds.Contains(d.KhacHangId) && !string.IsNullOrEmpty(d.GhiChu))
                    .OrderByDescending(d => d.NgayTao ?? d.NgayGioDat)
                    .Select(d => new { d.KhacHangId, d.GhiChu, d.NgayTao, d.NgayGioDat })
                    .ToListAsync();

                var goalFromBookingDict = new Dictionary<string, string>();
                foreach (var booking in bookingGoals)
                {
                    if (string.IsNullOrEmpty(booking.GhiChu)) continue;
                    
                    // Parse goal từ GhiChu: "Mục tiêu: {goal}"
                    var lines = booking.GhiChu.Split('\n');
                    foreach (var line in lines)
                    {
                        if (line.StartsWith("Mục tiêu:"))
                        {
                            var goal = line.Replace("Mục tiêu:", "").Trim();
                            if (!string.IsNullOrEmpty(goal) && !goalFromBookingDict.ContainsKey(booking.KhacHangId))
                            {
                                goalFromBookingDict[booking.KhacHangId] = goal;
                            }
                            break;
                        }
                    }
                }

                // Lấy mục tiêu từ bảng MucTieu (fallback)
                var goalEntries = await _context.MucTieus
                    .Where(m => allClientIds.Contains(m.UserId))
                    .OrderByDescending(m => m.NgayBatDau)
                    .Select(m => new { m.UserId, m.LoaiMucTieu, m.NgayBatDau })
                    .ToListAsync();

                var goalFromMucTieuDict = goalEntries
                    .GroupBy(m => m.UserId)
                    .ToDictionary(
                        g => g.Key,
                        g => g.OrderByDescending(x => x.NgayBatDau).First().LoaiMucTieu
                    );

                // Kết hợp: ưu tiên goal từ booking, nếu không có thì lấy từ MucTieu
                var goalDict = new Dictionary<string, string>();
                foreach (var clientId in allClientIds)
                {
                    if (goalFromBookingDict.TryGetValue(clientId, out var bookingGoal))
                    {
                        goalDict[clientId] = bookingGoal;
                    }
                    else if (goalFromMucTieuDict.TryGetValue(clientId, out var mucTieuGoal))
                    {
                        goalDict[clientId] = mucTieuGoal;
                    }
                }

                var bookingDict = bookingStats.ToDictionary(b => b.ClientId, b => b);
                var ratingDict = ratingStats.ToDictionary(r => r.ClientId, r => Math.Round(r.Rating, 1));


                // Tạo danh sách kết quả
                var result = new List<object>();
                
                foreach (var user in clients)
                {
                    permissionDict.TryGetValue(user.UserId, out var permission);
                    bookingDict.TryGetValue(user.UserId, out var sessionInfo);
                    ratingDict.TryGetValue(user.UserId, out var ratingValue);
                    goalDict.TryGetValue(user.UserId, out var goal);

                    // Xác định status: nếu có permission thì dùng status từ permission, nếu không thì dựa vào booking
                    string status;
                    if (permission != null)
                    {
                        status = permission.DangHoatDong == true
                            ? "Active"
                            : permission.DangHoatDong == false
                                ? "Inactive"
                                : "Pending";
                    }
                    else
                    {
                        // Nếu chưa có permission, mặc định là "Pending" (chờ duyệt)
                        status = "Pending";
                    }

                    // Sử dụng anonymous object thay vì Dictionary để đảm bảo JSON serialization
                    result.Add(new
                    {
                        id = user.UserId,
                        name = string.IsNullOrWhiteSpace(user.HoTen) ? user.Username : user.HoTen,
                        username = user.Username,
                        email = user.Email ?? string.Empty,
                        goal = goal ?? "Chưa cập nhật",
                        sessions = sessionInfo?.Sessions ?? 0,
                        status = status,
                        rating = ratingValue,
                        lastActivity = sessionInfo?.LastActivity,
                        createdDate = user.CreatedDate
                    });
                }

                // Sắp xếp kết quả - sử dụng reflection để lấy giá trị từ anonymous object
                result = result
                    .OrderByDescending(c =>
                    {
                        var prop = c.GetType().GetProperty("lastActivity");
                        if (prop != null)
                        {
                            var value = prop.GetValue(c);
                            return value as DateTime? ?? DateTime.MinValue;
                        }
                        return DateTime.MinValue;
                    })
                    .ThenBy(c =>
                    {
                        var prop = c.GetType().GetProperty("name");
                        if (prop != null)
                        {
                            return prop.GetValue(c)?.ToString() ?? "";
                        }
                        return "";
                    })
                    .ToList();

                _logger.LogInformation("GetClientsListAsync: Returning {Count} clients for PT {PtId}", result.Count, ptId);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving PT clients list");
                return new List<object>();
            }
        }


        public async Task<List<object>> GetScheduleForWeekAsync(string userId, DateOnly? start)
        {
            try
            {
                var trainer = await GetCurrentTrainerAsync(userId);
                if (trainer == null)
                {
                    return new List<object>();
                }

                var startDate = start?.ToDateTime(TimeOnly.MinValue) ?? GetStartOfWeek(DateTime.Today);
                var endDate = startDate.AddDays(7);

                var bookings = await _context.DatLichPts
                    .Include(d => d.KhacHang)
                    .Include(d => d.Pt)
                        .ThenInclude(p => p.User)
                    .Include(d => d.GiaoDich)
                    .Where(d => d.Ptid == trainer.Ptid && d.NgayGioDat >= startDate && d.NgayGioDat < endDate)
                    .OrderBy(d => d.NgayGioDat)
                    .ToListAsync();

                var result = bookings.Select(b => new
                {
                    id = b.DatLichId,
                    clientName = string.IsNullOrWhiteSpace(b.KhacHang.HoTen) ? b.KhacHang.Username : b.KhacHang.HoTen,
                    startTime = b.NgayGioDat,
                    status = string.IsNullOrWhiteSpace(b.TrangThai) ? "Pending" : b.TrangThai,
                    type = string.IsNullOrWhiteSpace(b.LoaiBuoiTap) ? "1-on-1" : b.LoaiBuoiTap,
                    notes = b.GhiChu,
                    duration = 60
                }).Cast<object>().ToList();

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving PT schedule");
                return new List<object>();
            }
        }

        public async Task<ScheduleViewModel> GetScheduleViewModelAsync(string userId, DateOnly? start)
        {
            try
            {
                var trainer = await GetCurrentTrainerAsync(userId);
                if (trainer == null)
                {
                    return new ScheduleViewModel();
                }

                var startDate = start?.ToDateTime(TimeOnly.MinValue) ?? GetStartOfWeek(DateTime.Today);
                var endDate = startDate.AddDays(7);
                var weekStart = DateOnly.FromDateTime(startDate);
                var weekEnd = DateOnly.FromDateTime(endDate.AddDays(-1));

                var bookings = await _context.DatLichPts
                    .Include(d => d.KhacHang)
                    .Include(d => d.Pt)
                        .ThenInclude(p => p.User)
                    .Include(d => d.GiaoDich)
                    .Where(d => d.Ptid == trainer.Ptid && d.NgayGioDat >= startDate && d.NgayGioDat < endDate)
                    .OrderBy(d => d.NgayGioDat)
                    .ToListAsync();

                var viewModel = new ScheduleViewModel
                {
                    WeekStart = weekStart,
                    WeekEnd = weekEnd,
                    Bookings = bookings.Select(b => new ScheduleBookingViewModel
                    {
                        Id = b.DatLichId,
                        ClientName = string.IsNullOrWhiteSpace(b.KhacHang.HoTen) ? b.KhacHang.Username : b.KhacHang.HoTen,
                        StartTime = b.NgayGioDat,
                        Duration = 60, // Default duration
                        Status = string.IsNullOrWhiteSpace(b.TrangThai) ? "Pending" : b.TrangThai,
                        Type = string.IsNullOrWhiteSpace(b.LoaiBuoiTap) ? "1-on-1" : b.LoaiBuoiTap,
                        Notes = b.GhiChu
                    }).ToList()
                };

                return viewModel;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting schedule view model");
                return new ScheduleViewModel();
            }
        }

        public async Task<(bool success, string message)> UpdateProfileAsync(string userId, ProfileSettingsViewModel model)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return (false, "Không tìm thấy người dùng");
                }

                user.HoTen = model.HoTen;
                user.Email = model.Email;

                var pt = await _context.HuanLuyenViens.FirstOrDefaultAsync(p => p.UserId == userId);
                if (pt != null)
                {
                    pt.ThanhPho = model.ThanhPho;
                    pt.TieuSu = model.TieuSu;
                }

                await _context.SaveChangesAsync();
                return (true, "Đã cập nhật thông tin cá nhân");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating profile");
                return (false, "Có lỗi xảy ra");
            }
        }

        public async Task<(bool success, string message)> UpdateProfessionalAsync(string userId, ProfessionalSettingsViewModel model)
        {
            try
            {
                var pt = await _context.HuanLuyenViens.FirstOrDefaultAsync(p => p.UserId == userId);
                if (pt == null)
                {
                    return (false, "Không tìm thấy thông tin PT");
                }

                pt.ChuyenMon = model.ChuyenMon;
                pt.SoNamKinhNghiem = model.SoNamKinhNghiem;
                pt.GiaTheoGio = model.GiaTheoGio;
                pt.ChungChi = model.ChungChi;

                await _context.SaveChangesAsync();
                return (true, "Đã cập nhật thông tin chuyên môn");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating professional info");
                return (false, "Có lỗi xảy ra");
            }
        }

        public async Task<(bool success, string message)> UpdateScheduleAsync(string userId, ScheduleSettingsViewModel model)
        {
            try
            {
                var pt = await _context.HuanLuyenViens.FirstOrDefaultAsync(p => p.UserId == userId);
                if (pt == null)
                {
                    return (false, "Không tìm thấy thông tin PT");
                }

                pt.GioRanh = model.GioRanh;
                pt.NhanKhach = model.NhanKhach;

                await _context.SaveChangesAsync();
                return (true, "Đã cập nhật lịch làm việc");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating schedule");
                return (false, "Có lỗi xảy ra");
            }
        }

        public async Task<(bool success, string message)> ChangePasswordAsync(string userId, ChangePasswordViewModel model)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return (false, "Không tìm thấy người dùng");
                }

                if (!VerifyPassword(model.CurrentPassword, user.PasswordHash))
                {
                    return (false, "Mật khẩu hiện tại không đúng");
                }

                if (model.NewPassword != model.ConfirmPassword)
                {
                    return (false, "Mật khẩu xác nhận không khớp");
                }

                user.PasswordHash = HashPassword(model.NewPassword);
                await _context.SaveChangesAsync();

                return (true, "Đã đổi mật khẩu thành công");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing password");
                return (false, "Có lỗi xảy ra");
            }
        }

        public async Task<SettingsViewModel?> GetSettingsViewModelAsync(string userId)
        {
            try
            {
                var user = await _context.Users
                    .Include(u => u.HuanLuyenViens)
                    .FirstOrDefaultAsync(u => u.UserId == userId);
                
                if (user == null)
                {
                    return null;
                }

                var pt = user.HuanLuyenViens?.FirstOrDefault();
                
                return new SettingsViewModel
                {
                    Profile = new ProfileSettingsViewModel
                    {
                        HoTen = user.HoTen ?? "",
                        Email = user.Email ?? "",
                        Phone = null, // Phone field not available in User entity
                        ThanhPho = pt?.ThanhPho,
                        TieuSu = pt?.TieuSu
                    },
                    Professional = new ProfessionalSettingsViewModel
                    {
                        ChuyenMon = pt?.ChuyenMon,
                        SoNamKinhNghiem = pt?.SoNamKinhNghiem,
                        GiaTheoGio = pt?.GiaTheoGio,
                        ChungChi = pt?.ChungChi
                    },
                    Schedule = new ScheduleSettingsViewModel
                    {
                        GioRanh = pt?.GioRanh,
                        NhanKhach = pt?.NhanKhach ?? true,
                        MaxClients = null // MaxClients not available in HuanLuyenVien entity
                    }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting settings view model");
                return null;
            }
        }

        public async Task<string?> GetCurrentUserIdAsync(HttpContext httpContext)
        {
            var userId = httpContext.Session.GetString("UserId");
            _logger.LogInformation("GetCurrentUserIdAsync: Retrieved userId: {UserId}", userId ?? "NULL");
            return userId;
        }

        public async Task<User?> GetCurrentUserAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return null;
            }
            return await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
        }

        public async Task<HuanLuyenVien?> GetCurrentTrainerAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("GetCurrentTrainerAsync: userId is null or empty");
                return null;
            }

            var trainer = await _context.HuanLuyenViens.FirstOrDefaultAsync(p => p.UserId == userId);
            if (trainer == null)
            {
                _logger.LogWarning("GetCurrentTrainerAsync: No trainer found for userId: {UserId}", userId);
            }
            else
            {
                _logger.LogInformation("GetCurrentTrainerAsync: Found trainer {PtId} for userId: {UserId}", trainer.Ptid, userId);
            }

            return trainer;
        }

        public async Task<object?> GetClientDetailAsync(string ptUserId, string clientId)
        {
            try
            {
                // Lấy PT ID
                var trainer = await GetCurrentTrainerAsync(ptUserId);
                if (trainer == null)
                {
                    return null;
                }

                var ptId = trainer.Ptid;

                // Kiểm tra xem client có thuộc PT này không
                var hasPermission = await _context.QuyenPtKhachHangs
                    .AnyAsync(q => q.Ptid == ptId && q.KhachHangId == clientId);
                
                var hasBooking = await _context.DatLichPts
                    .AnyAsync(d => d.Ptid == ptId && d.KhacHangId == clientId);

                if (!hasPermission && !hasBooking)
                {
                    return null; // Client không thuộc PT này
                }

                // Lấy thông tin user
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.UserId == clientId);

                if (user == null)
                {
                    return null;
                }

                // Lấy permission info
                var permission = await _context.QuyenPtKhachHangs
                    .FirstOrDefaultAsync(q => q.Ptid == ptId && q.KhachHangId == clientId);

                // Lấy thống kê booking
                var bookings = await _context.DatLichPts
                    .Where(d => d.Ptid == ptId && d.KhacHangId == clientId)
                    .OrderByDescending(d => d.NgayGioDat)
                    .ToListAsync();

                var totalSessions = bookings.Count(d => d.TrangThai == null || d.TrangThai != "Cancelled");
                var lastActivity = bookings
                    .Where(d => d.TrangThai == null || d.TrangThai != "Cancelled")
                    .OrderByDescending(d => d.NgayGioDat)
                    .FirstOrDefault()?.NgayGioDat;

                // Lấy yêu cầu Pending của client này
                var pendingBookings = bookings
                    .Where(d => d.TrangThai == null || d.TrangThai == "Pending")
                    .OrderByDescending(d => d.NgayTao)
                    .ThenBy(d => d.NgayGioDat)
                    .ToList();

                var pendingRequestId = pendingBookings.FirstOrDefault()?.DatLichId;
                var hasPendingRequest = pendingRequestId != null;

                // Lấy đánh giá của client này cho PT
                var ratings = await _context.DanhGiaPts
                    .Where(r => r.Ptid == ptId && r.KhachHangId == clientId && r.Diem.HasValue)
                    .ToListAsync();

                // Tính tổng số đánh giá từ JSON (mỗi record có thể chứa nhiều đánh giá theo booking)
                int totalRatings = CountTotalRatingsFromJson(ratings);
                var avgRating = ratings.Any() ? Math.Round(ratings.Average(r => r.Diem!.Value), 1) : 0;

                // Lấy mục tiêu - ưu tiên từ DatLichPt.GhiChu (yêu cầu gần nhất với PT này)
                string? goal = null;
                
                // Tìm mục tiêu từ booking gần nhất
                var recentBooking = bookings
                    .Where(d => !string.IsNullOrEmpty(d.GhiChu))
                    .OrderByDescending(d => d.NgayTao ?? d.NgayGioDat)
                    .FirstOrDefault();
                
                if (recentBooking != null && !string.IsNullOrEmpty(recentBooking.GhiChu))
                {
                    var lines = recentBooking.GhiChu.Split('\n');
                    foreach (var line in lines)
                    {
                        if (line.StartsWith("Mục tiêu:"))
                        {
                            goal = line.Replace("Mục tiêu:", "").Trim();
                            break;
                        }
                    }
                }
                
                // Nếu không có từ booking, lấy từ bảng MucTieu
                if (string.IsNullOrEmpty(goal))
                {
                    goal = await _context.MucTieus
                        .Where(m => m.UserId == clientId)
                        .OrderByDescending(m => m.NgayBatDau)
                        .Select(m => m.LoaiMucTieu)
                        .FirstOrDefaultAsync();
                }

                // Lấy thông tin sức khỏe gần nhất
                var latestHealth = await _context.LuuTruSucKhoes
                    .Where(h => h.UserId == clientId)
                    .OrderByDescending(h => h.NgayGhiNhan)
                    .FirstOrDefaultAsync();

                return new
                {
                    id = user.UserId,
                    name = user.HoTen ?? user.Username,
                    username = user.Username,
                    email = user.Email,
                    phone = user.GioiTinh, // Tạm thời dùng GioiTinh, có thể thêm Phone sau
                    avatar = user.AnhDaiDien,
                    status = permission != null
                        ? (permission.DangHoatDong == true ? "Active" : permission.DangHoatDong == false ? "Inactive" : "Pending")
                        : "Pending",
                    totalSessions = totalSessions,
                    avgRating = avgRating,
                    totalRatings = totalRatings,
                    goal = goal ?? "Chưa cập nhật",
                    lastActivity = lastActivity,
                    joinedDate = permission?.NgayCapQuyen ?? bookings.FirstOrDefault()?.NgayGioDat,
                    healthInfo = latestHealth != null ? new
                    {
                        height = latestHealth.ChieuCao,
                        weight = latestHealth.CanNang,
                        bmi = latestHealth.Bmi,
                        recordDate = latestHealth.NgayGhiNhan
                    } : null,
                    recentBookings = bookings.Take(5).Select(b => new
                    {
                        id = b.DatLichId,
                        date = b.NgayGioDat,
                        status = b.TrangThai ?? "Pending",
                        type = b.LoaiBuoiTap ?? "In-person",
                        note = b.GhiChu
                    }).ToList(),
                    hasPendingRequest = hasPendingRequest,
                    pendingRequestId = pendingRequestId
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving client detail for clientId: {ClientId}", clientId);
                return null;
            }
        }

        public async Task<ClientDetailViewModel?> GetClientDetailViewModelAsync(string ptUserId, string clientId)
        {
            try
            {
                // Lấy PT ID
                var trainer = await GetCurrentTrainerAsync(ptUserId);
                if (trainer == null)
                {
                    return null;
                }

                var ptId = trainer.Ptid;

                // Kiểm tra xem client có thuộc PT này không
                var hasPermission = await _context.QuyenPtKhachHangs
                    .AnyAsync(q => q.Ptid == ptId && q.KhachHangId == clientId);
                
                var hasBooking = await _context.DatLichPts
                    .AnyAsync(d => d.Ptid == ptId && d.KhacHangId == clientId);

                if (!hasPermission && !hasBooking)
                {
                    return null; // Client không thuộc PT này
                }

                // Lấy thông tin user
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.UserId == clientId);

                if (user == null)
                {
                    return null;
                }

                // Lấy permission info
                var permission = await _context.QuyenPtKhachHangs
                    .FirstOrDefaultAsync(q => q.Ptid == ptId && q.KhachHangId == clientId);

                // Lấy thống kê booking
                var bookings = await _context.DatLichPts
                    .Where(d => d.Ptid == ptId && d.KhacHangId == clientId)
                    .OrderByDescending(d => d.NgayGioDat)
                    .ToListAsync();

                var totalSessions = bookings.Count(d => d.TrangThai == null || d.TrangThai != "Cancelled");
                var lastActivity = bookings
                    .Where(d => d.TrangThai == null || d.TrangThai != "Cancelled")
                    .OrderByDescending(d => d.NgayGioDat)
                    .FirstOrDefault()?.NgayGioDat;

                // Lấy yêu cầu Pending của client này
                var pendingBookings = bookings
                    .Where(d => d.TrangThai == null || d.TrangThai == "Pending")
                    .OrderByDescending(d => d.NgayTao)
                    .ThenBy(d => d.NgayGioDat)
                    .ToList();

                var pendingRequestId = pendingBookings.FirstOrDefault()?.DatLichId;
                var hasPendingRequest = pendingRequestId != null;

                // Lấy đánh giá của client này cho PT
                var ratings = await _context.DanhGiaPts
                    .Where(r => r.Ptid == ptId && r.KhachHangId == clientId && r.Diem.HasValue)
                    .ToListAsync();

                // Tính tổng số đánh giá từ JSON (mỗi record có thể chứa nhiều đánh giá theo booking)
                int totalRatings = CountTotalRatingsFromJson(ratings);
                var avgRating = ratings.Any() ? Math.Round(ratings.Average(r => r.Diem!.Value), 1) : 0;

                // Lấy mục tiêu - ưu tiên từ DatLichPt.GhiChu (yêu cầu gần nhất với PT này)
                string? goal = null;
                
                // Tìm mục tiêu từ booking gần nhất
                var recentBooking = bookings
                    .Where(d => !string.IsNullOrEmpty(d.GhiChu))
                    .OrderByDescending(d => d.NgayTao ?? d.NgayGioDat)
                    .FirstOrDefault();
                
                if (recentBooking != null && !string.IsNullOrEmpty(recentBooking.GhiChu))
                {
                    var lines = recentBooking.GhiChu.Split('\n');
                    foreach (var line in lines)
                    {
                        if (line.StartsWith("Mục tiêu:"))
                        {
                            goal = line.Replace("Mục tiêu:", "").Trim();
                            break;
                        }
                    }
                }
                
                // Nếu không có từ booking, lấy từ bảng MucTieu
                if (string.IsNullOrEmpty(goal))
                {
                    goal = await _context.MucTieus
                        .Where(m => m.UserId == clientId)
                        .OrderByDescending(m => m.NgayBatDau)
                        .Select(m => m.LoaiMucTieu)
                        .FirstOrDefaultAsync();
                }

                // Lấy thông tin sức khỏe gần nhất
                var latestHealth = await _context.LuuTruSucKhoes
                    .Where(h => h.UserId == clientId)
                    .OrderByDescending(h => h.NgayGhiNhan)
                    .FirstOrDefaultAsync();

                var status = permission != null
                    ? (permission.DangHoatDong == true ? "Active" : permission.DangHoatDong == false ? "Inactive" : "Pending")
                    : "Pending";

                return new ClientDetailViewModel
                {
                    Id = user.UserId,
                    Name = user.HoTen ?? user.Username,
                    Username = user.Username,
                    Email = user.Email,
                    Phone = user.GioiTinh, // Tạm thời dùng GioiTinh, có thể thêm Phone sau
                    Avatar = user.AnhDaiDien,
                    Status = status,
                    TotalSessions = totalSessions,
                    AvgRating = avgRating,
                    TotalRatings = totalRatings,
                    Goal = goal ?? "Chưa cập nhật",
                    LastActivity = lastActivity,
                    JoinedDate = permission?.NgayCapQuyen ?? bookings.FirstOrDefault()?.NgayGioDat,
                    HealthInfo = latestHealth != null ? new ClientHealthInfoViewModel
                    {
                        Height = latestHealth.ChieuCao.HasValue ? (decimal?)latestHealth.ChieuCao.Value : null,
                        Weight = latestHealth.CanNang.HasValue ? (decimal?)latestHealth.CanNang.Value : null,
                        Bmi = latestHealth.Bmi.HasValue ? (decimal?)latestHealth.Bmi.Value : null,
                        RecordDate = latestHealth.NgayGhiNhan.ToDateTime(TimeOnly.MinValue)
                    } : null,
                    RecentBookings = bookings.Take(5).Select(b => new ClientBookingViewModel
                    {
                        Id = b.DatLichId,
                        Date = b.NgayGioDat,
                        Status = b.TrangThai ?? "Pending",
                        Type = b.LoaiBuoiTap ?? "In-person",
                        Note = b.GhiChu
                    }).ToList(),
                    HasPendingRequest = hasPendingRequest,
                    PendingRequestId = pendingRequestId
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving client detail view model for clientId: {ClientId}", clientId);
                return null;
            }
        }

        public async Task<ManageClientsViewModel?> GetManageClientsViewModelAsync(string userId)
        {
            try
            {
                var trainer = await GetCurrentTrainerAsync(userId);
                if (trainer == null)
                {
                    _logger.LogWarning("GetManageClientsViewModelAsync: Trainer not found for userId: {UserId}", userId);
                    return new ManageClientsViewModel
                    {
                        Clients = new List<ClientViewModel>()
                    };
                }

                var ptId = trainer.Ptid;

                // Lấy tất cả khách hàng từ bookings và permissions
                var clientIdsFromBookings = await _context.DatLichPts
                    .Where(d => d.Ptid == ptId)
                    .Select(d => d.KhacHangId)
                    .Distinct()
                    .ToListAsync();

                var clientIdsFromPermissions = await _context.QuyenPtKhachHangs
                    .Where(q => q.Ptid == ptId)
                    .Select(q => q.KhachHangId)
                    .Distinct()
                    .ToListAsync();

                var allClientIds = clientIdsFromBookings
                    .Union(clientIdsFromPermissions)
                    .Distinct()
                    .ToList();

                // Stats
                var totalClients = allClientIds.Count;
                var activeClients = await _context.QuyenPtKhachHangs
                    .Where(q => q.Ptid == ptId && q.DangHoatDong == true)
                    .CountAsync();
                var totalSessions = await _context.DatLichPts
                    .Where(d => d.Ptid == ptId && (d.TrangThai == null || d.TrangThai != "Cancelled"))
                    .CountAsync();

                // Lấy đánh giá của PT này (tổng)
                var ratings = await _context.DanhGiaPts
                    .Where(r => r.Ptid == ptId && r.Diem.HasValue)
                    .ToListAsync();
                
                // Tính tổng số đánh giá từ JSON
                int totalReviews = CountTotalRatingsFromJson(ratings);
                var avgRating = ratings.Count > 0 ? Math.Round(ratings.Average(r => r.Diem!.Value), 1) : 0;

                if (!allClientIds.Any())
                {
                    return new ManageClientsViewModel
                    {
                        TotalClients = totalClients,
                        ActiveClients = activeClients,
                        TotalSessions = totalSessions,
                        AvgRating = avgRating,
                        Clients = new List<ClientViewModel>()
                    };
                }

                // Load clients
                var clients = await _context.Users
                    .Where(u => allClientIds.Contains(u.UserId))
                    .ToListAsync();

                // Load permissions
                var permissions = await _context.QuyenPtKhachHangs
                    .Where(q => q.Ptid == ptId && allClientIds.Contains(q.KhachHangId))
                    .ToListAsync();
                var permissionDict = permissions.ToDictionary(q => q.KhachHangId, q => q);

                // Load booking stats
                var bookingStats = await _context.DatLichPts
                    .Where(d => d.Ptid == ptId && allClientIds.Contains(d.KhacHangId))
                    .GroupBy(d => d.KhacHangId)
                    .Select(g => new
                    {
                        ClientId = g.Key,
                        Sessions = g.Count(d => d.TrangThai == null || d.TrangThai != "Cancelled"),
                        LastActivity = g.Max(d => (DateTime?)d.NgayGioDat)
                    })
                    .ToListAsync();
                var bookingDict = bookingStats.ToDictionary(b => b.ClientId, b => b);

                // Load ratings
                var ratingStats = await _context.DanhGiaPts
                    .Where(r => r.Ptid == ptId && allClientIds.Contains(r.KhachHangId) && r.Diem.HasValue)
                    .GroupBy(r => r.KhachHangId)
                    .Select(g => new
                    {
                        ClientId = g.Key,
                        Rating = g.Average(r => r.Diem!.Value)
                    })
                    .ToListAsync();
                var ratingDict = ratingStats.ToDictionary(r => r.ClientId, r => Math.Round(r.Rating, 1));

                // Load goals - ưu tiên từ DatLichPt.GhiChu (yêu cầu gần nhất với PT này)
                var bookingGoals = await _context.DatLichPts
                    .Where(d => d.Ptid == ptId && allClientIds.Contains(d.KhacHangId) && !string.IsNullOrEmpty(d.GhiChu))
                    .OrderByDescending(d => d.NgayTao ?? d.NgayGioDat)
                    .Select(d => new { d.KhacHangId, d.GhiChu, d.NgayTao, d.NgayGioDat })
                    .ToListAsync();

                var goalFromBookingDict = new Dictionary<string, string>();
                foreach (var booking in bookingGoals)
                {
                    if (string.IsNullOrEmpty(booking.GhiChu)) continue;
                    
                    // Parse goal từ GhiChu: "Mục tiêu: {goal}"
                    var lines = booking.GhiChu.Split('\n');
                    foreach (var line in lines)
                    {
                        if (line.StartsWith("Mục tiêu:"))
                        {
                            var goal = line.Replace("Mục tiêu:", "").Trim();
                            if (!string.IsNullOrEmpty(goal) && !goalFromBookingDict.ContainsKey(booking.KhacHangId))
                            {
                                goalFromBookingDict[booking.KhacHangId] = goal;
                            }
                            break;
                        }
                    }
                }

                // Load goals từ bảng MucTieu (fallback)
                var goals = await _context.MucTieus
                    .Where(m => allClientIds.Contains(m.UserId))
                    .OrderByDescending(m => m.NgayBatDau)
                    .Select(m => new { m.UserId, m.LoaiMucTieu, m.NgayBatDau })
                    .ToListAsync();
                var goalFromMucTieuDict = goals
                    .GroupBy(m => m.UserId)
                    .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.NgayBatDau).First().LoaiMucTieu);

                // Kết hợp: ưu tiên goal từ booking, nếu không có thì lấy từ MucTieu
                var goalDict = new Dictionary<string, string>();
                foreach (var clientId in allClientIds)
                {
                    if (goalFromBookingDict.TryGetValue(clientId, out var bookingGoal))
                    {
                        goalDict[clientId] = bookingGoal;
                    }
                    else if (goalFromMucTieuDict.TryGetValue(clientId, out var mucTieuGoal))
                    {
                        goalDict[clientId] = mucTieuGoal;
                    }
                }

                // Build client list
                var clientsList = clients.Select(user =>
                {
                    permissionDict.TryGetValue(user.UserId, out var permission);
                    bookingDict.TryGetValue(user.UserId, out var sessionInfo);
                    ratingDict.TryGetValue(user.UserId, out var ratingValue);
                    goalDict.TryGetValue(user.UserId, out var goal);

                    string status;
                    if (permission != null)
                    {
                        status = permission.DangHoatDong == true ? "Active" 
                            : permission.DangHoatDong == false ? "Inactive" 
                            : "Pending";
                    }
                    else
                    {
                        status = "Pending";
                    }

                    return new ClientViewModel
                    {
                        Id = user.UserId,
                        Name = string.IsNullOrWhiteSpace(user.HoTen) ? user.Username : user.HoTen,
                        Username = user.Username,
                        Email = user.Email,
                        Goal = goal ?? "Chưa cập nhật",
                        Sessions = sessionInfo?.Sessions ?? 0,
                        Status = status,
                        Rating = ratingValue,
                        LastActivity = sessionInfo?.LastActivity
                    };
                }).ToList();

                return new ManageClientsViewModel
                {
                    TotalClients = totalClients,
                    ActiveClients = activeClients,
                    TotalSessions = totalSessions,
                    AvgRating = avgRating,
                    Clients = clientsList
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving manage clients view model for userId: {UserId}", userId);
                return null;
            }
        }

        // Helper method để tính tổng số đánh giá từ JSON trong BinhLuan
        private int CountTotalRatingsFromJson(List<DanhGiaPt> ratings)
        {
            int totalReviews = 0;
            foreach (var rating in ratings)
            {
                if (!string.IsNullOrWhiteSpace(rating.BinhLuan))
                {
                    try
                    {
                        var ratingData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, Dictionary<string, object>>>(
                            rating.BinhLuan);
                        
                        if (ratingData != null && ratingData.ContainsKey("bookings"))
                        {
                            var bookings = ratingData["bookings"];
                            totalReviews += bookings.Count;
                        }
                        else
                        {
                            // Nếu không có JSON hoặc format cũ, đếm là 1 đánh giá
                            totalReviews += 1;
                        }
                    }
                    catch
                    {
                        // Nếu không parse được JSON, đếm là 1 đánh giá
                        totalReviews += 1;
                    }
                }
                else
                {
                    // Nếu không có BinhLuan, đếm là 1 đánh giá
                    totalReviews += 1;
                }
            }
            return totalReviews;
        }

        // Helper methods
        private string HashPassword(string password)
        {
            using (var sha256 = SHA256.Create())
            {
                var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
                return Convert.ToBase64String(hashedBytes);
            }
        }

        private bool VerifyPassword(string password, string hash)
        {
            var hashedPassword = HashPassword(password);
            return hashedPassword == hash;
        }

        private async Task<string> GenerateUserIdAsync()
        {
            var lastUser = await _context.Users
                .OrderByDescending(u => u.UserId)
                .FirstOrDefaultAsync();

            if (lastUser == null)
            {
                return "user_0001";
            }

            var number = int.Parse(lastUser.UserId.Split('_')[1]) + 1;
            return $"user_{number:D4}";
        }

        private async Task<string> GeneratePTIdAsync()
        {
            var lastPT = await _context.HuanLuyenViens
                .OrderByDescending(p => p.Ptid)
                .FirstOrDefaultAsync();

            if (lastPT == null)
            {
                return "pt_0001";
            }

            var number = int.Parse(lastPT.Ptid.Split('_')[1]) + 1;
            return $"pt_{number:D4}";
        }

        private async Task<string> SaveFileAsync(IFormFile file, string folder, string userId)
        {
            var uploadsFolder = Path.Combine(_environment.WebRootPath, "uploads", folder, userId);
            Directory.CreateDirectory(uploadsFolder);

            var fileName = $"{Guid.NewGuid()}_{file.FileName}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            return $"/uploads/{folder}/{userId}/{fileName}";
        }

        private static DateTime GetStartOfWeek(DateTime date)
        {
            var diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
            return date.Date.AddDays(-1 * diff);
        }

        public async Task<List<PendingRequestViewModel>> GetPendingRequestsAsync(string userId)
        {
            try
            {
                var trainer = await GetCurrentTrainerAsync(userId);
                if (trainer == null)
                {
                    return new List<PendingRequestViewModel>();
                }

                var ptId = trainer.Ptid;

                // Lấy tất cả yêu cầu Pending của PT này, group theo client và ngày tạo
                var pendingBookings = await _context.DatLichPts
                    .Include(d => d.KhacHang)
                    .Where(d => d.Ptid == ptId && 
                               (d.TrangThai == null || d.TrangThai == "Pending"))
                    .OrderByDescending(d => d.NgayTao)
                    .ThenBy(d => d.NgayGioDat)
                    .ToListAsync();

                // Group theo client và ngày tạo để tạo request groups
                var requestGroups = pendingBookings
                    .GroupBy(d => new { d.KhacHangId, d.NgayTao })
                    .ToList();

                var requests = new List<PendingRequestViewModel>();

                foreach (var group in requestGroups)
                {
                    var firstBooking = group.First();
                    var client = firstBooking.KhacHang;

                    // Parse GhiChu để lấy Goal và Notes
                    var goal = "";
                    var notes = "";
                    var schedules = new List<ScheduleItem>();

                    if (!string.IsNullOrWhiteSpace(firstBooking.GhiChu))
                    {
                        var lines = firstBooking.GhiChu.Split('\n');
                        foreach (var line in lines)
                        {
                            if (line.StartsWith("Mục tiêu:"))
                            {
                                goal = line.Replace("Mục tiêu:", "").Trim();
                            }
                            else if (line.StartsWith("Ghi chú:"))
                            {
                                notes = line.Replace("Ghi chú:", "").Trim();
                            }
                            else if (line.Contains(":") && line.Contains("-"))
                            {
                                // Parse schedule line: "- Monday: 08:00 - 10:00"
                                var scheduleLine = line.Trim().TrimStart('-').Trim();
                                var parts = scheduleLine.Split(':');
                                if (parts.Length >= 3)
                                {
                                    var day = parts[0].Trim();
                                    var timeParts = parts[1].Trim() + ":" + parts[2].Split('-')[0].Trim();
                                    var endTimeParts = parts[2].Split('-');
                                    if (endTimeParts.Length > 1)
                                    {
                                        var endTime = endTimeParts[1].Trim();
                                        schedules.Add(new ScheduleItem
                                        {
                                            Day = day,
                                            StartTime = timeParts,
                                            EndTime = endTime
                                        });
                                    }
                                }
                            }
                        }
                    }

                    // Lấy thời gian đầu tiên và cuối cùng từ group
                    var sortedBookings = group.OrderBy(b => b.NgayGioDat).ToList();
                    var firstTime = sortedBookings.First().NgayGioDat;
                    var lastTime = sortedBookings.Last().NgayGioDat;

                    requests.Add(new PendingRequestViewModel
                    {
                        RequestId = firstBooking.DatLichId, // Sử dụng ID đầu tiên làm request ID
                        ClientId = client.UserId,
                        ClientName = client.HoTen ?? client.Username,
                        Username = client.Username,
                        Avatar = client.AnhDaiDien,
                        RequestDate = firstBooking.NgayTao ?? firstBooking.NgayGioDat,
                        StartTime = firstTime,
                        EndTime = lastTime,
                        Goal = goal,
                        Notes = notes,
                        Schedules = schedules
                    });
                }

                return requests;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting pending requests for user {UserId}", userId);
                return new List<PendingRequestViewModel>();
            }
        }

        public async Task<(bool success, string message)> AcceptRequestAsync(string userId, string requestId)
        {
            try
            {
                var trainer = await GetCurrentTrainerAsync(userId);
                if (trainer == null)
                {
                    return (false, "Không tìm thấy thông tin PT");
                }

                var ptId = trainer.Ptid;

                // Tìm booking đầu tiên với requestId này
                var firstBooking = await _context.DatLichPts
                    .FirstOrDefaultAsync(d => d.DatLichId == requestId && d.Ptid == ptId);

                if (firstBooking == null)
                {
                    return (false, "Không tìm thấy yêu cầu");
                }

                // Lấy tất cả bookings cùng client và cùng ngày tạo (cùng request group)
                var requestGroup = await _context.DatLichPts
                    .Where(d => d.Ptid == ptId &&
                               d.KhacHangId == firstBooking.KhacHangId &&
                               d.NgayTao == firstBooking.NgayTao &&
                               (d.TrangThai == null || d.TrangThai == "Pending"))
                    .ToListAsync();

                if (requestGroup.Count == 0)
                {
                    return (false, "Không tìm thấy yêu cầu");
                }

                var clientId = firstBooking.KhacHangId;

                // Cập nhật tất cả bookings trong group thành Confirmed
                foreach (var booking in requestGroup)
                {
                    booking.TrangThai = "Confirmed";
                }

                // Tạo hoặc cập nhật QuyenPtKhachHang để client xuất hiện trong danh sách với trạng thái Active
                var permission = await _context.QuyenPtKhachHangs
                    .FirstOrDefaultAsync(q => q.Ptid == ptId && q.KhachHangId == clientId);

                if (permission == null)
                {
                    // Tạo mới permission
                    permission = new QuyenPtKhachHang
                    {
                        KhachHangId = clientId,
                        Ptid = ptId,
                        NgayCapQuyen = DateTime.Now,
                        DangHoatDong = true
                    };
                    _context.QuyenPtKhachHangs.Add(permission);
                }
                else
                {
                    // Cập nhật permission thành active
                    permission.DangHoatDong = true;
                    if (!permission.NgayCapQuyen.HasValue)
                    {
                        permission.NgayCapQuyen = DateTime.Now;
                    }
                }

                // Lấy thông tin PT để hiển thị trong thông báo
                var ptInfo = await _context.HuanLuyenViens
                    .Include(h => h.User)
                    .FirstOrDefaultAsync(h => h.Ptid == ptId);
                var ptName = ptInfo?.User?.HoTen ?? ptInfo?.User?.Username ?? "PT";

                // Tạo thông báo cho client
                var notification = new ThongBao
                {
                    UserId = clientId,
                    NoiDung = $"PT {ptName} đã chấp nhận yêu cầu tập luyện của bạn. Bạn đã được thêm vào danh sách khách hàng với {requestGroup.Count} buổi tập đã được xác nhận.",
                    Loai = "PT",
                    MaLienQuan = null, // Có thể set booking ID nếu cần
                    DaDoc = false,
                    NgayTao = DateTime.Now
                };
                _context.ThongBaos.Add(notification);

                await _context.SaveChangesAsync();

                _logger.LogInformation("Request {RequestId} accepted by PT {PtId}, client {ClientId} is now Active", requestId, ptId, clientId);

                return (true, $"Đã chấp nhận {requestGroup.Count} buổi tập. Khách hàng đã được thêm vào danh sách.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error accepting request {RequestId} for user {UserId}", requestId, userId);
                return (false, "Có lỗi xảy ra khi chấp nhận yêu cầu");
            }
        }

        public async Task<(bool success, string message)> RejectRequestAsync(string userId, string requestId, string reason)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(reason))
                {
                    return (false, "Vui lòng nhập lý do từ chối");
                }

                var trainer = await GetCurrentTrainerAsync(userId);
                if (trainer == null)
                {
                    return (false, "Không tìm thấy thông tin PT");
                }

                var ptId = trainer.Ptid;

                // Tìm booking đầu tiên với requestId này
                var firstBooking = await _context.DatLichPts
                    .FirstOrDefaultAsync(d => d.DatLichId == requestId && d.Ptid == ptId);

                if (firstBooking == null)
                {
                    return (false, "Không tìm thấy yêu cầu");
                }

                // Lấy tất cả bookings cùng client và cùng ngày tạo (cùng request group)
                var requestGroup = await _context.DatLichPts
                    .Where(d => d.Ptid == ptId &&
                               d.KhacHangId == firstBooking.KhacHangId &&
                               d.NgayTao == firstBooking.NgayTao &&
                               (d.TrangThai == null || d.TrangThai == "Pending"))
                    .ToListAsync();

                if (requestGroup.Count == 0)
                {
                    return (false, "Không tìm thấy yêu cầu");
                }

                var clientId = firstBooking.KhacHangId;

                // Cập nhật tất cả bookings trong group thành Cancelled và lưu lý do
                foreach (var booking in requestGroup)
                {
                    booking.TrangThai = "Cancelled";
                    booking.LyDoTuChoi = reason;
                    booking.NguoiHuy = ptId; // PT từ chối
                }

                // Xóa QuyenPtKhachHang để client không xuất hiện trong danh sách nữa
                var permission = await _context.QuyenPtKhachHangs
                    .FirstOrDefaultAsync(q => q.Ptid == ptId && q.KhachHangId == clientId);

                if (permission != null)
                {
                    _context.QuyenPtKhachHangs.Remove(permission);
                }

                // Lấy thông tin PT để hiển thị trong thông báo
                var ptInfo = await _context.HuanLuyenViens
                    .Include(h => h.User)
                    .FirstOrDefaultAsync(h => h.Ptid == ptId);
                var ptName = ptInfo?.User?.HoTen ?? ptInfo?.User?.Username ?? "PT";

                // Tạo thông báo cho client kèm lý do từ chối
                var notification = new ThongBao
                {
                    UserId = clientId,
                    NoiDung = $"PT {ptName} đã từ chối yêu cầu tập luyện của bạn.\n\nLý do: {reason}\n\n{requestGroup.Count} buổi tập đã bị hủy.",
                    Loai = "PT",
                    MaLienQuan = null, // Có thể set booking ID nếu cần
                    DaDoc = false,
                    NgayTao = DateTime.Now
                };
                _context.ThongBaos.Add(notification);

                await _context.SaveChangesAsync();

                _logger.LogInformation("Request {RequestId} rejected by PT {PtId} with reason: {Reason}, client {ClientId} removed from list", requestId, ptId, reason, clientId);

                return (true, $"Đã từ chối {requestGroup.Count} buổi tập. Khách hàng đã được xóa khỏi danh sách.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error rejecting request {RequestId} for user {UserId}", requestId, userId);
                return (false, "Có lỗi xảy ra khi từ chối yêu cầu");
            }
        }

        public async Task<List<WorkoutTemplateViewModel>> GetWorkoutTemplatesByGoalAsync(string goal)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(goal))
                {
                    return new List<WorkoutTemplateViewModel>();
                }

                var templates = await _context.MauTapLuyens
                    .Where(m => m.MucTieu == goal && (m.CongKhai == true || m.DaXacThuc == true))
                    .OrderByDescending(m => m.DiemTrungBinh ?? 0)
                    .ThenByDescending(m => m.SoLanSuDung ?? 0)
                    .Select(m => new WorkoutTemplateViewModel
                    {
                        TemplateId = m.MauTapLuyenId,
                        Name = m.TenMauTapLuyen,
                        Description = m.MoTa,
                        Difficulty = m.DoKho ?? "Beginner",
                        Weeks = m.SoTuan ?? 4,
                        EstimatedCalories = m.CaloUocTinh ?? 0,
                        Equipment = m.ThietBiCan,
                        ExerciseCount = m.ChiTietMauTapLuyens.Count,
                        Rating = m.DiemTrungBinh ?? 0,
                        UsageCount = m.SoLanSuDung ?? 0
                    })
                    .ToListAsync();

                return templates;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting workout templates for goal: {Goal}", goal);
                return new List<WorkoutTemplateViewModel>();
            }
        }

        public async Task<List<WorkoutTemplateViewModel>> GetAllWorkoutTemplatesAsync()
        {
            try
            {
                var templates = await _context.MauTapLuyens
                    .Where(m => m.CongKhai == true || m.DaXacThuc == true)
                    .OrderByDescending(m => m.DiemTrungBinh ?? 0)
                    .ThenByDescending(m => m.SoLanSuDung ?? 0)
                    .Select(m => new WorkoutTemplateViewModel
                    {
                        TemplateId = m.MauTapLuyenId,
                        Name = m.TenMauTapLuyen,
                        Description = m.MoTa,
                        Difficulty = m.DoKho ?? "Beginner",
                        Weeks = m.SoTuan ?? 4,
                        EstimatedCalories = m.CaloUocTinh ?? 0,
                        Equipment = m.ThietBiCan,
                        ExerciseCount = m.ChiTietMauTapLuyens.Count,
                        Rating = m.DiemTrungBinh ?? 0,
                        UsageCount = m.SoLanSuDung ?? 0,
                        Goal = m.MucTieu
                    })
                    .ToListAsync();

                return templates;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all workout templates");
                return new List<WorkoutTemplateViewModel>();
            }
        }

        public async Task<List<ClientBookingViewModel>> GetClientBookingsForWorkoutAsync(string ptUserId, string clientId)
        {
            try
            {
                var trainer = await GetCurrentTrainerAsync(ptUserId);
                if (trainer == null)
                {
                    return new List<ClientBookingViewModel>();
                }

                // Lấy các booking từ bảng DatLichPt
                // Chỉ lấy booking đã confirmed hoặc pending (chưa completed, chưa cancelled)
                // Chỉ lấy booking trong tương lai hoặc hôm nay
                var now = DateTime.Now;
                var bookings = await _context.DatLichPts
                    .Where(d => d.Ptid == trainer.Ptid 
                        && d.KhacHangId == clientId
                        && (d.TrangThai == "Confirmed" || d.TrangThai == "Pending")
                        && d.NgayGioDat >= now.Date) // Lấy từ đầu ngày hôm nay trở đi
                    .OrderBy(d => d.NgayGioDat)
                    .Select(d => new ClientBookingViewModel
                    {
                        Id = d.DatLichId, // DatLichId từ bảng DatLichPt
                        Date = d.NgayGioDat, // NgayGioDat từ bảng DatLichPt
                        Status = d.TrangThai ?? "Pending", // TrangThai từ bảng DatLichPt
                        Type = d.LoaiBuoiTap ?? "In-person", // LoaiBuoiTap từ bảng DatLichPt
                        Note = d.GhiChu // GhiChu từ bảng DatLichPt
                    })
                    .ToListAsync();
                
                _logger.LogInformation("Found {Count} bookings for client {ClientId} and PT {PtId}", 
                    bookings.Count, clientId, trainer.Ptid);

                return bookings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting client bookings for workout");
                return new List<ClientBookingViewModel>();
            }
        }

        public async Task<WorkoutTemplateDetailViewModel?> GetWorkoutTemplateDetailAsync(int templateId)
        {
            try
            {
                var template = await _context.MauTapLuyens
                    .Include(m => m.ChiTietMauTapLuyens)
                    .FirstOrDefaultAsync(m => m.MauTapLuyenId == templateId);

                if (template == null)
                {
                    return null;
                }

                return new WorkoutTemplateDetailViewModel
                {
                    TemplateId = template.MauTapLuyenId,
                    Name = template.TenMauTapLuyen,
                    Description = template.MoTa,
                    Difficulty = template.DoKho ?? "Beginner",
                    Weeks = template.SoTuan ?? 4,
                    EstimatedCalories = template.CaloUocTinh ?? 0,
                    Equipment = template.ThietBiCan,
                    Exercises = template.ChiTietMauTapLuyens.Select(e => new ExerciseViewModel
                    {
                        ExerciseId = e.BaiTapId,
                        Name = e.TenbaiTap,
                        Sets = e.SoSets,
                        Reps = e.SoReps,
                        DurationMinutes = e.ThoiLuongPhut,
                        RestSeconds = e.ThoiGianNghiGiay,
                        Week = e.Tuan ?? 1,
                        DayOfWeek = e.NgayTrongTuan ?? 1,
                        Order = e.ThuTuHienThi ?? 0,
                        VideoUrl = e.VideoUrl,
                        Notes = e.GhiChu
                    }).ToList()
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting workout template detail for templateId: {TemplateId}", templateId);
                return null;
            }
        }

        public async Task<(bool success, string message)> CreateWorkoutPlanAsync(string ptUserId, string clientId, CreateWorkoutPlanViewModel model)
        {
            try
            {
                // Validate PT
                var trainer = await GetCurrentTrainerAsync(ptUserId);
                if (trainer == null)
                {
                    return (false, "Không tìm thấy thông tin PT");
                }

                // Validate client belongs to PT
                var hasPermission = await _context.QuyenPtKhachHangs
                    .AnyAsync(q => q.Ptid == trainer.Ptid && q.KhachHangId == clientId);
                
                var hasBooking = await _context.DatLichPts
                    .AnyAsync(d => d.Ptid == trainer.Ptid && d.KhacHangId == clientId);

                if (!hasPermission && !hasBooking)
                {
                    return (false, "Khách hàng không thuộc quyền quản lý của bạn");
                }

                // Validate model
                if (string.IsNullOrWhiteSpace(model.PlanName))
                {
                    return (false, "Vui lòng nhập tên kế hoạch");
                }

                if (model.Weeks <= 0 || model.Weeks > 52)
                {
                    return (false, "Số tuần phải từ 1 đến 52");
                }

                if (model.SessionsPerWeek <= 0 || model.SessionsPerWeek > 7)
                {
                    return (false, "Số buổi/tuần phải từ 1 đến 7");
                }

                if (model.Exercises == null || model.Exercises.Count == 0)
                {
                    return (false, "Vui lòng thêm ít nhất một bài tập");
                }

                // Get client's goal (MucTieu) - try to find from DatLichPt first, then from MucTieu table
                string? mucTieuId = null;
                var recentBooking = await _context.DatLichPts
                    .Where(d => d.Ptid == trainer.Ptid && d.KhacHangId == clientId && !string.IsNullOrEmpty(d.GhiChu))
                    .OrderByDescending(d => d.NgayTao ?? d.NgayGioDat)
                    .FirstOrDefaultAsync();

                string? goal = null;
                if (recentBooking != null && !string.IsNullOrEmpty(recentBooking.GhiChu))
                {
                    var lines = recentBooking.GhiChu.Split('\n');
                    foreach (var line in lines)
                    {
                        if (line.StartsWith("Mục tiêu:"))
                        {
                            goal = line.Replace("Mục tiêu:", "").Trim();
                            
                            // Try to find MucTieuId by matching goal text in MucTieu table
                            var matchingMucTieu = await _context.MucTieus
                                .Where(m => m.UserId == clientId && m.LoaiMucTieu.Contains(goal))
                                .OrderByDescending(m => m.NgayBatDau)
                                .FirstOrDefaultAsync();
                            
                            if (matchingMucTieu != null)
                            {
                                mucTieuId = matchingMucTieu.MucTieuId;
                            }
                            break;
                        }
                    }
                }

                // If no goal from booking or no MucTieuId found, get from MucTieu table
                if (string.IsNullOrEmpty(goal) || string.IsNullOrEmpty(mucTieuId))
                {
                    var mucTieu = await _context.MucTieus
                        .Where(m => m.UserId == clientId)
                        .OrderByDescending(m => m.NgayBatDau)
                        .FirstOrDefaultAsync();
                    
                    if (mucTieu != null)
                    {
                        mucTieuId = mucTieu.MucTieuId;
                        if (string.IsNullOrEmpty(goal))
                        {
                            goal = mucTieu.LoaiMucTieu;
                        }
                    }
                }

                // Generate KeHoachId
                var lastPlan = await _context.KeHoachTapLuyens
                    .OrderByDescending(k => k.KeHoachId)
                    .FirstOrDefaultAsync();

                var planNumber = 1;
                if (lastPlan != null)
                {
                    try
                    {
                        planNumber = int.Parse(lastPlan.KeHoachId.Split('_')[1]) + 1;
                    }
                    catch
                    {
                        planNumber = 1;
                    }
                }

                // Step 1: Create MauTapLuyen (Template) with PT as creator
                var mauTapLuyen = new MauTapLuyen
                {
                    NguoiTao = trainer.Ptid, // PT ID
                    TenMauTapLuyen = model.PlanName,
                    MoTa = $"Kế hoạch tập luyện cho khách hàng - {model.PlanName}",
                    DoKho = model.Difficulty ?? "Beginner",
                    MucTieu = goal,
                    SoTuan = model.Weeks,
                    CaloUocTinh = model.EstimatedCaloriesPerSession.HasValue 
                        ? (int?)(model.EstimatedCaloriesPerSession.Value * model.SessionsPerWeek * model.Weeks)
                        : null,
                    ThietBiCan = null, // Có thể mở rộng để lấy từ exercises nếu cần
                    CongKhai = false, // Không công khai mặc định
                    DaXacThuc = true, // Đã xác thực vì do PT tạo
                    SoLanSuDung = 0,
                    DiemTrungBinh = null,
                    NgayTao = DateTime.Now,
                    NgayChinhSua = DateTime.Now
                };

                _context.MauTapLuyens.Add(mauTapLuyen);
                await _context.SaveChangesAsync(); // Save to get MauTapLuyenId

                // Step 2: Create ChiTietMauTapLuyen for each exercise
                var thuTuHienThi = 1;
                foreach (var exercise in model.Exercises)
                {
                    var chiTietMau = new ChiTietMauTapLuyen
                    {
                        MauTapLuyenId = mauTapLuyen.MauTapLuyenId,
                        TenbaiTap = exercise.Name,
                        SoSets = exercise.Sets,
                        SoReps = exercise.Reps,
                        ThoiLuongPhut = exercise.DurationMinutes,
                        ThoiGianNghiGiay = exercise.RestSeconds,
                        Tuan = exercise.Week,
                        NgayTrongTuan = exercise.DayOfWeek,
                        ThuTuHienThi = thuTuHienThi,
                        VideoUrl = exercise.VideoUrl,
                        GhiChu = exercise.Notes
                    };

                    _context.ChiTietMauTapLuyens.Add(chiTietMau);
                    thuTuHienThi++;
                }

                await _context.SaveChangesAsync(); // Save ChiTietMauTapLuyen

                // Step 3: Generate KeHoachId (auto-increment style)
                var keHoachId = $"plan_{planNumber:D4}";

                // Step 4: Create KeHoachTapLuyen
                var workoutPlan = new KeHoachTapLuyen
                {
                    KeHoachId = keHoachId,
                    UserId = clientId,
                    MucTieuId = mucTieuId,
                    TenKeHoach = model.PlanName,
                    LoaiKeHoach = goal, // Use goal as LoaiKeHoach
                    MucDo = model.Difficulty ?? "Beginner",
                    SoTuan = model.Weeks,
                    SoBuoi = model.SessionsPerWeek,
                    ThoiLuongPhut = model.DurationPerSession ?? 60,
                    CaloTieuHaoMoiBuoi = model.EstimatedCaloriesPerSession,
                    Nguon = "PT", // Source: PT created
                    DangSuDung = true,
                    NgayTao = DateTime.Now
                };

                _context.KeHoachTapLuyens.Add(workoutPlan);

                // Step 5: Create ChiTietKeHoachTapLuyen for each exercise
                var chiTietId = 1;
                foreach (var exercise in model.Exercises)
                {
                    var chiTiet = new ChiTietKeHoachTapLuyen
                    {
                        KeHoachId = keHoachId,
                        TenBaiTap = exercise.Name,
                        SoHiep = exercise.Sets,
                        SoLan = exercise.Reps,
                        ThoiGianPhut = exercise.DurationMinutes,
                        NgayTrongTuan = exercise.DayOfWeek,
                        Tuan = exercise.Week,
                        ThuTuHienThi = exercise.Order,
                        VideoUrl = exercise.VideoUrl,
                        CanhBao = exercise.Notes,
                        CaloTieuHaoDuKien = exercise.EstimatedCalories
                    };

                    _context.ChiTietKeHoachTapLuyens.Add(chiTiet);
                    chiTietId++;
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Workout plan created: {PlanId} for client {ClientId} by PT {PtId}", keHoachId, clientId, trainer.Ptid);

                return (true, "Đã tạo kế hoạch tập luyện thành công");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating workout plan for client {ClientId}", clientId);
                return (false, "Có lỗi xảy ra khi tạo kế hoạch tập luyện");
            }
        }

        public async Task<WorkoutPlanViewModel?> GetClientWorkoutPlanAsync(string ptUserId, string clientId)
        {
            try
            {
                var trainer = await GetCurrentTrainerAsync(ptUserId);
                if (trainer == null)
                {
                    return null;
                }

                // Validate client belongs to PT
                var hasPermission = await _context.QuyenPtKhachHangs
                    .AnyAsync(q => q.Ptid == trainer.Ptid && q.KhachHangId == clientId);
                
                var hasBooking = await _context.DatLichPts
                    .AnyAsync(d => d.Ptid == trainer.Ptid && d.KhacHangId == clientId);

                if (!hasPermission && !hasBooking)
                {
                    return null;
                }

                // Get active workout plan
                var plan = await _context.KeHoachTapLuyens
                    .Include(k => k.ChiTietKeHoachTapLuyens)
                    .Where(k => k.UserId == clientId && k.DangSuDung == true && k.Nguon == "PT")
                    .OrderByDescending(k => k.NgayTao)
                    .FirstOrDefaultAsync();

                if (plan == null)
                {
                    return null;
                }

                return new WorkoutPlanViewModel
                {
                    PlanId = plan.KeHoachId,
                    PlanName = plan.TenKeHoach,
                    Weeks = plan.SoTuan ?? 0,
                    SessionsPerWeek = plan.SoBuoi ?? 0,
                    DurationPerSession = plan.ThoiLuongPhut ?? 60,
                    CreatedDate = plan.NgayTao ?? DateTime.Now,
                    Exercises = plan.ChiTietKeHoachTapLuyens.Select(e => new ExerciseViewModel
                    {
                        ExerciseId = e.ChiTietId,
                        Name = e.TenBaiTap,
                        Sets = e.SoHiep,
                        Reps = e.SoLan,
                        DurationMinutes = e.ThoiGianPhut,
                        Week = e.Tuan ?? 1,
                        DayOfWeek = e.NgayTrongTuan ?? 1,
                        Order = e.ThuTuHienThi ?? 0,
                        VideoUrl = e.VideoUrl,
                        Notes = e.CanhBao
                    }).ToList()
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting workout plan for client {ClientId}", clientId);
                return null;
            }
        }
    }

    // View Models (moved from controller)
    public class RegisterPTViewModel
    {
        public string UserHoTen { get; set; } = null!;
        public string UserEmail { get; set; } = null!;
        public string? UserPhone { get; set; }
        public DateTime? UserNgaySinh { get; set; }
        public string? Username { get; set; } // Optional nếu user đã đăng nhập
        public string? UserPassword { get; set; } // Optional nếu user đã đăng nhập
        public string? UserConfirmPassword { get; set; } // Optional nếu user đã đăng nhập
        public string ChuyenMon { get; set; } = null!;
        public int? SoNamKinhNghiem { get; set; }
        public string ThanhPho { get; set; } = null!;
        public double? GiaTheoGio { get; set; }
        public string? ChungChi { get; set; }
        public string TieuSu { get; set; } = null!;
        public string GioRanh { get; set; } = null!;
        public IFormFile? AvatarFile { get; set; }
        public IFormFile? CccdFile { get; set; }
        public IFormFile? CertFile { get; set; }
    }

    public class ProfileSettingsViewModel
    {
        public string HoTen { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string? Phone { get; set; }
        public string? ThanhPho { get; set; }
        public string? TieuSu { get; set; }
    }

    public class ProfessionalSettingsViewModel
    {
        public string? ChuyenMon { get; set; }
        public int? SoNamKinhNghiem { get; set; }
        public double? GiaTheoGio { get; set; }
        public string? ChungChi { get; set; }
    }

    public class ScheduleSettingsViewModel
    {
        public string? GioRanh { get; set; }
        public bool NhanKhach { get; set; }
        public int? MaxClients { get; set; } // Not stored in database, kept for UI compatibility
    }

    public class ChangePasswordViewModel
    {
        public string CurrentPassword { get; set; } = null!;
        public string NewPassword { get; set; } = null!;
        public string ConfirmPassword { get; set; } = null!;
    }

    public class DashboardViewModel
    {
        public int TotalClients { get; set; }
        public int TodayBookings { get; set; }
        public double MonthlyRevenue { get; set; }
        public double Rating { get; set; }
        public int Reviews { get; set; }
        public List<RecentBookingViewModel> RecentBookings { get; set; } = new();
    }

    public class RecentBookingViewModel
    {
        public string ClientName { get; set; } = null!;
        public string Username { get; set; } = null!;
        public DateTime StartTime { get; set; }
        public string Status { get; set; } = null!;
        public string Type { get; set; } = null!;
    }

    public class ManageClientsViewModel
    {
        public int TotalClients { get; set; }
        public int ActiveClients { get; set; }
        public int TotalSessions { get; set; }
        public double AvgRating { get; set; }
        public List<ClientViewModel> Clients { get; set; } = new();
    }

    public class ClientViewModel
    {
        public string Id { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string Username { get; set; } = null!;
        public string? Email { get; set; }
        public string? Goal { get; set; }
        public int Sessions { get; set; }
        public string Status { get; set; } = null!;
        public double Rating { get; set; }
        public DateTime? LastActivity { get; set; }
    }


    public class ScheduleViewModel
    {
        public DateOnly WeekStart { get; set; }
        public DateOnly WeekEnd { get; set; }
        public List<ScheduleBookingViewModel> Bookings { get; set; } = new();
    }

    public class ScheduleBookingViewModel
    {
        public string Id { get; set; } = null!;
        public string ClientName { get; set; } = null!;
        public DateTime StartTime { get; set; }
        public int Duration { get; set; }
        public string Status { get; set; } = null!;
        public string Type { get; set; } = null!;
        public string? Notes { get; set; }
    }

    public class SettingsViewModel
    {
        public ProfileSettingsViewModel Profile { get; set; } = new();
        public ProfessionalSettingsViewModel Professional { get; set; } = new();
        public ScheduleSettingsViewModel Schedule { get; set; } = new();
    }

    public class PendingRequestViewModel
    {
        public string RequestId { get; set; } = null!;
        public string ClientId { get; set; } = null!;
        public string ClientName { get; set; } = null!;
        public string Username { get; set; } = null!;
        public string? Avatar { get; set; }
        public DateTime RequestDate { get; set; }
        public DateTime? StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public string? Goal { get; set; }
        public string? Notes { get; set; }
        public List<ScheduleItem> Schedules { get; set; } = new();
    }

    public class ClientDetailViewModel
    {
        public string Id { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string Username { get; set; } = null!;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Avatar { get; set; }
        public string Status { get; set; } = null!;
        public int TotalSessions { get; set; }
        public double AvgRating { get; set; }
        public int TotalRatings { get; set; }
        public string? Goal { get; set; }
        public DateTime? LastActivity { get; set; }
        public DateTime? JoinedDate { get; set; }
        public ClientHealthInfoViewModel? HealthInfo { get; set; }
        public List<ClientBookingViewModel> RecentBookings { get; set; } = new();
        public bool HasPendingRequest { get; set; }
        public string? PendingRequestId { get; set; }
    }

    public class ClientHealthInfoViewModel
    {
        public decimal? Height { get; set; }
        public decimal? Weight { get; set; }
        public decimal? Bmi { get; set; }
        public DateTime? RecordDate { get; set; }
    }

    public class ClientBookingViewModel
    {
        public string Id { get; set; } = null!;
        public DateTime Date { get; set; }
        public string Status { get; set; } = null!;
        public string Type { get; set; } = null!;
        public string? Note { get; set; }
    }

    // Workout Plan View Models
    public class WorkoutTemplateViewModel
    {
        public int TemplateId { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public string Difficulty { get; set; } = null!;
        public int Weeks { get; set; }
        public int EstimatedCalories { get; set; }
        public string? Equipment { get; set; }
        public int ExerciseCount { get; set; }
        public double Rating { get; set; }
        public int UsageCount { get; set; }
        public string? Goal { get; set; }
    }

    public class WorkoutTemplateDetailViewModel
    {
        public int TemplateId { get; set; }
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public string Difficulty { get; set; } = null!;
        public int Weeks { get; set; }
        public int EstimatedCalories { get; set; }
        public string? Equipment { get; set; }
        public List<ExerciseViewModel> Exercises { get; set; } = new();
    }

    public class ExerciseViewModel
    {
        public int ExerciseId { get; set; }
        public string Name { get; set; } = null!;
        public int? Sets { get; set; }
        public int? Reps { get; set; }
        public int? DurationMinutes { get; set; }
        public int? RestSeconds { get; set; }
        public int Week { get; set; } = 1;
        public int DayOfWeek { get; set; } = 1; // 1=Monday, 7=Sunday
        public int Order { get; set; } = 0;
        public string? VideoUrl { get; set; }
        public string? Notes { get; set; }
        public double? EstimatedCalories { get; set; }
    }

    public class CreateWorkoutPlanViewModel
    {
        public string PlanName { get; set; } = null!;
        public int Weeks { get; set; }
        public int SessionsPerWeek { get; set; }
        public int? DurationPerSession { get; set; }
        public string? Difficulty { get; set; }
        public double? EstimatedCaloriesPerSession { get; set; }
        public List<ExerciseViewModel> Exercises { get; set; } = new();
    }

    public class WorkoutPlanViewModel
    {
        public string PlanId { get; set; } = null!;
        public string PlanName { get; set; } = null!;
        public int Weeks { get; set; }
        public int SessionsPerWeek { get; set; }
        public int DurationPerSession { get; set; }
        public DateTime CreatedDate { get; set; }
        public List<ExerciseViewModel> Exercises { get; set; } = new();
    }
}

