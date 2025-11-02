-- Tạo database cho ứng dụng theo dõi sức khỏe
CREATE DATABASE HealthTracker;
GO

USE HealthTracker;
GO

-- Bảng Users: Quản lý thông tin tài khoản người dùng (hỗ trợ multi-user profiles)
CREATE TABLE Users (
    UserID VARCHAR(20) PRIMARY KEY,  -- "user_0001"
    Username NVARCHAR(50) UNIQUE NOT NULL, -- Tên đăng nhập, duy nhất, không null
    PasswordHash NVARCHAR(256) NOT NULL, -- Mật khẩu đã hash để bảo mật
	Role NVARCHAR(20) DEFAULT 'Client', -- 'Client', 'PT', 'Admin'
	CHECK (Role IN ('Client', 'PT', 'Admin')), -- Chỉ cho phép 3 roles
    Email NVARCHAR(100) UNIQUE, -- Email, duy nhất, tùy chọn
    HoTen NVARCHAR(100), -- Họ tên đầy đủ của người dùng
    NgaySinh DATE, -- Ngày sinh, dùng để tính tuổi hoặc gợi ý sức khỏe
	CHECK (NgaySinh < GETDATE()), -- Không thể sinh trong tương lai
    GioiTinh NVARCHAR(10), -- Giới tính (Male/Female/Other), tùy chọn
	AnhDaiDien NVARCHAR(200),
	Theme NVARCHAR(10) DEFAULT 'Light', -- Theme giao diện: 'Light' (sáng) hoặc 'Dark' (tối)
    NgonNgu NVARCHAR(10) DEFAULT 'vi', -- Ngôn ngữ: 'vi' (Tiếng Việt), 'en' (English)
	TimeZone NVARCHAR(50) DEFAULT 'SE Asia Standard Time', -- Múi giờ user, dùng cho reminder chính xác
    ResetToken NVARCHAR(256), -- Token reset mật khẩu (random string), gửi qua email khi quên MK
    ResetTokenExpiry DATETIME, -- Thời gian hết hạn token (thường 15-30 phút), tránh bị hack
    CreatedDate DATETIME DEFAULT GETDATE() -- Ngày tạo tài khoản, tự động lấy thời gian hiện tại
);
GO

CREATE TABLE Benh (
	BenhID VARCHAR(20) PRIMARY KEY,
	TenBenh NVARCHAR(200)
);
GO

-- Bảng HealthRecords: Lưu trữ dữ liệu sức khỏe hàng ngày của người dùng
CREATE TABLE LuuTruSucKhoe  (
    MaBanGhi VARCHAR(20) PRIMARY KEY, -- rec_0001
    UserID VARCHAR(20) NOT NULL, -- Liên kết với Users
    NgayGhiNhan  DATE NOT NULL, -- Ngày ghi nhận dữ liệu, không null
    SoBuoc  INT DEFAULT 0, -- Số bước chân, mặc định 0
    CaloTieuThu FLOAT DEFAULT 0, -- Lượng calo tiêu thụ, mặc định 0
    SoGioNgu FLOAT DEFAULT 0, -- Thời gian ngủ (giờ), mặc định 0
    CanNang FLOAT, -- Cân nặng (kg), tùy chọn
    ChieuCao FLOAT, -- Chiều cao (cm), tùy chọn
    BMI FLOAT, -- Chỉ số BMI, tính tự động qua trigger
	SoDoVong1 FLOAT,
	SoDoVong2 FLOAT,
	SoDoVong3 FLOAT,
	SoDoBapTay FLOAT,
	SoDoBapChan FLOAT,
	TiLeMo FLOAT,
    BenhID VARCHAR(20),
    LuongNuocUong FLOAT DEFAULT 0, -- Lượng nước uống (lít), mặc định 0
    GhiChu NVARCHAR(500), -- Ghi chú thêm đánh giá tổng quan, tùy chọn
	-- Ràng buộc toàn vẹn dữ liệu
    CONSTRAINT FK_LuuTruSucKhoe_Users FOREIGN KEY (UserID)
        REFERENCES Users(UserID) ON DELETE CASCADE,
	CONSTRAINT FK_LuuTruSucKhoe_Benh FOREIGN KEY (BenhID)
		REFERENCES Benh(BenhID) ON DELETE SET NULL,
    CONSTRAINT UK_LuuTruSucKhoe UNIQUE (UserID, NgayGhiNhan) -- Đảm bảo mỗi user chỉ có 1 record/ngày
);
GO


-- Trigger tính tự động chỉ số BMI sau khi thêm hoặc cập nhật dữ liệu sức khỏe
CREATE TRIGGER TR_TinhBMI
ON LuuTruSucKhoe
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Cập nhật BMI = CanNang / (ChieuCao/100)^2, chỉ khi có đầy đủ dữ liệu hợp lệ
    UPDATE ls
    SET ls.BMI = 
        CASE 
            WHEN i.ChieuCao IS NOT NULL AND i.ChieuCao > 0 
                 AND i.CanNang IS NOT NULL 
            THEN ROUND(i.CanNang / POWER(i.ChieuCao / 100.0, 2), 2)
            ELSE NULL
        END
    FROM LuuTruSucKhoe ls
    INNER JOIN inserted i ON ls.MaBanGhi = i.MaBanGhi;
END;
GO

-- Bảng MucTieu: Quản lý mục tiêu cá nhân hóa của người dùng (e.g., giảm cân, tăng bước chân)
CREATE TABLE MucTieu (
    MucTieuID VARCHAR(20) PRIMARY KEY, -- goal_0001
    UserID VARCHAR(20) NOT NULL, -- Liên kết với Users
    LoaiMucTieu NVARCHAR(50) NOT NULL, -- Loại mục tiêu (e.g., 'WeightLoss', 'StepsTarget', 'SleepImprovement')
    GiaTriMucTieu FLOAT NOT NULL, -- Giá trị mục tiêu (e.g., 65kg cho cân nặng)
    NgayBatDau DATE NOT NULL, -- Ngày bắt đầu mục tiêu
    NgayKetThuc DATE, -- Ngày kết thúc, tùy chọn
    TienDoHienTai FLOAT DEFAULT 0, -- Tiến độ hiện tại (e.g., cân nặng hiện tại so với target)
    DaHoanThanh BIT DEFAULT 0, -- Trạng thái hoàn thành (0: chưa, 1: đã hoàn thành)
	ThuTuHienThi INT DEFAULT 0, -- Thứ tự hiển thị trong UI (cho drag & drop sắp xếp ưu tiên)
    GhiChu NVARCHAR(500) -- Ghi chú về mục tiêu, tùy chọn
	 -- Ràng buộc toàn vẹn dữ liệu
    CONSTRAINT FK_MucTieu_Users FOREIGN KEY (UserID)
        REFERENCES Users(UserID) ON DELETE CASCADE,
    -- Ràng buộc hợp lệ logic ngày tháng
    CONSTRAINT CK_MucTieu_Date CHECK (NgayKetThuc IS NULL OR NgayKetThuc >= NgayBatDau)
);
GO

-- Bảng ThanhTuu: Lưu trữ thành tựu cho gamification (badge, points, leaderboard)
CREATE TABLE ThanhTuu (
    ThanhTuuID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng, khóa chính
    UserID VARCHAR(20) NOT NULL, -- Liên kết với Users
    TenBadge NVARCHAR(50) NOT NULL, -- Tên badge (e.g., 'Marathon Runner')
    Diem INT DEFAULT 0, -- Điểm thưởng cho badge
    NgayDatDuoc DATETIME DEFAULT GETDATE(), -- Ngày đạt được badge
    MoTa NVARCHAR(200), -- Mô tả badge (e.g., 'Đạt 10.000 bước 3 ngày liên tiếp')
	-- Ràng buộc khóa ngoại
    CONSTRAINT FK_ThanhTuu_Users FOREIGN KEY (UserID)
        REFERENCES Users(UserID) ON DELETE CASCADE
);
GO

-- Bảng XepHang	: Xếp hạng người dùng theo thời gian (Daily/Weekly/Monthly)
CREATE TABLE XepHang (
    XepHangID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng, khóa chính
    UserID VARCHAR(20) NOT NULL, -- Liên kết user
    ChuKy NVARCHAR(20), -- Chu kỳ xếp hạng: 'Daily' (hôm nay), 'Weekly' (tuần này), 'Monthly' (tháng này)
    TongDiem INT, -- Tổng điểm trong chu kỳ (từ Achievements, ExercisePlans hoàn thành)
    ThuHang INT, -- Thứ hạng (1 = top 1), tự động tính qua stored procedure
    NgayBatDauChuKy DATE, -- Ngày bắt đầu chu kỳ (e.g., Monday cho Weekly)
    NgayKetThucChuKy DATE, -- Ngày kết thúc chu kỳ (e.g., Sunday cho Weekly)
    NgayCapNhat DATETIME DEFAULT GETDATE(), -- Lần cập nhật cuối, refresh theo real-time
	-- Khóa ngoại
    CONSTRAINT FK_XepHang_Users FOREIGN KEY (UserID)
        REFERENCES Users(UserID) ON DELETE CASCADE,
    -- Kiểm tra logic ngày tháng
    CONSTRAINT CK_XepHang_Ngay CHECK (NgayKetThucChuKy >= NgayBatDauChuKy)
);
GO

-- Bảng NhatKyThoiTiet: Lưu dữ liệu thời tiết từ API (OpenWeatherMap) để gợi ý hoạt động
CREATE TABLE NhatKyThoiTiet (
    ThoiTietID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng, khóa chính
    UserID VARCHAR(20) NOT NULL, -- Liên kết với Users
    NgayGhiLog DATE NOT NULL, -- Ngày ghi log thời tiết
    ThanhPho NVARCHAR(50), -- Thành phố (e.g., 'Hanoi')
    NhietDo FLOAT, -- Nhiệt độ (°C)
    TinhTrang NVARCHAR(50), -- Tình trạng thời tiết (e.g., 'Sunny', 'Rainy')
    DoAm FLOAT, -- Độ ẩm (%)
    GoiY NVARCHAR(200) -- Gợi ý hoạt động dựa trên thời tiết (e.g., 'Nên chạy bộ')
	CONSTRAINT FK_NhatKyThoiTiet_Users FOREIGN KEY (UserID)
        REFERENCES Users(UserID) ON DELETE CASCADE
);
GO

CREATE TABLE DinhDuongMonAn (
	MonAnID VARCHAR(20) PRIMARY KEY, 
	TenMonAn VARCHAR(200),
	DonViTinh NVARCHAR(20), 
	HinhAnh VARCHAR(200),
	LuongCalo FLOAT, -- Lượng calo
    Protein FLOAT, -- Protein (g)
    ChatBeo FLOAT, -- Chất béo (g)
    Carbohydrate FLOAT, -- Carbohydrate (g)
);
GO

-- Bảng NhatKyDinhDuong: Lưu dữ liệu dinh dưỡng từ API (Edamam/Spoonacular)
CREATE TABLE NhatKyDinhDuong (
    DinhDuongID VARCHAR(20) PRIMARY KEY, -- nut_0001
    UserID VARCHAR(20) NOT NULL, -- Liên kết với Users
    NgayGhiLog DATE NOT NULL, -- Ngày ghi log dinh dưỡng
    MonAnID VARCHAR(20) NOT NULL, -- Liên kết với DinhDuongMonAn
	LuongThucAn FLOAT, -- Lượng ăn thực tế (g or ml)
    GhiChu NVARCHAR(500), -- Ghi chú (e.g., 'Bữa sáng')
	CONSTRAINT FK_NhatKyDinhDuong_Users FOREIGN KEY (UserID)
        REFERENCES Users(UserID) ON DELETE CASCADE,
	CONSTRAINT FK_NhatKyDinhDuong_MonAn FOREIGN KEY (MonAnID)
        REFERENCES DinhDuongMonAn(MonAnID)
);
GO

-- Bảng AIGoiY: Lưu trữ gợi ý từ AI (ML.NET predictions)
CREATE TABLE AIGoiY (
    GoiYID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng, khóa chính
    UserID VARCHAR(20) NOT NULL, -- Liên kết với Users
    NgayGoiY DATE NOT NULL, -- Ngày tạo gợi ý
    NoiDungGoiY NVARCHAR(500) NOT NULL, -- Nội dung gợi ý (e.g., 'Giảm 500 calo hôm nay')
	DaHoanThanh BIT DEFAULT 0, -- User đã làm theo chưa
	NgayHoanThanh DATETIME,
    DiemThuong INT, -- Điểm thưởng nếu hoàn thành
	CONSTRAINT FK_AIGoiY_Users FOREIGN KEY (UserID)
        REFERENCES Users(UserID) ON DELETE CASCADE
);
GO

-- 1. Phân tích xu hướng
CREATE TABLE AIPhanTichXuHuong (
    PhanTichID INT PRIMARY KEY IDENTITY(1,1),
    UserID VARCHAR(20) NOT NULL, -- Liên kết với Users
    NgayPhanTich DATE DEFAULT CAST(GETDATE() AS DATE), -- Ngày thực hiện phân tích (mặc định = ngày hiện tại)
    LoaiChiSo NVARCHAR(50), -- Loại chỉ số được phân tích:  'Weight', 'Calories', 'Steps', 'Sleep'
    HuongXuHuong NVARCHAR(20),  -- Xu hướng biến động của chỉ số: 'Increasing', 'Decreasing', 'Stable'
    TyLeThayDoi FLOAT,  -- Mức thay đổi phần trăm so với kỳ trước (vd: +10% hoặc -5%)
    NhanXet NVARCHAR(500), -- Phân tích chi tiết / nhận xét của AI: "Your weight increased 2kg in 2 weeks"
    MucDo NVARCHAR(20), -- Mức độ quan trọng: 'ThongTin', 'CanhBao', 'NghiemTrong'
	CONSTRAINT FK_AIPhanTichXuHuong_Users FOREIGN KEY (UserID)
        REFERENCES Users(UserID) ON DELETE CASCADE
);

-- 2. Cảnh báo rủi ro sức khỏe
CREATE TABLE AICanhBaoSucKhoe (
    CanhBaoID INT PRIMARY KEY IDENTITY(1,1),
    UserID VARCHAR(20) NOT NULL, -- Liên kết với Users
    NgayCanhBao DATE DEFAULT CAST(GETDATE() AS DATE), -- Ngày phát sinh cảnh báo (mặc định = hôm nay)
    LoaiRuiRo NVARCHAR(50),  -- Loại rủi ro sức khỏe được phát hiện: 'HighBMI', 'LowActivity', 'InsufficientSleep', 'HighCalorieIntake'
    MucDo NVARCHAR(20), -- Mức độ nghiêm trọng của rủi ro: 'Low', 'Medium', 'High', 'Critical'
    NoiDung NVARCHAR(500), -- Nội dung chi tiết cảnh báo "Your BMI is 30, risk of cardiovascular disease"
    HanhDongDeXuat NVARCHAR(500), -- Hành động đề xuất cho người dùng vd: "Consult a doctor, reduce calorie intake by 500/day"
    DaBoQua BIT DEFAULT 0, -- 0 = cảnh báo còn hiệu lực, 1 = người dùng đã bỏ qua / đánh dấu đã xem
    NgayBoQua DATETIME,
	CONSTRAINT FK_AICanhBaoSucKhoe_Users FOREIGN KEY (UserID)
        REFERENCES Users(UserID) ON DELETE CASCADE
);

-- Bảng NhacNho: Quản lý nhắc nhở thông minh (kết hợp NotifyIcon và thời tiết)
CREATE TABLE NhacNho (
    NhacNhoID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng, khóa chính
    UserID VARCHAR(20) NOT NULL, -- Liên kết với Users
    ThoiGianNhac DATETIME NOT NULL, -- Thời gian nhắc nhở
    NoiDung NVARCHAR(200) NOT NULL, -- Nội dung nhắc nhở (e.g., 'Đi 2000 bước nữa!')
    KichHoat BIT DEFAULT 1, -- Trạng thái kích hoạt (1: active, 0: inactive)
    DieuKienThoiTiet NVARCHAR(50), -- Điều kiện thời tiết liên quan (e.g., 'Sunny')
    NgayTao DATETIME DEFAULT GETDATE(), -- Ngày tạo nhắc nhở
	CONSTRAINT FK_NhacNho_Users FOREIGN KEY (UserID)
        REFERENCES Users(UserID) ON DELETE CASCADE
);
GO

-- Bảng ThongBao: Lưu lịch sử thông báo (icon hộp thư, đã đọc/chưa)
CREATE TABLE ThongBao (
    ThongBaoID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng, khóa chính
    UserID VARCHAR(20) NOT NULL, -- Liên kết với Users
    NoiDung NVARCHAR(500), -- Nội dung thông báo (e.g., 'Bạn vừa mở khóa badge Marathon Runner!')
    Loai NVARCHAR(50), -- Loại: 'Reminder' (nhắc nhở), 'Achievement' (thành tựu), 'Goal' (mục tiêu), 'PT' (tin nhắn PT), 'AIRecommendation' (gợi ý AI)
    MaLienQuan INT, -- ID liên quan (e.g., GoalID, AchievementID, BookingID), dùng để navigate khi click
    DaDoc BIT DEFAULT 0, -- Trạng thái: 0 (chưa đọc - highlight), 1 (đã đọc)
    NgayTao DATETIME DEFAULT GETDATE() -- Ngày tạo, sắp xếp newest first
	CONSTRAINT FK_ThongBao_Users FOREIGN KEY (UserID)
        REFERENCES Users(UserID) ON DELETE CASCADE
);
GO

-- Bảng KeHoachTapLuyen: Lưu kế hoạch tập luyện (AI gợi ý hoặc người dùng tự tạo)
CREATE TABLE KeHoachTapLuyen (
    KeHoachID VARCHAR(20) PRIMARY KEY, -- Mã kế hoạch (ví dụ: plan_0001)
	UserID VARCHAR(20) NOT NULL, -- Liên kết với Users
    MucTieuID VARCHAR(20) NULL, -- Liên kết tới Goals (có thể null)
    TenKeHoach NVARCHAR(100) NOT NULL, -- Tên kế hoạch (vd: "12-week Strength Training")
    LoaiKeHoach NVARCHAR(50), -- Loại kế hoạch: 'Cardio', 'Strength', 'Yoga', 'Mixed', ...
    MucDo NVARCHAR(20), -- Mức độ: 'Beginner', 'Intermediate', 'Advanced'
    SoTuan INT, -- Thời lượng toàn bộ kế hoạch (tính theo tuần)
    SoBuoi INT, -- Số buổi tập mỗi tuần (ví dụ: 3, 5, 7)
    ThoiLuongPhut INT, -- Thời lượng mỗi buổi tập (tính bằng phút)
    CaloTieuHaoMoiBuoi FLOAT, -- Ước tính calo tiêu hao mỗi buổi tập
    Nguon NVARCHAR(20), -- Nguồn tạo kế hoạch: 'AI' (tự động), 'User' (người dùng), 'PT' (huấn luyện viên)
    DangSuDung BIT DEFAULT 1, -- 1 = đang sử dụng, 0 = đã lưu trữ/không còn dùng
    NgayTao DATETIME DEFAULT GETDATE(), -- Ngày tạo kế hoạch
	-- Khóa ngoại
    CONSTRAINT FK_KeHoachTapLuyen_Users FOREIGN KEY (UserID)
        REFERENCES Users(UserID) ON DELETE CASCADE,
    CONSTRAINT FK_KeHoachTapLuyen_Goals FOREIGN KEY (MucTieuID)
        REFERENCES MucTieu(MucTieuID) ON DELETE NO ACTION,

    -- RÀNG BUỘC KIỂM TRA GIÁ TRỊ HỢP LỆ
    CONSTRAINT CK_KeHoachTapLuyen_MucDo
        CHECK (MucDo IN ('Beginner', 'Intermediate', 'Advanced')),

    CONSTRAINT CK_ExercisePlans_Source 
        CHECK (Nguon IN ('AI', 'User', 'PT'))
);
GO

-- Bảng ChiTietKeHoachTapLuyen: Lưu chi tiết bài tập của từng kế hoạch
CREATE TABLE ChiTietKeHoachTapLuyen (
    ChiTietID INT PRIMARY KEY IDENTITY(1,1), -- Mã chi tiết tự tăng
	KeHoachID VARCHAR(20) NOT NULL, -- Liên kết đến kế hoạch tập
    TenBaiTap NVARCHAR(100) NOT NULL, -- Tên bài tập (vd: "Push-ups", "Running", "Squats")
    SoHiep INT, -- Số hiệp tập
    SoLan INT, -- Số lần mỗi hiệp
	CaloTieuHaoDuKien FLOAT, 
    ThoiGianPhut INT, -- Thời gian tập (phút), dùng cho bài dạng cardio
    NgayTrongTuan INT, -- Ngày trong tuần: 1 = Monday, ..., 7 = Sunday
    Tuan INT, -- Tuần thứ mấy trong kế hoạch (giúp sắp xếp và theo dõi tiến độ)
    ThuTuHienThi INT DEFAULT 0,  -- Thứ tự hiển thị (dùng trong UI)
	DanhGiaDoKho INT CHECK (DanhGiaDoKho BETWEEN 1 AND 5),-- Đánh giá độ khó (1 = dễ, 5 = cực khó)
	DanhGiaHieuQua INT CHECK (DanhGiaHieuQua BETWEEN 1 AND 5),-- Đánh giá hieu qua (1 = dễ, 5 = cực khó)
    VideoUrl NVARCHAR(500), -- Link video hướng dẫn bài tập (nếu có)
    CanhBao NVARCHAR(500), -- Ghi chú cho bài tập (vd: “Chú ý giữ lưng thẳng”)
    NoiDung NVARCHAR(1000),
	HuongDan NVARCHAR(1000),
    -- RÀNG BUỘC HỢP LỆ
    CONSTRAINT CK_ChiTietKeHoachTapLuyen_NgayTrongTuan
        CHECK (NgayTrongTuan BETWEEN 1 AND 7),

    CONSTRAINT CK_ChiTietKeHoachTapLuyens_Tuan
        CHECK (Tuan >= 1),
	 -- Khóa ngoại
    CONSTRAINT FK_ChiTietKeHoachTapLuyen_KeHoachTapLuyen
        FOREIGN KEY (KeHoachID) REFERENCES KeHoachTapLuyen(KeHoachID)
        ON DELETE CASCADE
);
GO


-- BẢNG THEO DÕI: NhatKyHoanThanhBaiTap, Lưu lại lịch sử hoàn thành bài tập của người dùng
CREATE TABLE NhatKyHoanThanhBaiTap (
    NhatKyID INT PRIMARY KEY IDENTITY(1,1), -- Mã log tự tăng
    UserID VARCHAR(20) NOT NULL, -- Người thực hiện bài tập
    ChiTietID INT NOT NULL, -- Liên kết đến bài tập cụ thể trong kế hoạch
    NgayHoanThanh DATE NOT NULL, -- Ngày thực hiện bài tập
    SoHiepThucTe INT,  -- Số hiệp thực tế hoàn thành
    SoLanThucTe INT,  -- Số lần thực tế mỗi hiệp
    ThoiLuongThucTePhut INT, -- Thời lượng thực tế (phút)
    CaloTieuHao FLOAT,  -- Lượng calo tiêu hao thực tế
    DanhGiaBaiTap INT CHECK (DanhGiaBaiTap BETWEEN 1 AND 5), -- người dùng đánh giá 
    GhiChu NVARCHAR(500), -- Ghi chú sau khi tập (vd: “Hôm nay hơi mệt”, “Giảm 5kg tạ”)
    -- Khóa ngoại
    CONSTRAINT FK_NhatKyHoanThanhBaiTap_Users
        FOREIGN KEY (UserID) REFERENCES Users(UserID)
        ON DELETE CASCADE,

    CONSTRAINT FK_NhatKyHoanThanhBaiTap_ChiTietKeHoachTapLuyen
        FOREIGN KEY (ChiTietID) REFERENCES ChiTietKeHoachTapLuyen(ChiTietID)
        ON DELETE  NO ACTION,

    -- MỖI USER CHỈ ĐƯỢC GHI LOG 1 LẦN CHO MỖI BÀI / NGÀY
    CONSTRAINT UK_NhatKyHoanThanhBaiTap
        UNIQUE (UserID, ChiTietID, NgayHoanThanh)
);
GO


-- Bảng NhatKyTamTrang: Theo dõi tâm trạng để hỗ trợ sức khỏe tinh thần
CREATE TABLE NhatKyTamTrang (
    TamTrangID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng, khóa chính
    UserID VARCHAR(20) NOT NULL, -- Liên kết với Users
    NgayGhi DATE NOT NULL, -- Ngày ghi log tâm trạng
    TamTrang NVARCHAR(50), -- Tâm trạng (e.g., 'Happy', 'Stressed')
    MucDoStress INT, -- Mức stress (1-10)
    GhiChu NVARCHAR(500), -- Ghi chú (e.g., 'Căng thẳng do công việc')
    CONSTRAINT UK_NhatKyTamTrang UNIQUE (UserID, NgayGhi), -- Đảm bảo 1 log tâm trạng/ngày/user
	CONSTRAINT FK_NhatKyTamTrang_Users FOREIGN KEY (UserID)
        REFERENCES Users(UserID) ON DELETE CASCADE
);
GO

-- Bảng SyncLogs: Theo dõi lịch sử đồng bộ với cloud (e.g., OneDrive)
CREATE TABLE NhatKyDongBo (
    DongBoID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng, khóa chính
    UserID VARCHAR(20) NOT NULL, -- Liên kết với Users
    NgayDongBo DATETIME DEFAULT GETDATE(), -- Ngày đồng bộ
    TrangThaiDongBo NVARCHAR(20), -- Trạng thái (e.g., 'Success', 'Failed')
    NoiDongBo NVARCHAR(50), -- Nơi đồng bộ (e.g., 'OneDrive')
    ChiTiet NVARCHAR(500), -- Chi tiết lỗi nếu có
	CONSTRAINT FK_NhatKyDongBo_Users FOREIGN KEY (UserID)
        REFERENCES Users(UserID) ON DELETE CASCADE
);
GO

-- Bảng NhatKyUngDung: Ghi log lỗi và hoạt động hệ thống
CREATE TABLE NhatKyUngDung (
    NhatKyID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng, khóa chính
    UserID VARCHAR(20), -- Liên kết với Users, có thể null nếu log hệ thống
    ThoiGian DATETIME DEFAULT GETDATE(), -- Thời gian ghi log
    MucDoLog NVARCHAR(20), -- Mức log (e.g., 'Info', 'Error', 'Warning')
    NoiDung NVARCHAR(MAX) NOT NULL -- Nội dung log (e.g., 'Lỗi gọi API thời tiết')
	CONSTRAINT FK_NhatKyUngDung_Users FOREIGN KEY (UserID) REFERENCES Users(UserID)
);
GO

-- Bảng HuanLuyenVien: Chi tiết profile PT
CREATE TABLE HuanLuyenVien  (
    PTID VARCHAR(20) PRIMARY KEY, -- ptr_0001
    UserID VARCHAR(20) NOT NULL, -- Liên kết với Users
    ChungChi NVARCHAR(500), -- Chứng chỉ (e.g., 'ACE Certified')
    ChuyenMon NVARCHAR(200), -- Chuyên môn (e.g., 'Weight Loss, Yoga')
	SoNamKinhNghiem INT, -- Số năm kinh nghiệm
	ThanhPho NVARCHAR(50), -- Thành phố (cho in-person sessions)
    GiaTheoGio FLOAT, -- Giá/giờ
    TieuSu NVARCHAR(1000), -- Tiểu sử
    AnhDaiDien NVARCHAR(255), -- Đường dẫn ảnh
	AnhCCCD NVARCHAR(255), -- Đường dẫn ảnh cccd
	AnhChanDung NVARCHAR(255), -- Đường dẫn ảnh 
	FileTaiLieu NVARCHAR(255), -- Đường dẫn file
    DaXacMinh BIT DEFAULT 0, -- Xác minh chứng chỉ
	GioRanh NVARCHAR(500), -- Giờ rảnh, lưu dạng JSON
	SoKhachHienTai INT DEFAULT 0, -- Số client hiện tại
	NhanKhach BIT DEFAULT 1, -- 1: nhận client mới, 0: full
	TongDanhGia INT, -- Số lượt đánh giá
	DiemTrungBinh FLOAT, --điểm đánh giá: Tính từ Reviews
	TiLeThanhCong FLOAT, 
	CONSTRAINT FK_HuanLuyenVien_Users FOREIGN KEY (UserID)
        REFERENCES Users(UserID) ON DELETE CASCADE
);
GO

-- Bảng DatLichPT: Quản lý đặt lịch thuê PT
CREATE TABLE DatLichPT (
    DatLichID VARCHAR(20) PRIMARY KEY, -- bkg_0001
    KhacHangID VARCHAR(20) NOT NULL, -- User đặt lịch (Role='Client')
    PTID VARCHAR(20) NULL,    -- PT được chọn (có thể null nếu chưa phân công)
    NgayGioDat DATETIME NOT NULL, -- Ngày giờ tập (e.g., '2025-10-10 08:00'), schedule calendar
    LoaiBuoiTap NVARCHAR(50), -- Loại buổi tập: 'Online' (video call), 'In-person' (trực tiếp)
    TrangThai NVARCHAR(20) DEFAULT 'Pending', -- Trạng thái: 'Pending' (chờ confirm), 'Confirmed' (đã xác nhận), 'Completed' (hoàn thành), 'Cancelled' (hủy)
	LyDoTuChoi NVARCHAR(500), -- Lý do PT từ chối (nếu Status='Cancelled')
	NguoiHuy VARCHAR(20), -- UserID của người hủy (Client hoặc Trainer)
    TienHoan FLOAT, -- Số tiền hoàn lại (nếu cancel trước 24h)
    ChoXemSucKhoe BIT DEFAULT 0, -- Cấp quyền PT xem sức khỏe: 1 (cho phép), 0 (không), privacy control
    GhiChu NVARCHAR(500), -- Ghi chú (e.g., 'Tập tại phòng gym A', 'Yêu cầu tăng cường cardio'), special requests
    NgayTao DATETIME DEFAULT GETDATE(), -- Ngày tạo booking, audit trail
	-- KHÓA NGOẠI
    CONSTRAINT FK_DatLichPT_KhachHang
        FOREIGN KEY (KhacHangID) REFERENCES Users(UserID)
        ON DELETE CASCADE, -- Nếu user bị xóa → xóa booking

    CONSTRAINT FK_DatLichPT_HuanLuyenVien
		FOREIGN KEY (PTID) REFERENCES HuanLuyenVien(PTID)
		ON DELETE NO ACTION
);
GO

-- Bảng DanhGiaPT: Đánh giá PT
CREATE TABLE DanhGiaPT (
    DanhGiaID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng, khóa chính
    KhachHangID VARCHAR(20) NOT NULL, -- Người đánh giá
    PTID VARCHAR(20) NOT NULL, -- PT được đánh giá
    Diem INT CHECK (Diem BETWEEN 1 AND 5), -- Điểm (1-5 sao), constraint đảm bảo valid range
    BinhLuan NVARCHAR(500), -- Bình luận (e.g., 'PT rất nhiệt tình, giúp tôi giảm 5kg'), public feedback
    NgayDanhGia DATETIME DEFAULT GETDATE(), -- Ngày đánh giá, sort newest first
	-- RÀNG BUỘC
    CONSTRAINT FK_DanhGiaPTs_Client
        FOREIGN KEY (KhachHangID) REFERENCES Users(UserID)
        ON DELETE CASCADE, -- Nếu client bị xóa → xóa review

    CONSTRAINT FK_DanhGiaPT_Trainer
		FOREIGN KEY (PTID) REFERENCES HuanLuyenVien(PTID)
		ON DELETE NO ACTION,

    -- MỖI CLIENT CHỈ REVIEW 1 PT 1 LẦN (nếu không có BookingID riêng)
    CONSTRAINT UK_DanhGiaPT_ClientTrainer UNIQUE (KhachHangID, PTID)
);
GO

-- Bảng TinNhan: Chat giữa PT và Client (real-time messaging)
CREATE TABLE TinNhan (
    TinNhanID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng, khóa chính
    NguoiGuiID VARCHAR(20) NOT NULL, -- Người gửi (Client hoặc PT)
    NguoiNhanID VARCHAR(20) NOT NULL, -- Người nhận (Client hoặc PT)
    DatLichID VARCHAR(20) NULL, -- Liên kết với buổi tập (nếu có)
    NoiDung NVARCHAR(MAX), -- Nội dung tin nhắn (text, có thể mở rộng cho image/file URL)
    DaDoc BIT DEFAULT 0, -- Trạng thái đọc: 0 (chưa đọc - highlight), 1 (đã đọc)
    NgayGui DATETIME DEFAULT GETDATE(), -- Ngày giờ gửi, sắp xếp theo timeline
	-- KHÓA NGOẠI
    CONSTRAINT FK_TinNhan_NguoiGui FOREIGN KEY (NguoiGuiID)
        REFERENCES Users(UserID) ON DELETE CASCADE,

    CONSTRAINT FK_TinNhan_NguoiNhan FOREIGN KEY (NguoiNhanID)
		REFERENCES Users(UserID),

    CONSTRAINT FK_Messages_Booking FOREIGN KEY (DatLichID)
        REFERENCES DatLichPT(DatLichID)
);
GO

-- Bảng QuyenPT_KhachHang: Phân quyền PT truy cập sức khỏe Client (privacy control)
CREATE TABLE QuyenPT_KhachHang (
    QuyenID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng, khóa chính
    KhachHangID VARCHAR(20) NOT NULL, -- User cho phép (Role='Client')
    PTID VARCHAR(20) NOT NULL, -- PT được cấp quyền
    NgayCapQuyen DATETIME DEFAULT GETDATE(), -- Ngày cấp quyền, audit trail
    DangHoatDong BIT DEFAULT 1, -- Trạng thái: 1 (đang active - PT xem được), 0 (revoked - thu hồi quyền)
	-- KHÓA NGOẠI
    CONSTRAINT FK_QuyenPT_KhachHang_KhachHang
        FOREIGN KEY (KhachHangID) REFERENCES Users(UserID)
        ON DELETE CASCADE,

    CONSTRAINT FK_QuyenPT_KhachHang_HLV
		FOREIGN KEY (PTID) REFERENCES HuanLuyenVien(PTID)
		ON DELETE NO ACTION,

    -- RÀNG BUỘC DUY NHẤT
    CONSTRAINT UK_ClientPTAccess UNIQUE (KhachHangID, PTID)
);
GO

-- Bảng GiaoDich: Quản lý thanh toán PT (thu phí, hoa hồng app)
CREATE TABLE GiaoDich (
    GiaoDichID VARCHAR(20) PRIMARY KEY, -- txn_YYYYMMDD_NNN
    DatLichID VARCHAR(20) NOT NULL, -- Liên kết booking
    KhachHangID VARCHAR(20) NOT NULL, -- Người thanh toán
    PTID VARCHAR(20) NOT NULL, -- PT nhận tiền
    SoTien FLOAT NOT NULL, -- Số tiền (e.g., 500000 VND), gross amount
    HoaHongApp FLOAT, -- Hoa hồng app (e.g., 15% = 75000 VND), revenue app
    SoTienPTNhan FLOAT, -- Số tiền PT nhận (Amount - AppCommission), net revenue PT
    TrangThaiThanhToan NVARCHAR(20) DEFAULT 'Pending', -- Trạng thái: 'Pending' (chờ), 'Completed' (hoàn tất), 'Refunded' (hoàn tiền)
    PhuongThucThanhToan NVARCHAR(50), -- Phương thức (e.g., 'Credit Card', 'PayPal', 'Bank Transfer'), user preference
    NgayGiaoDich DATETIME DEFAULT GETDATE(), -- Ngày giao dịch, financial reporting
	-- KHÓA NGOẠI
    CONSTRAINT FK_GiaoDich_DatLichPT
        FOREIGN KEY (DatLichID) REFERENCES DatLichPT(DatLichID)
        ON DELETE CASCADE,

    CONSTRAINT FK_GiaoDich_KhachHang
        FOREIGN KEY (KhachHangID) REFERENCES Users(UserID),

    CONSTRAINT FK_GiaoDich_HLV
        FOREIGN KEY (PTID) REFERENCES HuanLuyenVien(PTID),

    -- RÀNG BUỘC GIÁ TRỊ
    CONSTRAINT CK_Transactions_Status
        CHECK (TrangThaiThanhToan IN ('Pending', 'Completed', 'Refunded')),

    -- ĐẢM BẢO 1 BOOKING CHỈ CÓ 1 TRANSACTION
    CONSTRAINT UQ_GiaoDich_DatLichPT UNIQUE (DatLichID)
);
GO

-- ============================================================================
-- PHẦN 5: SOCIAL FEATURES - Friends & Sharing (NICE-TO-HAVE)
-- ============================================================================

-- Bang BanBe - Quản lý quan hệ bạn bè
CREATE TABLE BanBe (
    BanBeID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng, khóa chính
	UserID VARCHAR(20) NOT NULL, -- User gửi friend request
    NguoiNhanID VARCHAR(20) NOT NULL, -- User nhận friend request
    TrangThai NVARCHAR(20) DEFAULT 'Pending', -- Trạng thái: 'Pending' (chờ accept), 'Accepted' (đã kết bạn), 'Blocked' (chặn)
    NgayGui DATETIME DEFAULT GETDATE(), -- Ngày gửi friend request
    NgayChapNhan DATETIME, -- Ngày accept (NULL nếu vẫn Pending hoặc Blocked)
    CONSTRAINT CK_BanBe_NotSelf CHECK (UserID != NguoiNhanID), -- Không thể kết bạn với chính mình
    CONSTRAINT UK_BanBe UNIQUE (UserID, NguoiNhanID), -- Mỗi cặp user chỉ có 1 friendship record
    CONSTRAINT CK_BanBe_TrangThai CHECK (TrangThai IN ('Pending', 'Accepted', 'Blocked')),
	-- Khóa ngoại
    CONSTRAINT FK_BanBe_User FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    CONSTRAINT FK_BanBe_NguoiNhan FOREIGN KEY (NguoiNhanID) REFERENCES Users(UserID)
);
GO


-- ChiaSeThanhTuu table - Chia sẻ thành tích với bạn bè
CREATE TABLE ChiaSeThanhTuu (
    ChiaSeID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng, khóa chính
    ThanhTuuID INT NOT NULL,       -- Thành tích được chia sẻ
    NguoiChiaSe VARCHAR(20) NOT NULL,    -- Người chia sẻ -> UserID
    NgayChiaSe DATETIME DEFAULT GETDATE(), -- Ngày share
    DoiTuongXem NVARCHAR(20) DEFAULT 'Friends', -- Ai thấy được: 'Public' (mọi người), 'Friends' (chỉ bạn bè), 'Private' (chỉ mình - draft)
    ChuThich NVARCHAR(500), -- Chú thích khi share (e.g., "Finally hit 10k steps! 💪"), optional
    SoLuongThich INT DEFAULT 0, -- Số lượt like, cập nhật bởi trigger hoặc application
    CONSTRAINT CK_ChiaSeThanhTuu_DoiTuongXem CHECK (DoiTuongXem IN ('Public', 'Friends', 'Private')),
	-- Khóa ngoại
    CONSTRAINT FK_ChiaSeThanhTuu_ThanhTuu FOREIGN KEY (ThanhTuuID) 
        REFERENCES ThanhTuu(ThanhTuuID) ON DELETE CASCADE,

    CONSTRAINT FK_ChiaSeThanhTuu_User FOREIGN KEY (NguoiChiaSe) 
        REFERENCES Users(UserID)
);
GO

-- LuotThichChiaSeThanhTuu table - Likes cho shared achievements
CREATE TABLE LuotThichChiaSeThanhTuu (
    ThichID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng
    ChiaSeID INT NOT NULL,         -- Thành tích được like
    UserID VARCHAR(20) NOT NULL,  -- Người dùng like
    NgayThich DATETIME DEFAULT GETDATE(), -- Ngày like
    CONSTRAINT UK_Like UNIQUE (ChiaSeID, UserID), -- Mỗi user chỉ like 1 lần
	-- Khóa ngoại
    CONSTRAINT FK_LuotThichChiaSeThanhTuu_ChiaSe FOREIGN KEY (ChiaSeID) 
        REFERENCES ChiaSeThanhTuu(ChiaSeID) ON DELETE CASCADE,

    CONSTRAINT FK_LuotThichChiaSeThanhTuu_User FOREIGN KEY (UserID) 
        REFERENCES Users(UserID)
);
GO


-- ============================================================================
-- PHẦN 6: WORKOUT & MEAL TEMPLATES - PT tạo plans cho clients (NICE-TO-HAVE)
-- ============================================================================

-- MauTapLuyen - PT tạo workout templates có thể reuse
CREATE TABLE MauTapLuyen (
    MauTapLuyenID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng, khóa chính
    NguoiTao VARCHAR(20), -- PT nào tạo template (NULL nếu system template)
    TenMauTapLuyen NVARCHAR(100) NOT NULL, -- Tên template (e.g., "Beginner Full Body Workout", "Advanced HIIT")
    MoTa NVARCHAR(500), -- Mô tả chi tiết (e.g., "4-week program for weight loss")
    DoKho NVARCHAR(20), -- Độ khó: 'Beginner' (người mới), 'Intermediate' (trung bình), 'Advanced' (nâng cao)
    MucTieu NVARCHAR(50), -- Mục tiêu: 'WeightLoss', 'MuscleGain', 'Endurance', 'Flexibility'
    SoTuan INT, -- Thời lượng chương trình (tuần), e.g., 4, 8, 12 weeks
    CaloUocTinh INT, -- Ước tính calorie burn/session (average)
    ThietBiCan NVARCHAR(200), -- Thiết bị cần (e.g., "Dumbbells, Resistance bands", "No equipment")
    CongKhai BIT DEFAULT 0, -- Template công khai: 0 (private - chỉ PT dùng), 1 (public - mọi người thấy)
    DaXacThuc BIT DEFAULT 0, -- Được verify bởi admin: 0 (chưa), 1 (đã kiểm tra chất lượng)
    SoLanSuDung INT DEFAULT 0, -- Số lần template được sử dụng (popularity metric)
    DiemTrungBinh FLOAT, -- Đánh giá trung bình (1-5 sao), tính từ user feedback
    NgayTao DATETIME DEFAULT GETDATE(), -- Ngày tạo template
    NgayChinhSua DATETIME DEFAULT GETDATE(), -- Ngày chỉnh sửa gần nhất
    CONSTRAINT CK_MauTapLuyen_DoKho CHECK (DoKho IN ('Beginner', 'Intermediate', 'Advanced')),
    CONSTRAINT CK_MauTapLuyen_SoTuan CHECK (SoTuan > 0 AND SoTuan <= 52), -- Max 1 năm
	-- KHÓA NGOẠI
    CONSTRAINT FK_MauTapLuyen_HLV FOREIGN KEY (NguoiTao)
        REFERENCES HuanLuyenVien(PTID)
);
GO

-- Bảng ChiTietMauTapLuyen: Chi tiết bài tập trong template
CREATE TABLE ChiTietMauTapLuyen (
    BaiTapID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng, khóa chính
    MauTapLuyenID INT NOT NULL, -- Template nào
    TenbaiTap NVARCHAR(100) NOT NULL, -- Tên bài tập (e.g., "Push-ups", "Squats", "Plank")
	SoSets INT, -- Số sets (e.g., 3 sets), NULL nếu là cardio
    SoReps INT, -- Số reps/set (e.g., 10 reps), NULL nếu là time-based
    ThoiLuongPhut INT, -- Thời gian (phút), dùng cho cardio hoặc isometric (e.g., Plank 2 min)
    ThoiGianNghiGiay INT, -- Thời gian nghỉ giữa sets (giây, e.g., 60s)
    Tuan INT, -- Tuần thứ mấy trong program (1-12), cho progressive overload
    NgayTrongTuan INT, -- Ngày thứ mấy trong tuần (1=Monday, 7=Sunday)
    ThuTuHienThi INT DEFAULT 0, -- Thứ tự hiển thị trong workout session
    VideoUrl NVARCHAR(500), -- Link video hướng dẫn (e.g., YouTube), optional
    GhiChu NVARCHAR(500), -- Ghi chú kỹ thuật (e.g., "Keep back straight", "Exhale on push")
    CONSTRAINT CK_ChiTietMauTapLuyen_Tuan CHECK (Tuan >= 1 AND Tuan <= 52),
    CONSTRAINT CK_ChiTietMauTapLuyen_NgayTrongTuan CHECK (NgayTrongTuan BETWEEN 1 AND 7),
	-- KHÓA NGOẠI
    CONSTRAINT FK_ChiTietMauTapLuyen_MauTapLuyen
        FOREIGN KEY (MauTapLuyenID) REFERENCES MauTapLuyen(MauTapLuyenID)
        ON DELETE CASCADE
);
GO

-- Bảng GiaoBaiTapChoUser: Giao template tập luyện cho người dùng
CREATE TABLE GiaoBaiTapChoUser (
    GiaBtID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng
    UserID VARCHAR(20) NOT NULL,  -- User nào được assign
    MauTapLuyenID INT NOT NULL,   -- Template nào
    NguoiGiao VARCHAR(20),   -- PT nào assign (NULL nếu user tự chọn)
    NgayBatDau DATE NOT NULL, -- Ngày bắt đầu program
    NgayKetThuc DATE, -- Ngày kết thúc (calculated: StartDate + DurationWeeks)
    TuanHienTai INT DEFAULT 1, -- Tuần hiện tại user đang ở (1-12), update theo tiến độ
    TiLeHoanThanh FLOAT DEFAULT 0, -- % hoàn thành (0-100), calculated từ completed exercises
    TrangThai NVARCHAR(20) DEFAULT 'Active', -- Trạng thái: 'Active' (đang tập), 'Completed' (hoàn thành), 'Paused' (tạm dừng), 'Cancelled' (hủy)
    NgayGiao DATETIME DEFAULT GETDATE(), -- Ngày assign

	CONSTRAINT FK_GiaoBaiTapChoUser_User
		FOREIGN KEY (UserID) REFERENCES Users(UserID)
		ON DELETE CASCADE,  -- GIỮ CASCADE (quan hệ chính)

	CONSTRAINT FK_GiaoBaiTapChoUser_MauTapLuyen
		FOREIGN KEY (MauTapLuyenID) REFERENCES MauTapLuyen(MauTapLuyenID)
		ON DELETE NO ACTION,  --ĐỔI THÀNH NO ACTION (tránh conflict)

	CONSTRAINT FK_GiaoBaiTapChoUser_NguoiGiao
		FOREIGN KEY (NguoiGiao) REFERENCES HuanLuyenVien(PTID)
		ON DELETE NO ACTION,

    CONSTRAINT CK_GiaoBaiTapChoUser_TrangThai CHECK (TrangThai IN ('Active', 'Completed', 'Paused', 'Cancelled')),
    CONSTRAINT CK_GiaoBaiTapChoUser_TiLeHoanThanh CHECK (TiLeHoanThanh >= 0 AND TiLeHoanThanh <= 100)
);
GO

-- Bảng TheoDoiHoanThanhBaiTap: Theo dõi việc người dùng hoàn thành bài tập
CREATE TABLE TheoDoiHoanThanhBaiTap (
    TheoDoiID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng
    GiaBtID INT NOT NULL, -- Assignment nào
    BaiTapID INT NOT NULL, -- Exercise nào
    NgayHoanThanh DATE NOT NULL, -- Ngày hoàn thành
    SoSetThucTe INT, -- Số sets thực tế hoàn thành (có thể khác template)
    SoRepThucTe INT, -- Số reps thực tế
    ThoiGianThucTe INT, --  Thời gian thực tế (phút)
    CaloTieuHao FLOAT, -- Calories burn ước tính (từ ActualDuration và exercise type)
    DoKho INT, -- User đánh giá độ khó (1-5), 1=Very easy, 5=Very hard
    GhiChu NVARCHAR(500), -- Ghi chú của user (e.g., "Felt tired", "Increased weight")
    CONSTRAINT CK_TheoDoiHoanThanhBaiTap_DoKho CHECK (DoKho BETWEEN 1 AND 5),
	CONSTRAINT FK_TheoDoiHoanThanhBaiTap_Assignment 
        FOREIGN KEY (GiaBtID) 
        REFERENCES GiaoBaiTapChoUser(GiaBtID)
        ON DELETE CASCADE,

    CONSTRAINT FK_TheoDoiHoanThanhBaiTap_Exercise 
        FOREIGN KEY (BaiTapID) 
        REFERENCES ChiTietMauTapLuyen(BaiTapID)
);
GO

-- Bảng KeHoachAnUong: PT tạo kế hoạch ăn uống
CREATE TABLE KeHoachAnUong (
    KeHoachAnUongID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng, khóa chính
    NguoiTao VARCHAR(20) NULL, -- PT nào tạo (NULL nếu system plan)
    TenKeHoach NVARCHAR(100) NOT NULL, -- Tên plan (e.g., "Low Carb Diet", "Muscle Gain 3000 Kcal")
    MoTa NVARCHAR(500), -- Mô tả (e.g., "High protein, low carb for cutting")
    LuongCaloMucTieu INT, -- Target calorie/day (e.g., 2000, 2500, 3000)
    TiLeMacro NVARCHAR(50), -- Tỷ lệ Protein:Carbs:Fat (e.g., "40:30:30", "50:30:20")
    LoaiKeHoach NVARCHAR(50), -- Loại plan: 'WeightLoss', 'MuscleGain', 'Maintenance', 'Keto', 'Vegan'
    SoNgay INT, -- Thời lượng (ngày), e.g., 7 (1 tuần), 30 (1 tháng)
    CanhBaoDiUng NVARCHAR(200),  -- Cảnh báo dị ứng (vd: "Có sữa, hạt"), phân cách bằng dấu phẩy
    CongKhai BIT DEFAULT 0, -- Public plan: 0 (private), 1 (public)
    DaXacThuc BIT DEFAULT 0, -- Verify bởi nutritionist: 0 (chưa), 1 (đã)
    SoLanSuDung INT DEFAULT 0, -- Số lần được sử dụng
    DiemTrungBinh FLOAT, -- Rating trung bình (1-5)
    NgayTao DATETIME DEFAULT GETDATE(),
    NgayChinhSua DATETIME DEFAULT GETDATE(),
    CONSTRAINT CK_KeHoachAnUong_LuongCaloMucTieu CHECK (LuongCaloMucTieu > 0 AND LuongCaloMucTieu <= 10000),
    CONSTRAINT CK_KeHoachAnUong_SoNgay CHECK (SoNgay > 0 AND SoNgay <= 365),
	CONSTRAINT FK_KeHoachAnUong_NguoiTao
        FOREIGN KEY (NguoiTao) REFERENCES HuanLuyenVien(PTID)
);
GO
	
-- Bảng ChiTietKeHoachAnUong: Chi tiết món ăn trong kế hoạch ăn uống
CREATE TABLE ChiTietKeHoachAnUong (
    MonAnID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng
    KeHoachAnUongID INT NOT NULL, -- Khóa ngoại: Plan nào
    BuaAn NVARCHAR(20), -- Bữa ăn: 'Breakfast' (sáng), 'Lunch' (trưa), 'Dinner' (tối), 'Snack' (phụ)
    TenMonAn NVARCHAR(100) NOT NULL, -- Tên món (e.g., "Grilled Chicken Breast", "Brown Rice")
    KhauPhan NVARCHAR(50), -- Khẩu phần (e.g., "200g", "1 cup", "2 pieces")
    LuongCalo INT, -- Calorie của portion này
    Protein FLOAT, -- Protein (grams)
    Carbs FLOAT, -- Carbs (grams) Carbohydrate 
    ChatBeo FLOAT, -- Fat (grams)
    ChatXo FLOAT, -- Fiber (grams), quan trọng cho digestion (chất 
    ThuTrongKeHoach INT, -- Ngày thứ mấy trong plan (1-30), cho meal rotation
    ThuTuHienThi INT DEFAULT 0, -- Thứ tự trong bữa (appetizer → main → dessert)
    GhiChuCheBien NVARCHAR(500), -- Hướng dẫn chế biến (e.g., "Grill for 10 minutes")
    LinkCongThuc NVARCHAR(500), -- Link recipe chi tiết, optional
    CONSTRAINT CK_ChiTietKeHoachAnUong_BuaAn CHECK (BuaAn IN ('Breakfast', 'Lunch', 'Dinner', 'Snack')),
    CONSTRAINT CK_ChiTietKeHoachAnUong_DayNumber CHECK (ThuTrongKeHoach >= 1 AND ThuTrongKeHoach <= 365),
	CONSTRAINT FK_ChiTietKeHoachAnUong_KeHoachAnUong
        FOREIGN KEY (KeHoachAnUongID) REFERENCES KeHoachAnUong(KeHoachAnUongID)
        ON DELETE CASCADE
);
GO

-- Bảng PhanCongKeHoachAnUong: Phân công kế hoạch ăn uống cho người dùng
CREATE TABLE PhanCongKeHoachAnUong (
    PhanCongID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng
    UserID VARCHAR(20) NOT NULL, -- User nào
    KeHoachAnUongID INT NOT NULL, -- Plan nào
    NguoiGiao VARCHAR(20), -- PT nào assign (NULL nếu tự chọn)
    NgayBatDau DATE NOT NULL, -- Ngày bắt đầu
    NgayKetThuc DATE, -- Ngày kết thúc
    NgayHienTai INT DEFAULT 1, -- Ngày hiện tại trong plan (1-30)
    TiLeTuanThu FLOAT DEFAULT 0, -- % tuân thủ plan (0-100), calculated từ meal logs
    TrangThai NVARCHAR(20) DEFAULT 'Active', -- 'Active', 'Completed', 'Paused', 'Cancelled'
    NgayGiao DATETIME DEFAULT GETDATE(),
    CONSTRAINT CK_PhanCongKeHoachAnUong_TrangThai CHECK (TrangThai IN ('Active', 'Completed', 'Paused', 'Cancelled')),
    CONSTRAINT CK_PhanCongKeHoachAnUong_AdherenceRate CHECK (TiLeTuanThu >= 0 AND TiLeTuanThu <= 100),
	CONSTRAINT FK_PhanCongKeHoachAnUong_User
        FOREIGN KEY (UserID) REFERENCES Users(UserID)
        ON DELETE CASCADE,

    CONSTRAINT FK_PhanCongKeHoachAnUong_KeHoachAnUong
        FOREIGN KEY (KeHoachAnUongID) REFERENCES KeHoachAnUong(KeHoachAnUongID),

    CONSTRAINT FK_PhanCongKeHoachAnUong_NguoiGiao
        FOREIGN KEY (NguoiGiao) REFERENCES HuanLuyenVien(PTID)
);
GO

-- ============================================================================
-- PHẦN 7: SUBSCRIPTION SYSTEM - Premium membership (NICE-TO-HAVE)
-- ============================================================================

-- Bảng GoiThanhVien: Quản lý gói thành viên
CREATE TABLE GoiThanhVien (
    GoiThanhVienID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng
    UserID VARCHAR(20) NOT NULL, -- User nào subscribe
    LoaiGoi NVARCHAR(20) NOT NULL, -- Loại gói: 'Free' (miễn phí), 'Basic' (cơ bản - 99k/tháng), 'Premium' (cao cấp - 299k/tháng)
    NgayBatDau DATE NOT NULL, -- Ngày bắt đầu subscription
    NgayKetThuc DATE, -- Ngày hết hạn (NULL nếu lifetime hoặc đang active)
    TrangThai NVARCHAR(20) DEFAULT 'Active', -- Trạng thái: 'Active' (đang dùng), 'Expired' (hết hạn), 'Cancelled' (đã hủy), 'Suspended' (bị đình chỉ)
    SoTien FLOAT, -- Số tiền (VND), NULL nếu Free plan
    ChuKyThanhToan NVARCHAR(20), -- Chu kỳ thanh toán: 'Monthly' (hàng tháng), 'Yearly' (hàng năm - giảm 20%), 'Lifetime' (1 lần)
    NgayGiaHan DATE, -- Ngày gia hạn tiếp theo (auto-renewal), NULL nếu Cancelled
    PhuongThucThanhToan NVARCHAR(50), -- Phương thức: 'CreditCard', 'PayPal', 'BankTransfer', 'Momo', 'ZaloPay'
    TuDongGiaHan BIT DEFAULT 1, -- Tự động gia hạn: 1 (bật), 0 (tắt - expire sau EndDate)
    NgayDangKy DATETIME DEFAULT GETDATE(), -- Ngày đăng ký subscription
    NgayHuy DATETIME, -- Ngày user hủy (NULL nếu vẫn active)
    LyDoHuy NVARCHAR(500), -- Lý do hủy (feedback quan trọng!)
    CONSTRAINT CK_GoiThanhVien_LoaiGoi CHECK (LoaiGoi IN ('Free', 'Basic', 'Premium')),
    CONSTRAINT CK_GoiThanhVien_TrangThai CHECK (TrangThai IN ('Active', 'Expired', 'Cancelled', 'Suspended')),
    CONSTRAINT CK_GoiThanhVien_ChuKyThanhToan CHECK (ChuKyThanhToan IN ('Monthly', 'Yearly', 'Lifetime')),
	CONSTRAINT FK_GoiThanhVien_User FOREIGN KEY (UserID)
        REFERENCES Users(UserID)
        ON DELETE CASCADE
);
GO

-- Bảng TinhNangGoi: Quyền truy cập tính năng theo gói
CREATE TABLE TinhNangGoi (
    TinhNangID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng
    TenTinhNang NVARCHAR(50) UNIQUE NOT NULL, -- Tên feature (e.g., 'AI_Suggestions', 'Unlimited_Goals')
    GoiToiThieu NVARCHAR(20), -- Gói tối thiểu: 'Free' (mọi người), 'Basic', 'Premium' (chỉ Premium)
    MoTa NVARCHAR(200), -- Mô tả feature (marketing copy)
    ConHoatDong BIT DEFAULT 1, -- Feature còn active: 1 (đang dùng), 0 (deprecated)
    CONSTRAINT CK_FeatureAccess_RequiredPlan CHECK (GoiToiThieu IN ('Free', 'Basic', 'Premium'))
);
GO


-- ============================================================================
-- PHẦN 8: FILE STORAGE MANAGEMENT - Quản lý files upload (NICE-TO-HAVE)
-- ============================================================================

-- Bảng TapTin - Quản lý file upload
CREATE TABLE TapTin (
    TapTinID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng
    UserID VARCHAR(20) NOT NULL, -- User nào upload
    TenTapTin NVARCHAR(255) NOT NULL, -- Tên file gốc (vd: "anh_dai_dien.jpg")
    TenLuuTrenServer NVARCHAR(255) UNIQUE NOT NULL, -- Tên file trên server (vd: "a3b4c5d6-e7f8-g9h0.jpg"), unique để tránh overwrite
    DuongDan NVARCHAR(500) NOT NULL, -- Đường dẫn (e.g., "/uploads/users/123/", "https://blob.azure.com/...")
    KichThuoc BIGINT, -- Kích thước (bytes), check quota
    MimeType NVARCHAR(100), -- MIME type (e.g., "image/jpeg", "application/pdf"), validation
    LoaiFile NVARCHAR(50), -- Category: 'Image', 'PDF', 'Excel', 'Video', 'Document'
    MucDich NVARCHAR(50), -- Mục đích: 'AnhDaiDien', 'BaoCao', 'ChungChi', 'AnhBuaAn', 'VideoTap'
    NgayUpload DATETIME DEFAULT GETDATE(), -- Ngày upload
    DaXoa BIT DEFAULT 0, -- Soft delete: 0 (active), 1 (deleted - cleanup job xóa sau 30 ngày)
    NgayXoa DATETIME, -- Ngày đánh dấu deleted
    CONSTRAINT CK_TapTin_KichThuoc CHECK (KichThuoc > 0 AND KichThuoc <= 104857600), -- Max 100MB
    CONSTRAINT CK_TapTin_LoaiFile CHECK (LoaiFile IN ('Image', 'PDF', 'Excel', 'Video', 'Document')),
	CONSTRAINT FK_TapTin_Users FOREIGN KEY (UserID)
        REFERENCES Users(UserID)
        ON DELETE CASCADE
);
GO






