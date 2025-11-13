using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using HealthWeb.Models.Entities;
using HealthWeb.Models.EF;
using System.Security.Cryptography;
using System.Text;

namespace HealthWeb.Services
{
    public interface IPTService
    {
        Task<(bool success, string? errorMessage)> RegisterPTAsync(RegisterPTViewModel model);
        Task<object?> GetDashboardStatsAsync(string userId);
        Task<List<object>> GetRecentBookingsAsync(string userId);
        Task<object?> GetClientsStatsAsync(string userId);
        Task<List<object>> GetClientsListAsync(string userId);
        Task<List<object>> GetPotentialClientsAsync(string userId, string? search, string? goal, string? location, string? time, string? budget);
        Task<List<object>> GetScheduleForWeekAsync(string userId, DateOnly? start);
        Task<(bool success, string message)> UpdateProfileAsync(string userId, ProfileSettingsViewModel model);
        Task<(bool success, string message)> UpdateProfessionalAsync(string userId, ProfessionalSettingsViewModel model);
        Task<(bool success, string message)> UpdateScheduleAsync(string userId, ScheduleSettingsViewModel model);
        Task<(bool success, string message)> ChangePasswordAsync(string userId, ChangePasswordViewModel model);
        Task<string?> GetCurrentUserIdAsync(HttpContext httpContext);
        Task<HuanLuyenVien?> GetCurrentTrainerAsync(string userId);
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

        public async Task<(bool success, string? errorMessage)> RegisterPTAsync(RegisterPTViewModel model)
        {
            try
            {
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
                var userId = await GenerateUserIdAsync();
                var ptId = await GeneratePTIdAsync();

                // Hash password
                var passwordHash = HashPassword(model.UserPassword);

                // Create User
                var user = new User
                {
                    UserId = userId,
                    Username = model.Username,
                    PasswordHash = passwordHash,
                    Email = model.UserEmail,
                    HoTen = model.UserHoTen,
                    NgaySinh = model.UserNgaySinh.HasValue ? DateOnly.FromDateTime(model.UserNgaySinh.Value) : null,
                    Role = "PT",
                    CreatedDate = DateTime.Now
                };

                // Handle file uploads
                string? avatarPath = null;
                string? cccdPath = null;
                string? certPath = null;

                if (model.AvatarFile != null && model.AvatarFile.Length > 0)
                {
                    avatarPath = await SaveFileAsync(model.AvatarFile, "avatars", userId);
                    user.AnhDaiDien = avatarPath;
                }

                if (model.CccdFile != null && model.CccdFile.Length > 0)
                {
                    cccdPath = await SaveFileAsync(model.CccdFile, "cccd", userId);
                }

                if (model.CertFile != null && model.CertFile.Length > 0)
                {
                    certPath = await SaveFileAsync(model.CertFile, "certificates", userId);
                }

                // Create HuanLuyenVien
                var huanLuyenVien = new HuanLuyenVien
                {
                    Ptid = ptId,
                    UserId = userId,
                    ChuyenMon = model.ChuyenMon,
                    SoNamKinhNghiem = model.SoNamKinhNghiem,
                    ThanhPho = model.ThanhPho,
                    GiaTheoGio = model.GiaTheoGio,
                    ChungChi = model.ChungChi,
                    TieuSu = model.TieuSu,
                    GioRanh = model.GioRanh,
                    AnhDaiDien = avatarPath,
                    AnhCccd = cccdPath,
                    AnhChanDung = avatarPath,
                    FileTaiLieu = certPath,
                    DaXacMinh = false,
                    NhanKhach = true,
                    SoKhachHienTai = 0,
                    TongDanhGia = 0,
                    DiemTrungBinh = 0,
                    TiLeThanhCong = 0
                };

                // Save to database
                _context.Users.Add(user);
                _context.HuanLuyenViens.Add(huanLuyenVien);
                await _context.SaveChangesAsync();

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
                    .CountAsync(q => q.Ptid == ptId && q.DangHoatDong == true);

                var todayBookings = await _context.DatLichPts
                    .CountAsync(d =>
                        d.Ptid == ptId &&
                        d.NgayGioDat >= today &&
                        d.NgayGioDat < tomorrow &&
                        (d.TrangThai == null || d.TrangThai != "Cancelled"));

                var monthlyRevenue = await _context.GiaoDiches
                    .Where(g =>
                        g.Ptid == ptId &&
                        g.NgayGiaoDich.HasValue &&
                        g.NgayGiaoDich.Value >= startOfMonth &&
                        g.NgayGiaoDich.Value < endOfMonth)
                    .SumAsync(g => g.SoTienPtnhan ?? 0);

                var ratings = await _context.DanhGiaPts
                    .Where(r => r.Ptid == ptId && r.Diem.HasValue)
                    .Select(r => r.Diem!.Value)
                    .ToListAsync();

                var averageRating = ratings.Count > 0
                    ? Math.Round(ratings.Average(), 1)
                    : 0;

                return new
                {
                    totalClients,
                    todayBookings,
                    monthlyRevenue,
                    rating = averageRating,
                    reviews = ratings.Count
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving PT dashboard stats");
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
                    .Where(d => d.Ptid == trainer.Ptid)
                    .OrderByDescending(d => d.NgayGioDat)
                    .Include(d => d.KhacHang)
                    .Take(5)
                    .Select(d => new
                    {
                        ClientName = d.KhacHang.HoTen ?? d.KhacHang.Username ?? "Khách hàng",
                        Username = d.KhacHang.Username,
                        StartTime = d.NgayGioDat,
                        Status = d.TrangThai ?? "Pending",
                        Type = d.LoaiBuoiTap ?? "Chưa cập nhật"
                    })
                    .ToListAsync();

                return bookings.Cast<object>().ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving PT recent bookings");
                return new List<object>();
            }
        }

        public async Task<object?> GetClientsStatsAsync(string userId)
        {
            try
            {
                var trainer = await GetCurrentTrainerAsync(userId);
                if (trainer == null)
                {
                    return null;
                }

                var ptId = trainer.Ptid;

                var totalClients = await _context.QuyenPtKhachHangs.CountAsync(q => q.Ptid == ptId);
                var activeClients = await _context.QuyenPtKhachHangs.CountAsync(q => q.Ptid == ptId && q.DangHoatDong == true);
                var totalSessions = await _context.DatLichPts
                    .Where(d => d.Ptid == ptId && (d.TrangThai == null || !d.TrangThai.Equals("Cancelled", StringComparison.OrdinalIgnoreCase)))
                    .CountAsync();

                var ratings = await _context.DanhGiaPts
                    .Where(r => r.Ptid == ptId && r.Diem.HasValue)
                    .Select(r => r.Diem!.Value)
                    .ToListAsync();

                var avgRating = ratings.Count > 0 ? Math.Round(ratings.Average(), 1) : 0;

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
                    return new List<object>();
                }

                var ptId = trainer.Ptid;

                var clientLinks = await _context.QuyenPtKhachHangs
                    .Where(q => q.Ptid == ptId)
                    .Include(q => q.KhachHang)
                    .ToListAsync();

                if (!clientLinks.Any())
                {
                    return new List<object>();
                }

                var clientIds = clientLinks.Select(q => q.KhachHangId).Distinct().ToList();

                var bookingStats = await _context.DatLichPts
                    .Where(d => d.Ptid == ptId && clientIds.Contains(d.KhacHangId))
                    .GroupBy(d => d.KhacHangId)
                    .Select(g => new
                    {
                        ClientId = g.Key,
                        Sessions = g.Count(d => d.TrangThai == null || !d.TrangThai.Equals("Cancelled", StringComparison.OrdinalIgnoreCase)),
                        LastActivity = g.Max(d => (DateTime?)d.NgayGioDat)
                    })
                    .ToListAsync();

                var ratingStats = await _context.DanhGiaPts
                    .Where(r => r.Ptid == ptId && clientIds.Contains(r.KhachHangId) && r.Diem.HasValue)
                    .GroupBy(r => r.KhachHangId)
                    .Select(g => new
                    {
                        ClientId = g.Key,
                        Rating = g.Average(r => r.Diem!.Value)
                    })
                    .ToListAsync();

                var goalEntries = await _context.MucTieus
                    .Where(m => clientIds.Contains(m.UserId))
                    .OrderByDescending(m => m.NgayBatDau)
                    .Select(m => new { m.UserId, m.LoaiMucTieu, m.NgayBatDau })
                    .ToListAsync();

                var goalDict = goalEntries
                    .GroupBy(m => m.UserId)
                    .ToDictionary(
                        g => g.Key,
                        g => g.OrderByDescending(x => x.NgayBatDau).First().LoaiMucTieu
                    );

                var bookingDict = bookingStats.ToDictionary(b => b.ClientId, b => b);
                var ratingDict = ratingStats.ToDictionary(r => r.ClientId, r => Math.Round(r.Rating, 1));

                var clients = clientLinks.Select(link =>
                {
                    var user = link.KhachHang;
                    bookingDict.TryGetValue(link.KhachHangId, out var sessionInfo);
                    ratingDict.TryGetValue(link.KhachHangId, out var ratingValue);
                    goalDict.TryGetValue(link.KhachHangId, out var goal);

                    var status = link.DangHoatDong == true
                        ? "Active"
                        : link.DangHoatDong == false
                            ? "Inactive"
                            : "Pending";

                    return new
                    {
                        id = link.KhachHangId,
                        name = string.IsNullOrWhiteSpace(user.HoTen) ? user.Username : user.HoTen,
                        username = user.Username,
                        email = user.Email ?? string.Empty,
                        goal = goal ?? "Chưa cập nhật",
                        sessions = sessionInfo?.Sessions ?? 0,
                        status,
                        rating = ratingValue,
                        lastActivity = sessionInfo?.LastActivity,
                        createdDate = user.CreatedDate
                    };
                })
                .OrderByDescending(c => c.lastActivity ?? DateTime.MinValue)
                .ThenBy(c => c.name)
                .Cast<object>()
                .ToList();

                return clients;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving PT clients list");
                return new List<object>();
            }
        }

        public async Task<List<object>> GetPotentialClientsAsync(string userId, string? search, string? goal, string? location, string? time, string? budget)
        {
            try
            {
                var trainer = await GetCurrentTrainerAsync(userId);
                if (trainer == null)
                {
                    return new List<object>();
                }

                var ptId = trainer.Ptid;

                var assignedClientIds = await _context.QuyenPtKhachHangs
                    .Where(q => q.Ptid == ptId)
                    .Select(q => q.KhachHangId)
                    .ToListAsync();

                var clientsQuery = _context.Users
                    .Where(u => (u.Role == null || u.Role == "Client") && !assignedClientIds.Contains(u.UserId));

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var keyword = search.Trim().ToLower();
                    clientsQuery = clientsQuery.Where(u =>
                        (u.HoTen ?? string.Empty).ToLower().Contains(keyword) ||
                        u.Username.ToLower().Contains(keyword) ||
                        (u.Email ?? string.Empty).ToLower().Contains(keyword));
                }

                var potentialClients = await clientsQuery
                    .OrderByDescending(u => u.CreatedDate)
                    .Take(200)
                    .ToListAsync();

                if (!potentialClients.Any())
                {
                    return new List<object>();
                }

                var potentialIds = potentialClients.Select(u => u.UserId).ToList();

                var goals = await _context.MucTieus
                    .Where(m => potentialIds.Contains(m.UserId))
                    .OrderByDescending(m => m.NgayBatDau)
                    .Select(m => new { m.UserId, m.LoaiMucTieu, m.NgayBatDau })
                    .ToListAsync();

                var goalDict = goals
                    .GroupBy(m => m.UserId)
                    .ToDictionary(
                        g => g.Key,
                        g => g.OrderByDescending(x => x.NgayBatDau).First().LoaiMucTieu
                    );

                var bookingStats = await _context.DatLichPts
                    .Where(d => potentialIds.Contains(d.KhacHangId))
                    .GroupBy(d => d.KhacHangId)
                    .Select(g => new
                    {
                        ClientId = g.Key,
                        Sessions = g.Count(d => d.TrangThai == null || !d.TrangThai.Equals("Cancelled", StringComparison.OrdinalIgnoreCase)),
                        LastActivity = g.Max(d => (DateTime?)d.NgayGioDat)
                    })
                    .ToListAsync();

                var workoutMinutes = await _context.NhatKyHoanThanhBaiTaps
                    .Where(n => potentialIds.Contains(n.UserId) && n.ThoiLuongThucTePhut.HasValue)
                    .GroupBy(n => n.UserId)
                    .Select(g => new
                    {
                        ClientId = g.Key,
                        TotalMinutes = g.Sum(x => x.ThoiLuongThucTePhut!.Value)
                    })
                    .ToListAsync();

                var bookingDict = bookingStats.ToDictionary(b => b.ClientId, b => b);
                var minutesDict = workoutMinutes.ToDictionary(m => m.ClientId, m => m.TotalMinutes);

                var results = potentialClients.Select(user =>
                {
                    goalDict.TryGetValue(user.UserId, out var goalValue);
                    bookingDict.TryGetValue(user.UserId, out var sessionInfo);
                    minutesDict.TryGetValue(user.UserId, out var totalMinutes);

                    var normalizedGoal = goalValue ?? "Chưa cập nhật";
                    var normalizedLocation = "Chưa cập nhật";

                    var tags = new List<string>();
                    if (!string.IsNullOrWhiteSpace(goalValue))
                    {
                        tags.Add(goalValue);
                    }
                    if (sessionInfo?.Sessions > 0)
                    {
                        tags.Add($"{sessionInfo.Sessions} buổi tập");
                    }
                    if (totalMinutes > 0)
                    {
                        tags.Add($"{Math.Round(totalMinutes / 60.0, 1)} giờ luyện tập");
                    }

                    return new
                    {
                        id = user.UserId,
                        name = string.IsNullOrWhiteSpace(user.HoTen) ? user.Username : user.HoTen,
                        username = user.Username,
                        goal = normalizedGoal,
                        location = normalizedLocation,
                        activity = sessionInfo?.LastActivity,
                        stats = new
                        {
                            sessions = sessionInfo?.Sessions ?? 0,
                            hours = Math.Round(totalMinutes / 60.0, 1),
                            rating = 0
                        },
                        tags,
                        createdDate = user.CreatedDate
                    };
                })
                .ToList();

                if (!string.IsNullOrWhiteSpace(goal))
                {
                    var normalized = goal.Trim().ToLower();
                    results = results
                        .Where(r => (r.goal ?? string.Empty).ToLower().Contains(normalized) || r.tags.Any(t => t.ToLower().Contains(normalized)))
                        .ToList();
                }

                return results.Cast<object>().ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching potential clients");
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
                    .Where(d => d.Ptid == trainer.Ptid && d.NgayGioDat >= startDate && d.NgayGioDat < endDate)
                    .Include(d => d.KhacHang)
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

        public async Task<string?> GetCurrentUserIdAsync(HttpContext httpContext)
        {
            return httpContext.Session.GetString("UserId");
        }

        public async Task<HuanLuyenVien?> GetCurrentTrainerAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return null;
            }

            return await _context.HuanLuyenViens.FirstOrDefaultAsync(p => p.UserId == userId);
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
    }

    // View Models (moved from controller)
    public class RegisterPTViewModel
    {
        public string UserHoTen { get; set; } = null!;
        public string UserEmail { get; set; } = null!;
        public string? UserPhone { get; set; }
        public DateTime? UserNgaySinh { get; set; }
        public string Username { get; set; } = null!;
        public string UserPassword { get; set; } = null!;
        public string UserConfirmPassword { get; set; } = null!;
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
        public int? MaxClients { get; set; }
    }

    public class ChangePasswordViewModel
    {
        public string CurrentPassword { get; set; } = null!;
        public string NewPassword { get; set; } = null!;
        public string ConfirmPassword { get; set; } = null!;
    }
}

