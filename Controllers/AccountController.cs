using Microsoft.AspNetCore.Mvc;
using HealthWeb.Models.EF;
using HealthWeb.Models.Entities;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;


namespace HealthWeb.Controllers

{
    public class AccountController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<AccountController> _logger;
        private readonly IWebHostEnvironment _env;

        public AccountController(ApplicationDbContext context, ILogger<AccountController> logger, IWebHostEnvironment env)
        {
            _context = context;
            _logger = logger;
            _env = env;
        }

        // GET: /Account/Login
        public IActionResult Login()
        {
            return View();
        }

        // POST: /Account/Login
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Login(LoginViewModel model)
        {
            var usernameInput = model?.Username;
            if (string.IsNullOrWhiteSpace(usernameInput))
            {
                usernameInput = Request?.Form["Username"];
                model.Username = usernameInput ?? string.Empty;
            }
            usernameInput = usernameInput?.Trim();

            // Kiểm tra validation cơ bản - BẮT BUỘC (chỉ dùng tên đăng nhập)
            if (string.IsNullOrWhiteSpace(usernameInput))
            {
                ModelState.AddModelError(nameof(LoginViewModel.Username), "Tên đăng nhập là bắt buộc.");
                return View(model);
            }

            if (string.IsNullOrWhiteSpace(model?.Password))
            {
                ModelState.AddModelError(nameof(LoginViewModel.Password), "Mật khẩu là bắt buộc.");
                return View(model);
            }

            // BẮT BUỘC: Tìm user trong database - TỐI ƯU với timeout
            User? user = null;
            try
            {
                
                // Sử dụng CancellationToken để timeout sau 5 giây (tăng từ 3 giây)
                using (var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5)))
                {
                    // Query: chỉ cho phép login bằng Username
                    user = await _context.Users
                        .AsNoTracking() // Tối ưu: không track entity vì chỉ cần đọc
                        .FirstOrDefaultAsync(
                            u => u.Username == usernameInput,
                            cts.Token);
                    
                }
            }
            catch (OperationCanceledException)
            {
                // Timeout - trả lỗi ngay
                _logger.LogWarning("Query database timeout sau 5 giây");
                ModelState.AddModelError("", "Kết nối database quá chậm. Vui lòng thử lại sau.");
                return View(model);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi truy vấn database: {Message}", ex.Message);
                ModelState.AddModelError("", "Không thể kết nối đến database. Vui lòng thử lại sau.");
                return View(model);
            }

            // BẮT BUỘC: Kiểm tra user có tồn tại không - TRẢ LỖI NGAY
            if (user == null)
            {
                ModelState.AddModelError("", "Tên đăng nhập hoặc mật khẩu không đúng.");
                return View(model);
            }

            // BẮT BUỘC: Kiểm tra mật khẩu
            bool isPasswordValid = false;
            try
            {
                isPasswordValid = VerifyPassword(model.Password, user.PasswordHash);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi verify password");
                ModelState.AddModelError("", "Đã xảy ra lỗi khi xác thực mật khẩu.");
                return View(model);
            }

            if (!isPasswordValid)
            {
                ModelState.AddModelError("", "Tên đăng nhập hoặc mật khẩu không đúng.");
                return View(model);
            }

            // CHỈ khi user tồn tại VÀ mật khẩu đúng mới cho phép đăng nhập
            try
            {
                // Lưu session
                HttpContext.Session.SetString("UserId", user.UserId);
                HttpContext.Session.SetString("Username", user.Username);
                HttpContext.Session.SetString("HoTen", user.HoTen ?? user.Username);

                // Đăng nhập vào hệ thống xác thực cookie
                var claims = new List<Claim>
                {
                    new Claim(ClaimTypes.NameIdentifier, user.UserId),
                    new Claim(ClaimTypes.Name, user.Username),
                    new Claim(ClaimTypes.Role, user.Role ?? "Client")
                };
                var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
                
                // Nếu chọn "Ghi nhớ đăng nhập", cookie sẽ tồn tại 30 ngày, nếu không thì 1 giờ
                var authProperties = new AuthenticationProperties
                {
                    IsPersistent = model.RememberMe,
                    ExpiresUtc = model.RememberMe 
                        ? DateTimeOffset.UtcNow.AddDays(30) 
                        : DateTimeOffset.UtcNow.AddHours(1)
                };

                await HttpContext.SignInAsync(
                    CookieAuthenticationDefaults.AuthenticationScheme,
                    new ClaimsPrincipal(claimsIdentity),
                    authProperties
                );

                // Kiểm tra Role: Nếu là Admin, redirect đến trang Admin
                if (user.Role == "Admin")
                {
                    return RedirectToAction("ThongKe", "Admin");
                }

                // Kiểm tra xem user đã có thông tin cơ bản chưa
                var hasBasicInfo = await _context.LuuTruSucKhoes
                    .AnyAsync(l => l.UserId == user.UserId && l.ChieuCao.HasValue && l.CanNang.HasValue);

                if (!hasBasicInfo)
                {
                    // Chưa có thông tin cơ bản, redirect đến SetupProfile
                    return RedirectToAction("SetupProfile");
                }

                return RedirectToAction("Index", "Home");

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lưu session");
                ModelState.AddModelError("", "Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại sau.");
                return View(model);
            }
        }

        // GET: /Account/Register
        public IActionResult Register()
        {
            return View();
        }

        // POST: /Account/Register
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Register(RegisterViewModel model)
        {
            // Validation cơ bản - BẮT BUỘC
            bool hasError = false;

            if (string.IsNullOrWhiteSpace(model.FirstName))
            {
                ModelState.AddModelError("FirstName", "Họ là bắt buộc.");
                hasError = true;
            }
            else if (model.FirstName.Length < 2)
            {
                ModelState.AddModelError("FirstName", "Họ phải có ít nhất 2 ký tự.");
                hasError = true;
            }

            if (string.IsNullOrWhiteSpace(model.LastName))
            {
                ModelState.AddModelError("LastName", "Tên là bắt buộc.");
                hasError = true;
            }
            else if (model.LastName.Length < 2)
            {
                ModelState.AddModelError("LastName", "Tên phải có ít nhất 2 ký tự.");
                hasError = true;
            }

            if (string.IsNullOrWhiteSpace(model.Email))
            {
                ModelState.AddModelError("Email", "Email là bắt buộc.");
                hasError = true;
            }
            else
            {
                // Validate email format
                var emailParts = model.Email.Split('@');
                if (emailParts.Length != 2 || string.IsNullOrWhiteSpace(emailParts[0]) || string.IsNullOrWhiteSpace(emailParts[1]))
                {
                    ModelState.AddModelError("Email", "Email không hợp lệ.");
                    hasError = true;
                }
                else if (!emailParts[1].Contains('.'))
                {
                    ModelState.AddModelError("Email", "Email phải có định dạng hợp lệ (ví dụ: user@example.com).");
                    hasError = true;
                }
            }

            if (string.IsNullOrWhiteSpace(model.Username))
            {
                ModelState.AddModelError("Username", "Tên đăng nhập là bắt buộc.");
                hasError = true;
            }
            else if (model.Username.Length < 3)
            {
                ModelState.AddModelError("Username", "Tên đăng nhập phải có ít nhất 3 ký tự.");
                hasError = true;
            }
            else if (model.Username.Length > 50)
            {
                ModelState.AddModelError("Username", "Tên đăng nhập không được vượt quá 50 ký tự.");
                hasError = true;
            }

            if (string.IsNullOrWhiteSpace(model.Password))
            {
                ModelState.AddModelError("Password", "Mật khẩu là bắt buộc.");
                hasError = true;
            }
            else if (model.Password.Length < 6)
            {
                ModelState.AddModelError("Password", "Mật khẩu phải có ít nhất 6 ký tự.");
                hasError = true;
            }
            else if (model.Password.Length > 100)
            {
                ModelState.AddModelError("Password", "Mật khẩu không được vượt quá 100 ký tự.");
                hasError = true;
            }

            if (string.IsNullOrWhiteSpace(model.ConfirmPassword))
            {
                ModelState.AddModelError("ConfirmPassword", "Xác nhận mật khẩu là bắt buộc.");
                hasError = true;
            }

            // BẮT BUỘC: Kiểm tra mật khẩu và xác nhận mật khẩu phải giống nhau
            if (!string.IsNullOrWhiteSpace(model.Password) && !string.IsNullOrWhiteSpace(model.ConfirmPassword))
            {
                if (model.Password != model.ConfirmPassword)
                {
                    ModelState.AddModelError("ConfirmPassword", "Mật khẩu xác nhận không khớp với mật khẩu.");
                    hasError = true;
                }
            }

            if (hasError || !ModelState.IsValid)
            {
                return View(model);
            }

            try
            {
                // BẮT BUỘC: Kiểm tra username đã tồn tại trong database
                var existingUsername = await _context.Users
                    .AnyAsync(u => u.Username == model.Username.Trim());
                if (existingUsername)
                {
                    ModelState.AddModelError("Username", "Tên đăng nhập đã được sử dụng. Vui lòng chọn tên khác.");
                    return View(model);
                }

                // BẮT BUỘC: Kiểm tra email đã tồn tại trong database
                if (!string.IsNullOrWhiteSpace(model.Email))
                {
                    var existingEmail = await _context.Users
                        .AnyAsync(u => u.Email == model.Email.Trim());
                    if (existingEmail)
                    {
                        ModelState.AddModelError("Email", "Email đã được sử dụng. Vui lòng sử dụng email khác.");
                        return View(model);
                    }
                }

                // BẮT BUỘC: Validate ngày sinh
                if (model.BirthDate != default)
                {
                    var age = DateTime.Now.Year - model.BirthDate.Year;
                    if (model.BirthDate.Date > DateTime.Now.AddYears(-age)) age--;
                    
                    if (age < 13)
                    {
                        ModelState.AddModelError("BirthDate", "Bạn phải ít nhất 13 tuổi để đăng ký.");
                        return View(model);
                    }
                    
                    if (age > 120)
                    {
                        ModelState.AddModelError("BirthDate", "Ngày sinh không hợp lệ.");
                        return View(model);
                    }
                }

                // Tạo User mới với password đã được HASH
                var userId = await GenerateUserIdAsync();
                var user = new User
                {
                    UserId = userId,
                    Username = model.Username.Trim(),
                    Email = model.Email.Trim(),
                    PasswordHash = HashPassword(model.Password), // HASH password trước khi lưu
                    HoTen = $"{model.FirstName.Trim()} {model.LastName.Trim()}".Trim(),
                    NgaySinh = model.BirthDate != default ? DateOnly.FromDateTime(model.BirthDate) : null,
                    Role = "Client",
                    CreatedDate = DateTime.Now
                };

                // BẮT BUỘC: Lưu vào database
                _context.Users.Add(user);
                var result = await _context.SaveChangesAsync();

                if (result > 0)
                {
                    // Xác nhận user đã được lưu vào database
                    var savedUser = await _context.Users
                        .FirstOrDefaultAsync(u => u.UserId == userId);
                    
                    if (savedUser != null)
                    {
                        _logger.LogInformation($"✅ User {model.Username} đã đăng ký thành công với ID: {userId} và đã được lưu vào database.");
                        
                        // Đăng nhập tự động sau khi đăng ký
                        HttpContext.Session.SetString("UserId", savedUser.UserId);
                        HttpContext.Session.SetString("Username", savedUser.Username);
                        HttpContext.Session.SetString("HoTen", savedUser.HoTen ?? savedUser.Username);
                        
                        var claims = new List<Claim>
                        {
                            new Claim(ClaimTypes.NameIdentifier, savedUser.UserId),
                            new Claim(ClaimTypes.Name, savedUser.Username),
                            new Claim(ClaimTypes.Role, savedUser.Role ?? "Client")
                        };
                        var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
                        await HttpContext.SignInAsync(
                            CookieAuthenticationDefaults.AuthenticationScheme,
                            new ClaimsPrincipal(claimsIdentity),
                            new AuthenticationProperties { IsPersistent = false, ExpiresUtc = DateTimeOffset.UtcNow.AddHours(1) }
                        );
                        
                        // Redirect đến trang setup profile để nhập thông tin cơ bản
                        return RedirectToAction("SetupProfile");
                    }
                    else
                    {
                        _logger.LogError($"❌ User {userId} không tìm thấy sau khi SaveChanges");
                        ModelState.AddModelError("", "Đã xảy ra lỗi khi lưu tài khoản. Vui lòng thử lại.");
                        return View(model);
                    }
                }
                else
                {
                    _logger.LogError($"❌ SaveChanges trả về 0 cho user {model.Username}");
                    ModelState.AddModelError("", "Không thể lưu tài khoản vào database. Vui lòng thử lại.");
                    return View(model);
                }
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, $"Lỗi database khi đăng ký: {ex.Message}");
                
                // Kiểm tra lỗi unique constraint
                if (ex.InnerException?.Message.Contains("UNIQUE") == true || 
                    ex.InnerException?.Message.Contains("duplicate") == true)
                {
                    if (ex.InnerException.Message.Contains("Username") || ex.InnerException.Message.Contains("UQ__Users__536C85E4"))
                    {
                        ModelState.AddModelError("Username", "Tên đăng nhập đã được sử dụng.");
                    }
                    else if (ex.InnerException.Message.Contains("Email") || ex.InnerException.Message.Contains("UQ__Users__A9D10534"))
                    {
                        ModelState.AddModelError("Email", "Email đã được sử dụng.");
                    }
                }
                else
                {
                    ModelState.AddModelError("", "Đã xảy ra lỗi khi lưu vào database. Vui lòng thử lại sau.");
                }
                
                return View(model);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Lỗi khi đăng ký: {ex.Message}");
                ModelState.AddModelError("", $"Đã xảy ra lỗi: {ex.Message}");
                return View(model);
            }
        }

        // GET: /Account/ForgotPassword
        public IActionResult ForgotPassword()
        {
            return View();
        }

        // POST: /Account/ForgotPassword
        [HttpPost]
        public IActionResult ForgotPassword(ForgotPasswordViewModel model)
        {
            if (ModelState.IsValid)
            {
                // TODO: Implement forgot password logic
                return RedirectToAction("Login");
            }
            return View(model);
        }

        // Helper methods
        private string HashPassword(string password)
        {
            if (string.IsNullOrWhiteSpace(password))
                throw new ArgumentException("Password cannot be empty", nameof(password));

            using (var sha256 = SHA256.Create())
            {
                var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
                return Convert.ToBase64String(hashedBytes);
            }
        }

        private bool VerifyPassword(string password, string storedPassword)
        {
            if (string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(storedPassword))
                return false;

            try
            {
                var hashOfInput = HashPassword(password);
                if (hashOfInput == storedPassword)
                    return true;

                // Không cho phép bất kỳ hình thức xác thực nào khác ngoài khớp hash
            }
            catch
            {
                return false;
            }

            return false;
        }

        // Endpoint kiểm tra phiên đăng nhập từ server
        [HttpGet("Account/GetCurrentUserId")]
        public IActionResult GetCurrentUserId()
        {
            var userId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(userId))
            {
                return Json(new { success = false, userId = (string?)null });
            }
            return Json(new { success = true, userId = userId });
        }

        public IActionResult IsAuthenticated()
        {
            var isCookieAuth = HttpContext.User?.Identity?.IsAuthenticated == true;
            var userId = HttpContext.Session.GetString("UserId");
            var username = HttpContext.Session.GetString("Username");
            var hoTen = HttpContext.Session.GetString("HoTen");

            // Nếu có cookie auth nhưng chưa có session (trường hợp reload sau khi cookie set)
            if (isCookieAuth && string.IsNullOrEmpty(userId))
            {
                var claimId = HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var claimName = HttpContext.User.FindFirst(ClaimTypes.Name)?.Value;
                if (!string.IsNullOrEmpty(claimId))
                {
                    userId = claimId;
                    username = claimName ?? username;
                }
            }

            var isAuth = isCookieAuth || !string.IsNullOrEmpty(userId);

            return Json(new
            {
                isAuthenticated = isAuth,
                username = isAuth ? (hoTen ?? username ?? HttpContext.User?.Identity?.Name ?? "User") : null
            });
        }

        // Đăng xuất: xóa session
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Logout()
        {
            HttpContext.Session.Clear();
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return RedirectToAction("Index", "Home");
        }

        // Cho phép logout qua GET để hỗ trợ nơi không có AntiForgery trong layout
        [HttpGet]
        public async Task<IActionResult> LogoutGet()
        {
            HttpContext.Session.Clear();
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return RedirectToAction("Index", "Home");
        }

        // GET: Setup Profile - Nhập thông tin cơ bản sau khi đăng ký
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> SetupProfile()
        {
            var userId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(userId))
            {
                return RedirectToAction("Login");
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
            {
                return RedirectToAction("Login");
            }

            // Kiểm tra xem user đã có thông tin cơ bản chưa (có record trong LuuTruSucKhoe với ChieuCao và CanNang)
            var hasBasicInfo = await _context.LuuTruSucKhoes
                .AnyAsync(l => l.UserId == userId && l.ChieuCao.HasValue && l.CanNang.HasValue);

            if (hasBasicInfo)
            {
                // Đã có thông tin, redirect về Home
                return RedirectToAction("Index", "Home");
            }

            var model = new SetupProfileViewModel
            {
                NgaySinh = user.NgaySinh,
                GioiTinh = user.GioiTinh
            };

            return View(model);
        }

        // POST: Setup Profile - Lưu thông tin cơ bản
        [HttpPost]
        [Authorize]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SetupProfile(SetupProfileViewModel model)
        {
            var userId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(userId))
            {
                return RedirectToAction("Login");
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
            {
                return RedirectToAction("Login");
            }

            // Khởi tạo model nếu null
            if (model == null)
            {
                model = new SetupProfileViewModel();
            }

            // Parse từ form (ưu tiên form vì model binding có thể không hoạt động với double?)
            var chieuCaoStr = Request.Form["ChieuCao"].ToString();
            if (!string.IsNullOrWhiteSpace(chieuCaoStr))
            {
                if (double.TryParse(chieuCaoStr, System.Globalization.NumberStyles.Any, 
                    System.Globalization.CultureInfo.InvariantCulture, out var chieuCao))
                {
                    model.ChieuCao = chieuCao;
                }
            }

            var canNangStr = Request.Form["CanNang"].ToString();
            if (!string.IsNullOrWhiteSpace(canNangStr))
            {
                if (double.TryParse(canNangStr, System.Globalization.NumberStyles.Any, 
                    System.Globalization.CultureInfo.InvariantCulture, out var canNang))
                {
                    model.CanNang = canNang;
                }
            }

            // Parse NgaySinh và GioiTinh nếu có
            var ngaySinhStr = Request.Form["NgaySinh"].ToString();
            if (!string.IsNullOrWhiteSpace(ngaySinhStr) && DateOnly.TryParse(ngaySinhStr, out var ngaySinh))
            {
                model.NgaySinh = ngaySinh;
            }

            var gioiTinhStr = Request.Form["GioiTinh"].ToString();
            if (!string.IsNullOrWhiteSpace(gioiTinhStr))
            {
                model.GioiTinh = gioiTinhStr;
            }

            // Validation thủ công để đảm bảo ChieuCao và CanNang có giá trị
            if (!model.ChieuCao.HasValue || model.ChieuCao <= 0)
            {
                ModelState.AddModelError("ChieuCao", "Chiều cao là bắt buộc và phải lớn hơn 0");
            }
            if (!model.CanNang.HasValue || model.CanNang <= 0)
            {
                ModelState.AddModelError("CanNang", "Cân nặng là bắt buộc và phải lớn hơn 0");
            }

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            try
            {
                // Cập nhật thông tin user nếu có
                if (model.NgaySinh.HasValue)
                {
                    user.NgaySinh = model.NgaySinh;
                }
                if (!string.IsNullOrWhiteSpace(model.GioiTinh))
                {
                    user.GioiTinh = model.GioiTinh;
                }

                // Tạo record đầu tiên trong LuuTruSucKhoe với thông tin cơ bản
                // Format: rec_YYYYMMDD_userId (ví dụ: rec_20250111_user_0001)
                // LƯU Ý: MaBanGhi phải <= 20 ký tự (VARCHAR(20) trong DB)
                var today = DateOnly.FromDateTime(DateTime.Now);
                var dateStr = today.ToString("yyyyMMdd");
                
                // Tạo MaBanGhi với format: rec_YYYYMMDD_XXXXX
                // "rec_" (4) + dateStr (8) + "_" (1) = 13 ký tự cố định
                // Còn lại: 20 - 13 = 7 ký tự cho userId
                // Nếu userId dài hơn 7, lấy 7 ký tự cuối (để tránh conflict với các user khác)
                var maxUserIdLength = 20 - 13; // 7 ký tự
                string shortUserId;
                if (userId.Length > maxUserIdLength)
                {
                    // Lấy 7 ký tự cuối của userId để tránh conflict
                    shortUserId = userId.Substring(userId.Length - maxUserIdLength);
                }
                else
                {
                    shortUserId = userId;
                }
                var maBanGhi = $"rec_{dateStr}_{shortUserId}";
                
                // Đảm bảo MaBanGhi không vượt quá 20 ký tự
                if (maBanGhi.Length > 20)
                {
                    maBanGhi = maBanGhi.Substring(0, 20);
                }
                
                // Kiểm tra xem đã có record cho ngày hôm nay chưa
                var existingRecord = await _context.LuuTruSucKhoes
                    .FirstOrDefaultAsync(l => l.UserId == userId && l.NgayGhiNhan == today);

                if (existingRecord == null)
                {
                    // Tạo record mới
                    var healthRecord = new LuuTruSucKhoe
                    {
                        MaBanGhi = maBanGhi,
                        UserId = userId,
                        NgayGhiNhan = today,
                        ChieuCao = model.ChieuCao,
                        CanNang = model.CanNang,
                        // BMI sẽ được tính tự động bởi trigger trong database
                        SoBuoc = 0,
                        CaloTieuThu = 0,
                        SoGioNgu = 0,
                        LuongNuocUong = 0
                    };

                    _context.LuuTruSucKhoes.Add(healthRecord);
                }
                else
                {
                    // Cập nhật record hiện có
                    existingRecord.ChieuCao = model.ChieuCao;
                    existingRecord.CanNang = model.CanNang;
                }

                await _context.SaveChangesAsync();

                // Kiểm tra lại xem đã lưu thành công chưa
                var savedRecord = await _context.LuuTruSucKhoes
                    .FirstOrDefaultAsync(l => l.UserId == userId && l.NgayGhiNhan == today);
                
                if (savedRecord != null && savedRecord.ChieuCao.HasValue && savedRecord.CanNang.HasValue)
                {
                    TempData["SuccessMessage"] = "Đã lưu thông tin cơ bản thành công!";
                    return RedirectToAction("Index", "Home");
                }
                else
                {
                    ModelState.AddModelError("", "Không thể lưu thông tin. Vui lòng thử lại.");
                    return View(model);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lưu thông tin cơ bản");
                ModelState.AddModelError("", "Đã xảy ra lỗi khi lưu thông tin. Vui lòng thử lại.");
                return View(model);
            }
        }


        private async Task<string> GenerateUserIdAsync()
        {
            // Tạo UserId duy nhất dựa trên số lượng user hiện có
            var count = await _context.Users.CountAsync() + 1;
            var userId = $"user_{count:D4}";
            
            // Đảm bảo không trùng (trong trường hợp có xóa user)
            while (await _context.Users.AnyAsync(u => u.UserId == userId))
            {
                count++;
                userId = $"user_{count:D4}";
            }
            
            return userId;
        }
    }

    // View Models
    public class LoginViewModel
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public bool RememberMe { get; set; }
    }

    public class RegisterViewModel
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string ConfirmPassword { get; set; } = string.Empty;
        public DateTime BirthDate { get; set; }
        public bool AgreeTerms { get; set; }
        public bool Newsletter { get; set; }
    }

    public class ForgotPasswordViewModel
    {
        public string Email { get; set; } = string.Empty;
    }

    public class SetupProfileViewModel
    {
        // Không dùng [Required] cho double? vì có thể không hoạt động đúng
        // Validation sẽ được làm thủ công trong controller
        public double? ChieuCao { get; set; }
        public double? CanNang { get; set; }
        public DateOnly? NgaySinh { get; set; }
        public string? GioiTinh { get; set; }
    }
} 