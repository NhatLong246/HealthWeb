using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HealthWeb.Models.EF;
using HealthWeb.Models.Entities;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace HealthWeb.Controllers
{
    [Authorize]
    public class ProfileController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ProfileController> _logger;

        public ProfileController(ApplicationDbContext context, ILogger<ProfileController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> Edit()
        {
            var userId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(userId))
            {
                return RedirectToAction("Login", "Account");
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
            {
                return RedirectToAction("Login", "Account");
            }

            // Lấy thông tin sức khỏe mới nhất
            var today = DateOnly.FromDateTime(DateTime.Today);
            var healthRecord = await _context.LuuTruSucKhoes
                .FirstOrDefaultAsync(l => l.UserId == userId && l.NgayGhiNhan == today);

            var model = new EditProfileViewModel
            {
                Username = user.Username,
                HoTen = user.HoTen,
                NgaySinh = user.NgaySinh,
                GioiTinh = user.GioiTinh,
                ChieuCao = healthRecord?.ChieuCao,
                CanNang = healthRecord?.CanNang
            };

            return View(model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(EditProfileViewModel model)
        {
            var userId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(userId))
            {
                return RedirectToAction("Login", "Account");
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
            {
                return RedirectToAction("Login", "Account");
            }

            // Validation
            if (string.IsNullOrWhiteSpace(model.Username))
            {
                ModelState.AddModelError("Username", "Tên đăng nhập là bắt buộc");
            }
            else if (model.Username.Length < 3)
            {
                ModelState.AddModelError("Username", "Tên đăng nhập phải có ít nhất 3 ký tự");
            }
            else
            {
                // Kiểm tra username đã tồn tại chưa (trừ user hiện tại)
                var existingUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.Username == model.Username && u.UserId != userId);
                if (existingUser != null)
                {
                    ModelState.AddModelError("Username", "Tên đăng nhập đã được sử dụng");
                }
            }

            if (model.ChieuCao.HasValue && (model.ChieuCao <= 0 || model.ChieuCao > 300))
            {
                ModelState.AddModelError("ChieuCao", "Chiều cao phải từ 1 đến 300 cm");
            }

            if (model.CanNang.HasValue && (model.CanNang <= 0 || model.CanNang > 500))
            {
                ModelState.AddModelError("CanNang", "Cân nặng phải từ 1 đến 500 kg");
            }

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            try
            {
                // Cập nhật thông tin User
                user.Username = model.Username.Trim();
                user.HoTen = model.HoTen?.Trim();
                user.NgaySinh = model.NgaySinh;
                user.GioiTinh = model.GioiTinh;

                await _context.SaveChangesAsync();

                // Cập nhật thông tin sức khỏe hôm nay
                var today = DateOnly.FromDateTime(DateTime.Today);
                var healthRecord = await _context.LuuTruSucKhoes
                    .FirstOrDefaultAsync(l => l.UserId == userId && l.NgayGhiNhan == today);

                if (healthRecord == null)
                {
                    // Tạo mới record nếu chưa có
                    var userCount = await _context.LuuTruSucKhoes.CountAsync();
                    var newRecordId = $"rec_{userCount + 1:D4}";
                    
                    healthRecord = new LuuTruSucKhoe
                    {
                        MaBanGhi = newRecordId,
                        UserId = userId,
                        NgayGhiNhan = today,
                        ChieuCao = model.ChieuCao,
                        CanNang = model.CanNang
                    };
                    _context.LuuTruSucKhoes.Add(healthRecord);
                }
                else
                {
                    // Cập nhật record hiện có
                    healthRecord.ChieuCao = model.ChieuCao;
                    healthRecord.CanNang = model.CanNang;
                }

                await _context.SaveChangesAsync();

                TempData["SuccessMessage"] = "Cập nhật thông tin cá nhân thành công!";
                return RedirectToAction("Index", "Home");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating profile");
                ModelState.AddModelError("", "Đã xảy ra lỗi khi cập nhật thông tin. Vui lòng thử lại.");
                return View(model);
            }
        }
    }

    public class EditProfileViewModel
    {
        [Required(ErrorMessage = "Tên đăng nhập là bắt buộc")]
        [StringLength(50, MinimumLength = 3, ErrorMessage = "Tên đăng nhập phải từ 3 đến 50 ký tự")]
        public string Username { get; set; } = string.Empty;

        [StringLength(100, ErrorMessage = "Họ tên không được vượt quá 100 ký tự")]
        public string? HoTen { get; set; }

        public DateOnly? NgaySinh { get; set; }

        public string? GioiTinh { get; set; }

        [Range(1, 300, ErrorMessage = "Chiều cao phải từ 1 đến 300 cm")]
        public double? ChieuCao { get; set; }

        [Range(1, 500, ErrorMessage = "Cân nặng phải từ 1 đến 500 kg")]
        public double? CanNang { get; set; }
    }
}

