using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HealthWeb.Models.EF;
using HealthWeb.Models.Entities;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Data.SqlClient;

namespace HealthWeb.Controllers
{
    public class MucTieuController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<MucTieuController> _logger;

        public MucTieuController(ApplicationDbContext context, ILogger<MucTieuController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // Helper: Lấy userId từ session
        private string? GetUserId()
        {
            var userId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(userId) && HttpContext.User?.Identity?.IsAuthenticated == true)
            {
                userId = HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            }
            return userId;
        }

        // Helper: Generate MucTieuId
        private async Task<string> GenerateMucTieuIdAsync()
        {
            var count = await _context.MucTieus.CountAsync() + 1;
            var mucTieuId = $"goal_{count:D4}";
            
            while (await _context.MucTieus.AnyAsync(m => m.MucTieuId == mucTieuId))
            {
                count++;
                mucTieuId = $"goal_{count:D4}";
            }
            
            return mucTieuId;
        }

        // Helper: Generate KeHoachId
        private async Task<string> GenerateKeHoachIdAsync()
        {
            var count = await _context.KeHoachTapLuyens.CountAsync() + 1;
            var keHoachId = $"plan_{count:D4}";
            
            while (await _context.KeHoachTapLuyens.AnyAsync(k => k.KeHoachId == keHoachId))
            {
                count++;
                keHoachId = $"plan_{count:D4}";
            }
            
            return keHoachId;
        }

        [Route("/MucTieu")]
        public IActionResult Index()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                ViewData["RequireLogin"] = true;
                ViewData["LoginMessage"] = "Vui lòng đăng nhập để sử dụng tính năng này.";
            }
            return View("MucTieu");
        }

        // API: Lấy danh sách mẫu tập luyện theo mục tiêu và trình độ
        [HttpGet("MucTieu/GetMauTapLuyenByMucTieu")]
        public async Task<IActionResult> GetMauTapLuyenByMucTieu(string mucTieu, string? level = null)
        {
            try
            {
                if (string.IsNullOrEmpty(mucTieu))
                {
                    return Json(new { success = false, message = "Mục tiêu không được để trống" });
                }

                _logger.LogInformation("GetMauTapLuyenByMucTieu called with mucTieu: {MucTieu}, level: {Level}", mucTieu, level);

                // Xây dựng query base
                var query = _context.MauTapLuyens
                    .Where(m => m.MucTieu == mucTieu && (m.CongKhai == true || m.DaXacThuc == true));

                // Filter theo trình độ (DoKho) nếu có
                // Logic: Người ở trình độ cao hơn có thể làm bài tập ở trình độ thấp hơn
                if (!string.IsNullOrEmpty(level))
                {
                    List<string> allowedDoKho = level switch
                    {
                        "Beginner" => new List<string> { "Beginner" }, // Chỉ Beginner
                        "Intermediate" => new List<string> { "Beginner", "Intermediate" }, // Beginner + Intermediate
                        "Advanced" => new List<string> { "Beginner", "Intermediate", "Advanced" }, // Tất cả
                        _ => new List<string>() // Không filter nếu level không hợp lệ
                    };

                    if (allowedDoKho.Any())
                    {
                        query = query.Where(m => allowedDoKho.Contains(m.DoKho ?? ""));
                        _logger.LogInformation("Filtering by DoKho levels: {Levels} for user level: {Level}", 
                            string.Join(", ", allowedDoKho), level);
                    }
                }

                var mauTapLuyensQuery = await query
                    .Include(m => m.ChiTietMauTapLuyens.OrderBy(c => c.ThuTuHienThi).ThenBy(c => c.Tuan).ThenBy(c => c.NgayTrongTuan))
                    .OrderByDescending(m => m.DiemTrungBinh ?? 0)
                    .ThenByDescending(m => m.SoLanSuDung ?? 0)
                    .ToListAsync();

                var mauTapLuyens = mauTapLuyensQuery.Select(m => new
                {
                    MauTapLuyenId = m.MauTapLuyenId,
                    TenMauTapLuyen = m.TenMauTapLuyen,
                    MoTa = m.MoTa,
                    DoKho = m.DoKho,
                    SoTuan = m.SoTuan,
                    CaloUocTinh = m.CaloUocTinh,
                    ThietBiCan = m.ThietBiCan,
                    DiemTrungBinh = m.DiemTrungBinh,
                    SoLanSuDung = m.SoLanSuDung,
                    SoBaiTap = m.ChiTietMauTapLuyens.Count,
                    VideoUrl = m.ChiTietMauTapLuyens.FirstOrDefault()?.VideoUrl
                }).ToList();

                _logger.LogInformation("Found {Count} workout templates for mucTieu: {MucTieu}", mauTapLuyens.Count, mucTieu);

                return Json(new { success = true, data = mauTapLuyens });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading workout templates for mucTieu: {MucTieu}", mucTieu);
                return Json(new { success = false, message = "Không thể tải danh sách mẫu tập luyện" });
            }
        }

        // API: Lấy chi tiết mẫu tập luyện (bao gồm các bài tập con)
        [HttpGet("MucTieu/GetChiTietMauTapLuyen")]
        public async Task<IActionResult> GetChiTietMauTapLuyen(int mauTapLuyenId)
        {
            try
            {
                _logger.LogInformation("GetChiTietMauTapLuyen called with mauTapLuyenId: {MauTapLuyenId}", mauTapLuyenId);

                var mauTapLuyen = await _context.MauTapLuyens
                    .Include(m => m.ChiTietMauTapLuyens.OrderBy(c => c.ThuTuHienThi).ThenBy(c => c.Tuan).ThenBy(c => c.NgayTrongTuan))
                    .FirstOrDefaultAsync(m => m.MauTapLuyenId == mauTapLuyenId);

                if (mauTapLuyen == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy mẫu tập luyện" });
                }

                // Tính tổng số buổi tập (dựa trên số tuần và số ngày trong tuần có bài tập)
                // Đếm số ngày trong tuần có bài tập (từ ChiTietMauTapLuyen)
                var soNgayTrongTuan = mauTapLuyen.ChiTietMauTapLuyens
                    .Where(c => c.Tuan == 1) // Lấy tuần đầu tiên
                    .Select(c => c.NgayTrongTuan)
                    .Where(ngay => ngay.HasValue)
                    .Distinct()
                    .Count();
                // Nếu không có dữ liệu ngày trong tuần, ước tính 3 buổi/tuần
                var soBuoiMoiTuan = soNgayTrongTuan > 0 ? soNgayTrongTuan : 3;
                var soBuoiTap = (mauTapLuyen.SoTuan ?? 0) * soBuoiMoiTuan;
                
                // Tính tổng thời gian (từ các bài tập có thời gian)
                var tongThoiGian = mauTapLuyen.ChiTietMauTapLuyens
                    .Where(c => c.ThoiLuongPhut.HasValue)
                    .Sum(c => c.ThoiLuongPhut.Value);
                // Nếu không có thời gian từ chi tiết, dùng ước tính từ mẫu
                if (tongThoiGian == 0 && mauTapLuyen.CaloUocTinh.HasValue)
                {
                    // Ước tính: 200 calo ≈ 30 phút
                    tongThoiGian = (int)((mauTapLuyen.CaloUocTinh.Value / 200.0) * 30);
                }
                
                // Tính tổng calo ước tính (trung bình mỗi buổi * số buổi)
                var tongCalo = (mauTapLuyen.CaloUocTinh ?? 0) * soBuoiTap;

                // Tính scheme (Sets - Reps) từ bài tập đầu tiên
                var baiTapDau = mauTapLuyen.ChiTietMauTapLuyens.FirstOrDefault();
                var scheme = baiTapDau != null && baiTapDau.SoSets.HasValue && baiTapDau.SoReps.HasValue
                    ? $"{baiTapDau.SoSets}-{baiTapDau.SoReps}"
                    : (baiTapDau != null && baiTapDau.SoSets.HasValue ? $"{baiTapDau.SoSets}-0" 
                    : (baiTapDau != null && baiTapDau.SoReps.HasValue ? $"0-{baiTapDau.SoReps}" : "-"));
                
                // Tính thời lượng phút trung bình từ ChiTietMauTapLuyen
                var thoiLuongPhutTrungBinh = mauTapLuyen.ChiTietMauTapLuyens
                    .Where(c => c.ThoiLuongPhut.HasValue)
                    .Select(c => c.ThoiLuongPhut.Value)
                    .DefaultIfEmpty(0)
                    .Average();
                var thoiLuongPhut = (int)Math.Round(thoiLuongPhutTrungBinh);

                // Đánh giá hiệu quả dựa trên điểm trung bình
                var hieuQua = mauTapLuyen.DiemTrungBinh >= 4.5 ? "Tốt" 
                    : mauTapLuyen.DiemTrungBinh >= 3.5 ? "Khá" 
                    : mauTapLuyen.DiemTrungBinh >= 2.5 ? "Trung bình" 
                    : "Cần cải thiện";

                // Độ khó
                var doKho = mauTapLuyen.DoKho switch
                {
                    "Beginner" => "Dễ",
                    "Intermediate" => "Trung bình",
                    "Advanced" => "Khó",
                    _ => "Trung bình"
                };

                // Tạo hướng dẫn từ các bài tập
                var huongDan = string.Join("\n", mauTapLuyen.ChiTietMauTapLuyens
                    .Take(5)
                    .Select((bt, index) => $"{index + 1}. {bt.TenbaiTap}" + 
                        (bt.SoSets.HasValue && bt.SoReps.HasValue ? $" - {bt.SoSets}x{bt.SoReps}" : "") +
                        (bt.ThoiLuongPhut.HasValue ? $" - {bt.ThoiLuongPhut} phút" : "")));

                var result = new
                {
                    MauTapLuyenId = mauTapLuyen.MauTapLuyenId,
                    TenMauTapLuyen = mauTapLuyen.TenMauTapLuyen,
                    MoTa = mauTapLuyen.MoTa,
                    DoKho = doKho,
                    SoTuan = mauTapLuyen.SoTuan,
                    CaloUocTinh = mauTapLuyen.CaloUocTinh, // Calo mỗi buổi
                    ThietBiCan = mauTapLuyen.ThietBiCan,
                    DiemTrungBinh = mauTapLuyen.DiemTrungBinh,
                    SoLanSuDung = mauTapLuyen.SoLanSuDung,
                    SoBuoiTap = soBuoiTap, // Tổng số buổi tập
                    TongThoiGian = tongThoiGian, // Tổng thời gian (phút)
                    TongCalo = tongCalo, // Tổng calo ước tính
                    ThoiLuongTrungBinhMoiBuoi = tongThoiGian > 0 && soBuoiTap > 0 ? Math.Round((double)tongThoiGian / soBuoiTap, 1) : 0, // Thời lượng trung bình mỗi buổi (phút)
                    ThoiLuongPhut = thoiLuongPhut, // Thời lượng phút trung bình từ ChiTietMauTapLuyen
                    Scheme = scheme,
                    HieuQua = hieuQua,
                    HuongDan = huongDan,
                    ChiTietBaiTap = mauTapLuyen.ChiTietMauTapLuyens.Select(bt => new
                    {
                        BaiTapId = bt.BaiTapId,
                        TenbaiTap = bt.TenbaiTap,
                        SoSets = bt.SoSets,
                        SoReps = bt.SoReps,
                        ThoiLuongPhut = bt.ThoiLuongPhut,
                        ThoiGianNghiGiay = bt.ThoiGianNghiGiay,
                        Tuan = bt.Tuan,
                        NgayTrongTuan = bt.NgayTrongTuan,
                        ThuTuHienThi = bt.ThuTuHienThi,
                        VideoUrl = bt.VideoUrl,
                        GhiChu = bt.GhiChu
                    }).ToList()
                };

                _logger.LogInformation("Loaded detail for mauTapLuyenId: {MauTapLuyenId}, soBaiTap: {SoBaiTap}", 
                    mauTapLuyenId, mauTapLuyen.ChiTietMauTapLuyens.Count);

                return Json(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading workout template detail for mauTapLuyenId: {MauTapLuyenId}", mauTapLuyenId);
                return Json(new { success = false, message = "Không thể tải chi tiết mẫu tập luyện" });
            }
        }

        // API: Lấy MucTieuId hiện tại theo loại mục tiêu (chưa hoàn thành)
        [HttpGet("MucTieu/GetCurrentMucTieuId")]
        public async Task<IActionResult> GetCurrentMucTieuId([FromQuery] string loaiMucTieu)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Chưa đăng nhập" });
            }

            try
            {
                if (string.IsNullOrEmpty(loaiMucTieu))
                {
                    return Json(new { success = false, message = "Loại mục tiêu không được để trống" });
                }

                // Tìm mục tiêu hiện tại (chưa hoàn thành) của user với loại mục tiêu này
                var mucTieu = await _context.MucTieus
                    .Where(m => m.UserId == userId 
                        && m.LoaiMucTieu == loaiMucTieu 
                        && (m.DaHoanThanh == false || m.DaHoanThanh == null))
                    .OrderByDescending(m => m.NgayBatDau)
                    .FirstOrDefaultAsync();

                if (mucTieu != null)
                {
                    return Json(new { success = true, mucTieuId = mucTieu.MucTieuId, exists = true });
                }

                return Json(new { success = true, mucTieuId = (string?)null, exists = false });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting current muc tieu id for user {UserId}", userId);
                return Json(new { success = false, message = $"Lỗi khi lấy mục tiêu: {ex.Message}" });
            }
        }

        // API: Lưu mục tiêu vào database
        [HttpPost("MucTieu/SaveMucTieu")]
        public async Task<IActionResult> SaveMucTieu([FromBody] SaveMucTieuRequest request)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Chưa đăng nhập" });
            }

            try
            {
                if (string.IsNullOrEmpty(request.LoaiMucTieu))
                {
                    return Json(new { success = false, message = "Loại mục tiêu không được để trống" });
                }

                // Tạo MucTieuId mới
                var mucTieuId = await GenerateMucTieuIdAsync();

                // Ngày bắt đầu = ngày tạo (ngày hiện tại)
                var ngayBatDau = DateOnly.FromDateTime(DateTime.Today);
                // Tính ngày kết thúc (mặc định 12 tuần từ ngày bắt đầu)
                var ngayKetThuc = request.NgayKetThuc ?? ngayBatDau.AddDays(84); // 12 tuần = 84 ngày

                var mucTieu = new MucTieu
                {
                    MucTieuId = mucTieuId,
                    UserId = userId,
                    LoaiMucTieu = request.LoaiMucTieu,
                    GiaTriMucTieu = request.GiaTriMucTieu,
                    NgayBatDau = ngayBatDau,
                    NgayKetThuc = ngayKetThuc,
                    TienDoHienTai = 0,
                    DaHoanThanh = false,
                    ThuTuHienThi = request.ThuTuHienThi ?? 0,
                    GhiChu = request.GhiChu
                };

                _context.MucTieus.Add(mucTieu);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Saved muc tieu {MucTieuId} for user {UserId}", mucTieuId, userId);

                return Json(new { success = true, mucTieuId = mucTieuId });
            }
            catch (DbUpdateException dbEx)
            {
                _logger.LogError(dbEx, "Database update error saving muc tieu for user {UserId}. Inner Exception: {InnerEx}", 
                    userId, dbEx.InnerException?.Message);
                
                // Kiểm tra lỗi constraint violation (duplicate key, foreign key, etc.)
                if (dbEx.InnerException is SqlException innerSqlEx)
                {
                    if (innerSqlEx.Number == 2627 || innerSqlEx.Number == 2601) // Primary key or unique constraint violation
                    {
                        return Json(new { 
                            success = false, 
                            message = "Mục tiêu với ID này đã tồn tại. Vui lòng thử lại." 
                        });
                    }
                    
                    if (innerSqlEx.Number == 547) // Foreign key constraint violation
                    {
                        return Json(new { 
                            success = false, 
                            message = "Lỗi ràng buộc dữ liệu. Vui lòng kiểm tra lại thông tin." 
                        });
                    }
                }
                
                return Json(new { 
                    success = false, 
                    message = $"Lỗi khi lưu mục tiêu vào database: {dbEx.InnerException?.Message ?? dbEx.Message}" 
                });
            }
            catch (SqlException sqlEx)
            {
                _logger.LogError(sqlEx, "SQL error saving muc tieu for user {UserId}. SQL Error Number: {Number}, Message: {Message}", 
                    userId, sqlEx.Number, sqlEx.Message);
                
                return Json(new { 
                    success = false, 
                    message = $"Lỗi SQL Server khi lưu mục tiêu: {sqlEx.Message} (Error Number: {sqlEx.Number})" 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving muc tieu for user {UserId}. Error: {Error}, StackTrace: {StackTrace}", 
                    userId, ex.Message, ex.StackTrace);
                return Json(new { 
                    success = false, 
                    message = $"Lỗi khi lưu mục tiêu: {ex.Message}" 
                });
            }
        }

        // API: Lưu kế hoạch tập luyện từ MauTapLuyen vào KeHoachTapLuyen
        [HttpPost("MucTieu/SaveKeHoachTapLuyen")]
        public async Task<IActionResult> SaveKeHoachTapLuyen([FromBody] SaveKeHoachTapLuyenRequest request)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Chưa đăng nhập" });
            }

            try
            {
                // Kiểm tra xem đã có kế hoạch đang thực hiện chưa
                var existingPlan = await _context.KeHoachTapLuyens
                    .Where(k => k.UserId == userId && k.DangSuDung == true)
                    .FirstOrDefaultAsync();

                if (existingPlan != null)
                {
                    _logger.LogWarning("SaveKeHoachTapLuyen - User {UserId} already has an active plan {KeHoachId}", 
                        userId, existingPlan.KeHoachId);
                    return Json(new { 
                        success = false, 
                        message = "Bạn đang có kế hoạch tập luyện đang thực hiện. Vui lòng hoàn thành hoặc hủy kế hoạch hiện tại trước khi tạo mục tiêu mới.",
                        hasActivePlan = true,
                        keHoachId = existingPlan.KeHoachId
                    });
                }

                if (request.MauTapLuyenId <= 0)
                {
                    return Json(new { success = false, message = "Mẫu tập luyện không hợp lệ" });
                }

                // Lấy thông tin MauTapLuyen
                var mauTapLuyen = await _context.MauTapLuyens
                    .Include(m => m.ChiTietMauTapLuyens)
                    .FirstOrDefaultAsync(m => m.MauTapLuyenId == request.MauTapLuyenId);

                if (mauTapLuyen == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy mẫu tập luyện" });
                }

                // Tạo hoặc lấy MucTieuId
                string? mucTieuId = request.MucTieuId;
                MucTieu? mucTieuEntity = null;
                
                if (string.IsNullOrEmpty(mucTieuId) && !string.IsNullOrEmpty(request.LoaiMucTieu))
                {
                    // Tạo mục tiêu mới nếu chưa có
                    mucTieuId = await GenerateMucTieuIdAsync();
                    var ngayBatDau = DateOnly.FromDateTime(DateTime.Today); // Ngày bắt đầu = ngày tạo
                    var ngayKetThuc = ngayBatDau.AddDays(84); // 12 tuần

                    mucTieuEntity = new MucTieu
                    {
                        MucTieuId = mucTieuId,
                        UserId = userId,
                        LoaiMucTieu = request.LoaiMucTieu,
                        GiaTriMucTieu = request.GiaTriMucTieu ?? 0,
                        NgayBatDau = ngayBatDau,
                        NgayKetThuc = ngayKetThuc,
                        TienDoHienTai = 0,
                        DaHoanThanh = false
                    };

                    _context.MucTieus.Add(mucTieuEntity);
                    await _context.SaveChangesAsync();
                }
                else if (!string.IsNullOrEmpty(mucTieuId))
                {
                    // Lấy mục tiêu đã tồn tại
                    mucTieuEntity = await _context.MucTieus.FindAsync(mucTieuId);
                }

                // Tạo KeHoachId mới
                var keHoachId = await GenerateKeHoachIdAsync();

                // Tính số buổi mỗi tuần từ ChiTietMauTapLuyen
                var soNgayTrongTuan = mauTapLuyen.ChiTietMauTapLuyens
                    .Where(c => c.Tuan == 1)
                    .Select(c => c.NgayTrongTuan)
                    .Where(ngay => ngay.HasValue)
                    .Distinct()
                    .Count();
                var soBuoi = soNgayTrongTuan > 0 ? soNgayTrongTuan : 3;

                // Tính thời lượng trung bình mỗi buổi
                var thoiLuongTrungBinh = mauTapLuyen.ChiTietMauTapLuyens
                    .Where(c => c.ThoiLuongPhut.HasValue)
                    .Select(c => c.ThoiLuongPhut.Value)
                    .DefaultIfEmpty(0)
                    .Average();

                // Tạo dictionary để map lịch tập theo (Tuan, NgayTrongTuan)
                // Key: "Tuan_NgayTrongTuan" (ví dụ: "1_2" = Tuần 1, Thứ 3)
                var lichTapDict = new Dictionary<string, ScheduleItem>();
                if (request.LichTap != null && request.LichTap.Any())
                {
                    foreach (var lich in request.LichTap)
                    {
                        if (lich.Tuan.HasValue && lich.NgayTrongTuan.HasValue)
                        {
                            var key = $"{lich.Tuan.Value}_{lich.NgayTrongTuan.Value}";
                            if (!lichTapDict.ContainsKey(key))
                            {
                                lichTapDict[key] = lich;
                            }
                        }
                    }
                }

                // Lưu thông tin bổ sung (địa điểm) vào GhiChu của MucTieu dưới dạng JSON nếu có
                if (mucTieuEntity != null && !string.IsNullOrEmpty(request.DiaDiemTapLuyen))
                {
                    var thongTinBoSung = new
                    {
                        DiaDiemTapLuyen = request.DiaDiemTapLuyen // 'GYM' hoặc 'Home'
                    };
                    var ghiChuJson = System.Text.Json.JsonSerializer.Serialize(thongTinBoSung);
                    mucTieuEntity.GhiChu = ghiChuJson;
                }

                // Tạo KeHoachTapLuyen
                var keHoach = new KeHoachTapLuyen
                {
                    KeHoachId = keHoachId,
                    UserId = userId,
                    MucTieuId = mucTieuId,
                    TenKeHoach = mauTapLuyen.TenMauTapLuyen,
                    LoaiKeHoach = mauTapLuyen.MucTieu, // Loại kế hoạch từ mục tiêu
                    MucDo = request.MucDo ?? mauTapLuyen.DoKho, // Ưu tiên từ request, nếu không có thì dùng từ mẫu
                    SoTuan = mauTapLuyen.SoTuan,
                    SoBuoi = soBuoi,
                    ThoiLuongPhut = (int)Math.Round(thoiLuongTrungBinh),
                    CaloTieuHaoMoiBuoi = mauTapLuyen.CaloUocTinh,
                    Nguon = "User",
                    DangSuDung = true,
                    NgayTao = DateTime.Now
                };

                _context.KeHoachTapLuyens.Add(keHoach);

                // Copy ChiTietMauTapLuyen sang ChiTietKeHoachTapLuyen
                var chiTietList = new List<ChiTietKeHoachTapLuyen>();
                var lichTapIndex = 0; // Index để phân phối lịch tập cho các bài tập không có Tuan/NgayTrongTuan
                var lichTapList = request.LichTap?.Where(l => l.Tuan.HasValue && l.NgayTrongTuan.HasValue).ToList() ?? new List<ScheduleItem>();
                
                foreach (var chiTietMau in mauTapLuyen.ChiTietMauTapLuyens.OrderBy(c => c.ThuTuHienThi).ThenBy(c => c.Tuan).ThenBy(c => c.NgayTrongTuan))
                {
                    var chiTiet = new ChiTietKeHoachTapLuyen
                    {
                        KeHoachId = keHoachId,
                        TenBaiTap = chiTietMau.TenbaiTap,
                        SoHiep = chiTietMau.SoSets,
                        SoLan = chiTietMau.SoReps,
                        ThoiGianPhut = chiTietMau.ThoiLuongPhut,
                        NgayTrongTuan = chiTietMau.NgayTrongTuan,
                        Tuan = chiTietMau.Tuan,
                        ThuTuHienThi = chiTietMau.ThuTuHienThi ?? 0,
                        VideoUrl = chiTietMau.VideoUrl,
                        CanhBao = chiTietMau.GhiChu,
                        NoiDung = chiTietMau.GhiChu,
                        HuongDan = chiTietMau.GhiChu
                    };

                    // Cập nhật NgayTrongTuan và Tuan từ lịch tập người dùng chọn
                    ScheduleItem? matchedLich = null;
                    
                    // Trường hợp 1: Bài tập trong mẫu đã có Tuan và NgayTrongTuan -> tìm lịch tập khớp
                    if (chiTietMau.Tuan.HasValue && chiTietMau.NgayTrongTuan.HasValue)
                    {
                        var key = $"{chiTietMau.Tuan.Value}_{chiTietMau.NgayTrongTuan.Value}";
                        if (lichTapDict.ContainsKey(key))
                        {
                            matchedLich = lichTapDict[key];
                        }
                    }
                    
                    // Trường hợp 2: Bài tập trong mẫu không có Tuan hoặc NgayTrongTuan -> gán từ lịch tập người dùng
                    // Phân phối lịch tập theo thứ tự cho các bài tập không có lịch
                    if (matchedLich == null && lichTapList.Any())
                    {
                        // Nếu bài tập không có Tuan hoặc NgayTrongTuan, gán từ lịch tập người dùng
                        if (!chiTietMau.Tuan.HasValue || !chiTietMau.NgayTrongTuan.HasValue)
                        {
                            if (lichTapIndex < lichTapList.Count)
                            {
                                matchedLich = lichTapList[lichTapIndex];
                                lichTapIndex++;
                            }
                        }
                    }
                    
                    // Cập nhật NgayTrongTuan và Tuan từ lịch tập nếu tìm thấy
                    if (matchedLich != null)
                    {
                        // Cập nhật NgayTrongTuan và Tuan từ lịch tập người dùng chọn
                        chiTiet.NgayTrongTuan = matchedLich.NgayTrongTuan ?? chiTietMau.NgayTrongTuan;
                        chiTiet.Tuan = matchedLich.Tuan ?? chiTietMau.Tuan;
                        
                        // Lưu thông tin bổ sung (Buoi, GioBatDau, GioKetThuc) vào CanhBao dưới dạng JSON
                        var lichTapInfo = new
                        {
                            Buoi = matchedLich.Buoi,
                            GioBatDau = matchedLich.GioBatDau,
                            GioKetThuc = matchedLich.GioKetThuc
                        };
                        var lichTapJson = System.Text.Json.JsonSerializer.Serialize(lichTapInfo);
                        
                        // Lưu vào CanhBao (hoặc NoiDung nếu CanhBao đã có nội dung khác)
                        if (string.IsNullOrEmpty(chiTiet.CanhBao))
                        {
                            chiTiet.CanhBao = $"{{\"LichTap\": {lichTapJson}}}";
                        }
                        else
                        {
                            // Nếu CanhBao đã có nội dung, lưu vào NoiDung
                            chiTiet.NoiDung = string.IsNullOrEmpty(chiTiet.NoiDung) 
                                ? $"{{\"LichTap\": {lichTapJson}}}" 
                                : $"{chiTiet.NoiDung} | {{\"LichTap\": {lichTapJson}}}";
                        }
                    }

                    // Tính calo tiêu hao dự kiến sử dụng helper mới
                    var mucTieuLoai = mucTieuEntity?.LoaiMucTieu; // Lấy loại mục tiêu để xác định loại bài tập
                    chiTiet.CaloTieuHaoDuKien = CaloTieuHaoHelper.TinhCaloTieuHao(
                        thoiGianPhut: chiTietMau.ThoiLuongPhut,
                        soHiep: chiTietMau.SoSets,
                        soLan: chiTietMau.SoReps,
                        mucTieu: mucTieuLoai,
                        caloUocTinhMau: mauTapLuyen.CaloUocTinh
                    );

                    chiTietList.Add(chiTiet);
                }

                _context.ChiTietKeHoachTapLuyens.AddRange(chiTietList);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Saved ke hoach tap luyen {KeHoachId} from mauTapLuyen {MauTapLuyenId} for user {UserId}", 
                    keHoachId, request.MauTapLuyenId, userId);

                return Json(new { success = true, keHoachId = keHoachId, mucTieuId = mucTieuId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving ke hoach tap luyen for user {UserId}", userId);
                return Json(new { success = false, message = "Lỗi khi lưu kế hoạch tập luyện" });
            }
        }

        // API: Thêm bài tập vào danh sách đã chọn
        [HttpPost("MucTieu/AddBaiTapToMucTieu")]
        public async Task<IActionResult> AddBaiTapToMucTieu([FromBody] AddBaiTapToMucTieuRequest request)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Chưa đăng nhập" });
            }

            try
            {
                if (string.IsNullOrEmpty(request.MucTieuId))
                {
                    return Json(new { success = false, message = "Mục tiêu không được để trống" });
                }

                if (request.MauTapLuyenId <= 0)
                {
                    return Json(new { success = false, message = "Mẫu tập luyện không hợp lệ" });
                }

                // Kiểm tra mục tiêu có thuộc về user không
                var mucTieu = await _context.MucTieus
                    .FirstOrDefaultAsync(m => m.MucTieuId == request.MucTieuId && m.UserId == userId);

                if (mucTieu == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy mục tiêu hoặc không có quyền truy cập" });
                }

                // Kiểm tra bài tập đã được chọn chưa
                var existing = await _context.MucTieuChonBaiTaps
                    .FirstOrDefaultAsync(c => c.MucTieuId == request.MucTieuId && c.MauTapLuyenId == request.MauTapLuyenId);

                if (existing != null)
                {
                    return Json(new { success = false, message = "Bài tập này đã được chọn" });
                }

                // Lấy thứ tự hiển thị tiếp theo - sửa lại để EF Core có thể translate sang SQL
                // Cách 1: Dùng MaxAsync với nullable int
                var maxThuTuNullable = await _context.MucTieuChonBaiTaps
                    .Where(c => c.MucTieuId == request.MucTieuId)
                    .MaxAsync(c => (int?)c.ThuTuHienThi);
                var maxThuTu = maxThuTuNullable ?? 0;

                // Thêm bài tập vào danh sách đã chọn
                var chonBaiTap = new MucTieuChonBaiTap
                {
                    MucTieuId = request.MucTieuId,
                    MauTapLuyenId = request.MauTapLuyenId,
                    ThuTuHienThi = maxThuTu + 1,
                    DaLapLich = false,
                    NgayChon = DateTime.Now
                };

                _context.MucTieuChonBaiTaps.Add(chonBaiTap);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Added bai tap {MauTapLuyenId} to muc tieu {MucTieuId} for user {UserId}", 
                    request.MauTapLuyenId, request.MucTieuId, userId);

                return Json(new { success = true, chonBaiTapId = chonBaiTap.ChonBaiTapId });
            }
            catch (SqlException sqlEx)
            {
                _logger.LogError(sqlEx, "SQL Error adding bai tap to muc tieu for user {UserId}. SQL Error Number: {Number}, Message: {Message}", 
                    userId, sqlEx.Number, sqlEx.Message);
                
                // Kiểm tra chính xác lỗi SQL
                if (sqlEx.Number == 208) // Invalid object name
                {
                    return Json(new { 
                        success = false, 
                        message = "Bảng MucTieuChonBaiTap chưa được tạo. Vui lòng chạy migration script: Database/migration_add_mucTieuChonBaiTap.sql" 
                    });
                }
                
                if (sqlEx.Number == 207) // Invalid column name
                {
                    return Json(new { 
                        success = false, 
                        message = $"Lỗi cấu hình database: Tên cột không hợp lệ. Chi tiết: {sqlEx.Message}. Vui lòng kiểm tra lại cấu hình Entity Framework." 
                    });
                }
                
                return Json(new { 
                    success = false, 
                    message = $"Lỗi SQL Server: {sqlEx.Message} (Error Number: {sqlEx.Number})" 
                });
            }
            catch (DbUpdateException dbEx)
            {
                _logger.LogError(dbEx, "Database update error adding bai tap to muc tieu for user {UserId}. Inner Exception: {InnerEx}", 
                    userId, dbEx.InnerException?.Message);
                
                // Kiểm tra inner exception
                if (dbEx.InnerException is SqlException innerSqlEx)
                {
                    if (innerSqlEx.Number == 208) // Invalid object name
                    {
                        return Json(new { 
                            success = false, 
                            message = "Bảng MucTieuChonBaiTap chưa được tạo. Vui lòng chạy migration script: Database/migration_add_mucTieuChonBaiTap.sql" 
                        });
                    }
                    
                    if (innerSqlEx.Number == 207) // Invalid column name
                    {
                        return Json(new { 
                            success = false, 
                            message = $"Lỗi cấu hình database: Tên cột không hợp lệ. Chi tiết: {innerSqlEx.Message}. Vui lòng rebuild project và kiểm tra lại cấu hình Entity Framework." 
                        });
                    }
                }
                
                return Json(new { 
                    success = false, 
                    message = $"Lỗi khi cập nhật database: {dbEx.InnerException?.Message ?? dbEx.Message}" 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding bai tap to muc tieu for user {UserId}. Error: {Error}, StackTrace: {StackTrace}", 
                    userId, ex.Message, ex.StackTrace);
                
                return Json(new { 
                    success = false, 
                    message = $"Lỗi khi thêm bài tập: {ex.Message}" 
                });
            }
        }

        // API: Xóa bài tập khỏi danh sách đã chọn
        [HttpPost("MucTieu/RemoveBaiTapFromMucTieu")]
        public async Task<IActionResult> RemoveBaiTapFromMucTieu([FromBody] RemoveBaiTapFromMucTieuRequest request)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Chưa đăng nhập" });
            }

            try
            {
                if (string.IsNullOrEmpty(request.MucTieuId))
                {
                    return Json(new { success = false, message = "Mục tiêu không được để trống" });
                }

                if (request.MauTapLuyenId <= 0)
                {
                    return Json(new { success = false, message = "Mẫu tập luyện không hợp lệ" });
                }

                // Kiểm tra mục tiêu có thuộc về user không
                var mucTieu = await _context.MucTieus
                    .FirstOrDefaultAsync(m => m.MucTieuId == request.MucTieuId && m.UserId == userId);

                if (mucTieu == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy mục tiêu hoặc không có quyền truy cập" });
                }

                // Tìm và xóa bài tập đã chọn
                var chonBaiTap = await _context.MucTieuChonBaiTaps
                    .FirstOrDefaultAsync(c => c.MucTieuId == request.MucTieuId && c.MauTapLuyenId == request.MauTapLuyenId);

                if (chonBaiTap == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy bài tập đã chọn" });
                }

                // Kiểm tra xem bài tập đã lên lịch chưa
                // QUAN TRỌNG: Chỉ chặn xóa nếu có kế hoạch ĐANG THỰC HIỆN (DangSuDung = true)
                // Nếu kế hoạch đã bị hủy (DangSuDung = false), cho phép xóa dù DaLapLich = true
                if (chonBaiTap.DaLapLich == true)
                {
                    // Kiểm tra xem có kế hoạch đang thực hiện liên quan đến MucTieu này không
                    var hasActivePlan = await _context.KeHoachTapLuyens
                        .AnyAsync(k => k.MucTieuId == request.MucTieuId && 
                                      k.UserId == userId && 
                                      k.DangSuDung == true);

                    if (hasActivePlan)
                    {
                        _logger.LogWarning("RemoveBaiTapFromMucTieu - User {UserId} tried to remove MauTapLuyenId {MauTapLuyenId} from MucTieuId {MucTieuId} but it has active plan", 
                            userId, request.MauTapLuyenId, request.MucTieuId);
                        return Json(new { success = false, message = "Không thể xóa bài tập đã lên lịch" });
                    }
                    else
                    {
                        // Kế hoạch đã bị hủy, cho phép xóa và reset DaLapLich
                        _logger.LogInformation("RemoveBaiTapFromMucTieu - Allowing removal because no active plan exists for MucTieuId {MucTieuId}", 
                            request.MucTieuId);
                        // Không cần reset DaLapLich ở đây vì sẽ xóa record luôn
                    }
                }

                _context.MucTieuChonBaiTaps.Remove(chonBaiTap);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Removed bai tap {MauTapLuyenId} from muc tieu {MucTieuId} for user {UserId}", 
                    request.MauTapLuyenId, request.MucTieuId, userId);

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing bai tap from muc tieu for user {UserId}", userId);
                return Json(new { success = false, message = "Lỗi khi xóa bài tập" });
            }
        }

        // API: Lấy danh sách bài tập đã chọn cho mục tiêu
        [HttpGet("MucTieu/GetBaiTapDaChon")]
        public async Task<IActionResult> GetBaiTapDaChon(string mucTieuId)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Chưa đăng nhập" });
            }

            try
            {
                if (string.IsNullOrEmpty(mucTieuId))
                {
                    return Json(new { success = false, message = "Mục tiêu không được để trống" });
                }

                // Kiểm tra mục tiêu có thuộc về user không
                var mucTieu = await _context.MucTieus
                    .FirstOrDefaultAsync(m => m.MucTieuId == mucTieuId && m.UserId == userId);

                if (mucTieu == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy mục tiêu hoặc không có quyền truy cập" });
                }

                // Lấy danh sách bài tập đã chọn
                var baiTapDaChon = await _context.MucTieuChonBaiTaps
                    .Where(c => c.MucTieuId == mucTieuId)
                    .Include(c => c.MauTapLuyen)
                        .ThenInclude(m => m.ChiTietMauTapLuyens)
                    .OrderBy(c => c.ThuTuHienThi ?? 0)
                    .Select(c => new
                    {
                        ChonBaiTapId = c.ChonBaiTapId,
                        MauTapLuyenId = c.MauTapLuyenId,
                        TenMauTapLuyen = c.MauTapLuyen.TenMauTapLuyen,
                        MoTa = c.MauTapLuyen.MoTa,
                        DoKho = c.MauTapLuyen.DoKho,
                        SoTuan = c.MauTapLuyen.SoTuan,
                        CaloUocTinh = c.MauTapLuyen.CaloUocTinh,
                        ThietBiCan = c.MauTapLuyen.ThietBiCan,
                        DiemTrungBinh = c.MauTapLuyen.DiemTrungBinh,
                        SoBaiTap = c.MauTapLuyen.ChiTietMauTapLuyens.Count,
                        ThuTuHienThi = c.ThuTuHienThi,
                        DaLapLich = c.DaLapLich,
                        NgayChon = c.NgayChon
                    })
                    .ToListAsync();

                return Json(new { success = true, data = baiTapDaChon });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting bai tap da chon for muc tieu {MucTieuId}", mucTieuId);
                return Json(new { success = false, message = "Lỗi khi lấy danh sách bài tập đã chọn" });
            }
        }

        // API: Lưu kế hoạch tập luyện từ danh sách bài tập đã chọn
        [HttpPost("MucTieu/SaveKeHoachTapLuyenFromSelected")]
        public async Task<IActionResult> SaveKeHoachTapLuyenFromSelected([FromBody] SaveKeHoachTapLuyenFromSelectedRequest request)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Chưa đăng nhập" });
            }

            try
            {
                // Kiểm tra xem đã có kế hoạch đang thực hiện chưa
                var existingPlan = await _context.KeHoachTapLuyens
                    .Where(k => k.UserId == userId && k.DangSuDung == true)
                    .FirstOrDefaultAsync();

                if (existingPlan != null)
                {
                    _logger.LogWarning("SaveKeHoachTapLuyenFromSelected - User {UserId} already has an active plan {KeHoachId}", 
                        userId, existingPlan.KeHoachId);
                    return Json(new { 
                        success = false, 
                        message = "Bạn đang có kế hoạch tập luyện đang thực hiện. Vui lòng hoàn thành hoặc hủy kế hoạch hiện tại trước khi tạo mục tiêu mới.",
                        hasActivePlan = true,
                        keHoachId = existingPlan.KeHoachId
                    });
                }

                if (string.IsNullOrEmpty(request.MucTieuId))
                {
                    return Json(new { success = false, message = "Mục tiêu không được để trống" });
                }

                // Kiểm tra mục tiêu có thuộc về user không
                var mucTieu = await _context.MucTieus
                    .FirstOrDefaultAsync(m => m.MucTieuId == request.MucTieuId && m.UserId == userId);

                if (mucTieu == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy mục tiêu hoặc không có quyền truy cập" });
                }

                // Lấy danh sách bài tập đã chọn (chưa lên lịch)
                var baiTapDaChon = await _context.MucTieuChonBaiTaps
                    .Where(c => c.MucTieuId == request.MucTieuId && c.DaLapLich == false)
                    .Include(c => c.MauTapLuyen)
                        .ThenInclude(m => m.ChiTietMauTapLuyens)
                    .OrderBy(c => c.ThuTuHienThi ?? 0)
                    .ToListAsync();

                if (!baiTapDaChon.Any())
                {
                    return Json(new { success = false, message = "Chưa có bài tập nào được chọn" });
                }

                // Tạo KeHoachId mới
                var keHoachId = await GenerateKeHoachIdAsync();

                // Tính tổng số tuần (lấy max từ các bài tập)
                var maxSoTuan = baiTapDaChon
                    .Select(c => c.MauTapLuyen.SoTuan ?? 0)
                    .DefaultIfEmpty(0)
                    .Max();

                // Tính tổng số buổi (tổng từ tất cả bài tập)
                var tongSoBuoi = 0;
                var tongThoiLuong = 0;
                var tongCalo = 0.0;

                // Tạo dictionary để map lịch tập (không cần Tuan nữa, chỉ dùng NgayTrongTuan)
                var lichTapDict = new Dictionary<int, ScheduleItem>();
                if (request.LichTap != null && request.LichTap.Any())
                {
                    foreach (var lich in request.LichTap)
                    {
                        if (lich.NgayTrongTuan.HasValue)
                        {
                            var key = lich.NgayTrongTuan.Value;
                            if (!lichTapDict.ContainsKey(key))
                            {
                                lichTapDict[key] = lich;
                            }
                        }
                    }
                }

                // Lưu thông tin bổ sung (địa điểm) vào GhiChu của MucTieu nếu có
                // Merge với NgayKhongTap nếu đã có
                var ghiChuData = new Dictionary<string, object>();
                
                if (!string.IsNullOrEmpty(request.DiaDiemTapLuyen))
                {
                    ghiChuData["DiaDiemTapLuyen"] = request.DiaDiemTapLuyen;
                }
                
                if (request.NgayKhongTap != null && request.NgayKhongTap.Any())
                {
                    ghiChuData["NgayKhongTap"] = request.NgayKhongTap;
                }
                
                if (ghiChuData.Any())
                {
                    mucTieu.GhiChu = System.Text.Json.JsonSerializer.Serialize(ghiChuData);
                }

                // Tạo tên kế hoạch từ tên các bài tập
                var tenKeHoach = string.Join(", ", baiTapDaChon.Take(3).Select(c => c.MauTapLuyen.TenMauTapLuyen));
                if (baiTapDaChon.Count > 3)
                {
                    tenKeHoach += $" và {baiTapDaChon.Count - 3} bài tập khác";
                }

                // Tạo KeHoachTapLuyen
                var keHoach = new KeHoachTapLuyen
                {
                    KeHoachId = keHoachId,
                    UserId = userId,
                    MucTieuId = request.MucTieuId,
                    TenKeHoach = tenKeHoach,
                    LoaiKeHoach = mucTieu.LoaiMucTieu,
                    MucDo = request.MucDo ?? baiTapDaChon.First().MauTapLuyen.DoKho,
                    SoTuan = maxSoTuan,
                    SoBuoi = tongSoBuoi, // Sẽ cập nhật sau
                    ThoiLuongPhut = tongThoiLuong, // Sẽ cập nhật sau
                    CaloTieuHaoMoiBuoi = tongCalo, // Sẽ cập nhật sau
                    Nguon = "User",
                    DangSuDung = true,
                    NgayTao = DateTime.Now
                };

                _context.KeHoachTapLuyens.Add(keHoach);

                // Copy ChiTietMauTapLuyen từ tất cả bài tập đã chọn sang ChiTietKeHoachTapLuyen
                var chiTietList = new List<ChiTietKeHoachTapLuyen>();
                var lichTapIndex = 0;
                var lichTapList = request.LichTap?.Where(l => l.NgayTrongTuan.HasValue).ToList() ?? new List<ScheduleItem>();

                foreach (var chonBaiTap in baiTapDaChon)
                {
                    var mauTapLuyen = chonBaiTap.MauTapLuyen;
                    
                    // Cập nhật tổng số buổi, thời lượng, calo
                    var soNgayTrongTuan = mauTapLuyen.ChiTietMauTapLuyens
                        .Where(c => c.Tuan == 1)
                        .Select(c => c.NgayTrongTuan)
                        .Where(ngay => ngay.HasValue)
                        .Distinct()
                        .Count();
                    tongSoBuoi += soNgayTrongTuan > 0 ? soNgayTrongTuan : 3;

                    var thoiLuongTrungBinh = mauTapLuyen.ChiTietMauTapLuyens
                        .Where(c => c.ThoiLuongPhut.HasValue)
                        .Select(c => c.ThoiLuongPhut.Value)
                        .DefaultIfEmpty(0)
                        .Average();
                    tongThoiLuong += (int)Math.Round(thoiLuongTrungBinh);

                    tongCalo += mauTapLuyen.CaloUocTinh ?? 0;

                    foreach (var chiTietMau in mauTapLuyen.ChiTietMauTapLuyens.OrderBy(c => c.ThuTuHienThi).ThenBy(c => c.Tuan).ThenBy(c => c.NgayTrongTuan))
                    {
                        var chiTiet = new ChiTietKeHoachTapLuyen
                        {
                            KeHoachId = keHoachId,
                            TenBaiTap = chiTietMau.TenbaiTap,
                            SoHiep = chiTietMau.SoSets,
                            SoLan = chiTietMau.SoReps,
                            ThoiGianPhut = chiTietMau.ThoiLuongPhut,
                            NgayTrongTuan = chiTietMau.NgayTrongTuan,
                            Tuan = chiTietMau.Tuan, // Giữ nguyên Tuan từ MauTapLuyen (phụ thuộc vào SoTuan)
                            ThuTuHienThi = chiTietMau.ThuTuHienThi ?? 0,
                            VideoUrl = chiTietMau.VideoUrl,
                            CanhBao = chiTietMau.GhiChu,
                            NoiDung = chiTietMau.GhiChu,
                            HuongDan = chiTietMau.GhiChu
                        };

                        // Cập nhật lịch tập - map theo NgayTrongTuan (không cần Tuan từ request)
                        ScheduleItem? matchedLich = null;
                        
                        if (chiTietMau.NgayTrongTuan.HasValue)
                        {
                            var key = chiTietMau.NgayTrongTuan.Value;
                            if (lichTapDict.ContainsKey(key))
                            {
                                matchedLich = lichTapDict[key];
                            }
                        }
                        
                        // Nếu không tìm thấy, lấy từ danh sách lịch tập theo thứ tự
                        if (matchedLich == null && lichTapList.Any())
                        {
                            if (lichTapIndex < lichTapList.Count)
                            {
                                matchedLich = lichTapList[lichTapIndex];
                                lichTapIndex++;
                            }
                        }
                        
                        if (matchedLich != null)
                        {
                            // Cập nhật NgayTrongTuan từ lịch tập người dùng chọn
                            chiTiet.NgayTrongTuan = matchedLich.NgayTrongTuan ?? chiTietMau.NgayTrongTuan;
                            // Tuan vẫn giữ từ chiTietMau (phụ thuộc vào SoTuan của MauTapLuyen)
                            
                            var lichTapInfo = new
                            {
                                Buoi = matchedLich.Buoi,
                                GioBatDau = matchedLich.GioBatDau,
                                GioKetThuc = matchedLich.GioKetThuc
                            };
                            var lichTapJson = System.Text.Json.JsonSerializer.Serialize(lichTapInfo);
                            
                            if (string.IsNullOrEmpty(chiTiet.CanhBao))
                            {
                                chiTiet.CanhBao = $"{{\"LichTap\": {lichTapJson}}}";
                            }
                            else
                            {
                                chiTiet.NoiDung = string.IsNullOrEmpty(chiTiet.NoiDung) 
                                    ? $"{{\"LichTap\": {lichTapJson}}}" 
                                    : $"{chiTiet.NoiDung} | {{\"LichTap\": {lichTapJson}}}";
                            }
                        }

                        // Tính calo tiêu hao dự kiến sử dụng helper mới
                        var mucTieuLoai = mucTieu?.LoaiMucTieu; // Lấy loại mục tiêu để xác định loại bài tập
                        chiTiet.CaloTieuHaoDuKien = CaloTieuHaoHelper.TinhCaloTieuHao(
                            thoiGianPhut: chiTietMau.ThoiLuongPhut,
                            soHiep: chiTietMau.SoSets,
                            soLan: chiTietMau.SoReps,
                            mucTieu: mucTieuLoai,
                            caloUocTinhMau: mauTapLuyen.CaloUocTinh
                        );

                        chiTietList.Add(chiTiet);
                    }
                }

                // Cập nhật tổng số buổi, thời lượng, calo vào KeHoachTapLuyen
                keHoach.SoBuoi = tongSoBuoi;
                keHoach.ThoiLuongPhut = tongThoiLuong;
                keHoach.CaloTieuHaoMoiBuoi = tongCalo / tongSoBuoi; // Trung bình mỗi buổi

                _context.ChiTietKeHoachTapLuyens.AddRange(chiTietList);

                // Đánh dấu các bài tập đã lên lịch
                foreach (var chonBaiTap in baiTapDaChon)
                {
                    chonBaiTap.DaLapLich = true;
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Saved ke hoach tap luyen {KeHoachId} from {Count} selected bai tap for user {UserId}", 
                    keHoachId, baiTapDaChon.Count, userId);

                return Json(new { success = true, keHoachId = keHoachId, mucTieuId = request.MucTieuId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving ke hoach tap luyen from selected for user {UserId}", userId);
                return Json(new { success = false, message = "Lỗi khi lưu kế hoạch tập luyện" });
            }
        }

        // API: Lưu kế hoạch tập luyện từ preview schedule
        [HttpPost("MucTieu/SaveKeHoachTapLuyenFromPreviewSchedule")]
        public async Task<IActionResult> SaveKeHoachTapLuyenFromPreviewSchedule([FromBody] SaveKeHoachTapLuyenFromPreviewScheduleRequest request)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Chưa đăng nhập" });
            }

            try
            {
                // Kiểm tra xem đã có kế hoạch đang thực hiện chưa
                var existingPlan = await _context.KeHoachTapLuyens
                    .Where(k => k.UserId == userId && k.DangSuDung == true)
                    .FirstOrDefaultAsync();

                if (existingPlan != null)
                {
                    _logger.LogWarning("SaveKeHoachTapLuyenFromPreviewSchedule - User {UserId} already has an active plan {KeHoachId}", 
                        userId, existingPlan.KeHoachId);
                    return Json(new { 
                        success = false, 
                        message = "Bạn đang có kế hoạch tập luyện đang thực hiện. Vui lòng hoàn thành hoặc hủy kế hoạch hiện tại trước khi tạo mục tiêu mới.",
                        hasActivePlan = true,
                        keHoachId = existingPlan.KeHoachId
                    });
                }
                if (string.IsNullOrEmpty(request.MucTieuId))
                {
                    return Json(new { success = false, message = "Mục tiêu không được để trống" });
                }

                // Kiểm tra mục tiêu có thuộc về user không
                var mucTieu = await _context.MucTieus
                    .FirstOrDefaultAsync(m => m.MucTieuId == request.MucTieuId && m.UserId == userId);

                if (mucTieu == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy mục tiêu hoặc không có quyền truy cập" });
                }

                if (request.ChiTietBaiTap == null || !request.ChiTietBaiTap.Any())
                {
                    return Json(new { success = false, message = "Chưa có dữ liệu lịch tập luyện" });
                }

                // Tạo KeHoachId mới
                var keHoachId = await GenerateKeHoachIdAsync();

                // Tính tổng số tuần, số buổi, thời lượng, calo
                var maxTuan = request.ChiTietBaiTap.Max(c => c.Tuan);
                var distinctDays = request.ChiTietBaiTap
                    .GroupBy(c => new { c.Tuan, c.NgayTrongTuan })
                    .Count();
                var tongThoiLuong = request.ChiTietBaiTap.Sum(c => c.ThoiLuongPhut ?? 0);

                // Lấy thông tin từ các bài tập để tính calo
                var mauTapLuyenIds = request.ChiTietBaiTap.Select(c => c.MauTapLuyenId).Distinct().ToList();
                var mauTapLuyens = await _context.MauTapLuyens
                    .Where(m => mauTapLuyenIds.Contains(m.MauTapLuyenId))
                    .ToListAsync();
                var tongCalo = mauTapLuyens.Sum(m => m.CaloUocTinh ?? 0);

                // Parse ngày bắt đầu nếu có (đây là Thứ 2 của tuần đầu tiên trong preview schedule)
                DateOnly? ngayBatDauKeHoach = null;
                if (!string.IsNullOrEmpty(request.NgayBatDau) && DateOnly.TryParse(request.NgayBatDau, out var parsedNgayBatDau))
                {
                    ngayBatDauKeHoach = parsedNgayBatDau;
                }
                else
                {
                    // Nếu không có, tính từ ngày bắt đầu của mục tiêu
                    // Tính Thứ 2 của tuần chứa ngày bắt đầu mục tiêu
                    if (mucTieu.NgayBatDau != default(DateOnly))
                    {
                        var ngayBatDauMucTieu = mucTieu.NgayBatDau;
                        var dayOfWeekNgayBatDau = (int)ngayBatDauMucTieu.DayOfWeek;
                        var ngayTrongTuanBatDau = dayOfWeekNgayBatDau == 0 ? 7 : dayOfWeekNgayBatDau;
                        var daysToMonday = ngayTrongTuanBatDau - 1;
                        ngayBatDauKeHoach = ngayBatDauMucTieu.AddDays(-daysToMonday);
                    }
                    else
                    {
                    // Nếu không có ngày bắt đầu mục tiêu, dùng hôm nay (tính về Thứ 2)
                    var today = DateOnly.FromDateTime(DateTime.Now);
                    var dayOfWeekToday = (int)today.DayOfWeek;
                    var ngayTrongTuanToday = dayOfWeekToday == 0 ? 7 : dayOfWeekToday;
                    var daysToMondayToday = ngayTrongTuanToday - 1;
                    ngayBatDauKeHoach = today.AddDays(-daysToMondayToday);
                    _logger.LogInformation("Calculated ngayBatDauKeHoach from today: {NgayBatDau}", ngayBatDauKeHoach);
                    }
                }

                // QUAN TRỌNG: Luôn cập nhật NgayBatDau thành firstMonday từ preview schedule
                // Đảm bảo NgayBatDau là Thứ 2 (Monday) để logic tính ngày/tuần nhất quán
                if (ngayBatDauKeHoach.HasValue)
                {
                    // Đảm bảo ngayBatDauKeHoach là Thứ 2
                    var dayOfWeekNgayBatDau = (int)ngayBatDauKeHoach.Value.DayOfWeek;
                    if (dayOfWeekNgayBatDau != 1) // 1 = Monday
                    {
                        var ngayTrongTuanBatDau = dayOfWeekNgayBatDau == 0 ? 7 : dayOfWeekNgayBatDau;
                        var daysToMonday = ngayTrongTuanBatDau - 1;
                        ngayBatDauKeHoach = ngayBatDauKeHoach.Value.AddDays(-daysToMonday);
                    }
                    mucTieu.NgayBatDau = ngayBatDauKeHoach.Value;
                    _logger.LogInformation("Updated MucTieu.NgayBatDau to {NgayBatDau} (firstMonday from preview schedule)", mucTieu.NgayBatDau);
                }
                else if (mucTieu.NgayBatDau == default(DateOnly))
                {
                    // Nếu không có ngày bắt đầu từ request và mục tiêu chưa có ngày bắt đầu
                    // Tính Thứ 2 của tuần chứa ngày hôm nay
                    var today = DateOnly.FromDateTime(DateTime.Now);
                    var dayOfWeekToday = (int)today.DayOfWeek;
                    var ngayTrongTuanToday = dayOfWeekToday == 0 ? 7 : dayOfWeekToday;
                    var daysToMondayToday = ngayTrongTuanToday - 1;
                    mucTieu.NgayBatDau = today.AddDays(-daysToMondayToday);
                    _logger.LogInformation("Set MucTieu.NgayBatDau to {NgayBatDau} (calculated firstMonday from today)", mucTieu.NgayBatDau);
                }

                // Lưu thông tin bổ sung vào GhiChu của MucTieu
                var ghiChuData = new Dictionary<string, object>();
                if (request.NgayKhongTap != null && request.NgayKhongTap.Any())
                {
                    ghiChuData["NgayKhongTap"] = request.NgayKhongTap;
                }
                if (ghiChuData.Any())
                {
                    mucTieu.GhiChu = System.Text.Json.JsonSerializer.Serialize(ghiChuData);
                }

                // Tạo tên kế hoạch từ tên các bài tập
                var distinctBaiTap = request.ChiTietBaiTap.Select(c => c.TenBaiTap).Distinct().Take(3).ToList();
                var tenKeHoach = string.Join(", ", distinctBaiTap);
                if (request.ChiTietBaiTap.Select(c => c.TenBaiTap).Distinct().Count() > 3)
                {
                    tenKeHoach += $" và {request.ChiTietBaiTap.Select(c => c.TenBaiTap).Distinct().Count() - 3} bài tập khác";
                }

                // Tạo KeHoachTapLuyen
                var keHoach = new KeHoachTapLuyen
                {
                    KeHoachId = keHoachId,
                    UserId = userId,
                    MucTieuId = request.MucTieuId,
                    TenKeHoach = tenKeHoach,
                    LoaiKeHoach = mucTieu.LoaiMucTieu,
                    MucDo = request.MucDo ?? "Intermediate",
                    SoTuan = maxTuan,
                    SoBuoi = distinctDays,
                    ThoiLuongPhut = tongThoiLuong,
                    CaloTieuHaoMoiBuoi = distinctDays > 0 ? tongCalo / distinctDays : tongCalo,
                    Nguon = "User",
                    DangSuDung = true,
                    NgayTao = DateTime.Now
                };

                _context.KeHoachTapLuyens.Add(keHoach);

                // Tạo ChiTietKeHoachTapLuyen từ dữ liệu preview schedule
                var chiTietList = new List<ChiTietKeHoachTapLuyen>();
                var thuTuHienThi = 0;

                // Verify firstMonday để log
                var firstMondayToVerify = ngayBatDauKeHoach ?? mucTieu.NgayBatDau;
                _logger.LogInformation("SaveKeHoachTapLuyenFromPreviewSchedule - FirstMonday (reference): {FirstMonday}, Total chiTietBaiTap: {Count}", 
                    firstMondayToVerify, request.ChiTietBaiTap.Count);

                foreach (var chiTietItem in request.ChiTietBaiTap.OrderBy(c => c.Tuan).ThenBy(c => c.NgayTrongTuan).ThenBy(c => c.ThuTuHienThi))
                {
                    // Tính lại ngày thực tế từ Tuan và NgayTrongTuan để verify
                    if (chiTietItem.Tuan > 0 && chiTietItem.NgayTrongTuan > 0)
                    {
                        var tuanIndex = chiTietItem.Tuan - 1;
                        var ngayTrongTuanIndex = chiTietItem.NgayTrongTuan - 1;
                        var calculatedDateFromTuan = firstMondayToVerify.AddDays(tuanIndex * 7 + ngayTrongTuanIndex);
                        
                        _logger.LogInformation("SaveKeHoachTapLuyenFromPreviewSchedule - Saving: TenBaiTap={TenBaiTap}, Tuan={Tuan}, NgayTrongTuan={NgayTrongTuan}, CalculatedDate={Date}", 
                            chiTietItem.TenBaiTap, chiTietItem.Tuan, chiTietItem.NgayTrongTuan, calculatedDateFromTuan);
                    }

                    // Parse NgayTap từ string (YYYY-MM-DD) sang DateOnly
                    DateOnly? ngayTap = null;
                    if (!string.IsNullOrEmpty(chiTietItem.NgayTap))
                    {
                        if (DateOnly.TryParse(chiTietItem.NgayTap, out var parsedNgayTap))
                        {
                            ngayTap = parsedNgayTap;
                            _logger.LogInformation("SaveKeHoachTapLuyenFromPreviewSchedule - Parsed NgayTap: {NgayTapString} -> {NgayTap}", 
                                chiTietItem.NgayTap, ngayTap);
                        }
                        else
                        {
                            _logger.LogWarning("SaveKeHoachTapLuyenFromPreviewSchedule - Failed to parse NgayTap: {NgayTapString}", 
                                chiTietItem.NgayTap);
                        }
                    }
                    else
                    {
                        _logger.LogWarning("SaveKeHoachTapLuyenFromPreviewSchedule - NgayTap is null or empty for TenBaiTap={TenBaiTap}", 
                            chiTietItem.TenBaiTap);
                    }

                    var chiTiet = new ChiTietKeHoachTapLuyen
                    {
                        KeHoachId = keHoachId,
                        TenBaiTap = chiTietItem.TenBaiTap,
                        SoHiep = chiTietItem.SoHiep,
                        SoLan = chiTietItem.SoLan,
                        ThoiGianPhut = chiTietItem.ThoiLuongPhut,
                        Tuan = chiTietItem.Tuan,
                        NgayTrongTuan = chiTietItem.NgayTrongTuan,
                        NgayTap = ngayTap, // Lưu ngày cụ thể từ preview schedule
                        ThuTuHienThi = chiTietItem.ThuTuHienThi ?? (++thuTuHienThi),
                        VideoUrl = chiTietItem.VideoUrl,
                        CanhBao = chiTietItem.GhiChu,
                        NoiDung = chiTietItem.GhiChu,
                        HuongDan = chiTietItem.GhiChu
                    };

                    _logger.LogInformation("SaveKeHoachTapLuyenFromPreviewSchedule - Saving: TenBaiTap={TenBaiTap}, NgayTap={NgayTap}, Tuan={Tuan}, NgayTrongTuan={NgayTrongTuan}, NgayTapString={NgayTapString}, VideoUrl={VideoUrl}", 
                        chiTiet.TenBaiTap, ngayTap, chiTiet.Tuan, chiTiet.NgayTrongTuan, chiTietItem.NgayTap, chiTiet.VideoUrl);

                    // Lưu thông tin lịch tập vào CanhBao hoặc NoiDung
                    if (chiTietItem.LichTap != null)
                    {
                        var lichTapJson = System.Text.Json.JsonSerializer.Serialize(chiTietItem.LichTap);
                        if (string.IsNullOrEmpty(chiTiet.CanhBao))
                        {
                            chiTiet.CanhBao = $"{{\"LichTap\": {lichTapJson}}}";
                        }
                        else
                        {
                            chiTiet.NoiDung = string.IsNullOrEmpty(chiTiet.NoiDung)
                                ? $"{{\"LichTap\": {lichTapJson}}}"
                                : $"{chiTiet.NoiDung} | {{\"LichTap\": {lichTapJson}}}";
                        }
                    }

                    // Tính calo tiêu hao dự kiến sử dụng helper mới
                    var mauTapLuyen = mauTapLuyens.FirstOrDefault(m => m.MauTapLuyenId == chiTietItem.MauTapLuyenId);
                    var mucTieuLoai = mucTieu?.LoaiMucTieu; // Lấy loại mục tiêu để xác định loại bài tập
                    chiTiet.CaloTieuHaoDuKien = CaloTieuHaoHelper.TinhCaloTieuHao(
                        thoiGianPhut: chiTietItem.ThoiLuongPhut,
                        soHiep: chiTietItem.SoHiep,
                        soLan: chiTietItem.SoLan,
                        mucTieu: mucTieuLoai,
                        caloUocTinhMau: mauTapLuyen?.CaloUocTinh
                    );

                    chiTietList.Add(chiTiet);
                }

                _context.ChiTietKeHoachTapLuyens.AddRange(chiTietList);

                // Đánh dấu các bài tập đã lên lịch
                var mauTapLuyenIdsToUpdate = request.ChiTietBaiTap.Select(c => c.MauTapLuyenId).Distinct().ToList();
                var baiTapDaChon = await _context.MucTieuChonBaiTaps
                    .Where(c => c.MucTieuId == request.MucTieuId && mauTapLuyenIdsToUpdate.Contains(c.MauTapLuyenId))
                    .ToListAsync();

                foreach (var chonBaiTap in baiTapDaChon)
                {
                    chonBaiTap.DaLapLich = true;
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Saved ke hoach tap luyen {KeHoachId} from preview schedule for user {UserId}", 
                    keHoachId, userId);

                return Json(new { success = true, keHoachId = keHoachId, mucTieuId = request.MucTieuId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving ke hoach tap luyen from preview schedule for user {UserId}", userId);
                return Json(new { success = false, message = "Lỗi khi lưu kế hoạch tập luyện: " + ex.Message });
            }
        }
    }

    // Request models
    public class SaveMucTieuRequest
    {
        public string LoaiMucTieu { get; set; } = null!;
        public double GiaTriMucTieu { get; set; }
        public DateOnly? NgayBatDau { get; set; }
        public DateOnly? NgayKetThuc { get; set; }
        public int? ThuTuHienThi { get; set; }
        public string? GhiChu { get; set; }
    }

    public class SaveKeHoachTapLuyenRequest
    {
        public int MauTapLuyenId { get; set; } // Giữ lại để tương thích ngược
        public List<int>? MauTapLuyenIds { get; set; } // Danh sách bài tập đã chọn (ưu tiên)
        public string? MucTieuId { get; set; }
        public string? LoaiMucTieu { get; set; }
        public double? GiaTriMucTieu { get; set; }
        public string? DiaDiemTapLuyen { get; set; } // 'GYM' hoặc 'Home'
        public string? MucDo { get; set; } // 'Beginner', 'Intermediate', 'Advanced'
        public List<ScheduleItem>? LichTap { get; set; } // Danh sách lịch tập
        public List<int>? NgayKhongTap { get; set; } // Danh sách ngày không tập (1-7)
    }

    public class ScheduleItem
    {
        public int? Tuan { get; set; } // Tuần thứ mấy (1-12)
        public int? NgayTrongTuan { get; set; } // 1-7 (Monday-Sunday)
        public string? Buoi { get; set; } // 'Sáng', 'Chiều', 'Tối'
        public string? GioBatDau { get; set; } // '07:00'
        public string? GioKetThuc { get; set; } // '11:00'
    }

    public class AddBaiTapToMucTieuRequest
    {
        public string MucTieuId { get; set; } = null!;
        public int MauTapLuyenId { get; set; }
    }

    public class RemoveBaiTapFromMucTieuRequest
    {
        public string MucTieuId { get; set; } = null!;
        public int MauTapLuyenId { get; set; }
    }

    public class SaveKeHoachTapLuyenFromSelectedRequest
    {
        public string MucTieuId { get; set; } = null!;
        public string? DiaDiemTapLuyen { get; set; } // 'GYM' hoặc 'Home'
        public string? MucDo { get; set; } // 'Beginner', 'Intermediate', 'Advanced'
        public List<ScheduleItem>? LichTap { get; set; } // Danh sách lịch tập (không cần Tuan nữa)
        public List<NgayKhongTapItem>? NgayKhongTap { get; set; } // Danh sách ngày không thể tập
    }
    
    public class NgayKhongTapItem
    {
        public string Loai { get; set; } = null!; // 'holiday' hoặc 'custom'
        public string GiaTri { get; set; } = null!; // 'tet', 'giang-sinh', 'quoc-khanh', 'le-lao-dong' hoặc 'YYYY-MM-DD'
    }

    // Request model để lưu từ preview schedule
    public class SaveKeHoachTapLuyenFromPreviewScheduleRequest
    {
        public string MucTieuId { get; set; } = null!;
        public string? MucDo { get; set; } // 'Beginner', 'Intermediate', 'Advanced'
        public string? NgayBatDau { get; set; } // YYYY-MM-DD
        public List<NgayKhongTapItem>? NgayKhongTap { get; set; }
        public List<ChiTietBaiTapItem>? ChiTietBaiTap { get; set; }
    }

    public class ChiTietBaiTapItem
    {
        public int MauTapLuyenId { get; set; }
        public string TenBaiTap { get; set; } = null!;
        public int? SoHiep { get; set; }
        public int? SoLan { get; set; }
        public int? ThoiLuongPhut { get; set; }
        public int Tuan { get; set; }
        public int NgayTrongTuan { get; set; }
        public string? NgayTap { get; set; } // Ngày cụ thể (YYYY-MM-DD) từ preview schedule
        public int? ThuTuHienThi { get; set; }
        public string? VideoUrl { get; set; }
        public string? GhiChu { get; set; }
        public LichTapInfo? LichTap { get; set; }
    }

    public class LichTapInfo
    {
        public string? Buoi { get; set; }
        public string? GioBatDau { get; set; }
        public string? GioKetThuc { get; set; }
    }
}
