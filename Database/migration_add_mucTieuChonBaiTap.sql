-- Migration script: Thêm bảng MucTieuChonBaiTap
-- Chạy script này nếu bạn đã có database HealthTracker và muốn thêm bảng mới

USE HealthTracker;
GO

-- Kiểm tra xem bảng đã tồn tại chưa
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MucTieuChonBaiTap')
BEGIN
    -- Bảng MucTieuChonBaiTap: Lưu các bài tập được chọn cho mục tiêu (trước khi lên lịch)
    CREATE TABLE MucTieuChonBaiTap (
        ChonBaiTapID INT PRIMARY KEY IDENTITY(1,1), -- ID tự tăng
        MucTieuId VARCHAR(20) NOT NULL, -- Liên kết với MucTieu
        MauTapLuyenId INT NOT NULL, -- Liên kết với MauTapLuyen
        ThuTuHienThi INT DEFAULT 0, -- Thứ tự hiển thị (cho drag & drop)
        DaLapLich BIT DEFAULT 0, -- Đã lên lịch chưa (0: chưa, 1: đã lên lịch)
        NgayChon DATETIME DEFAULT GETDATE(), -- Ngày chọn bài tập
        -- Ràng buộc toàn vẹn dữ liệu
        CONSTRAINT FK_MucTieuChonBaiTap_MucTieu 
            FOREIGN KEY (MucTieuId) REFERENCES MucTieu(MucTieuID) ON DELETE CASCADE,
        CONSTRAINT FK_MucTieuChonBaiTap_MauTapLuyen 
            FOREIGN KEY (MauTapLuyenId) REFERENCES MauTapLuyen(MauTapLuyenID) ON DELETE CASCADE,
        -- Đảm bảo mỗi mục tiêu không chọn trùng bài tập
        CONSTRAINT UK_MucTieuChonBaiTap UNIQUE (MucTieuId, MauTapLuyenId)
    );
    
    PRINT 'Bảng MucTieuChonBaiTap đã được tạo thành công!';
END
ELSE
BEGIN
    PRINT 'Bảng MucTieuChonBaiTap đã tồn tại.';
END
GO

