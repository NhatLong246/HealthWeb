-- ==========================================
-- SỬA LỖI FONT CHỮ BẢNG ThanhTuu
-- Trường TenBadge thiếu ký tự N (Unicode)
-- ==========================================

USE HealthTracker;
GO

PRINT N'==========================================';
PRINT N'SỬA LỖI FONT CHỮ BẢNG ThanhTuu - TenBadge';
PRINT N'==========================================';
PRINT N'';

-- Cập nhật các giá trị TenBadge với ký tự N (Unicode)
UPDATE ThanhTuu
SET TenBadge = N'10 Bài Tập Hoàn Thành'
WHERE TenBadge = '10 Bài Tập Hoàn Thành';
GO

UPDATE ThanhTuu
SET TenBadge = N'20 Bài Tập Hoàn Thành'
WHERE TenBadge = '20 Bài Tập Hoàn Thành';
GO

UPDATE ThanhTuu
SET TenBadge = N'30 Bài Tập Hoàn Thành'
WHERE TenBadge = '30 Bài Tập Hoàn Thành';
GO

-- Kiểm tra kết quả
PRINT N'Đã cập nhật xong. Kiểm tra kết quả:';
SELECT 
    ThanhTuuID,
    UserID,
    TenBadge,
    Diem,
    NgayDatDuoc,
    MoTa
FROM ThanhTuu
ORDER BY ThanhTuuID;
GO

PRINT N'';
PRINT N'==========================================';
PRINT N'HOÀN TẤT SỬA LỖI';
PRINT N'==========================================';
GO

