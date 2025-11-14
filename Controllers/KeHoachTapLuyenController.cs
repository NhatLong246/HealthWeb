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
                        chiTietBaiTap = keHoach.ChiTietKeHoachTapLuyens.Select(c => new
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
                        }).ToList()
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

                return Json(new { success = true, exercises });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting exercises by day for user {UserId}", userId);
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
    }
}


