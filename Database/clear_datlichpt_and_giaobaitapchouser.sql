-- Script để xóa hết dữ liệu cũ của hai bảng DatLichPT và GiaoBaiTapChoUser
-- CẢNH BÁO: Script này sẽ xóa TẤT CẢ dữ liệu trong hai bảng này!
-- Vui lòng backup database trước khi chạy script này!

USE HealthTracker;
GO

-- Kiểm tra số lượng records trước khi xóa
PRINT '=== THÔNG TIN TRƯỚC KHI XÓA ===';
SELECT 
    'GiaoBaiTapChoUser' as TableName,
    COUNT(*) as RecordCount
FROM GiaoBaiTapChoUser
UNION ALL
SELECT 
    'DatLichPT' as TableName,
    COUNT(*) as RecordCount
FROM DatLichPT;
GO

PRINT '';
PRINT 'Bắt đầu xóa dữ liệu...';
PRINT '';

-- Bước 1: Xóa dữ liệu trong GiaoBaiTapChoUser trước (vì có foreign key đến DatLichPT)
PRINT 'Đang xóa dữ liệu trong bảng GiaoBaiTapChoUser...';
DELETE FROM GiaoBaiTapChoUser;
GO

PRINT 'Đã xóa xong bảng GiaoBaiTapChoUser';
PRINT '';

-- Bước 2: Xóa các giao dịch liên quan đến DatLichPT trước
-- Bảng GiaoDich có foreign key đến DatLichPT qua cột DatLichId
PRINT 'Đang xóa các giao dịch liên quan đến DatLichPT...';

-- Kiểm tra xem có bảng GiaoDich có foreign key đến DatLichPT không
IF EXISTS (
    SELECT 1 
    FROM sys.foreign_keys 
    WHERE referenced_object_id = OBJECT_ID('DatLichPT')
      AND parent_object_id = OBJECT_ID('GiaoDich')
)
BEGIN
    PRINT 'Cảnh báo: Bảng GiaoDich có foreign key đến DatLichPT.';
    PRINT 'Đang xóa các giao dịch liên quan...';
    
    -- Xóa tất cả các giao dịch có DatLichId (tất cả giao dịch PT đều có DatLichId)
    DELETE FROM GiaoDich
    WHERE DatLichId IS NOT NULL;
    
    PRINT 'Đã xóa các giao dịch liên quan.';
END
ELSE
BEGIN
    PRINT 'Không tìm thấy foreign key từ GiaoDich đến DatLichPT.';
    PRINT 'Đang xóa các giao dịch có DatLichId...';
    
    -- Vẫn xóa các giao dịch có DatLichId để đảm bảo
    DELETE FROM GiaoDich
    WHERE DatLichId IS NOT NULL;
    
    PRINT 'Đã xóa các giao dịch có DatLichId.';
END
GO

-- Bước 3: Xóa dữ liệu trong DatLichPT
PRINT 'Đang xóa dữ liệu trong bảng DatLichPT...';
DELETE FROM DatLichPT;
GO

PRINT 'Đã xóa xong bảng DatLichPT';
PRINT '';

-- Kiểm tra số lượng records sau khi xóa
PRINT '=== THÔNG TIN SAU KHI XÓA ===';
SELECT 
    'GiaoBaiTapChoUser' as TableName,
    COUNT(*) as RecordCount
FROM GiaoBaiTapChoUser
UNION ALL
SELECT 
    'DatLichPT' as TableName,
    COUNT(*) as RecordCount
FROM DatLichPT
UNION ALL
SELECT 
    'GiaoDich (có DatLichId)' as TableName,
    COUNT(*) as RecordCount
FROM GiaoDich
WHERE DatLichId IS NOT NULL;
GO

PRINT '';
PRINT '=== HOÀN TẤT ===';
PRINT 'Đã xóa hết dữ liệu trong hai bảng DatLichPT và GiaoBaiTapChoUser!';
PRINT 'Đã xóa các giao dịch liên quan trong bảng GiaoDich (các giao dịch có DatLichId).';
GO

