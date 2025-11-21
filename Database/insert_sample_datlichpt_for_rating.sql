-- Script để thêm 5 dữ liệu mẫu vào bảng DatLichPT
-- Cho user_0009 với các buổi tập trước thời gian hiện tại để có thể đánh giá

USE HealthTracker;
GO

-- Kiểm tra xem user_0009 có tồn tại không
IF NOT EXISTS (SELECT * FROM Users WHERE UserID = 'user_0009')
BEGIN
    PRINT 'Cảnh báo: User user_0009 không tồn tại. Vui lòng tạo user trước.';
    -- Có thể tạo user mẫu nếu cần
    -- INSERT INTO Users (UserID, Username, PasswordHash, Role) VALUES ('user_0009', 'testuser', 'hash', 'Client');
END
GO

-- Lấy một PTID bất kỳ từ bảng HuanLuyenVien (hoặc tạo mới nếu chưa có)
DECLARE @PTID VARCHAR(20);
SELECT TOP 1 @PTID = PTID FROM HuanLuyenVien;
IF @PTID IS NULL
BEGIN
    -- Nếu chưa có PT, tạo một PT mẫu
    -- Giả sử có user_0001 là PT
    IF EXISTS (SELECT * FROM Users WHERE UserID = 'user_0001')
    BEGIN
        IF NOT EXISTS (SELECT * FROM HuanLuyenVien WHERE UserID = 'user_0001')
        BEGIN
            INSERT INTO HuanLuyenVien (PTID, UserID, GiaTheoGio, NhanKhach)
            VALUES ('ptr_0001', 'user_0001', 500000, 1);
            SET @PTID = 'ptr_0001';
            PRINT 'Đã tạo PT mẫu: ptr_0001';
        END
        ELSE
        BEGIN
            SELECT @PTID = PTID FROM HuanLuyenVien WHERE UserID = 'user_0001';
        END
    END
    ELSE
    BEGIN
        PRINT 'Cảnh báo: Không tìm thấy PT nào. Vui lòng tạo PT trước.';
        RETURN;
    END
END
GO

-- Xóa các record cũ nếu có (để tránh duplicate)
DELETE FROM DatLichPT 
WHERE KhacHangID = 'user_0009' 
AND DatLichID IN ('bkg_sample_001', 'bkg_sample_002', 'bkg_sample_003', 'bkg_sample_004', 'bkg_sample_005');
GO

-- Thêm 5 buổi tập mẫu
-- Buổi 1: 5 ngày trước, đã hoàn thành
INSERT INTO DatLichPT (
    DatLichID, 
    KhacHangID, 
    PTID, 
    NgayGioDat, 
    LoaiBuoiTap, 
    TrangThai, 
    GhiChu, 
    NgayTao,
    ChoXemSucKhoe
)
VALUES (
    'bkg_sample_001',
    'user_0009',
    (SELECT TOP 1 PTID FROM HuanLuyenVien),
    DATEADD(DAY, -5, GETDATE()), -- 5 ngày trước
    'In-person',
    'Completed',
    'Buổi tập đầu tiên - Tập toàn thân. Số giờ buổi này: 1.5 giờ. Thời gian rảnh: 08:00 - 09:30',
    DATEADD(DAY, -6, GETDATE()),
    1
);
GO

-- Buổi 2: 4 ngày trước, đã hoàn thành
INSERT INTO DatLichPT (
    DatLichID, 
    KhacHangID, 
    PTID, 
    NgayGioDat, 
    LoaiBuoiTap, 
    TrangThai, 
    GhiChu, 
    NgayTao,
    ChoXemSucKhoe
)
VALUES (
    'bkg_sample_002',
    'user_0009',
    (SELECT TOP 1 PTID FROM HuanLuyenVien),
    DATEADD(DAY, -4, GETDATE()), -- 4 ngày trước
    'Online',
    'Completed',
    'Buổi tập thứ hai - Cardio. Số giờ buổi này: 1 giờ. Thời gian rảnh: 10:00 - 11:00',
    DATEADD(DAY, -5, GETDATE()),
    1
);
GO

-- Buổi 3: 3 ngày trước, đã xác nhận (có thể đánh giá)
INSERT INTO DatLichPT (
    DatLichID, 
    KhacHangID, 
    PTID, 
    NgayGioDat, 
    LoaiBuoiTap, 
    TrangThai, 
    GhiChu, 
    NgayTao,
    ChoXemSucKhoe
)
VALUES (
    'bkg_sample_003',
    'user_0009',
    (SELECT TOP 1 PTID FROM HuanLuyenVien),
    DATEADD(DAY, -3, GETDATE()), -- 3 ngày trước
    'In-person',
    'Confirmed',
    'Buổi tập thứ ba - Tập sức mạnh. Số giờ buổi này: 2 giờ. Thời gian rảnh: 14:00 - 16:00',
    DATEADD(DAY, -4, GETDATE()),
    1
);
GO

-- Buổi 4: 2 ngày trước, đã hoàn thành
INSERT INTO DatLichPT (
    DatLichID, 
    KhacHangID, 
    PTID, 
    NgayGioDat, 
    LoaiBuoiTap, 
    TrangThai, 
    GhiChu, 
    NgayTao,
    ChoXemSucKhoe
)
VALUES (
    'bkg_sample_004',
    'user_0009',
    (SELECT TOP 1 PTID FROM HuanLuyenVien),
    DATEADD(DAY, -2, GETDATE()), -- 2 ngày trước
    'In-person',
    'Completed',
    'Buổi tập thứ tư - Yoga và stretching. Số giờ buổi này: 1 giờ. Thời gian rảnh: 18:00 - 19:00',
    DATEADD(DAY, -3, GETDATE()),
    0
);
GO

-- Buổi 5: 1 ngày trước, đã hoàn thành
INSERT INTO DatLichPT (
    DatLichID, 
    KhacHangID, 
    PTID, 
    NgayGioDat, 
    LoaiBuoiTap, 
    TrangThai, 
    GhiChu, 
    NgayTao,
    ChoXemSucKhoe
)
VALUES (
    'bkg_sample_005',
    'user_0009',
    (SELECT TOP 1 PTID FROM HuanLuyenVien),
    DATEADD(DAY, -1, GETDATE()), -- 1 ngày trước
    'Online',
    'Completed',
    'Buổi tập thứ năm - HIIT. Số giờ buổi này: 1.5 giờ. Thời gian rảnh: 09:00 - 10:30',
    DATEADD(DAY, -2, GETDATE()),
    1
);
GO

-- Kiểm tra kết quả
SELECT 
    DatLichID,
    KhacHangID,
    PTID,
    NgayGioDat,
    LoaiBuoiTap,
    TrangThai,
    GhiChu
FROM DatLichPT
WHERE KhacHangID = 'user_0009'
ORDER BY NgayGioDat DESC;
GO

PRINT 'Đã thêm 5 buổi tập mẫu cho user_0009 thành công!';
PRINT 'Các buổi tập đã được tạo với thời gian trước hiện tại để có thể đánh giá.';
GO

