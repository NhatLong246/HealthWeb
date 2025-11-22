using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HealthWeb.Models.EF;
using HealthWeb.Models.Entities;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

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
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                ViewData["RequireLogin"] = true;
                ViewData["LoginMessage"] = "Vui lòng đăng nhập để sử dụng tính năng này.";
            }
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
                _logger.LogInformation("GetCurrentPlan - KeHoachId: {KeHoachId}, NgayTao: {NgayTao}, Exercise Count: {ExerciseCount}", 
                    keHoach.KeHoachId, keHoach.NgayTao, exerciseCount);
                
                // Log chi tiết NgayTap của các bài tập
                var exercisesWithNgayTap = keHoach.ChiTietKeHoachTapLuyens.Where(c => c.NgayTap.HasValue).ToList();
                var exercisesWithoutNgayTap = keHoach.ChiTietKeHoachTapLuyens.Where(c => !c.NgayTap.HasValue).ToList();
                _logger.LogInformation("GetCurrentPlan - Exercises with NgayTap: {Count}, Without NgayTap: {CountWithout}", 
                    exercisesWithNgayTap.Count, exercisesWithoutNgayTap.Count);
                
                if (exercisesWithNgayTap.Any())
                {
                    var ngayTapList = exercisesWithNgayTap.Select(c => c.NgayTap.Value).Distinct().OrderBy(d => d).ToList();
                    _logger.LogInformation("GetCurrentPlan - NgayTap values: {NgayTapList}", 
                        string.Join(", ", ngayTapList.Select(d => d.ToString("yyyy-MM-dd"))));
                }
                
                if (exercisesWithoutNgayTap.Any())
                {
                    _logger.LogWarning("GetCurrentPlan - Found {Count} exercises without NgayTap (old data), will use fallback calculation", 
                        exercisesWithoutNgayTap.Count);
                }

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
        public async Task<IActionResult> GetExercisesByDay(int? tuan = null, int? ngayTrongTuan = null, string? ngay = null)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Chưa đăng nhập" });
            }

            try
            {
                // Lấy kế hoạch hiện tại để có ngày bắt đầu
                var keHoach = await _context.KeHoachTapLuyens
                    .Include(k => k.MucTieu)
                    .Where(k => k.UserId == userId && k.DangSuDung == true)
                    .OrderByDescending(k => k.NgayTao)
                    .FirstOrDefaultAsync();

                if (keHoach == null)
                {
                    return Json(new { success = false, message = "Chưa có kế hoạch tập luyện" });
                }

                DateOnly? targetDate = null;
                
                // Lấy ngày bắt đầu từ MucTieu
                // QUAN TRỌNG: NgayBatDau đã được lưu là Thứ 2 của tuần đầu tiên (firstMonday) khi save từ preview schedule
                var ngayBatDauPlan = keHoach.MucTieu?.NgayBatDau ?? DateOnly.FromDateTime(keHoach.NgayTao ?? DateTime.Now);
                
                // Verify: đảm bảo NgayBatDau là Thứ 2 (Monday = 1)
                var firstMonday = ngayBatDauPlan;
                var dayOfWeekNgayBatDau = (int)ngayBatDauPlan.DayOfWeek;
                if (dayOfWeekNgayBatDau != 1) // 1 = Monday
                {
                    // Nếu không phải Thứ 2, tính lại về Thứ 2 của tuần chứa ngày đó
                    var ngayTrongTuanBatDau = dayOfWeekNgayBatDau == 0 ? 7 : dayOfWeekNgayBatDau;
                    var daysToMonday = ngayTrongTuanBatDau - 1;
                    firstMonday = ngayBatDauPlan.AddDays(-daysToMonday);
                    _logger.LogWarning("GetExercisesByDay - NgayBatDau {NgayBatDau} is not Monday (DayOfWeek: {DayOfWeek}), adjusted to {FirstMonday}", 
                        ngayBatDauPlan, dayOfWeekNgayBatDau, firstMonday);
                }
                
                _logger.LogInformation("GetExercisesByDay - KeHoach {KeHoachId}: Using firstMonday = {FirstMonday}", 
                    keHoach.KeHoachId, firstMonday);
                
                // Nếu có ngày cụ thể, tính tuần và ngày trong tuần dựa trên firstMonday
                // Logic này PHẢI khớp với logic tính Tuan và NgayTrongTuan khi lưu trong MucTieu
                if (!string.IsNullOrEmpty(ngay) && DateOnly.TryParse(ngay, out var parsedDate))
                {
                    targetDate = parsedDate;
                    
                    // Tính tuần: dựa trên khoảng cách từ firstMonday
                    // Logic PHẢI khớp với MucTieu: Math.floor((dayDate - firstMonday) / 7) + 1
                    if (targetDate >= firstMonday)
                    {
                        var daysDiff = targetDate.Value.DayNumber - firstMonday.DayNumber;
                        // Sử dụng integer division để khớp với Math.floor trong JavaScript
                        var weekIndex = daysDiff / 7; // Tuần 1 = 0, Tuần 2 = 1, ...
                        var calculatedWeek = (int)weekIndex + 1; // Tuần 1 = 1, Tuần 2 = 2, ...
                        
                        // Tính ngày trong tuần (1 = Thứ 2, 7 = Chủ nhật)
                        // Logic PHẢI khớp với MucTieu: dayOfWeek === 0 ? 7 : dayOfWeek
                        var dayOfWeek = (int)targetDate.Value.DayOfWeek;
                        var ngayTrongTuanCalc = dayOfWeek == 0 ? 7 : dayOfWeek;
                        
                        tuan = calculatedWeek;
                        ngayTrongTuan = ngayTrongTuanCalc;
                        
                        _logger.LogInformation("GetExercisesByDay - Date: {Date}, FirstMonday: {FirstMonday}, DaysDiff: {DaysDiff}, CalculatedWeek: {Week}, CalculatedNgayTrongTuan: {Day}", 
                            targetDate, firstMonday, daysDiff, calculatedWeek, ngayTrongTuanCalc);
                    }
                    else
                    {
                        _logger.LogWarning("GetExercisesByDay - Date {Date} is before FirstMonday {FirstMonday}", targetDate, firstMonday);
                    }
                }

                // QUAN TRỌNG: Ưu tiên dùng NgayTap (ngày cụ thể) để query, không cần tính từ Tuan/NgayTrongTuan
                IQueryable<ChiTietKeHoachTapLuyen> query;
                
                if (targetDate.HasValue)
                {
                    // Ưu tiên: Lọc theo NgayTap (ngày cụ thể) nếu có
                    query = _context.ChiTietKeHoachTapLuyens
                        .Include(c => c.KeHoach)
                        .Where(c => c.KeHoachId == keHoach.KeHoachId && c.NgayTap == targetDate.Value);
                    
                    _logger.LogInformation("GetExercisesByDay - Querying by NgayTap: {Ngay}", targetDate.Value);
                    
                    // Thử query với NgayTap trước
                    var exercisesWithNgayTap = await query.ToListAsync();
                    
                    if (exercisesWithNgayTap.Any())
                    {
                        // Tìm thấy bài tập với NgayTap, dùng kết quả này
                        _logger.LogInformation("GetExercisesByDay - Found {Count} exercises with NgayTap", exercisesWithNgayTap.Count);
                    }
                    else
                    {
                        // Fallback: Nếu không có bài tập nào có NgayTap, dùng logic cũ (tính từ Tuan/NgayTrongTuan)
                        // Logic này chỉ dùng cho dữ liệu cũ chưa có NgayTap
                        _logger.LogWarning("GetExercisesByDay - No exercises found with NgayTap, falling back to Tuan/NgayTrongTuan calculation");
                        
                        // Tính lại từ Tuan và NgayTrongTuan (cho dữ liệu cũ)
                        int? calculatedTuan = null;
                        int? calculatedNgayTrongTuan = null;
                        
                        if (targetDate >= firstMonday)
                        {
                            var daysDiff = targetDate.Value.DayNumber - firstMonday.DayNumber;
                            var weekIndex = daysDiff / 7;
                            calculatedTuan = (int)weekIndex + 1;
                            
                            var dayOfWeek = (int)targetDate.Value.DayOfWeek;
                            calculatedNgayTrongTuan = dayOfWeek == 0 ? 7 : dayOfWeek;
                        }
                        
                        query = _context.ChiTietKeHoachTapLuyens
                            .Include(c => c.KeHoach)
                            .Where(c => c.KeHoachId == keHoach.KeHoachId &&
                                       c.NgayTap == null && // Chỉ query dữ liệu cũ
                                       (calculatedTuan == null || c.Tuan == calculatedTuan) &&
                                       (calculatedNgayTrongTuan == null || c.NgayTrongTuan == calculatedNgayTrongTuan));
                    }
                }
                else
                {
                    // Nếu không có ngày cụ thể, lọc theo Tuan và NgayTrongTuan (giữ logic cũ)
                    query = _context.ChiTietKeHoachTapLuyens
                        .Include(c => c.KeHoach)
                        .Where(c => c.KeHoachId == keHoach.KeHoachId);
                    
                    if (tuan.HasValue)
                    {
                        query = query.Where(c => c.Tuan == tuan.Value);
                    }
                    if (ngayTrongTuan.HasValue)
                    {
                        query = query.Where(c => c.NgayTrongTuan == ngayTrongTuan.Value);
                    }
                }

                var filteredExercises = await query
                    .Include(c => c.KeHoach)
                        .ThenInclude(k => k.MucTieu)
                    .ToListAsync();

                // Load tất cả MucTieuChonBaiTap và ChiTietMauTapLuyen để tìm videoUrl
                var mucTieuId = filteredExercises.FirstOrDefault()?.KeHoach?.MucTieuId;
                Dictionary<string, string?> videoUrlMap = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
                
                if (mucTieuId != null)
                {
                    _logger.LogInformation("GetExercisesByDay - Loading videoUrl from ChiTietMauTapLuyen for MucTieuId: {MucTieuId}", mucTieuId);
                    
                    var mucTieuChonBaiTaps = await _context.MucTieuChonBaiTaps
                        .Include(m => m.MauTapLuyen)
                        .ThenInclude(m => m.ChiTietMauTapLuyens)
                        .Where(m => m.MucTieuId == mucTieuId)
                        .ToListAsync();
                    
                    _logger.LogInformation("GetExercisesByDay - Found {Count} MucTieuChonBaiTap records", mucTieuChonBaiTaps.Count);
                    
                    foreach (var chonBaiTap in mucTieuChonBaiTaps)
                    {
                        _logger.LogInformation("GetExercisesByDay - Processing MauTapLuyen: {MauTapLuyenId}, TenMauTapLuyen: {TenMauTapLuyen}, ChiTietCount: {ChiTietCount}",
                            chonBaiTap.MauTapLuyen.MauTapLuyenId, chonBaiTap.MauTapLuyen.TenMauTapLuyen, chonBaiTap.MauTapLuyen.ChiTietMauTapLuyens.Count);
                        
                        foreach (var chiTietMau in chonBaiTap.MauTapLuyen.ChiTietMauTapLuyens)
                        {
                            if (!string.IsNullOrEmpty(chiTietMau.VideoUrl))
                            {
                                // Lưu videoUrl theo tên bài tập (case-insensitive)
                                var tenBaiTapKey = chiTietMau.TenbaiTap?.Trim() ?? "";
                                if (!string.IsNullOrEmpty(tenBaiTapKey))
                                {
                                    videoUrlMap[tenBaiTapKey] = chiTietMau.VideoUrl;
                                    _logger.LogInformation("GetExercisesByDay - Added videoUrl to map: TenBaiTap={TenBaiTap}, VideoUrl={VideoUrl}",
                                        tenBaiTapKey, chiTietMau.VideoUrl);
                                }
                            }
                        }
                    }
                    
                    _logger.LogInformation("GetExercisesByDay - VideoUrlMap contains {Count} entries", videoUrlMap.Count);
                }
                else
                {
                    _logger.LogWarning("GetExercisesByDay - MucTieuId is null, cannot load videoUrl from ChiTietMauTapLuyen");
                }

                // Kiểm tra xem buổi tập đã hoàn thành chưa (tất cả bài tập trong ngày đã có nhật ký hoàn thành)
                var today = targetDate ?? DateOnly.FromDateTime(DateTime.Now);
                var chiTietIds = filteredExercises.Select(c => c.ChiTietId).ToList();
                
                _logger.LogInformation("GetExercisesByDay - Checking completion status for date: {Today}, UserId: {UserId}, ChiTietIds: {ChiTietIds}", 
                    today, userId, string.Join(", ", chiTietIds));
                
                // Load tất cả nhật ký hoàn thành cho các bài tập trong ngày
                var completedChiTietIds = await _context.NhatKyHoanThanhBaiTaps
                    .Where(n => n.UserId == userId && 
                               chiTietIds.Contains(n.ChiTietId) && 
                               n.NgayHoanThanh == today)
                    .Select(n => n.ChiTietId)
                    .Distinct()
                    .ToListAsync();
                
                // Log chi tiết để debug
                _logger.LogInformation("GetExercisesByDay - Completion check: Total exercises: {Total}, Completed: {Completed}, ChiTietIds: {ChiTietIds}", 
                    chiTietIds.Count, completedChiTietIds.Count, string.Join(", ", completedChiTietIds));
                
                // Kiểm tra từng chiTietId xem có trong database không
                foreach (var chiTietId in chiTietIds)
                {
                    var hasRecord = await _context.NhatKyHoanThanhBaiTaps
                        .AnyAsync(n => n.UserId == userId && 
                                      n.ChiTietId == chiTietId && 
                                      n.NgayHoanThanh == today);
                    if (!hasRecord)
                    {
                        _logger.LogWarning("GetExercisesByDay - ChiTietId {ChiTietId} has NO completion record for date {Today}", 
                            chiTietId, today);
                    }
                    else
                    {
                        var record = await _context.NhatKyHoanThanhBaiTaps
                            .FirstOrDefaultAsync(n => n.UserId == userId && 
                                                      n.ChiTietId == chiTietId && 
                                                      n.NgayHoanThanh == today);
                        _logger.LogInformation("GetExercisesByDay - ChiTietId {ChiTietId} HAS completion record: NgayHoanThanh={NgayHoanThanh}, NhatKyId={NhatKyId}", 
                            chiTietId, record?.NgayHoanThanh, record?.NhatKyId);
                    }
                }
                
                var isWorkoutCompleted = chiTietIds.Count > 0 && completedChiTietIds.Count == chiTietIds.Count;
                
                _logger.LogInformation("GetExercisesByDay - Final isWorkoutCompleted: {IsWorkoutCompleted} (Total: {Total}, Completed: {Completed})", 
                    isWorkoutCompleted, chiTietIds.Count, completedChiTietIds.Count);

                var exercises = filteredExercises
                    .OrderBy(c => c.ThuTuHienThi)
                    .Select(c => {
                        // Kiểm tra xem bài tập này đã hoàn thành chưa
                        var isExerciseCompleted = completedChiTietIds.Contains(c.ChiTietId);
                        
                        // Ưu tiên lấy videoUrl từ ChiTietMauTapLuyen, sau đó từ ChiTietKeHoachTapLuyen
                        string? videoUrl = null;
                        var tenBaiTapKey = c.TenBaiTap?.Trim() ?? "";
                        
                        // Tìm trong videoUrlMap (case-insensitive và partial match)
                        if (!string.IsNullOrEmpty(tenBaiTapKey))
                        {
                            // Thử tìm chính xác trước
                            if (videoUrlMap.ContainsKey(tenBaiTapKey))
                            {
                                videoUrl = videoUrlMap[tenBaiTapKey];
                                _logger.LogInformation("GetExercisesByDay - Found videoUrl from map (exact match): TenBaiTap={TenBaiTap}, VideoUrl={VideoUrl}",
                                    tenBaiTapKey, videoUrl);
                            }
                            else
                            {
                                // Thử tìm case-insensitive
                                var matchedKey = videoUrlMap.Keys.FirstOrDefault(k => 
                                    string.Equals(k, tenBaiTapKey, StringComparison.OrdinalIgnoreCase));
                                if (matchedKey != null)
                                {
                                    videoUrl = videoUrlMap[matchedKey];
                                    _logger.LogInformation("GetExercisesByDay - Found videoUrl from map (case-insensitive): TenBaiTap={TenBaiTap}, MatchedKey={MatchedKey}, VideoUrl={VideoUrl}",
                                        tenBaiTapKey, matchedKey, videoUrl);
                                }
                                else
                                {
                                    // Thử tìm partial match (tên bài tập có thể có thêm phần mở rộng như "(Vrksasana)")
                                    // Ví dụ: "Yoga - Tư Thế Cây" sẽ match với "Yoga - Tư Thế Cây (Vrksasana)"
                                    matchedKey = videoUrlMap.Keys.FirstOrDefault(k => 
                                        k.Contains(tenBaiTapKey, StringComparison.OrdinalIgnoreCase) ||
                                        tenBaiTapKey.Contains(k, StringComparison.OrdinalIgnoreCase));
                                    if (matchedKey != null)
                                    {
                                        videoUrl = videoUrlMap[matchedKey];
                                        _logger.LogInformation("GetExercisesByDay - Found videoUrl from map (partial match): TenBaiTap={TenBaiTap}, MatchedKey={MatchedKey}, VideoUrl={VideoUrl}",
                                            tenBaiTapKey, matchedKey, videoUrl);
                                    }
                                }
                            }
                        }
                        
                        // Fallback: Lấy từ ChiTietKeHoachTapLuyen
                        if (string.IsNullOrEmpty(videoUrl))
                        {
                            videoUrl = c.VideoUrl;
                            if (!string.IsNullOrEmpty(videoUrl))
                            {
                                _logger.LogInformation("GetExercisesByDay - Using videoUrl from ChiTietKeHoachTapLuyen: TenBaiTap={TenBaiTap}, VideoUrl={VideoUrl}",
                                    tenBaiTapKey, videoUrl);
                            }
                            else
                            {
                                _logger.LogWarning("GetExercisesByDay - No videoUrl found for: TenBaiTap={TenBaiTap}, VideoUrlMapCount={VideoUrlMapCount}",
                                    tenBaiTapKey, videoUrlMap.Count);
                            }
                        }
                        
                        // Parse LichTap từ CanhBao hoặc NoiDung nếu có
                        object? lichTap = null;
                        
                        // Thử parse từ CanhBao trước
                        if (!string.IsNullOrEmpty(c.CanhBao))
                        {
                            try
                            {
                                // Kiểm tra xem có phải JSON không
                                if (c.CanhBao.Trim().StartsWith("{") || c.CanhBao.Trim().StartsWith("["))
                                {
                                    var canhBaoJson = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(c.CanhBao);
                                    if (canhBaoJson.TryGetProperty("LichTap", out var lichTapElement))
                                    {
                                        lichTap = System.Text.Json.JsonSerializer.Deserialize<object>(lichTapElement.GetRawText());
                                        _logger.LogInformation("GetExercisesByDay - Parsed LichTap from CanhBao for {TenBaiTap}: {LichTap}", 
                                            c.TenBaiTap, System.Text.Json.JsonSerializer.Serialize(lichTap));
                                    }
                                }
                            }
                            catch (System.Text.Json.JsonException)
                            {
                                // CanhBao không phải JSON hợp lệ (có thể là plain text), thử NoiDung
                                _logger.LogWarning("GetExercisesByDay - CanhBao for {TenBaiTap} is not valid JSON, trying NoiDung", c.TenBaiTap);
                            }
                        }
                        
                        // Nếu không tìm thấy trong CanhBao, thử parse từ NoiDung
                        if (lichTap == null && !string.IsNullOrEmpty(c.NoiDung))
                        {
                            try
                            {
                                // Kiểm tra xem có phải JSON không
                                if (c.NoiDung.Trim().StartsWith("{") || c.NoiDung.Trim().StartsWith("["))
                                {
                                    var noiDungJson = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(c.NoiDung);
                                    if (noiDungJson.TryGetProperty("LichTap", out var lichTapElement))
                                    {
                                        lichTap = System.Text.Json.JsonSerializer.Deserialize<object>(lichTapElement.GetRawText());
                                        _logger.LogInformation("GetExercisesByDay - Parsed LichTap from NoiDung for {TenBaiTap}: {LichTap}", 
                                            c.TenBaiTap, System.Text.Json.JsonSerializer.Serialize(lichTap));
                                    }
                                }
                                // Nếu NoiDung chứa nhiều phần (separated by |), tìm phần có LichTap
                                else if (c.NoiDung.Contains("|") && c.NoiDung.Contains("LichTap"))
                                {
                                    var parts = c.NoiDung.Split('|');
                                    foreach (var part in parts)
                                    {
                                        var trimmedPart = part.Trim();
                                        if (trimmedPart.StartsWith("{") && trimmedPart.Contains("LichTap"))
                                        {
                                            try
                                            {
                                                var partJson = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(trimmedPart);
                                                if (partJson.TryGetProperty("LichTap", out var lichTapElement))
                                                {
                                                    lichTap = System.Text.Json.JsonSerializer.Deserialize<object>(lichTapElement.GetRawText());
                                                    _logger.LogInformation("GetExercisesByDay - Parsed LichTap from NoiDung (multi-part) for {TenBaiTap}: {LichTap}", 
                                                        c.TenBaiTap, System.Text.Json.JsonSerializer.Serialize(lichTap));
                                                    break;
                                                }
                                            }
                                            catch
                                            {
                                                // Continue to next part
                                            }
                                        }
                                    }
                                }
                            }
                            catch (System.Text.Json.JsonException)
                            {
                                // NoiDung cũng không phải JSON hợp lệ
                                _logger.LogWarning("GetExercisesByDay - NoiDung for {TenBaiTap} is not valid JSON either", c.TenBaiTap);
                            }
                        }
                        
                        return new
                        {
                            chiTietId = c.ChiTietId,
                            tenBaiTap = c.TenBaiTap,
                            soHiep = c.SoHiep,
                            soLan = c.SoLan,
                            caloTieuHaoDuKien = c.CaloTieuHaoDuKien,
                            thoiGianPhut = c.ThoiGianPhut,
                            ngayTrongTuan = c.NgayTrongTuan,
                            tuan = c.Tuan,
                            videoUrl = videoUrl,
                            canhBao = c.CanhBao, // Giữ nguyên để tương thích
                            lichTap = lichTap, // Parse sẵn LichTap từ CanhBao
                            noiDung = c.NoiDung,
                            huongDan = c.HuongDan,
                            danhGiaDoKho = c.DanhGiaDoKho,
                            danhGiaHieuQua = c.DanhGiaHieuQua,
                            isCompleted = isExerciseCompleted
                        };
                    })
                    .ToList();

                // Log để debug - chi tiết từng bài tập
                _logger.LogInformation("GetExercisesByDay - UserId: {UserId}, Tuan: {Tuan}, NgayTrongTuan: {NgayTrongTuan}, Ngay: {Ngay}, Count: {Count}", 
                    userId, tuan, ngayTrongTuan, ngay, exercises.Count);
                
                foreach (var ex in exercises)
                {
                    _logger.LogInformation("GetExercisesByDay - Exercise: {TenBaiTap}, Tuan: {Tuan}, NgayTrongTuan: {NgayTrongTuan}, VideoUrl: {VideoUrl}, IsCompleted: {IsCompleted}", 
                        ex.tenBaiTap, ex.tuan, ex.ngayTrongTuan, ex.videoUrl, ex.isCompleted);
                }

                _logger.LogInformation("GetExercisesByDay - Date: {Ngay}, Total exercises: {Count}, Completed exercises: {CompletedCount}, IsWorkoutCompleted: {IsWorkoutCompleted}", 
                    today, chiTietIds.Count, completedChiTietIds.Count, isWorkoutCompleted);
                
                // Log chi tiết các chiTietId đã hoàn thành
                if (completedChiTietIds.Any())
                {
                    _logger.LogInformation("GetExercisesByDay - Completed ChiTietIds: {ChiTietIds}", 
                        string.Join(", ", completedChiTietIds));
                }
                else
                {
                    _logger.LogWarning("GetExercisesByDay - No completed exercises found for date {Ngay}", today);
                }

                return Json(new { 
                    success = true, 
                    exercises, 
                    count = exercises.Count, 
                    tuan, 
                    ngayTrongTuan,
                    isWorkoutCompleted = isWorkoutCompleted // Trạng thái hoàn thành của cả buổi tập
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting exercises by day for user {UserId}", userId);
                return Json(new { success = false, message = "Lỗi khi tải dữ liệu" });
            }
        }

        // API: Lấy thông tin chi tiết của một bài tập
        [HttpGet("KeHoachTapLuyen/GetExerciseDetail")]
        public async Task<IActionResult> GetExerciseDetail(int chiTietId)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("GetExerciseDetail - User not logged in");
                return Json(new { success = false, message = "Chưa đăng nhập" });
            }

            try
            {
                _logger.LogInformation("GetExerciseDetail - Request for chiTietId: {ChiTietId}, UserId: {UserId}", chiTietId, userId);
                
                var chiTiet = await _context.ChiTietKeHoachTapLuyens
                    .Include(c => c.KeHoach)
                    .ThenInclude(k => k.MucTieu)
                    .Where(c => c.ChiTietId == chiTietId && c.KeHoach.UserId == userId && c.KeHoach.DangSuDung == true)
                    .FirstOrDefaultAsync();

                if (chiTiet == null)
                {
                    _logger.LogWarning("GetExerciseDetail - Exercise not found: chiTietId={ChiTietId}, userId={UserId}", chiTietId, userId);
                    return Json(new { success = false, message = "Không tìm thấy bài tập" });
                }

                _logger.LogInformation("GetExerciseDetail - Found exercise: TenBaiTap={TenBaiTap}, SoHiep={SoHiep}, SoLan={SoLan}, ThoiGianPhut={ThoiGianPhut}, CaloTieuHaoDuKien={CaloTieuHaoDuKien}, DanhGiaDoKho={DanhGiaDoKho}, DanhGiaHieuQua={DanhGiaHieuQua}, VideoUrl={VideoUrl}, NoiDung={NoiDung}, HuongDan={HuongDan}",
                    chiTiet.TenBaiTap, chiTiet.SoHiep, chiTiet.SoLan, chiTiet.ThoiGianPhut, chiTiet.CaloTieuHaoDuKien, chiTiet.DanhGiaDoKho, chiTiet.DanhGiaHieuQua, chiTiet.VideoUrl, chiTiet.NoiDung, chiTiet.HuongDan);

                // Tìm MauTapLuyen từ MucTieuChonBaiTap để lấy dữ liệu đầy đủ
                MauTapLuyen? mauTapLuyen = null;
                ChiTietMauTapLuyen? chiTietMau = null;
                
                _logger.LogInformation("GetExerciseDetail - Searching for MauTapLuyen: MucTieuId={MucTieuId}, TenBaiTap={TenBaiTap}",
                    chiTiet.KeHoach.MucTieuId, chiTiet.TenBaiTap);
                
                if (chiTiet.KeHoach.MucTieuId != null)
                {
                    // Tìm MauTapLuyen từ MucTieuChonBaiTap dựa trên TenBaiTap
                    var mucTieuChonBaiTap = await _context.MucTieuChonBaiTaps
                        .Include(m => m.MauTapLuyen)
                        .ThenInclude(m => m.ChiTietMauTapLuyens)
                        .Where(m => m.MucTieuId == chiTiet.KeHoach.MucTieuId)
                        .ToListAsync();
                    
                    _logger.LogInformation("GetExerciseDetail - Found {Count} MucTieuChonBaiTap records for MucTieuId={MucTieuId}",
                        mucTieuChonBaiTap.Count, chiTiet.KeHoach.MucTieuId);
                    
                    // Tìm MauTapLuyen có ChiTietMauTapLuyen trùng tên với chiTiet.TenBaiTap
                    foreach (var chonBaiTap in mucTieuChonBaiTap)
                    {
                        _logger.LogInformation("GetExerciseDetail - Checking MauTapLuyen: MauTapLuyenId={MauTapLuyenId}, TenMauTapLuyen={TenMauTapLuyen}, ChiTietCount={ChiTietCount}",
                            chonBaiTap.MauTapLuyen.MauTapLuyenId, chonBaiTap.MauTapLuyen.TenMauTapLuyen, chonBaiTap.MauTapLuyen.ChiTietMauTapLuyens.Count);
                        
                        // Tìm theo tên chính xác trước
                        chiTietMau = chonBaiTap.MauTapLuyen.ChiTietMauTapLuyens
                            .FirstOrDefault(c => c.TenbaiTap == chiTiet.TenBaiTap);
                        
                        // Nếu không tìm thấy, thử tìm theo tên tương tự (case-insensitive)
                        if (chiTietMau == null)
                        {
                            chiTietMau = chonBaiTap.MauTapLuyen.ChiTietMauTapLuyens
                                .FirstOrDefault(c => c.TenbaiTap.Equals(chiTiet.TenBaiTap, StringComparison.OrdinalIgnoreCase));
                        }
                        
                        // Nếu vẫn không tìm thấy, thử tìm theo tên chứa (contains)
                        if (chiTietMau == null)
                        {
                            chiTietMau = chonBaiTap.MauTapLuyen.ChiTietMauTapLuyens
                                .FirstOrDefault(c => c.TenbaiTap.Contains(chiTiet.TenBaiTap) || chiTiet.TenBaiTap.Contains(c.TenbaiTap));
                        }
                        
                        if (chiTietMau != null)
                        {
                            mauTapLuyen = chonBaiTap.MauTapLuyen;
                            _logger.LogInformation("GetExerciseDetail - Found MauTapLuyen: MauTapLuyenId={MauTapLuyenId}, TenMauTapLuyen={TenMauTapLuyen}, ChiTietMau TenbaiTap={TenbaiTap}",
                                mauTapLuyen.MauTapLuyenId, mauTapLuyen.TenMauTapLuyen, chiTietMau.TenbaiTap);
                            break;
                        }
                    }
                    
                    if (mauTapLuyen == null)
                    {
                        _logger.LogWarning("GetExerciseDetail - MauTapLuyen not found via MucTieuChonBaiTap for TenBaiTap={TenBaiTap}, MucTieuId={MucTieuId}. Trying direct search...",
                            chiTiet.TenBaiTap, chiTiet.KeHoach.MucTieuId);
                        
                        // Thử tìm trực tiếp từ MauTapLuyen dựa trên TenBaiTap (tìm trong tất cả MauTapLuyen có ChiTietMauTapLuyen trùng tên)
                        var allMauTapLuyens = await _context.MauTapLuyens
                            .Include(m => m.ChiTietMauTapLuyens)
                            .Where(m => m.ChiTietMauTapLuyens.Any(c => c.TenbaiTap == chiTiet.TenBaiTap || 
                                c.TenbaiTap.Equals(chiTiet.TenBaiTap, StringComparison.OrdinalIgnoreCase)))
                            .ToListAsync();
                        
                        if (allMauTapLuyens.Any())
                        {
                            // Ưu tiên MauTapLuyen có SoLanSuDung cao nhất (phổ biến nhất)
                            mauTapLuyen = allMauTapLuyens
                                .OrderByDescending(m => m.SoLanSuDung ?? 0)
                                .FirstOrDefault();
                            
                            if (mauTapLuyen != null)
                            {
                                chiTietMau = mauTapLuyen.ChiTietMauTapLuyens
                                    .FirstOrDefault(c => c.TenbaiTap == chiTiet.TenBaiTap || 
                                        c.TenbaiTap.Equals(chiTiet.TenBaiTap, StringComparison.OrdinalIgnoreCase));
                                
                                _logger.LogInformation("GetExerciseDetail - Found MauTapLuyen via direct search: MauTapLuyenId={MauTapLuyenId}, TenMauTapLuyen={TenMauTapLuyen}",
                                    mauTapLuyen.MauTapLuyenId, mauTapLuyen.TenMauTapLuyen);
                            }
                        }
                    }
                }
                else
                {
                    _logger.LogWarning("GetExerciseDetail - KeHoach.MucTieuId is null, trying direct search for MauTapLuyen...");
                    
                    // Thử tìm trực tiếp từ MauTapLuyen dựa trên TenBaiTap
                    var allMauTapLuyens = await _context.MauTapLuyens
                        .Include(m => m.ChiTietMauTapLuyens)
                        .Where(m => m.ChiTietMauTapLuyens.Any(c => c.TenbaiTap == chiTiet.TenBaiTap || 
                            c.TenbaiTap.Equals(chiTiet.TenBaiTap, StringComparison.OrdinalIgnoreCase)))
                        .ToListAsync();
                    
                    if (allMauTapLuyens.Any())
                    {
                        mauTapLuyen = allMauTapLuyens
                            .OrderByDescending(m => m.SoLanSuDung ?? 0)
                            .FirstOrDefault();
                        
                        if (mauTapLuyen != null)
                        {
                            chiTietMau = mauTapLuyen.ChiTietMauTapLuyens
                                .FirstOrDefault(c => c.TenbaiTap == chiTiet.TenBaiTap || 
                                    c.TenbaiTap.Equals(chiTiet.TenBaiTap, StringComparison.OrdinalIgnoreCase));
                            
                            _logger.LogInformation("GetExerciseDetail - Found MauTapLuyen via direct search (no MucTieuId): MauTapLuyenId={MauTapLuyenId}, TenMauTapLuyen={TenMauTapLuyen}",
                                mauTapLuyen.MauTapLuyenId, mauTapLuyen.TenMauTapLuyen);
                        }
                    }
                }

                // Tính toán các metrics - Ưu tiên dữ liệu từ MauTapLuyen nếu có
                // Số buổi tập: Tính từ MauTapLuyen nếu có, nếu không thì dùng soHiep
                var soBuoiTap = 0;
                if (mauTapLuyen != null)
                {
                    // Tính số buổi tập từ MauTapLuyen (tương tự GetChiTietMauTapLuyen)
                    var soNgayTrongTuan = mauTapLuyen.ChiTietMauTapLuyens
                        .Where(c => c.Tuan == 1)
                        .Select(c => c.NgayTrongTuan)
                        .Where(ngay => ngay.HasValue)
                        .Distinct()
                        .Count();
                    var soBuoiMoiTuan = soNgayTrongTuan > 0 ? soNgayTrongTuan : 3;
                    soBuoiTap = (mauTapLuyen.SoTuan ?? 0) * soBuoiMoiTuan;
                }
                else
                {
                    soBuoiTap = chiTiet.SoHiep ?? 0;
                }
                
                // Thời lượng phút: Ưu tiên từ chiTietMau, sau đó từ chiTiet
                var thoiLuongPhut = chiTietMau?.ThoiLuongPhut ?? chiTiet.ThoiGianPhut ?? 0;
                
                // Hiệu quả: Ưu tiên từ MauTapLuyen.DiemTrungBinh, sau đó từ DanhGiaHieuQua
                var hieuQua = "Trung bình";
                if (mauTapLuyen != null && mauTapLuyen.DiemTrungBinh.HasValue)
                {
                    hieuQua = mauTapLuyen.DiemTrungBinh >= 4.5 ? "Tốt"
                        : mauTapLuyen.DiemTrungBinh >= 3.5 ? "Khá"
                        : mauTapLuyen.DiemTrungBinh >= 2.5 ? "Trung bình"
                        : "Cần cải thiện";
                }
                else if (chiTiet.DanhGiaHieuQua.HasValue)
                {
                    hieuQua = chiTiet.DanhGiaHieuQua >= 4.5 ? "Tốt"
                        : chiTiet.DanhGiaHieuQua >= 3.5 ? "Khá"
                        : chiTiet.DanhGiaHieuQua >= 2.5 ? "Trung bình"
                        : "Cần cải thiện";
                }
                
                // Calo/buổi: Ưu tiên từ MauTapLuyen.CaloUocTinh, sau đó từ CaloTieuHaoDuKien
                var caloUocTinh = mauTapLuyen?.CaloUocTinh ?? chiTiet.CaloTieuHaoDuKien ?? 0;
                
                // Sets - Reps: Ưu tiên từ chiTietMau, sau đó từ chiTiet
                var scheme = "-";
                if (chiTietMau != null && chiTietMau.SoSets.HasValue && chiTietMau.SoReps.HasValue)
                {
                    scheme = $"{chiTietMau.SoSets}-{chiTietMau.SoReps}";
                }
                else if (chiTietMau != null && chiTietMau.SoSets.HasValue)
                {
                    scheme = $"{chiTietMau.SoSets}-0";
                }
                else if (chiTietMau != null && chiTietMau.SoReps.HasValue)
                {
                    scheme = $"0-{chiTietMau.SoReps}";
                }
                else if (chiTiet.SoHiep.HasValue && chiTiet.SoLan.HasValue)
                {
                    scheme = $"{chiTiet.SoHiep}-{chiTiet.SoLan}";
                }
                else if (chiTiet.SoHiep.HasValue)
                {
                    scheme = $"{chiTiet.SoHiep}-0";
                }
                else if (chiTiet.SoLan.HasValue)
                {
                    scheme = $"0-{chiTiet.SoLan}";
                }
                
                // Mức độ: Ưu tiên từ MauTapLuyen.DoKho, sau đó từ DanhGiaDoKho
                var doKho = "Trung bình";
                if (mauTapLuyen != null && !string.IsNullOrEmpty(mauTapLuyen.DoKho))
                {
                    doKho = mauTapLuyen.DoKho switch
                    {
                        "Beginner" => "Dễ",
                        "Intermediate" => "Trung bình",
                        "Advanced" => "Khó",
                        _ => "Trung bình"
                    };
                }
                else if (chiTiet.DanhGiaDoKho.HasValue)
                {
                    doKho = chiTiet.DanhGiaDoKho >= 4 ? "Khó"
                        : chiTiet.DanhGiaDoKho >= 3 ? "Trung bình"
                        : "Dễ";
                }
                
                // VideoUrl: Ưu tiên từ chiTietMau, sau đó từ chiTiet
                var videoUrl = chiTietMau?.VideoUrl ?? chiTiet.VideoUrl;
                
                // NoiDung và HuongDan: Ưu tiên từ chiTietMau, sau đó từ chiTiet
                var noiDung = chiTietMau?.GhiChu ?? chiTiet.NoiDung;
                var huongDan = chiTietMau?.GhiChu ?? chiTiet.HuongDan;

                var exercise = new
                {
                    chiTietId = chiTiet.ChiTietId,
                    tenBaiTap = chiTiet.TenBaiTap,
                    soHiep = chiTietMau?.SoSets ?? chiTiet.SoHiep ?? 0,
                    soLan = chiTietMau?.SoReps ?? chiTiet.SoLan ?? 0,
                    caloTieuHaoDuKien = caloUocTinh,
                    thoiGianPhut = thoiLuongPhut,
                    ngayTrongTuan = chiTiet.NgayTrongTuan,
                    tuan = chiTiet.Tuan,
                    videoUrl = videoUrl,
                    canhBao = chiTiet.CanhBao,
                    noiDung = noiDung,
                    huongDan = huongDan,
                    danhGiaDoKho = chiTiet.DanhGiaDoKho,
                    danhGiaHieuQua = chiTiet.DanhGiaHieuQua,
                    // Thêm các metrics đã tính toán
                    soBuoiTap = soBuoiTap,
                    hieuQua = hieuQua,
                    scheme = scheme,
                    doKho = doKho,
                    // Thêm thông tin từ MauTapLuyen nếu có
                    thietBiCan = mauTapLuyen?.ThietBiCan,
                    soTuan = mauTapLuyen?.SoTuan,
                    soLanSuDung = mauTapLuyen?.SoLanSuDung,
                    moTa = mauTapLuyen?.MoTa
                };

                _logger.LogInformation("GetExerciseDetail - Calculated metrics: SoBuoiTap={SoBuoiTap}, ThoiLuongPhut={ThoiLuongPhut}, HieuQua={HieuQua}, CaloUocTinh={CaloUocTinh}, Scheme={Scheme}, DoKho={DoKho}",
                    soBuoiTap, thoiLuongPhut, hieuQua, caloUocTinh, scheme, doKho);
                
                _logger.LogInformation("GetExerciseDetail - MauTapLuyen found: {Found}, MauTapLuyenId: {MauTapLuyenId}, ChiTietMau found: {ChiTietMauFound}",
                    mauTapLuyen != null, mauTapLuyen?.MauTapLuyenId, chiTietMau != null);
                
                if (mauTapLuyen != null)
                {
                    _logger.LogInformation("GetExerciseDetail - MauTapLuyen data: TenMauTapLuyen={TenMauTapLuyen}, SoTuan={SoTuan}, CaloUocTinh={CaloUocTinh}, DiemTrungBinh={DiemTrungBinh}, DoKho={DoKho}, ThietBiCan={ThietBiCan}, SoLanSuDung={SoLanSuDung}, MoTa={MoTa}",
                        mauTapLuyen.TenMauTapLuyen, mauTapLuyen.SoTuan, mauTapLuyen.CaloUocTinh, mauTapLuyen.DiemTrungBinh, mauTapLuyen.DoKho, mauTapLuyen.ThietBiCan, mauTapLuyen.SoLanSuDung, mauTapLuyen.MoTa);
                }
                
                if (chiTietMau != null)
                {
                    _logger.LogInformation("GetExerciseDetail - ChiTietMau data: TenbaiTap={TenbaiTap}, SoSets={SoSets}, SoReps={SoReps}, ThoiLuongPhut={ThoiLuongPhut}, VideoUrl={VideoUrl}, GhiChu={GhiChu}",
                        chiTietMau.TenbaiTap, chiTietMau.SoSets, chiTietMau.SoReps, chiTietMau.ThoiLuongPhut, chiTietMau.VideoUrl, chiTietMau.GhiChu);
                }

                return Json(new { success = true, exercise });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting exercise detail for chiTietId {ChiTietId}", chiTietId);
                return Json(new { success = false, message = "Lỗi khi tải dữ liệu" });
            }
        }
        
        // API: Test - Kiểm tra dữ liệu trong database
        [HttpGet("KeHoachTapLuyen/TestExerciseData")]
        public async Task<IActionResult> TestExerciseData(int chiTietId)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Chưa đăng nhập" });
            }

            try
            {
                var chiTiet = await _context.ChiTietKeHoachTapLuyens
                    .Include(c => c.KeHoach)
                    .ThenInclude(k => k.MucTieu)
                    .Where(c => c.ChiTietId == chiTietId && c.KeHoach.UserId == userId)
                    .FirstOrDefaultAsync();

                if (chiTiet == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy bài tập" });
                }

                var rawData = new
                {
                    chiTietId = chiTiet.ChiTietId,
                    tenBaiTap = chiTiet.TenBaiTap,
                    soHiep = chiTiet.SoHiep,
                    soLan = chiTiet.SoLan,
                    thoiGianPhut = chiTiet.ThoiGianPhut,
                    caloTieuHaoDuKien = chiTiet.CaloTieuHaoDuKien,
                    danhGiaDoKho = chiTiet.DanhGiaDoKho,
                    danhGiaHieuQua = chiTiet.DanhGiaHieuQua,
                    videoUrl = chiTiet.VideoUrl,
                    noiDung = chiTiet.NoiDung,
                    huongDan = chiTiet.HuongDan,
                    mucTieuId = chiTiet.KeHoach.MucTieuId
                };

                return Json(new { success = true, rawData });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in TestExerciseData for chiTietId {ChiTietId}", chiTietId);
                return Json(new { success = false, message = ex.Message });
            }
        }
        
        // API: Lấy thông tin ngày đã tập và ngày có lịch tập
        [HttpGet("KeHoachTapLuyen/GetScheduleInfo")]
        public async Task<IActionResult> GetScheduleInfo(string? startDate = null, string? endDate = null)
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
                    .Include(k => k.MucTieu)
                    .Include(k => k.ChiTietKeHoachTapLuyens)
                    .Where(k => k.UserId == userId && k.DangSuDung == true)
                    .OrderByDescending(k => k.NgayTao)
                    .FirstOrDefaultAsync();

                if (keHoach == null)
                {
                    return Json(new { success = false, message = "Chưa có kế hoạch tập luyện" });
                }

                // Lấy ngày bắt đầu từ MucTieu
                // QUAN TRỌNG: NgayBatDau đã được lưu là Thứ 2 của tuần đầu tiên (firstMonday) khi save từ preview schedule
                var ngayBatDau = keHoach.MucTieu?.NgayBatDau ?? DateOnly.FromDateTime(keHoach.NgayTao ?? DateTime.Now);
                
                // Verify: đảm bảo NgayBatDau là Thứ 2 (Monday = 1)
                // Nếu không phải Thứ 2, có thể có lỗi trong quá trình lưu - tính lại về Thứ 2 của tuần chứa ngày đó
                var dayOfWeekNgayBatDau = (int)ngayBatDau.DayOfWeek;
                if (dayOfWeekNgayBatDau != 1) // 1 = Monday
                {
                    // Nếu không phải Thứ 2, tính lại về Thứ 2 của tuần chứa ngày đó
                    var ngayTrongTuanBatDau = dayOfWeekNgayBatDau == 0 ? 7 : dayOfWeekNgayBatDau;
                    var daysToMonday = ngayTrongTuanBatDau - 1;
                    var ngayBatDauAdjusted = ngayBatDau.AddDays(-daysToMonday);
                    
                    _logger.LogWarning("GetScheduleInfo - KeHoach {KeHoachId}: NgayBatDau {NgayBatDau} is not Monday (DayOfWeek: {DayOfWeek}), adjusted to {AdjustedNgayBatDau}", 
                        keHoach.KeHoachId, ngayBatDau, dayOfWeekNgayBatDau, ngayBatDauAdjusted);
                    
                    // Cập nhật NgayBatDau trong MucTieu nếu cần (sửa lỗi)
                    if (keHoach.MucTieu != null)
                    {
                        keHoach.MucTieu.NgayBatDau = ngayBatDauAdjusted;
                        try
                        {
                            await _context.SaveChangesAsync();
                            _logger.LogInformation("Updated MucTieu.NgayBatDau to {NgayBatDau} for KeHoach {KeHoachId}", 
                                ngayBatDauAdjusted, keHoach.KeHoachId);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Failed to update MucTieu.NgayBatDau for KeHoach {KeHoachId}", keHoach.KeHoachId);
                        }
                    }
                    
                    ngayBatDau = ngayBatDauAdjusted;
                }
                
                _logger.LogInformation("GetScheduleInfo - KeHoach {KeHoachId}: Using NgayBatDau (firstMonday) = {NgayBatDau}", 
                    keHoach.KeHoachId, ngayBatDau);
                
                // Parse date range nếu có
                DateOnly start = ngayBatDau;
                DateOnly end = ngayBatDau.AddDays((keHoach.SoTuan ?? 8) * 7);
                
                if (!string.IsNullOrEmpty(startDate) && DateOnly.TryParse(startDate, out var parsedStart))
                {
                    start = parsedStart;
                }
                
                if (!string.IsNullOrEmpty(endDate) && DateOnly.TryParse(endDate, out var parsedEnd))
                {
                    end = parsedEnd;
                }

                // Lấy danh sách ngày đã tập từ NhatKyHoanThanhBaiTap
                var ngayDaTap = await _context.NhatKyHoanThanhBaiTaps
                    .Where(n => n.UserId == userId && 
                                n.NgayHoanThanh >= start && 
                                n.NgayHoanThanh <= end)
                    .Select(n => n.NgayHoanThanh)
                    .Distinct()
                    .ToListAsync();

                // Lấy danh sách ngày có lịch tập từ ChiTietKeHoachTapLuyen
                // Tính toán ngày dựa trên NgayBatDau, Tuan, và NgayTrongTuan
                // QUAN TRỌNG: NgayBatDau đã được lưu là Thứ 2 của tuần đầu tiên (firstMonday)
                // Logic phải khớp với logic khi lưu trong MucTieu: Tuan và NgayTrongTuan được tính từ firstMonday
                var ngayCoLichTap = new HashSet<DateOnly>();
                
                // NgayBatDau đã là firstMonday (Thứ 2 của tuần đầu tiên) khi lưu
                // Sau khi verify ở trên, ngayBatDau chắc chắn là Thứ 2
                var firstMonday = ngayBatDau;
                
                _logger.LogInformation("GetScheduleInfo - KeHoachId: {KeHoachId}, FirstMonday: {FirstMonday}, TotalChiTiet: {Count}", 
                    keHoach.KeHoachId, firstMonday, keHoach.ChiTietKeHoachTapLuyens.Count);
                
                foreach (var chiTiet in keHoach.ChiTietKeHoachTapLuyens)
                {
                    // Ưu tiên: Dùng NgayTap (ngày cụ thể) nếu có
                    if (chiTiet.NgayTap.HasValue)
                    {
                        var ngayTap = chiTiet.NgayTap.Value;
                        
                        // Verify: Kiểm tra ngày có hợp lệ không
                        var dayOfWeek = (int)ngayTap.DayOfWeek;
                        var ngayTrongTuanFromNgayTap = dayOfWeek == 0 ? 7 : dayOfWeek;
                        
                        _logger.LogInformation("ChiTiet - TenBaiTap: {Ten}, NgayTap: {Date}, dayOfWeek={DayOfWeek}, ngayTrongTuan={NgayTrongTuan}, Tuan={Tuan}, NgayTrongTuanFromData={NgayTrongTuanData}", 
                            chiTiet.TenBaiTap, ngayTap, dayOfWeek, ngayTrongTuanFromNgayTap, chiTiet.Tuan, chiTiet.NgayTrongTuan);
                        
                        if (ngayTap >= start && ngayTap <= end)
                        {
                            ngayCoLichTap.Add(ngayTap);
                        }
                    }
                    // Fallback: Tính từ Tuan và NgayTrongTuan (cho dữ liệu cũ)
                    else if (chiTiet.Tuan.HasValue && chiTiet.NgayTrongTuan.HasValue)
                    {
                        // Tính ngày: Thứ 2 của tuần đầu tiên + (Tuan - 1) * 7 + (NgayTrongTuan - 1)
                        var tuanIndex = chiTiet.Tuan.Value - 1; // Tuần 1 = 0, Tuần 2 = 1, ...
                        var ngayTrongTuanIndex = chiTiet.NgayTrongTuan.Value - 1; // Thứ 2 = 0, Thứ 3 = 1, ...
                        var calculatedDate = firstMonday.AddDays(tuanIndex * 7 + ngayTrongTuanIndex);
                        
                        _logger.LogWarning("ChiTiet - TenBaiTap: {Ten}, Tuan: {Tuan}, NgayTrongTuan: {NgayTrongTuan}, CalculatedDate: {Date} (fallback - OLD DATA)", 
                            chiTiet.TenBaiTap, chiTiet.Tuan, chiTiet.NgayTrongTuan, calculatedDate);
                        
                        if (calculatedDate >= start && calculatedDate <= end)
                        {
                            ngayCoLichTap.Add(calculatedDate);
                        }
                    }
                }
                
                _logger.LogInformation("GetScheduleInfo - Total ngayCoLichTap: {Count}, Dates: {Dates}", 
                    ngayCoLichTap.Count, string.Join(", ", ngayCoLichTap.OrderBy(d => d).Select(d => d.ToString("yyyy-MM-dd"))));

                var result = new
                {
                    success = true,
                    ngayBatDau = ngayBatDau.ToString("yyyy-MM-dd"),
                    ngayKetThuc = end.ToString("yyyy-MM-dd"),
                    ngayDaTap = ngayDaTap.Select(d => d.ToString("yyyy-MM-dd")).ToList(),
                    ngayCoLichTap = ngayCoLichTap.Select(d => d.ToString("yyyy-MM-dd")).OrderBy(d => d).ToList()
                };

                return Json(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting schedule info for user {UserId}", userId);
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
                // Lấy kế hoạch hiện tại (include MucTieu để lấy LoaiMucTieu)
                var keHoach = await _context.KeHoachTapLuyens
                    .Include(k => k.MucTieu)
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

                    // Tính calo tiêu hao dự kiến sử dụng helper mới
                    var mucTieuLoai = keHoach.MucTieu?.LoaiMucTieu; // Lấy loại mục tiêu để xác định loại bài tập
                    chiTiet.CaloTieuHaoDuKien = CaloTieuHaoHelper.TinhCaloTieuHao(
                        thoiGianPhut: baiTap.ThoiLuongPhut,
                        soHiep: baiTap.SoSets,
                        soLan: baiTap.SoReps,
                        mucTieu: mucTieuLoai,
                        caloUocTinhMau: mauTapLuyen.CaloUocTinh
                    );

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

        // API: Hoàn thành buổi tập (tất cả bài tập trong ngày)
        [HttpPost("KeHoachTapLuyen/CompleteWorkoutSession")]
        public async Task<IActionResult> CompleteWorkoutSession([FromBody] CompleteWorkoutSessionRequest request)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Chưa đăng nhập" });
            }

            try
            {
                if (request.ChiTietIds == null || request.ChiTietIds.Count == 0)
                {
                    return Json(new { success = false, message = "Không có bài tập nào để hoàn thành" });
                }

                // Parse ngày
                if (!DateOnly.TryParse(request.Ngay, out var ngay))
                {
                    return Json(new { success = false, message = "Ngày không hợp lệ" });
                }

                // Kiểm tra tất cả bài tập có thuộc về user không
                var chiTiets = await _context.ChiTietKeHoachTapLuyens
                    .Include(c => c.KeHoach)
                    .Where(c => request.ChiTietIds.Contains(c.ChiTietId) && 
                               c.KeHoach.UserId == userId &&
                               c.KeHoach.DangSuDung == true)
                    .ToListAsync();

                if (chiTiets.Count != request.ChiTietIds.Count)
                {
                    return Json(new { success = false, message = "Một số bài tập không hợp lệ hoặc không thuộc về bạn" });
                }

                // Đánh dấu tất cả bài tập đã hoàn thành trong ngày
                // Sử dụng ngày từ request, không phải ngày hiện tại
                var completedCount = 0;

                _logger.LogInformation("CompleteWorkoutSession - Processing {Count} exercises for date {Ngay}, UserId: {UserId}", 
                    chiTiets.Count, ngay, userId);

                foreach (var chiTiet in chiTiets)
                {
                    // Kiểm tra xem đã có nhật ký hoàn thành chưa
                    var existing = await _context.NhatKyHoanThanhBaiTaps
                        .FirstOrDefaultAsync(n => n.UserId == userId && 
                                                  n.ChiTietId == chiTiet.ChiTietId && 
                                                  n.NgayHoanThanh == ngay);
                    
                    _logger.LogInformation("CompleteWorkoutSession - ChiTietId {ChiTietId}, TenBaiTap {TenBaiTap}, Existing: {Existing}, Ngay: {Ngay}", 
                        chiTiet.ChiTietId, chiTiet.TenBaiTap, existing != null, ngay);

                    if (existing == null)
                    {
                        // Tạo nhật ký hoàn thành mới (với giá trị mặc định)
                        var nhatKy = new NhatKyHoanThanhBaiTap
                        {
                            UserId = userId,
                            ChiTietId = chiTiet.ChiTietId,
                            NgayHoanThanh = ngay, // Sử dụng ngày từ request
                            SoHiepThucTe = chiTiet.SoHiep,
                            SoLanThucTe = chiTiet.SoLan,
                            ThoiLuongThucTePhut = chiTiet.ThoiGianPhut ?? 0,
                            CaloTieuHao = chiTiet.CaloTieuHaoDuKien ?? 0,
                            DanhGiaBaiTap = 5, // Mặc định 5 sao
                            GhiChu = "Hoàn thành buổi tập"
                        };
                        _context.NhatKyHoanThanhBaiTaps.Add(nhatKy);
                        completedCount++;
                        _logger.LogInformation("CompleteWorkoutSession - Created new NhatKy for ChiTietId {ChiTietId} on {Ngay}, UserId: {UserId}, NhatKyId will be: {NhatKyId}", 
                            chiTiet.ChiTietId, ngay, userId, nhatKy.NhatKyId);
                    }
                    else
                    {
                        _logger.LogInformation("CompleteWorkoutSession - NhatKy already exists for ChiTietId {ChiTietId} on {Ngay}, NhatKyId: {NhatKyId}", 
                            chiTiet.ChiTietId, ngay, existing.NhatKyId);
                    }
                }

                var saveResult = await _context.SaveChangesAsync();
                _logger.LogInformation("CompleteWorkoutSession - SaveChangesAsync returned: {Result}", saveResult);

                _logger.LogInformation("CompleteWorkoutSession - User {UserId} completed {Count} exercises on {Ngay}", 
                    userId, completedCount, ngay);
                
                // Verify: Kiểm tra lại xem có bao nhiêu bài tập đã hoàn thành
                var verifyCompleted = await _context.NhatKyHoanThanhBaiTaps
                    .Where(n => n.UserId == userId && 
                               request.ChiTietIds.Contains(n.ChiTietId) && 
                               n.NgayHoanThanh == ngay)
                    .Select(n => n.ChiTietId)
                    .Distinct()
                    .CountAsync();
                
                _logger.LogInformation("CompleteWorkoutSession - Verification: {VerifyCount} exercises completed out of {TotalCount} for date {Ngay}", 
                    verifyCompleted, request.ChiTietIds.Count, ngay);
                
                // Log chi tiết từng record đã lưu
                var allRecords = await _context.NhatKyHoanThanhBaiTaps
                    .Where(n => n.UserId == userId && 
                               request.ChiTietIds.Contains(n.ChiTietId) && 
                               n.NgayHoanThanh == ngay)
                    .ToListAsync();
                
                foreach (var record in allRecords)
                {
                    _logger.LogInformation("CompleteWorkoutSession - Saved record: NhatKyId={NhatKyId}, ChiTietId={ChiTietId}, NgayHoanThanh={NgayHoanThanh}, UserId={UserId}", 
                        record.NhatKyId, record.ChiTietId, record.NgayHoanThanh, record.UserId);
                }

                return Json(new { 
                    success = true, 
                    message = $"Đã hoàn thành buổi tập thành công! ({completedCount} bài tập)",
                    completedCount = completedCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error completing workout session for user {UserId}", userId);
                return Json(new { success = false, message = "Lỗi khi hoàn thành buổi tập" });
            }
        }

        // API: Kiểm tra xem mục tiêu đã hoàn thành chưa (tất cả buổi tập đã hoàn thành)
        [HttpGet("KeHoachTapLuyen/CheckGoalCompleted")]
        public async Task<IActionResult> CheckGoalCompleted()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Chưa đăng nhập", isGoalCompleted = false });
            }

            try
            {
                // Lấy kế hoạch hiện tại
                var keHoach = await _context.KeHoachTapLuyens
                    .Include(k => k.MucTieu)
                    .Where(k => k.UserId == userId && k.DangSuDung == true)
                    .OrderByDescending(k => k.NgayTao)
                    .FirstOrDefaultAsync();

                if (keHoach == null || keHoach.MucTieu == null)
                {
                    return Json(new { success = true, isGoalCompleted = false, message = "Chưa có kế hoạch hoặc mục tiêu" });
                }

                // Lấy tất cả các ngày có lịch tập (từ ChiTietKeHoachTapLuyen có NgayTap)
                var ngayCoLichTap = await _context.ChiTietKeHoachTapLuyens
                    .Where(c => c.KeHoachId == keHoach.KeHoachId && c.NgayTap.HasValue)
                    .Select(c => c.NgayTap!.Value)
                    .Distinct()
                    .ToListAsync();

                // Lấy tất cả các ngày đã tập (từ NhatKyHoanThanhBaiTap)
                var ngayDaTap = await _context.NhatKyHoanThanhBaiTaps
                    .Where(n => n.UserId == userId && 
                               n.ChiTiet.KeHoachId == keHoach.KeHoachId)
                    .Select(n => n.NgayHoanThanh)
                    .Distinct()
                    .ToListAsync();

                // Kiểm tra: Tất cả ngày có lịch tập đều đã được tập
                var isGoalCompleted = ngayCoLichTap.Count > 0 && 
                                     ngayCoLichTap.All(ngay => ngayDaTap.Contains(ngay));

                _logger.LogInformation("CheckGoalCompleted - UserId: {UserId}, NgayCoLichTap: {NgayCoLichTapCount}, NgayDaTap: {NgayDaTapCount}, IsGoalCompleted: {IsGoalCompleted}",
                    userId, ngayCoLichTap.Count, ngayDaTap.Count, isGoalCompleted);

                if (isGoalCompleted)
                {
                    _logger.LogInformation("CheckGoalCompleted - Goal completed! All {Count} scheduled days have been completed", ngayCoLichTap.Count);
                    
                    // QUAN TRỌNG 1: Set DaHoanThanh = true, TienDoHienTai = 100 và NgayKetThuc cho MucTieu để admin có thể thấy mục tiêu đã hoàn thành
                    if (keHoach.MucTieu != null)
                    {
                        keHoach.MucTieu.DaHoanThanh = true;
                        // Set tiến độ hiện tại = 100% khi mục tiêu hoàn thành
                        keHoach.MucTieu.TienDoHienTai = 100.0;
                        // Cập nhật ngày kết thúc nếu chưa có hoặc ngày hiện tại sớm hơn
                        var today = DateOnly.FromDateTime(DateTime.Now);
                        if (!keHoach.MucTieu.NgayKetThuc.HasValue || keHoach.MucTieu.NgayKetThuc.Value > today)
                        {
                            keHoach.MucTieu.NgayKetThuc = today;
                        }
                        _logger.LogInformation("CheckGoalCompleted - Setting DaHoanThanh = true, TienDoHienTai = 100 and NgayKetThuc = {NgayKetThuc} for MucTieuId {MucTieuId}", 
                            today, keHoach.MucTieuId);
                    }
                    
                    // QUAN TRỌNG 2: Set DangSuDung = false cho kế hoạch hiện tại
                    // để kế hoạch không còn hiển thị ở giao diện keHoachTapLuyen.cshtml
                    keHoach.DangSuDung = false;
                    _logger.LogInformation("CheckGoalCompleted - Setting DangSuDung = false for KeHoachId {KeHoachId}", keHoach.KeHoachId);
                    
                    // QUAN TRỌNG 3: Reset DaLapLich = false cho tất cả MucTieuChonBaiTap liên quan
                    // để cho phép xóa bài tập sau khi hoàn thành mục tiêu
                    var mucTieuChonBaiTaps = await _context.MucTieuChonBaiTaps
                        .Where(c => c.MucTieuId == keHoach.MucTieuId && c.DaLapLich == true)
                        .ToListAsync();

                    _logger.LogInformation("CheckGoalCompleted - Found {Count} MucTieuChonBaiTap records with DaLapLich = true to reset", 
                        mucTieuChonBaiTaps.Count);

                    foreach (var chonBaiTap in mucTieuChonBaiTaps)
                    {
                        chonBaiTap.DaLapLich = false;
                        _logger.LogInformation("CheckGoalCompleted - Setting DaLapLich = false for ChonBaiTapId {ChonBaiTapId}, MauTapLuyenId {MauTapLuyenId}", 
                            chonBaiTap.ChonBaiTapId, chonBaiTap.MauTapLuyenId);
                    }

                    // Lưu tất cả thay đổi
                    var saveResult = await _context.SaveChangesAsync();
                    _logger.LogInformation("CheckGoalCompleted - SaveChangesAsync returned: {Result}, marked goal as completed, deactivated plan and reset {Count} MucTieuChonBaiTap records", 
                        saveResult, mucTieuChonBaiTaps.Count);
                    
                    // Verify: Kiểm tra xem kế hoạch đã được deactivate chưa
                    var remainingActivePlans = await _context.KeHoachTapLuyens
                        .Where(k => k.UserId == userId && k.DangSuDung == true)
                        .CountAsync();
                    
                    if (remainingActivePlans > 0)
                    {
                        _logger.LogWarning("CheckGoalCompleted - WARNING: After completion, User {UserId} still has {Count} active plan(s)!", 
                            userId, remainingActivePlans);
                    }
                    else
                    {
                        _logger.LogInformation("CheckGoalCompleted - Successfully deactivated plan for User {UserId}", userId);
                    }
                }

                return Json(new { 
                    success = true, 
                    isGoalCompleted = isGoalCompleted,
                    totalScheduledDays = ngayCoLichTap.Count,
                    completedDays = ngayDaTap.Count,
                    message = isGoalCompleted ? "Bạn đã hoàn thành mục tiêu!" : "Mục tiêu chưa hoàn thành"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking goal completion for user {UserId}", userId);
                return Json(new { success = false, message = "Lỗi khi kiểm tra mục tiêu", isGoalCompleted = false });
            }
        }

        // API: Hủy kế hoạch tập luyện hiện tại
        [HttpPost("KeHoachTapLuyen/CancelPlan")]
        public async Task<IActionResult> CancelPlan()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, message = "Chưa đăng nhập" });
            }

            try
            {
                // Tìm TẤT CẢ kế hoạch đang thực hiện (có thể có nhiều do lỗi)
                // QUAN TRỌNG: Không dùng Include vì chỉ cần update DangSuDung
                var keHoachs = await _context.KeHoachTapLuyens
                    .Where(k => k.UserId == userId && k.DangSuDung == true)
                    .ToListAsync();

                if (keHoachs == null || keHoachs.Count == 0)
                {
                    _logger.LogWarning("CancelPlan - User {UserId} has no active plans", userId);
                    return Json(new { success = false, message = "Không tìm thấy kế hoạch đang thực hiện" });
                }

                _logger.LogInformation("CancelPlan - User {UserId} found {Count} active plan(s)", userId, keHoachs.Count);

                // Lấy tất cả MucTieuId liên quan đến các kế hoạch sẽ bị hủy
                var mucTieuIds = keHoachs.Select(k => k.MucTieuId).Distinct().ToList();

                // Hủy TẤT CẢ kế hoạch đang thực hiện (set DangSuDung = false)
                foreach (var keHoach in keHoachs)
                {
                    keHoach.DangSuDung = false;
                    _logger.LogInformation("CancelPlan - Setting DangSuDung = false for KeHoachId {KeHoachId}, MucTieuId {MucTieuId}", 
                        keHoach.KeHoachId, keHoach.MucTieuId);
                }

                // QUAN TRỌNG: Reset DaLapLich = false cho tất cả MucTieuChonBaiTap liên quan
                // để cho phép xóa bài tập sau khi hủy kế hoạch
                var mucTieuChonBaiTaps = await _context.MucTieuChonBaiTaps
                    .Where(c => mucTieuIds.Contains(c.MucTieuId) && c.DaLapLich == true)
                    .ToListAsync();

                _logger.LogInformation("CancelPlan - Found {Count} MucTieuChonBaiTap records with DaLapLich = true to reset", 
                    mucTieuChonBaiTaps.Count);

                foreach (var chonBaiTap in mucTieuChonBaiTaps)
                {
                    chonBaiTap.DaLapLich = false;
                    _logger.LogInformation("CancelPlan - Setting DaLapLich = false for ChonBaiTapId {ChonBaiTapId}, MauTapLuyenId {MauTapLuyenId}", 
                        chonBaiTap.ChonBaiTapId, chonBaiTap.MauTapLuyenId);
                }

                var saveResult = await _context.SaveChangesAsync();
                _logger.LogInformation("CancelPlan - SaveChangesAsync returned: {Result}, cancelled {Count} plan(s)", 
                    saveResult, keHoachs.Count);

                // Verify: Kiểm tra lại xem còn kế hoạch nào đang thực hiện không
                var remainingActivePlans = await _context.KeHoachTapLuyens
                    .Where(k => k.UserId == userId && k.DangSuDung == true)
                    .CountAsync();

                if (remainingActivePlans > 0)
                {
                    _logger.LogError("CancelPlan - ERROR: After cancellation, User {UserId} still has {Count} active plan(s)!", 
                        userId, remainingActivePlans);
                    return Json(new { 
                        success = false, 
                        message = "Đã hủy kế hoạch nhưng vẫn còn kế hoạch đang thực hiện. Vui lòng thử lại hoặc liên hệ hỗ trợ." 
                    });
                }

                _logger.LogInformation("CancelPlan - Successfully cancelled all plans for User {UserId}", userId);

                return Json(new { 
                    success = true, 
                    message = "Đã hủy kế hoạch tập luyện thành công. Bạn có thể tạo mục tiêu mới." 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling plan for user {UserId}", userId);
                return Json(new { success = false, message = "Lỗi khi hủy kế hoạch" });
            }
        }

        public class CompleteWorkoutSessionRequest
        {
            public string Ngay { get; set; } = string.Empty;
            public List<int> ChiTietIds { get; set; } = new List<int>();
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


