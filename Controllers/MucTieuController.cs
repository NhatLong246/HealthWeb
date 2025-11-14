using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HealthWeb.Models.EF;
using HealthWeb.Models.Entities;

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

        [Route("/MucTieu")]
        public IActionResult Index()
        {
            return View("MucTieu");
        }

        // API: Lấy danh sách mẫu tập luyện theo mục tiêu
        [HttpGet("MucTieu/GetMauTapLuyenByMucTieu")]
        public async Task<IActionResult> GetMauTapLuyenByMucTieu(string mucTieu)
        {
            try
            {
                if (string.IsNullOrEmpty(mucTieu))
                {
                    return Json(new { success = false, message = "Mục tiêu không được để trống" });
                }

                _logger.LogInformation("GetMauTapLuyenByMucTieu called with mucTieu: {MucTieu}", mucTieu);

                var mauTapLuyensQuery = await _context.MauTapLuyens
                    .Where(m => m.MucTieu == mucTieu && (m.CongKhai == true || m.DaXacThuc == true))
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

                // Tính scheme (Sets / Reps / Tăng / Tuần) từ bài tập đầu tiên
                var baiTapDau = mauTapLuyen.ChiTietMauTapLuyens.FirstOrDefault();
                var scheme = baiTapDau != null && baiTapDau.SoSets.HasValue && baiTapDau.SoReps.HasValue
                    ? $"{baiTapDau.SoReps} / {baiTapDau.SoSets} - {mauTapLuyen.SoTuan ?? 0} / 1"
                    : $"{mauTapLuyen.SoTuan ?? 0} tuần";

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
                    CaloUocTinh = mauTapLuyen.CaloUocTinh,
                    ThietBiCan = mauTapLuyen.ThietBiCan,
                    DiemTrungBinh = mauTapLuyen.DiemTrungBinh,
                    SoBuoiTap = soBuoiTap,
                    TongThoiGian = tongThoiGian,
                    TongCalo = tongCalo,
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
    }
}
