-- Migration: Thêm cột DatLichID vào bảng GiaoBaiTapChoUser
-- Để liên kết bài tập được giao với lịch đặt cụ thể

USE HealthTracker;
GO

-- Kiểm tra và thêm cột DatLichID nếu chưa tồn tại
IF NOT EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('GiaoBaiTapChoUser') 
    AND name = 'DatLichID'
)
BEGIN
    ALTER TABLE GiaoBaiTapChoUser
    ADD DatLichID VARCHAR(20) NULL;
    PRINT 'Đã thêm cột DatLichID vào bảng GiaoBaiTapChoUser';
END
ELSE
BEGIN
    PRINT 'Cột DatLichID đã tồn tại trong bảng GiaoBaiTapChoUser';
END
GO

-- Kiểm tra và thêm khóa ngoại nếu chưa tồn tại
IF NOT EXISTS (
    SELECT 1 
    FROM sys.foreign_keys 
    WHERE name = 'FK_GiaoBaiTapChoUser_DatLichPT'
)
BEGIN
    ALTER TABLE GiaoBaiTapChoUser
    ADD CONSTRAINT FK_GiaoBaiTapChoUser_DatLichPT
        FOREIGN KEY (DatLichID) REFERENCES DatLichPT(DatLichID)
        ON DELETE NO ACTION; -- Không cho phép xóa DatLichPT nếu còn GiaoBaiTapChoUser tham chiếu
    PRINT 'Đã thêm foreign key FK_GiaoBaiTapChoUser_DatLichPT';
END
ELSE
BEGIN
    PRINT 'Foreign key FK_GiaoBaiTapChoUser_DatLichPT đã tồn tại';
END
GO

-- Kiểm tra và tạo index nếu chưa tồn tại
IF NOT EXISTS (
    SELECT 1 
    FROM sys.indexes 
    WHERE name = 'IX_GiaoBaiTapChoUser_DatLichID' 
    AND object_id = OBJECT_ID('GiaoBaiTapChoUser')
)
BEGIN
    CREATE INDEX IX_GiaoBaiTapChoUser_DatLichID 
    ON GiaoBaiTapChoUser(DatLichID);
    PRINT 'Đã tạo index IX_GiaoBaiTapChoUser_DatLichID';
END
ELSE
BEGIN
    PRINT 'Index IX_GiaoBaiTapChoUser_DatLichID đã tồn tại';
END
GO

PRINT 'Migration hoàn tất!';
GO

