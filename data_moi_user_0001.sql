USE HealthTracker;
GO

-- ==========================================
-- THÊM DỮ LIỆU MỚI CHO user_0001
-- Dữ liệu cho 7 ngày gần nhất để hiển thị trên trang thống kê
-- ==========================================

-- 1. THÊM DỮ LIỆU SỨC KHỎE (LuuTruSucKhoe) - 7 ngày gần nhất
-- Lấy ngày hiện tại và tạo dữ liệu cho 7 ngày gần nhất
DECLARE @Today DATE = CAST(GETDATE() AS DATE);
DECLARE @DayOffset INT = 0;
DECLARE @TargetDate DATE;
DECLARE @MaBanGhi VARCHAR(20);
DECLARE @SoBuoc INT;
DECLARE @CaloTieuThu FLOAT;
DECLARE @CanNang FLOAT;
DECLARE @SoDoVong1 FLOAT;
DECLARE @SoDoVong2 FLOAT;
DECLARE @SoDoVong3 FLOAT;
DECLARE @TiLeMo FLOAT;
DECLARE @LuongNuocUong FLOAT;

WHILE @DayOffset < 7
BEGIN
    SET @TargetDate = DATEADD(DAY, -@DayOffset, @Today);
    SET @MaBanGhi = 'rec_new' + RIGHT('0000' + CAST((1000 + @DayOffset) AS VARCHAR), 4);
    
    -- Kiểm tra xem đã có dữ liệu cho ngày này chưa
    IF NOT EXISTS (SELECT 1 FROM LuuTruSucKhoe WHERE UserID = 'user_0001' AND NgayGhiNhan = @TargetDate)
    BEGIN
        -- Tạo dữ liệu với giá trị tăng dần theo ngày (giảm cân, tăng bước chân, v.v.)
        SET @SoBuoc = 8500 + (@DayOffset * 200);
        SET @CaloTieuThu = 550.0 + (@DayOffset * 25.0);
        SET @CanNang = 72.0 - (@DayOffset * 0.1);
        SET @SoDoVong1 = 86.0 - (@DayOffset * 0.1);
        SET @SoDoVong2 = 71.0 - (@DayOffset * 0.1);
        SET @SoDoVong3 = 91.0 - (@DayOffset * 0.1);
        SET @TiLeMo = 21.0 - (@DayOffset * 0.05);
        SET @LuongNuocUong = 2.2 + (@DayOffset * 0.1);
        
        INSERT INTO LuuTruSucKhoe (
            MaBanGhi, UserID, NgayGhiNhan, SoBuoc, CaloTieuThu, SoGioNgu, 
            CanNang, ChieuCao, BMI, SoDoVong1, SoDoVong2, SoDoVong3, 
            SoDoBapTay, SoDoBapChan, TiLeMo, BenhID, LuongNuocUong
        )
        VALUES (
            @MaBanGhi, 'user_0001', @TargetDate, @SoBuoc, @CaloTieuThu, 7.5 + (@DayOffset * 0.1),
            @CanNang, 172.0, NULL, @SoDoVong1, @SoDoVong2, @SoDoVong3,
            31.0, 41.0, @TiLeMo, 'benh_0003', @LuongNuocUong
        );
    END
    
    SET @DayOffset = @DayOffset + 1;
END;
GO

-- 2. THÊM DỮ LIỆU NHẬT KÝ HOÀN THÀNH BÀI TẬP (NhatKyHoanThanhBaiTap)
-- Thêm dữ liệu cho 7 ngày gần nhất với ChiTietID 1, 2, 3 (của user_0001)
DECLARE @Today2 DATE = CAST(GETDATE() AS DATE);
DECLARE @DayOffset2 INT = 0;
DECLARE @TargetDate2 DATE;

WHILE @DayOffset2 < 7
BEGIN
    SET @TargetDate2 = DATEADD(DAY, -@DayOffset2, @Today2);
    
    -- Thêm bài tập ChiTietID 1 (Yoga - Tư Thế Plank) - mỗi ngày
    IF NOT EXISTS (
        SELECT 1 FROM NhatKyHoanThanhBaiTap 
        WHERE UserID = 'user_0001' AND ChiTietID = 1 AND NgayHoanThanh = @TargetDate2
    )
    BEGIN
        INSERT INTO NhatKyHoanThanhBaiTap (
            UserID, ChiTietID, NgayHoanThanh, SoHiepThucTe, SoLanThucTe, 
            ThoiLuongThucTePhut, CaloTieuHao, DanhGiaBaiTap, GhiChu
        )
        VALUES (
            'user_0001', 1, @TargetDate2, NULL, NULL, 
            1, 140.0 + (@DayOffset2 * 5.0), 
            3 + CASE WHEN @DayOffset2 > 3 THEN 1 ELSE 0 END, 
            N'Plank ngày ' + CAST(@DayOffset2 + 1 AS NVARCHAR) + N' - Cải thiện dần'
        );
    END
    
    -- Thêm bài tập ChiTietID 2 (Yoga - Tư Thế Chiến Binh) - cách ngày
    IF @DayOffset2 % 2 = 0 AND NOT EXISTS (
        SELECT 1 FROM NhatKyHoanThanhBaiTap 
        WHERE UserID = 'user_0001' AND ChiTietID = 2 AND NgayHoanThanh = @TargetDate2
    )
    BEGIN
        INSERT INTO NhatKyHoanThanhBaiTap (
            UserID, ChiTietID, NgayHoanThanh, SoHiepThucTe, SoLanThucTe, 
            ThoiLuongThucTePhut, CaloTieuHao, DanhGiaBaiTap, GhiChu
        )
        VALUES (
            'user_0001', 2, @TargetDate2, NULL, NULL, 
            2, 155.0 + (@DayOffset2 * 3.0), 
            3 + CASE WHEN @DayOffset2 > 2 THEN 1 ELSE 0 END, 
            N'Tư thế chiến binh - Ngày ' + CAST(@DayOffset2 + 1 AS NVARCHAR)
        );
    END
    
    -- Thêm bài tập ChiTietID 3 (Tay Trước - Tập Curls) - cách 2 ngày
    IF @DayOffset2 % 3 = 0 AND NOT EXISTS (
        SELECT 1 FROM NhatKyHoanThanhBaiTap 
        WHERE UserID = 'user_0001' AND ChiTietID = 3 AND NgayHoanThanh = @TargetDate2
    )
    BEGIN
        INSERT INTO NhatKyHoanThanhBaiTap (
            UserID, ChiTietID, NgayHoanThanh, SoHiepThucTe, SoLanThucTe, 
            ThoiLuongThucTePhut, CaloTieuHao, DanhGiaBaiTap, GhiChu
        )
        VALUES (
            'user_0001', 3, @TargetDate2, 3, 10 + (@DayOffset2 * 1), 
            NULL, 180.0 + (@DayOffset2 * 10.0), 
            4, N'Curls tay trước - ' + CAST(10 + (@DayOffset2 * 1) AS NVARCHAR) + N' reps'
        );
    END
    
    SET @DayOffset2 = @DayOffset2 + 1;
END;
GO

-- 3. THÊM DỮ LIỆU NHẬT KÝ DINH DƯỠNG (NhatKyDinhDuong)
-- Thêm dữ liệu cho 7 ngày gần nhất
DECLARE @Today3 DATE = CAST(GETDATE() AS DATE);
DECLARE @DayOffset3 INT = 0;
DECLARE @NutCounter INT = 2000; -- Bắt đầu từ nut_2000 để tránh trùng
DECLARE @TargetDate3 DATE;

WHILE @DayOffset3 < 7
BEGIN
    SET @TargetDate3 = DATEADD(DAY, -@DayOffset3, @Today3);
    
    -- Bữa sáng
    IF NOT EXISTS (
        SELECT 1 FROM NhatKyDinhDuong 
        WHERE UserID = 'user_0001' AND NgayGhiLog = @TargetDate3 AND GhiChu LIKE N'%Sáng%'
    )
    BEGIN
        INSERT INTO NhatKyDinhDuong (DinhDuongID, UserID, NgayGhiLog, MonAnID, LuongThucAn, GhiChu)
        VALUES (
            'nut_' + CAST(@NutCounter AS VARCHAR), 'user_0001', @TargetDate3, 
            'monan_0002', 150.0 + (@DayOffset3 * 10.0), N'Buổi Sáng'
        );
        SET @NutCounter = @NutCounter + 1;
    END
    
    -- Bữa trưa
    IF NOT EXISTS (
        SELECT 1 FROM NhatKyDinhDuong 
        WHERE UserID = 'user_0001' AND NgayGhiLog = @TargetDate3 AND GhiChu LIKE N'%Trưa%'
    )
    BEGIN
        INSERT INTO NhatKyDinhDuong (DinhDuongID, UserID, NgayGhiLog, MonAnID, LuongThucAn, GhiChu)
        VALUES (
            'nut_' + CAST(@NutCounter AS VARCHAR), 'user_0001', @TargetDate3, 
            'monan_0001', 200.0 + (@DayOffset3 * 5.0), N'Buổi Trưa'
        );
        SET @NutCounter = @NutCounter + 1;
        
        -- Thêm cơm gạo lứt
        INSERT INTO NhatKyDinhDuong (DinhDuongID, UserID, NgayGhiLog, MonAnID, LuongThucAn, GhiChu)
        VALUES (
            'nut_' + CAST(@NutCounter AS VARCHAR), 'user_0001', @TargetDate3, 
            'monan_0003', 1.0, N'Buổi Trưa'
        );
        SET @NutCounter = @NutCounter + 1;
    END
    
    -- Bữa tối
    IF NOT EXISTS (
        SELECT 1 FROM NhatKyDinhDuong 
        WHERE UserID = 'user_0001' AND NgayGhiLog = @TargetDate3 AND GhiChu LIKE N'%Tối%'
    )
    BEGIN
        INSERT INTO NhatKyDinhDuong (DinhDuongID, UserID, NgayGhiLog, MonAnID, LuongThucAn, GhiChu)
        VALUES (
            'nut_' + CAST(@NutCounter AS VARCHAR), 'user_0001', @TargetDate3, 
            'monan_0004', 1.0, N'Buổi Tối'
        );
        SET @NutCounter = @NutCounter + 1;
    END
    
    SET @DayOffset3 = @DayOffset3 + 1;
END;
GO

-- 4. THÊM THÀNH TỰU MỚI (ThanhTuu) nếu chưa có
-- Kiểm tra và thêm thành tựu "30 Bài Tập Hoàn Thành" nếu user đã hoàn thành đủ
IF NOT EXISTS (
    SELECT 1 FROM ThanhTuu 
    WHERE UserID = 'user_0001' AND TenBadge = N'30 Bài Tập Hoàn Thành'
)
BEGIN
    DECLARE @TotalExercises INT;
    SELECT @TotalExercises = COUNT(*) 
    FROM NhatKyHoanThanhBaiTap 
    WHERE UserID = 'user_0001';
    
    IF @TotalExercises >= 30
    BEGIN
        INSERT INTO ThanhTuu (UserID, TenBadge, Diem, NgayDatDuoc, MoTa)
        VALUES (
            'user_0001', N'30 Bài Tập Hoàn Thành', 135, 
            CAST(GETDATE() AS DATETIME), 
            N'Chúc mừng bạn đã hoàn thành 30 bài tập. Bạn thật tuyệt vời!'
        );
    END
END;
GO

-- 5. CẬP NHẬT MỤC TIÊU (MucTieu) - Cập nhật tiến độ
UPDATE MucTieu
SET TienDoHienTai = 25.0 + (SELECT COUNT(*) * 0.5 FROM NhatKyHoanThanhBaiTap WHERE UserID = 'user_0001')
WHERE UserID = 'user_0001' AND MucTieuID = 'goal_0001';

UPDATE MucTieu
SET TienDoHienTai = 30.0 + (SELECT COUNT(*) * 0.3 FROM NhatKyHoanThanhBaiTap WHERE UserID = 'user_0001' AND ChiTietID = 3)
WHERE UserID = 'user_0001' AND MucTieuID = 'goal_0002';
GO

PRINT N'Đã thêm dữ liệu mới cho user_0001 thành công!';
PRINT N'Dữ liệu bao gồm:';
PRINT N'- 7 bản ghi sức khỏe (LuuTruSucKhoe) cho 7 ngày gần nhất';
PRINT N'- Nhiều bản ghi nhật ký hoàn thành bài tập (NhatKyHoanThanhBaiTap)';
PRINT N'- Nhiều bản ghi nhật ký dinh dưỡng (NhatKyDinhDuong)';
PRINT N'- Cập nhật thành tựu và mục tiêu nếu đủ điều kiện';
GO

