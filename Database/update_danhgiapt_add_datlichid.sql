-- Script để cập nhật bảng DanhGiaPT: Thêm cột DatLichID để liên kết với DatLichPT
-- Cho phép đánh giá sau mỗi buổi tập thay vì chỉ đánh giá 1 lần cho mỗi PT

USE HealthTracker;
GO

-- Bước 1: Xóa constraint UNIQUE cũ (KhachHangID, PTID) vì giờ có thể đánh giá nhiều lần cho cùng 1 PT
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'UK_DanhGiaPT_ClientTrainer' AND object_id = OBJECT_ID('DanhGiaPT'))
BEGIN
    ALTER TABLE DanhGiaPT DROP CONSTRAINT UK_DanhGiaPT_ClientTrainer;
    PRINT 'Đã xóa constraint UK_DanhGiaPT_ClientTrainer';
END
GO

-- Bước 2: Thêm cột DatLichID vào bảng DanhGiaPT
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('DanhGiaPT') AND name = 'DatLichID')
BEGIN
    ALTER TABLE DanhGiaPT
    ADD DatLichID VARCHAR(20) NULL; -- Cho phép NULL tạm thời để migrate dữ liệu cũ
    PRINT 'Đã thêm cột DatLichID vào bảng DanhGiaPT';
END
GO

-- Bước 3: Xóa các record có DatLichID = NULL (dữ liệu cũ không có DatLichID)
-- Vì không thể map được với DatLichPT, nên xóa các record cũ
IF EXISTS (SELECT * FROM DanhGiaPT WHERE DatLichID IS NULL)
BEGIN
    DELETE FROM DanhGiaPT WHERE DatLichID IS NULL;
    PRINT 'Đã xóa các record đánh giá cũ không có DatLichID';
END
ELSE
BEGIN
    PRINT 'Không có record nào có DatLichID = NULL';
END
GO

-- Bước 4: Đặt DatLichID thành NOT NULL (sau khi đã xóa NULL)
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('DanhGiaPT') AND name = 'DatLichID' AND is_nullable = 1)
BEGIN
    -- Kiểm tra lại xem còn NULL không
    IF NOT EXISTS (SELECT * FROM DanhGiaPT WHERE DatLichID IS NULL)
    BEGIN
        ALTER TABLE DanhGiaPT
        ALTER COLUMN DatLichID VARCHAR(20) NOT NULL;
        PRINT 'Đã đặt DatLichID thành NOT NULL';
    END
    ELSE
    BEGIN
        PRINT 'Cảnh báo: Vẫn còn record có DatLichID = NULL, không thể set NOT NULL';
    END
END
GO

-- Bước 5: Thêm constraint UNIQUE (DatLichID) để đảm bảo mỗi buổi tập chỉ được đánh giá 1 lần
-- Phải làm sau khi đã set NOT NULL
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UK_DanhGiaPT_DatLichID' AND object_id = OBJECT_ID('DanhGiaPT'))
BEGIN
    -- Kiểm tra xem có duplicate không
    IF NOT EXISTS (
        SELECT DatLichID 
        FROM DanhGiaPT 
        WHERE DatLichID IS NOT NULL
        GROUP BY DatLichID 
        HAVING COUNT(*) > 1
    )
    BEGIN
        ALTER TABLE DanhGiaPT
        ADD CONSTRAINT UK_DanhGiaPT_DatLichID UNIQUE (DatLichID);
        PRINT 'Đã thêm constraint UK_DanhGiaPT_DatLichID';
    END
    ELSE
    BEGIN
        PRINT 'Cảnh báo: Có duplicate DatLichID, không thể tạo UNIQUE constraint';
        PRINT 'Vui lòng xử lý dữ liệu duplicate trước';
    END
END
GO

-- Bước 6: Thêm Foreign Key từ DatLichID đến DatLichPT
-- Dùng ON DELETE NO ACTION để tránh multiple cascade paths
-- (Vì DatLichPT đã có FK đến Users với CASCADE, nên không thể dùng CASCADE ở đây)
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_DanhGiaPT_DatLichPT')
BEGIN
    -- Kiểm tra xem tất cả DatLichID có tồn tại trong DatLichPT không
    IF NOT EXISTS (
        SELECT d.DatLichID 
        FROM DanhGiaPT d
        LEFT JOIN DatLichPT dl ON d.DatLichID = dl.DatLichID
        WHERE d.DatLichID IS NOT NULL AND dl.DatLichID IS NULL
    )
    BEGIN
        ALTER TABLE DanhGiaPT
        ADD CONSTRAINT FK_DanhGiaPT_DatLichPT
            FOREIGN KEY (DatLichID) REFERENCES DatLichPT(DatLichID)
            ON DELETE NO ACTION; -- Dùng NO ACTION thay vì CASCADE để tránh multiple cascade paths
        PRINT 'Đã thêm Foreign Key FK_DanhGiaPT_DatLichPT';
    END
    ELSE
    BEGIN
        PRINT 'Cảnh báo: Có DatLichID không tồn tại trong DatLichPT, không thể tạo FK';
        PRINT 'Vui lòng xử lý dữ liệu trước';
    END
END
GO

PRINT 'Hoàn thành cập nhật bảng DanhGiaPT';
GO

