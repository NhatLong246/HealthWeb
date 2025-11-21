-- Migration: Thêm cột NgayTap vào bảng ChiTietKeHoachTapLuyen
-- Ngày: 2025-11-29
-- Mục đích: Lưu trực tiếp ngày cụ thể từ preview schedule, không cần tính từ Tuan/NgayTrongTuan

USE HealthTracker;
GO

-- 1. Thêm cột NgayTap (nullable) vào bảng ChiTietKeHoachTapLuyen
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'ChiTietKeHoachTapLuyen') 
    AND name = 'NgayTap'
)
BEGIN
    ALTER TABLE ChiTietKeHoachTapLuyen
    ADD NgayTap DATE NULL;
    
    PRINT 'Đã thêm cột NgayTap vào bảng ChiTietKeHoachTapLuyen';
END
ELSE
BEGIN
    PRINT 'Cột NgayTap đã tồn tại trong bảng ChiTietKeHoachTapLuyen';
END
GO

-- 2. Sửa lại constraint cho NgayTrongTuan để cho phép NULL (vì có thể có dữ liệu cũ)
IF EXISTS (
    SELECT * FROM sys.check_constraints 
    WHERE name = 'CK_ChiTietKeHoachTapLuyen_NgayTrongTuan'
)
BEGIN
    ALTER TABLE ChiTietKeHoachTapLuyen
    DROP CONSTRAINT CK_ChiTietKeHoachTapLuyen_NgayTrongTuan;
    
    ALTER TABLE ChiTietKeHoachTapLuyen
    ADD CONSTRAINT CK_ChiTietKeHoachTapLuyen_NgayTrongTuan
        CHECK (NgayTrongTuan IS NULL OR NgayTrongTuan BETWEEN 1 AND 7);
    
    PRINT 'Đã cập nhật constraint CK_ChiTietKeHoachTapLuyen_NgayTrongTuan để cho phép NULL';
END
GO

-- 3. Sửa lại constraint cho Tuan để cho phép NULL
IF EXISTS (
    SELECT * FROM sys.check_constraints 
    WHERE name = 'CK_ChiTietKeHoachTapLuyens_Tuan'
)
BEGIN
    ALTER TABLE ChiTietKeHoachTapLuyen
    DROP CONSTRAINT CK_ChiTietKeHoachTapLuyens_Tuan;
    
    ALTER TABLE ChiTietKeHoachTapLuyen
    ADD CONSTRAINT CK_ChiTietKeHoachTapLuyens_Tuan
        CHECK (Tuan IS NULL OR Tuan >= 1);
    
    PRINT 'Đã cập nhật constraint CK_ChiTietKeHoachTapLuyens_Tuan để cho phép NULL';
END
GO

-- 4. Tạo index để query nhanh theo ngày
IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'IX_ChiTietKeHoachTapLuyen_NgayTap' 
    AND object_id = OBJECT_ID(N'ChiTietKeHoachTapLuyen')
)
BEGIN
    CREATE INDEX IX_ChiTietKeHoachTapLuyen_NgayTap 
    ON ChiTietKeHoachTapLuyen(NgayTap) 
    WHERE NgayTap IS NOT NULL;
    
    PRINT 'Đã tạo index IX_ChiTietKeHoachTapLuyen_NgayTap';
END
ELSE
BEGIN
    PRINT 'Index IX_ChiTietKeHoachTapLuyen_NgayTap đã tồn tại';
END
GO

-- 5. (Tùy chọn) Cập nhật dữ liệu cũ: Tính NgayTap từ Tuan và NgayTrongTuan cho các record chưa có NgayTap
-- LƯU Ý: Chỉ chạy script này nếu bạn muốn migrate dữ liệu cũ
-- Nếu không, dữ liệu cũ sẽ vẫn hoạt động với logic fallback (tính từ Tuan/NgayTrongTuan)

/*
UPDATE chiTiet
SET chiTiet.NgayTap = DATEADD(DAY, 
    (chiTiet.Tuan - 1) * 7 + (chiTiet.NgayTrongTuan - 1), 
    keHoach.MucTieu.NgayBatDau
)
FROM ChiTietKeHoachTapLuyen chiTiet
INNER JOIN KeHoachTapLuyen keHoach ON chiTiet.KeHoachID = keHoach.KeHoachID
INNER JOIN MucTieu mucTieu ON keHoach.MucTieuID = mucTieu.MucTieuID
WHERE chiTiet.NgayTap IS NULL
  AND chiTiet.Tuan IS NOT NULL
  AND chiTiet.NgayTrongTuan IS NOT NULL
  AND mucTieu.NgayBatDau IS NOT NULL;
GO
*/

PRINT 'Migration hoàn tất!';
GO

