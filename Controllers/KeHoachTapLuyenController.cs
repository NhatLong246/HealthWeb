using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HealthWeb.Models.EF;
using HealthWeb.Models.Entities;
using System.Security.Claims;

namespace HealthWeb.Controllers
{
    public class KeHoachTapLuyenController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<KeHoachTapLuyenController> _logger;

        public KeHoachTapLuyenController(ApplicationDbContext context, ILogger<KeHoachTapLuyenController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [Route("/KeHoachTapLuyen")]
        public IActionResult Index()
        {
            return View("keHoachTapLuyen");
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

        // API: Lấy kế hoạch tập luyện hiện tại của user
        [HttpGet("KeHoachTapLuyen/GetCurrentPlan")]
        public async Task<IActionResult> GetCurrentPlan()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Chưa đăng nhập" });
            }

            try
            {
                // Kiểm tra tổng số kế hoạch và bài tập trong database
                var totalPlans = await _context.KeHoachTapLuyens
                    .Where(k => k.UserId == userId && k.DangSuDung == true)
                    .CountAsync();
                
                var totalExercises = await _context.ChiTietKeHoachTapLuyens
                    .Include(c => c.KeHoach)
                    .Where(c => c.KeHoach.UserId == userId && c.KeHoach.DangSuDung == true)
                    .CountAsync();
                
                _logger.LogInformation("GetCurrentPlan - UserId: {UserId}, Total Plans: {TotalPlans}, Total Exercises: {TotalExercises}", 
                    userId, totalPlans, totalExercises);

                var keHoach = await _context.KeHoachTapLuyens
                    .Include(k => k.ChiTietKeHoachTapLuyens.OrderBy(c => c.Tuan).ThenBy(c => c.NgayTrongTuan).ThenBy(c => c.ThuTuHienThi))
                    .Include(k => k.MucTieu)
                    .Where(k => k.UserId == userId && k.DangSuDung == true)
                    .OrderByDescending(k => k.NgayTao)
                    .FirstOrDefaultAsync();

                if (keHoach == null)
                {
                    return Json(new { success = false, message = "Chưa có kế hoạch tập luyện" });
                }

                // Log số lượng bài tập trong kế hoạch được load
                var exerciseCount = keHoach.ChiTietKeHoachTapLuyens?.Count ?? 0;
                _logger.LogInformation("GetCurrentPlan - KeHoachId: {KeHoachId}, Exercise Count in Plan: {ExerciseCount}", 
                    keHoach.KeHoachId, exerciseCount);

                var chiTietBaiTap = keHoach.ChiTietKeHoachTapLuyens.Select(c => new
                {
                    chiTietId = c.ChiTietId,
                    tenBaiTap = c.TenBaiTap,
                    soHiep = c.SoHiep,
                    soLan = c.SoLan,
                    caloTieuHaoDuKien = c.CaloTieuHaoDuKien,
                    thoiGianPhut = c.ThoiGianPhut,
                    ngayTrongTuan = c.NgayTrongTuan,
                    tuan = c.Tuan,
                    thuTuHienThi = c.ThuTuHienThi,
                    danhGiaDoKho = c.DanhGiaDoKho,
                    danhGiaHieuQua = c.DanhGiaHieuQua,
                    videoUrl = c.VideoUrl,
                    canhBao = c.CanhBao,
                    noiDung = c.NoiDung,
                    huongDan = c.HuongDan
                }).ToList();

                _logger.LogInformation("GetCurrentPlan - Final chiTietBaiTap count: {Count}", chiTietBaiTap.Count);

                var result = new
                {
                    success = true,
                    keHoach = new
                    {
                        keHoachId = keHoach.KeHoachId,
                        tenKeHoach = keHoach.TenKeHoach,
                        loaiKeHoach = keHoach.LoaiKeHoach,
                        mucDo = keHoach.MucDo,
                        soTuan = keHoach.SoTuan,
                        soBuoi = keHoach.SoBuoi,
                        thoiLuongPhut = keHoach.ThoiLuongPhut,
                        caloTieuHaoMoiBuoi = keHoach.CaloTieuHaoMoiBuoi,
                        nguon = keHoach.Nguon,
                        ngayTao = keHoach.NgayTao,
                        mucTieu = keHoach.MucTieu != null ? new
                        {
                            mucTieuId = keHoach.MucTieu.MucTieuId,
                            loaiMucTieu = keHoach.MucTieu.LoaiMucTieu,
                            giaTriMucTieu = keHoach.MucTieu.GiaTriMucTieu,
                            ngayBatDau = keHoach.MucTieu.NgayBatDau,
                            ngayKetThuc = keHoach.MucTieu.NgayKetThuc,
                            tienDoHienTai = keHoach.MucTieu.TienDoHienTai,
                            daHoanThanh = keHoach.MucTieu.DaHoanThanh
                        } : null,
                        chiTietBaiTap = chiTietBaiTap
                    }
                };

                return Json(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting current plan for user {UserId}", userId);
                return Json(new { success = false, message = "Lỗi khi tải dữ liệu" });
            }
        }

        // API: Lấy danh sách bài tập theo ngày trong tuần
        [HttpGet("KeHoachTapLuyen/GetExercisesByDay")]
        public async Task<IActionResult> GetExercisesByDay(int? tuan = null, int? ngayTrongTuan = null)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Chưa đăng nhập" });
            }

            try
            {
                var query = _context.ChiTietKeHoachTapLuyens
                    .Include(c => c.KeHoach)
                    .Where(c => c.KeHoach.UserId == userId && c.KeHoach.DangSuDung == true);

                if (tuan.HasValue)
                {
                    query = query.Where(c => c.Tuan == tuan.Value);
                }

                if (ngayTrongTuan.HasValue)
                {
                    query = query.Where(c => c.NgayTrongTuan == ngayTrongTuan.Value);
                }

                var exercises = await query
                    .OrderBy(c => c.ThuTuHienThi)
                    .Select(c => new
                    {
                        chiTietId = c.ChiTietId,
                        tenBaiTap = c.TenBaiTap,
                        soHiep = c.SoHiep,
                        soLan = c.SoLan,
                        caloTieuHaoDuKien = c.CaloTieuHaoDuKien,
                        thoiGianPhut = c.ThoiGianPhut,
                        ngayTrongTuan = c.NgayTrongTuan,
                        tuan = c.Tuan,
                        videoUrl = c.VideoUrl,
                        canhBao = c.CanhBao,
                        noiDung = c.NoiDung,
                        huongDan = c.HuongDan,
                        danhGiaDoKho = c.DanhGiaDoKho,
                        danhGiaHieuQua = c.DanhGiaHieuQua
                    })
                    .ToListAsync();

                // Log để debug
                _logger.LogInformation("GetExercisesByDay - UserId: {UserId}, Tuan: {Tuan}, NgayTrongTuan: {NgayTrongTuan}, Count: {Count}", 
                    userId, tuan, ngayTrongTuan, exercises.Count);

                return Json(new { success = true, exercises, count = exercises.Count });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting exercises by day for user {UserId}", userId);
                return Json(new { success = false, message = "Lỗi khi tải dữ liệu" });
            }
        }

        // API: Debug - Lấy tất cả bài tập không filter (để kiểm tra)
        [HttpGet("KeHoachTapLuyen/GetAllExercisesDebug")]
        public async Task<IActionResult> GetAllExercisesDebug()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Chưa đăng nhập" });
            }

            try
            {
                // Lấy tất cả bài tập của user, không filter theo ngày/tuần
                var allExercises = await _context.ChiTietKeHoachTapLuyens
                    .Include(c => c.KeHoach)
                    .Where(c => c.KeHoach.UserId == userId && c.KeHoach.DangSuDung == true)
                    .Select(c => new
                    {
                        chiTietId = c.ChiTietId,
                        tenBaiTap = c.TenBaiTap,
                        soHiep = c.SoHiep,
                        soLan = c.SoLan,
                        ngayTrongTuan = c.NgayTrongTuan,
                        tuan = c.Tuan,
                        thuTuHienThi = c.ThuTuHienThi,
                        keHoachId = c.KeHoachId
                    })
                    .ToListAsync();

                // Nhóm theo ngày và tuần để xem phân bố
                var grouped = allExercises
                    .GroupBy(e => new { e.tuan, e.ngayTrongTuan })
                    .Select(g => new
                    {
                        tuan = g.Key.tuan,
                        ngayTrongTuan = g.Key.ngayTrongTuan,
                        count = g.Count(),
                        exercises = g.Select(e => e.tenBaiTap).ToList()
                    })
                    .ToList();

                return Json(new { 
                    success = true, 
                    totalCount = allExercises.Count,
                    allExercises = allExercises,
                    grouped = grouped
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all exercises debug for user {UserId}", userId);
                return Json(new { success = false, message = "Lỗi khi tải dữ liệu" });
            }
        }

        // API: Lấy thông tin mục tiêu
        [HttpGet("KeHoachTapLuyen/GetMucTieu")]
        public async Task<IActionResult> GetMucTieu()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Chưa đăng nhập" });
            }

            try
            {
                var mucTieu = await _context.MucTieus
                    .Where(m => m.UserId == userId && (m.DaHoanThanh == false || m.DaHoanThanh == null))
                    .OrderByDescending(m => m.NgayBatDau)
                    .Select(m => new
                    {
                        mucTieuId = m.MucTieuId,
                        loaiMucTieu = m.LoaiMucTieu,
                        giaTriMucTieu = m.GiaTriMucTieu,
                        ngayBatDau = m.NgayBatDau,
                        ngayKetThuc = m.NgayKetThuc,
                        tienDoHienTai = m.TienDoHienTai,
                        daHoanThanh = m.DaHoanThanh,
                        ghiChu = m.GhiChu
                    })
                    .ToListAsync();

                return Json(new { success = true, mucTieu });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting muc tieu for user {UserId}", userId);
                return Json(new { success = false, message = "Lỗi khi tải dữ liệu" });
            }
        }

        // API: Lấy tất cả bài tập trong kế hoạch hiện tại
        [HttpGet("KeHoachTapLuyen/GetAllExercises")]
        public async Task<IActionResult> GetAllExercises()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Chưa đăng nhập" });
            }

            try
            {
                var keHoach = await _context.KeHoachTapLuyens
                    .Include(k => k.ChiTietKeHoachTapLuyens.OrderBy(c => c.Tuan).ThenBy(c => c.NgayTrongTuan).ThenBy(c => c.ThuTuHienThi))
                    .Where(k => k.UserId == userId && k.DangSuDung == true)
                    .OrderByDescending(k => k.NgayTao)
                    .FirstOrDefaultAsync();

                if (keHoach == null)
                {
                    return Json(new { success = false, message = "Chưa có kế hoạch tập luyện" });
                }

                var exercises = keHoach.ChiTietKeHoachTapLuyens.Select(c => new
                {
                    chiTietId = c.ChiTietId,
                    tenBaiTap = c.TenBaiTap,
                    soHiep = c.SoHiep,
                    soLan = c.SoLan,
                    caloTieuHaoDuKien = c.CaloTieuHaoDuKien,
                    thoiGianPhut = c.ThoiGianPhut,
                    ngayTrongTuan = c.NgayTrongTuan,
                    tuan = c.Tuan,
                    thuTuHienThi = c.ThuTuHienThi,
                    danhGiaDoKho = c.DanhGiaDoKho,
                    danhGiaHieuQua = c.DanhGiaHieuQua,
                    videoUrl = c.VideoUrl,
                    canhBao = c.CanhBao,
                    noiDung = c.NoiDung,
                    huongDan = c.HuongDan
                }).ToList();

                return Json(new { success = true, exercises });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all exercises for user {UserId}", userId);
                return Json(new { success = false, message = "Lỗi khi tải dữ liệu" });
            }
        }

        // API: Thêm bài tập vào kế hoạch từ mẫu tập luyện
        [HttpPost("KeHoachTapLuyen/AddExercisesFromTemplate")]
        public async Task<IActionResult> AddExercisesFromTemplate([FromBody] AddExercisesRequest request)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Chưa đăng nhập" });
            }

            try
            {
                // Lấy kế hoạch hiện tại
                var keHoach = await _context.KeHoachTapLuyens
                    .Where(k => k.UserId == userId && k.DangSuDung == true)
                    .OrderByDescending(k => k.NgayTao)
                    .FirstOrDefaultAsync();

                if (keHoach == null)
                {
                    return Json(new { success = false, message = "Chưa có kế hoạch tập luyện. Vui lòng tạo kế hoạch trước." });
                }

                // Lấy mẫu tập luyện
                var mauTapLuyen = await _context.MauTapLuyens
                    .Include(m => m.ChiTietMauTapLuyens)
                    .FirstOrDefaultAsync(m => m.MauTapLuyenId == request.MauTapLuyenId);

                if (mauTapLuyen == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy mẫu tập luyện" });
                }

                // Lấy thứ tự hiển thị cao nhất hiện tại
                var maxThuTu = await _context.ChiTietKeHoachTapLuyens
                    .Where(c => c.KeHoachId == keHoach.KeHoachId)
                    .Select(c => c.ThuTuHienThi ?? 0)
                    .DefaultIfEmpty(0)
                    .MaxAsync();

                // Thêm các bài tập từ mẫu vào kế hoạch
                var chiTietMoi = new List<ChiTietKeHoachTapLuyen>();
                foreach (var baiTap in mauTapLuyen.ChiTietMauTapLuyens)
                {
                    // Chỉ thêm các bài tập được chọn (nếu có danh sách baiTapIds)
                    if (request.BaiTapIds != null && request.BaiTapIds.Count > 0)
                    {
                        if (!request.BaiTapIds.Contains(baiTap.BaiTapId))
                            continue;
                    }

                    var chiTiet = new ChiTietKeHoachTapLuyen
                    {
                        KeHoachId = keHoach.KeHoachId,
                        TenBaiTap = baiTap.TenbaiTap,
                        SoHiep = baiTap.SoSets,
                        SoLan = baiTap.SoReps,
                        ThoiGianPhut = baiTap.ThoiLuongPhut,
                        NgayTrongTuan = request.NgayTrongTuan ?? baiTap.NgayTrongTuan,
                        Tuan = request.Tuan ?? baiTap.Tuan ?? 1,
                        ThuTuHienThi = ++maxThuTu,
                        VideoUrl = baiTap.VideoUrl,
                        HuongDan = baiTap.GhiChu,
                        DanhGiaDoKho = 3, // Mặc định
                        DanhGiaHieuQua = 3 // Mặc định
                    };

                    // Tính calo tiêu hao dự kiến (ước tính)
                    if (baiTap.ThoiLuongPhut.HasValue)
                    {
                        chiTiet.CaloTieuHaoDuKien = baiTap.ThoiLuongPhut.Value * 10; // Ước tính 10 calo/phút
                    }
                    else if (baiTap.SoSets.HasValue && baiTap.SoReps.HasValue)
                    {
                        chiTiet.CaloTieuHaoDuKien = baiTap.SoSets.Value * baiTap.SoReps.Value * 0.5; // Ước tính
                    }

                    chiTietMoi.Add(chiTiet);
                }

                if (chiTietMoi.Count > 0)
                {
                    _context.ChiTietKeHoachTapLuyens.AddRange(chiTietMoi);
                    await _context.SaveChangesAsync();

                    return Json(new { success = true, message = $"Đã thêm {chiTietMoi.Count} bài tập vào kế hoạch" });
                }
                else
                {
                    return Json(new { success = false, message = "Không có bài tập nào được thêm" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding exercises from template for user {UserId}", userId);
                return Json(new { success = false, message = "Lỗi khi thêm bài tập" });
            }
        }

        // API: Đánh dấu hoàn thành bài tập
        [HttpPost("KeHoachTapLuyen/CompleteExercise")]
        public async Task<IActionResult> CompleteExercise([FromBody] CompleteExerciseRequest request)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Chưa đăng nhập" });
            }

            try
            {
                // Kiểm tra bài tập có tồn tại và thuộc về user không
                var chiTiet = await _context.ChiTietKeHoachTapLuyens
                    .Include(c => c.KeHoach)
                    .FirstOrDefaultAsync(c => c.ChiTietId == request.ChiTietId && 
                                             c.KeHoach.UserId == userId);

                if (chiTiet == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy bài tập" });
                }

                // Kiểm tra xem đã hoàn thành trong ngày hôm nay chưa
                var today = DateOnly.FromDateTime(DateTime.Now);
                var existing = await _context.NhatKyHoanThanhBaiTaps
                    .FirstOrDefaultAsync(n => n.UserId == userId && 
                                             n.ChiTietId == request.ChiTietId && 
                                             n.NgayHoanThanh == today);

                if (existing != null)
                {
                    // Cập nhật bản ghi hiện có
                    existing.SoHiepThucTe = request.SoHiepThucTe;
                    existing.SoLanThucTe = request.SoLanThucTe;
                    existing.ThoiLuongThucTePhut = request.ThoiLuongThucTePhut;
                    existing.CaloTieuHao = request.CaloTieuHao;
                    existing.DanhGiaBaiTap = request.DanhGiaBaiTap;
                    existing.GhiChu = request.GhiChu;
                }
                else
                {
                    // Tạo bản ghi mới
                    var nhatKy = new NhatKyHoanThanhBaiTap
                    {
                        UserId = userId,
                        ChiTietId = request.ChiTietId,
                        NgayHoanThanh = today,
                        SoHiepThucTe = request.SoHiepThucTe,
                        SoLanThucTe = request.SoLanThucTe,
                        ThoiLuongThucTePhut = request.ThoiLuongThucTePhut,
                        CaloTieuHao = request.CaloTieuHao,
                        DanhGiaBaiTap = request.DanhGiaBaiTap,
                        GhiChu = request.GhiChu
                    };
                    _context.NhatKyHoanThanhBaiTaps.Add(nhatKy);
                }

                await _context.SaveChangesAsync();

                return Json(new { success = true, message = "Đã lưu nhật ký hoàn thành bài tập" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error completing exercise for user {UserId}", userId);
                return Json(new { success = false, message = "Lỗi khi lưu nhật ký" });
            }
        }

        // API: Lấy nhật ký hoàn thành bài tập
        [HttpGet("KeHoachTapLuyen/GetExerciseJournal")]
        public async Task<IActionResult> GetExerciseJournal(int? limit = 50)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Chưa đăng nhập" });
            }

            try
            {
                var journal = await _context.NhatKyHoanThanhBaiTaps
                    .Include(n => n.ChiTiet)
                    .Where(n => n.UserId == userId)
                    .OrderByDescending(n => n.NgayHoanThanh)
                    .ThenByDescending(n => n.NhatKyId)
                    .Take(limit ?? 50)
                    .Select(n => new
                    {
                        nhatKyId = n.NhatKyId,
                        chiTietId = n.ChiTietId,
                        tenBaiTap = n.ChiTiet.TenBaiTap,
                        ngayHoanThanh = n.NgayHoanThanh.ToString("yyyy-MM-dd"),
                        soHiepThucTe = n.SoHiepThucTe,
                        soLanThucTe = n.SoLanThucTe,
                        thoiLuongThucTePhut = n.ThoiLuongThucTePhut,
                        caloTieuHao = n.CaloTieuHao,
                        danhGiaBaiTap = n.DanhGiaBaiTap,
                        ghiChu = n.GhiChu
                    })
                    .ToListAsync();

                return Json(new { success = true, journal });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting exercise journal for user {UserId}", userId);
                return Json(new { success = false, message = "Lỗi khi tải nhật ký" });
            }
        }

        public class AddExercisesRequest
        {
            public int MauTapLuyenId { get; set; }
            public List<int>? BaiTapIds { get; set; } // Nếu null thì thêm tất cả
            public int? Tuan { get; set; }
            public int? NgayTrongTuan { get; set; }
        }

        public class CompleteExerciseRequest
        {
            public int ChiTietId { get; set; }
            public int? SoHiepThucTe { get; set; }
            public int? SoLanThucTe { get; set; }
            public int? ThoiLuongThucTePhut { get; set; }
            public double? CaloTieuHao { get; set; }
            public int? DanhGiaBaiTap { get; set; } // 1-5
            public string? GhiChu { get; set; }
        }
    }
}


