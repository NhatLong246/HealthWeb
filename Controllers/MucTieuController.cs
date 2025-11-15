using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HealthWeb.Models.EF;
using HealthWeb.Models.Entities;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

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
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving muc tieu for user {UserId}", userId);
                return Json(new { success = false, message = "Lỗi khi lưu mục tiêu" });
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

                    // Tính calo tiêu hao dự kiến (ước tính)
                    if (chiTietMau.ThoiLuongPhut.HasValue)
                    {
                        chiTiet.CaloTieuHaoDuKien = (chiTietMau.ThoiLuongPhut.Value / 30.0) * (mauTapLuyen.CaloUocTinh ?? 200);
                    }
                    else if (chiTietMau.SoSets.HasValue && chiTietMau.SoReps.HasValue)
                    {
                        // Ước tính: mỗi set x rep ≈ 5-10 calo
                        chiTiet.CaloTieuHaoDuKien = chiTietMau.SoSets.Value * chiTietMau.SoReps.Value * 7.5;
                    }
                    else
                    {
                        chiTiet.CaloTieuHaoDuKien = mauTapLuyen.CaloUocTinh ?? 200;
                    }

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
        public int MauTapLuyenId { get; set; }
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
}
