-- Script kiểm tra xem bảng MucTieuChonBaiTap đã tồn tại chưa
USE HealthTracker;
GO

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'MucTieuChonBaiTap')
BEGIN
    PRINT '✓ Bảng MucTieuChonBaiTap đã tồn tại.';
    SELECT 
        'MucTieuChonBaiTap' AS TableName,
        COUNT(*) AS RecordCount
    FROM MucTieuChonBaiTap;
END
ELSE
BEGIN
    PRINT '✗ Bảng MucTieuChonBaiTap CHƯA tồn tại!';
    PRINT 'Vui lòng chạy script: Database/migration_add_mucTieuChonBaiTap.sql';
END
GO

