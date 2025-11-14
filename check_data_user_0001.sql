USE HealthTracker;
GO

-- ==========================================
-- SCRIPT KIỂM TRA DỮ LIỆU CHO user_0001
-- ==========================================

PRINT N'==========================================';
PRINT N'KIỂM TRA DỮ LIỆU CHO user_0001';
PRINT N'==========================================';
PRINT N'';

-- 1. KIỂM TRA USER CÓ TỒN TẠI KHÔNG
PRINT N'1. KIỂM TRA USER:';
SELECT 
    UserID,
    Username,
    HoTen,
    Email,
    CreatedDate
FROM Users
WHERE UserID = 'user_0001';
GO

-- 2. KIỂM TRA NHẬT KÝ HOÀN THÀNH BÀI TẬP
PRINT N'';
PRINT N'2. NHẬT KÝ HOÀN THÀNH BÀI TẬP (NhatKyHoanThanhBaiTap):';
SELECT 
    COUNT(*) AS TotalRecords,
    MIN(NgayHoanThanh) AS EarliestDate,
    MAX(NgayHoanThanh) AS LatestDate,
    SUM(CASE WHEN NgayHoanThanh >= DATEADD(DAY, -6, CAST(GETDATE() AS DATE)) THEN 1 ELSE 0 END) AS RecordsLast7Days,
    SUM(ThoiLuongThucTePhut) AS TotalMinutes,
    SUM(CaloTieuHao) AS TotalCalories
FROM NhatKyHoanThanhBaiTap
WHERE UserID = 'user_0001';
GO

-- Chi tiết 7 ngày gần nhất
PRINT N'';
PRINT N'   Chi tiết 7 ngày gần nhất:';
SELECT 
    NgayHoanThanh,
    ChiTietID,
    ThoiLuongThucTePhut,
    CaloTieuHao,
    DanhGiaBaiTap,
    GhiChu
FROM NhatKyHoanThanhBaiTap
WHERE UserID = 'user_0001'
    AND NgayHoanThanh >= DATEADD(DAY, -6, CAST(GETDATE() AS DATE))
ORDER BY NgayHoanThanh DESC, ChiTietID;
GO

-- 3. KIỂM TRA CHI TIẾT KẾ HOẠCH TẬP LUYỆN (để xem ChiTietID có tồn tại không)
PRINT N'';
PRINT N'3. CHI TIẾT KẾ HOẠCH TẬP LUYỆN (ChiTietKeHoachTapLuyen):';
SELECT 
    c.ChiTietID,
    c.KeHoachID,
    c.TenBaiTap,
    k.UserID,
    k.LoaiKeHoach
FROM ChiTietKeHoachTapLuyen c
INNER JOIN KeHoachTapLuyen k ON c.KeHoachID = k.KeHoachID
WHERE k.UserID = 'user_0001'
ORDER BY c.ChiTietID;
GO

-- Kiểm tra ChiTietID được sử dụng trong NhatKyHoanThanhBaiTap
PRINT N'';
PRINT N'   ChiTietID được sử dụng trong nhật ký:';
SELECT DISTINCT
    n.ChiTietID,
    c.TenBaiTap,
    COUNT(*) AS UsageCount
FROM NhatKyHoanThanhBaiTap n
LEFT JOIN ChiTietKeHoachTapLuyen c ON n.ChiTietID = c.ChiTietID
WHERE n.UserID = 'user_0001'
GROUP BY n.ChiTietID, c.TenBaiTap
ORDER BY n.ChiTietID;
GO

-- 4. KIỂM TRA DỮ LIỆU SỨC KHỎE
PRINT N'';
PRINT N'4. DỮ LIỆU SỨC KHỎE (LuuTruSucKhoe):';
SELECT 
    COUNT(*) AS TotalRecords,
    MIN(NgayGhiNhan) AS EarliestDate,
    MAX(NgayGhiNhan) AS LatestDate,
    SUM(CASE WHEN NgayGhiNhan >= DATEADD(DAY, -6, CAST(GETDATE() AS DATE)) THEN 1 ELSE 0 END) AS RecordsLast7Days
FROM LuuTruSucKhoe
WHERE UserID = 'user_0001';
GO

-- Chi tiết 7 ngày gần nhất
PRINT N'';
PRINT N'   Chi tiết 7 ngày gần nhất:';
SELECT 
    NgayGhiNhan,
    CanNang,
    ChieuCao,
    BMI,
    SoBuoc,
    CaloTieuThu,
    SoGioNgu,
    TiLeMo
FROM LuuTruSucKhoe
WHERE UserID = 'user_0001'
    AND NgayGhiNhan >= DATEADD(DAY, -6, CAST(GETDATE() AS DATE))
ORDER BY NgayGhiNhan DESC;
GO

-- 5. KIỂM TRA NHẬT KÝ DINH DƯỠNG
PRINT N'';
PRINT N'5. NHẬT KÝ DINH DƯỠNG (NhatKyDinhDuong):';
SELECT 
    COUNT(*) AS TotalRecords,
    MIN(NgayGhiLog) AS EarliestDate,
    MAX(NgayGhiLog) AS LatestDate,
    SUM(CASE WHEN NgayGhiLog >= DATEADD(DAY, -6, CAST(GETDATE() AS DATE)) THEN 1 ELSE 0 END) AS RecordsLast7Days
FROM NhatKyDinhDuong
WHERE UserID = 'user_0001';
GO

-- Chi tiết 7 ngày gần nhất với thông tin món ăn
PRINT N'';
PRINT N'   Chi tiết 7 ngày gần nhất:';
SELECT 
    n.NgayGhiLog,
    n.MonAnID,
    m.TenMonAn,
    n.LuongThucAn,
    m.LuongCalo,
    (m.LuongCalo * n.LuongThucAn / 100.0) AS TotalCalories,
    n.GhiChu
FROM NhatKyDinhDuong n
LEFT JOIN DinhDuongMonAn m ON n.MonAnID = m.MonAnID
WHERE n.UserID = 'user_0001'
    AND n.NgayGhiLog >= DATEADD(DAY, -6, CAST(GETDATE() AS DATE))
ORDER BY n.NgayGhiLog DESC, n.GhiChu;
GO

-- 6. KIỂM TRA THÀNH TỰU
PRINT N'';
PRINT N'6. THÀNH TỰU (ThanhTuu):';
SELECT 
    TenBadge,
    Diem,
    NgayDatDuoc,
    MoTa
FROM ThanhTuu
WHERE UserID = 'user_0001'
ORDER BY NgayDatDuoc DESC;
GO

PRINT N'   Tổng số thành tựu:';
SELECT COUNT(*) AS TotalAchievements
FROM ThanhTuu
WHERE UserID = 'user_0001';
GO

-- 7. KIỂM TRA MỤC TIÊU
PRINT N'';
PRINT N'7. MỤC TIÊU (MucTieu):';
SELECT 
    MucTieuID,
    LoaiMucTieu,
    GiaTriMucTieu,
    NgayBatDau,
    NgayKetThuc,
    TienDoHienTai,
    DaHoanThanh,
    GhiChu
FROM MucTieu
WHERE UserID = 'user_0001'
ORDER BY ThuTuHienThi;
GO

-- 8. TỔNG HỢP THỐNG KÊ
PRINT N'';
PRINT N'==========================================';
PRINT N'TỔNG HỢP THỐNG KÊ';
PRINT N'==========================================';
PRINT N'';

-- Tổng số buổi tập
SELECT 
    'Tổng số buổi tập' AS Metric,
    COUNT(*) AS Value
FROM NhatKyHoanThanhBaiTap
WHERE UserID = 'user_0001'
UNION ALL
-- Tổng thời gian (giờ)
SELECT 
    'Tổng thời gian (giờ)' AS Metric,
    CAST(SUM(ISNULL(ThoiLuongThucTePhut, 0)) / 60.0 AS DECIMAL(10, 2)) AS Value
FROM NhatKyHoanThanhBaiTap
WHERE UserID = 'user_0001'
UNION ALL
-- Tổng số thành tựu
SELECT 
    'Tổng số thành tựu' AS Metric,
    COUNT(*) AS Value
FROM ThanhTuu
WHERE UserID = 'user_0001'
UNION ALL
-- Số bản ghi sức khỏe 7 ngày gần nhất
SELECT 
    'Bản ghi sức khỏe (7 ngày)' AS Metric,
    COUNT(*) AS Value
FROM LuuTruSucKhoe
WHERE UserID = 'user_0001'
    AND NgayGhiNhan >= DATEADD(DAY, -6, CAST(GETDATE() AS DATE))
UNION ALL
-- Số bản ghi dinh dưỡng 7 ngày gần nhất
SELECT 
    'Bản ghi dinh dưỡng (7 ngày)' AS Metric,
    COUNT(*) AS Value
FROM NhatKyDinhDuong
WHERE UserID = 'user_0001'
    AND NgayGhiLog >= DATEADD(DAY, -6, CAST(GETDATE() AS DATE))
UNION ALL
-- Số buổi tập 7 ngày gần nhất
SELECT 
    'Buổi tập (7 ngày)' AS Metric,
    COUNT(*) AS Value
FROM NhatKyHoanThanhBaiTap
WHERE UserID = 'user_0001'
    AND NgayHoanThanh >= DATEADD(DAY, -6, CAST(GETDATE() AS DATE));
GO

-- 9. KIỂM TRA NGÀY HIỆN TẠI VÀ KHOẢNG THỜI GIAN
PRINT N'';
PRINT N'==========================================';
PRINT N'THÔNG TIN NGÀY THÁNG';
PRINT N'==========================================';
PRINT N'';
SELECT 
    'Ngày hiện tại' AS Info,
    CAST(GETDATE() AS DATE) AS Value
UNION ALL
SELECT 
    '7 ngày trước' AS Info,
    DATEADD(DAY, -6, CAST(GETDATE() AS DATE)) AS Value
UNION ALL
SELECT 
    'Ngày sớm nhất trong nhật ký' AS Info,
    MIN(NgayHoanThanh) AS Value
FROM NhatKyHoanThanhBaiTap
WHERE UserID = 'user_0001'
UNION ALL
SELECT 
    'Ngày mới nhất trong nhật ký' AS Info,
    MAX(NgayHoanThanh) AS Value
FROM NhatKyHoanThanhBaiTap
WHERE UserID = 'user_0001';
GO

-- 10. KIỂM TRA DỮ LIỆU CÓ VẤN ĐỀ
PRINT N'';
PRINT N'==========================================';
PRINT N'KIỂM TRA DỮ LIỆU CÓ VẤN ĐỀ';
PRINT N'==========================================';
PRINT N'';

-- Nhật ký với ChiTietID không tồn tại
PRINT N'10.1. Nhật ký với ChiTietID không tồn tại:';
SELECT 
    n.UserID,
    n.ChiTietID,
    n.NgayHoanThanh,
    'ChiTietID không tồn tại trong ChiTietKeHoachTapLuyen' AS Issue
FROM NhatKyHoanThanhBaiTap n
LEFT JOIN ChiTietKeHoachTapLuyen c ON n.ChiTietID = c.ChiTietID
WHERE n.UserID = 'user_0001'
    AND c.ChiTietID IS NULL;
GO

-- Nhật ký dinh dưỡng với MonAnID không tồn tại
PRINT N'';
PRINT N'10.2. Nhật ký dinh dưỡng với MonAnID không tồn tại:';
SELECT 
    n.UserID,
    n.MonAnID,
    n.NgayGhiLog,
    'MonAnID không tồn tại trong DinhDuongMonAn' AS Issue
FROM NhatKyDinhDuong n
LEFT JOIN DinhDuongMonAn m ON n.MonAnID = m.MonAnID
WHERE n.UserID = 'user_0001'
    AND m.MonAnID IS NULL;
GO

-- Dữ liệu với ngày trong tương lai
PRINT N'';
PRINT N'10.3. Dữ liệu với ngày trong tương lai:';
SELECT 
    'NhatKyHoanThanhBaiTap' AS TableName,
    COUNT(*) AS FutureRecords
FROM NhatKyHoanThanhBaiTap
WHERE UserID = 'user_0001'
    AND NgayHoanThanh > CAST(GETDATE() AS DATE)
UNION ALL
SELECT 
    'LuuTruSucKhoe' AS TableName,
    COUNT(*) AS FutureRecords
FROM LuuTruSucKhoe
WHERE UserID = 'user_0001'
    AND NgayGhiNhan > CAST(GETDATE() AS DATE)
UNION ALL
SELECT 
    'NhatKyDinhDuong' AS TableName,
    COUNT(*) AS FutureRecords
FROM NhatKyDinhDuong
WHERE UserID = 'user_0001'
    AND NgayGhiLog > CAST(GETDATE() AS DATE);
GO

PRINT N'';
PRINT N'==========================================';
PRINT N'HOÀN TẤT KIỂM TRA';
PRINT N'==========================================';
PRINT N'';
PRINT N'Lưu ý:';
PRINT N'- Nếu "Buổi tập (7 ngày)" = 0, có thể dữ liệu có ngày cũ hơn 7 ngày';
PRINT N'- Nếu "ChiTietID không tồn tại", cần kiểm tra lại mối quan hệ giữa các bảng';
PRINT N'- Nếu "MonAnID không tồn tại", cần kiểm tra lại dữ liệu dinh dưỡng';
PRINT N'';
GO

