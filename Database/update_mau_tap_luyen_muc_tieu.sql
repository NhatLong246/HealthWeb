USE HealthTracker;
GO

PRINT N'--- CẬP NHẬT TRƯỜNG MucTieu TRONG BẢNG MauTapLuyen ---';
PRINT N'--- CHUYỂN ĐỔI TỪ TÊN CŨ SANG 10 MỤC TIÊU MỚI ---';
GO

-- Hiển thị dữ liệu trước khi cập nhật
PRINT N'--- TRƯỚC KHI CẬP NHẬT ---';
SELECT DISTINCT MucTieu, COUNT(*) AS SoLuong 
FROM MauTapLuyen 
GROUP BY MucTieu
ORDER BY MucTieu;
GO

-- Cập nhật các giá trị MucTieu
-- 1. "Tay Khỏe" → "Cơ Tay"
UPDATE MauTapLuyen
SET MucTieu = N'Cơ Tay'
WHERE MucTieu = N'Tay Khỏe';
GO

-- 2. "Chân To" → "Cơ Chân"
UPDATE MauTapLuyen
SET MucTieu = N'Cơ Chân'
WHERE MucTieu = N'Chân To';
GO

-- 3. "Mông Săn Chắc" → "Cơ Mông"
UPDATE MauTapLuyen
SET MucTieu = N'Cơ Mông'
WHERE MucTieu = N'Mông Săn Chắc';
GO

-- 4. "Bụng 6 Múi" → "Cơ Bụng"
UPDATE MauTapLuyen
SET MucTieu = N'Cơ Bụng'
WHERE MucTieu = N'Bụng 6 Múi';
GO

-- 5. "Vai Rộng" → "Cơ Vai"
UPDATE MauTapLuyen
SET MucTieu = N'Cơ Vai'
WHERE MucTieu = N'Vai Rộng';
GO

-- 6. "Lưng Chắc Khỏe" → "Cơ Xô"
UPDATE MauTapLuyen
SET MucTieu = N'Cơ Xô'
WHERE MucTieu = N'Lưng Chắc Khỏe';
GO

-- 7. "Ngực Nở" → "Cơ Ngực"
UPDATE MauTapLuyen
SET MucTieu = N'Cơ Ngực'
WHERE MucTieu = N'Ngực Nở';
GO

-- 8. "Dẻo Dai" → "Giảm Cân" (Yoga thường dùng cho giảm cân và dẻo dai)
-- Nếu bạn muốn giữ một số bài Yoga cho mục tiêu khác, có thể điều chỉnh
UPDATE MauTapLuyen
SET MucTieu = N'Giảm Cân'
WHERE MucTieu = N'Dẻo Dai';
GO

-- 9. Tách riêng các bài tập về "Đùi" thành "Cơ Đùi"
-- (Cần thực hiện sau khi đã cập nhật "Chân To" → "Cơ Chân")
UPDATE MauTapLuyen
SET MucTieu = N'Cơ Đùi'
WHERE TenMauTapLuyen LIKE N'%Đùi%' AND MucTieu = N'Cơ Chân';
GO

-- 10. Cập nhật các bài Yoga liên quan đến cổ/lưng thành "Cơ Cổ"
-- (Yoga Cobra thường tập cho cơ cổ và lưng)
UPDATE MauTapLuyen
SET MucTieu = N'Cơ Cổ'
WHERE TenMauTapLuyen LIKE N'%Yoga%Tư Thế Cobra%';
GO

-- Hiển thị dữ liệu sau khi cập nhật
PRINT N'--- SAU KHI CẬP NHẬT ---';
SELECT DISTINCT MucTieu, COUNT(*) AS SoLuong 
FROM MauTapLuyen 
GROUP BY MucTieu
ORDER BY MucTieu;
GO

PRINT N'--- HOÀN TẤT CẬP NHẬT ---';
GO

