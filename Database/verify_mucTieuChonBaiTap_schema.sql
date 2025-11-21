-- Script kiểm tra chi tiết schema của bảng MucTieuChonBaiTap
USE HealthTracker;
GO

-- 1. Kiểm tra bảng có tồn tại không
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'MucTieuChonBaiTap')
BEGIN
    PRINT '✓ Bảng MucTieuChonBaiTap đã tồn tại.';
    PRINT '';
    
    -- 2. Kiểm tra các cột trong bảng
    PRINT '=== CÁC CỘT TRONG BẢNG ===';
    SELECT 
        c.COLUMN_NAME AS TenCot,
        c.DATA_TYPE AS KieuDuLieu,
        c.CHARACTER_MAXIMUM_LENGTH AS DoDai,
        c.IS_NULLABLE AS ChoPhepNull,
        c.COLUMN_DEFAULT AS GiaTriMacDinh
    FROM INFORMATION_SCHEMA.COLUMNS c
    WHERE c.TABLE_NAME = 'MucTieuChonBaiTap'
    ORDER BY c.ORDINAL_POSITION;
    PRINT '';
    
    -- 3. Kiểm tra Primary Key
    PRINT '=== PRIMARY KEY ===';
    SELECT 
        kcu.COLUMN_NAME AS CotKhoaChinh
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu 
        ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
    WHERE tc.TABLE_NAME = 'MucTieuChonBaiTap' 
        AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY';
    PRINT '';
    
    -- 4. Kiểm tra Foreign Keys
    PRINT '=== FOREIGN KEYS ===';
    SELECT 
        fk.CONSTRAINT_NAME AS TenRangBuoc,
        fk.COLUMN_NAME AS CotForeign,
        pk.TABLE_NAME AS BangThamChieu,
        pk.COLUMN_NAME AS CotThamChieu
    FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
    INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE fk 
        ON rc.CONSTRAINT_NAME = fk.CONSTRAINT_NAME
    INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE pk 
        ON rc.UNIQUE_CONSTRAINT_NAME = pk.CONSTRAINT_NAME
    WHERE fk.TABLE_NAME = 'MucTieuChonBaiTap';
    PRINT '';
    
    -- 5. Kiểm tra Unique Constraints
    PRINT '=== UNIQUE CONSTRAINTS ===';
    SELECT 
        tc.CONSTRAINT_NAME AS TenRangBuoc,
        STRING_AGG(kcu.COLUMN_NAME, ', ') AS CacCot
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu 
        ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
    WHERE tc.TABLE_NAME = 'MucTieuChonBaiTap' 
        AND tc.CONSTRAINT_TYPE = 'UNIQUE'
    GROUP BY tc.CONSTRAINT_NAME;
    PRINT '';
    
    -- 6. Đếm số bản ghi
    PRINT '=== SỐ BẢN GHI ===';
    SELECT COUNT(*) AS SoBanGhi FROM MucTieuChonBaiTap;
    PRINT '';
    
    -- 7. Kiểm tra tên cột có đúng không (quan trọng!)
    PRINT '=== KIỂM TRA TÊN CỘT (phải khớp với Entity Framework) ===';
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'MucTieuChonBaiTap' AND COLUMN_NAME = 'MucTieuId')
        PRINT '✓ Cột MucTieuId: TỒN TẠI';
    ELSE
        PRINT '✗ Cột MucTieuId: KHÔNG TỒN TẠI';
        
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'MucTieuChonBaiTap' AND COLUMN_NAME = 'MauTapLuyenId')
        PRINT '✓ Cột MauTapLuyenId: TỒN TẠI';
    ELSE
        PRINT '✗ Cột MauTapLuyenId: KHÔNG TỒN TẠI';
        
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'MucTieuChonBaiTap' AND COLUMN_NAME = 'ChonBaiTapID')
        PRINT '✓ Cột ChonBaiTapID: TỒN TẠI';
    ELSE
        PRINT '✗ Cột ChonBaiTapID: KHÔNG TỒN TẠI';
    PRINT '';
    
    -- 8. Kiểm tra các cột có tên sai (có số "1" ở cuối)
    PRINT '=== KIỂM TRA CỘT CÓ TÊN SAI (có số "1") ===';
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'MucTieuChonBaiTap' AND COLUMN_NAME LIKE '%1')
    BEGIN
        PRINT '✗ PHÁT HIỆN CỘT CÓ TÊN SAI:';
        SELECT COLUMN_NAME AS TenCotSai
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'MucTieuChonBaiTap' AND COLUMN_NAME LIKE '%1';
    END
    ELSE
        PRINT '✓ Không có cột nào có tên sai (có số "1")';
END
ELSE
BEGIN
    PRINT '✗ Bảng MucTieuChonBaiTap CHƯA tồn tại!';
    PRINT 'Vui lòng chạy script: Database/migration_add_mucTieuChonBaiTap.sql';
END
GO

