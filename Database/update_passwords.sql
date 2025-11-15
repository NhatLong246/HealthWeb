-- ============================================================
-- UPDATE PASSWORD HASHES - Khớp với C# SHA256 (UTF-8) → Base64
-- ============================================================
-- Script này cập nhật password hash cho các user đã có trong database
-- để khớp với cách verify trong AccountController.cs
-- 
-- C# sử dụng: SHA256(Encoding.UTF8.GetBytes(password)) → Convert.ToBase64String()
-- SQL cần: SHA2_256(VARCHAR(password)) → Base64 (VARCHAR để gần với UTF-8 hơn)
-- ============================================================

USE HealthTracker;
GO

-- Cập nhật password hash cho từng user
-- Sử dụng cùng logic như trong data_mau.sql đã được sửa

-- User: nguyenvana (user_0001) - Password: 123456a@
;WITH HashData AS (
    SELECT CAST('' as xml).value('xs:base64Binary(sql:column("hb"))','varchar(max)') as PasswordHashBase64
    FROM (SELECT CONVERT(varbinary(32), HASHBYTES('SHA2_256', CONVERT(VARCHAR(200), '123456a@'))) as hb) H
)
UPDATE u
SET u.PasswordHash = h.PasswordHashBase64
FROM Users u
CROSS JOIN HashData h
WHERE u.UserID = 'user_0001' AND u.Username = 'nguyenvana';
GO

-- User: tranthib (user_0002) - Password: 123456a@
;WITH HashData AS (
    SELECT CAST('' as xml).value('xs:base64Binary(sql:column("hb"))','varchar(max)') as PasswordHashBase64
    FROM (SELECT CONVERT(varbinary(32), HASHBYTES('SHA2_256', CONVERT(VARCHAR(200), '123456a@'))) as hb) H
)
UPDATE u
SET u.PasswordHash = h.PasswordHashBase64
FROM Users u
CROSS JOIN HashData h
WHERE u.UserID = 'user_0002' AND u.Username = 'tranthib';
GO

-- User: leminhhoang (user_0003) - Password: 123456a@
;WITH HashData AS (
    SELECT CAST('' as xml).value('xs:base64Binary(sql:column("hb"))','varchar(max)') as PasswordHashBase64
    FROM (SELECT CONVERT(varbinary(32), HASHBYTES('SHA2_256', CONVERT(VARCHAR(200), '123456a@'))) as hb) H
)
UPDATE u
SET u.PasswordHash = h.PasswordHashBase64
FROM Users u
CROSS JOIN HashData h
WHERE u.UserID = 'user_0003' AND u.Username = 'leminhhoang';
GO

-- User: admin_van (user_0004) - Password: Admin@123
;WITH HashData AS (
    SELECT CAST('' as xml).value('xs:base64Binary(sql:column("hb"))','varchar(max)') as PasswordHashBase64
    FROM (SELECT CONVERT(varbinary(32), HASHBYTES('SHA2_256', CONVERT(VARCHAR(200), 'Admin@123'))) as hb) H
)
UPDATE u
SET u.PasswordHash = h.PasswordHashBase64
FROM Users u
CROSS JOIN HashData h
WHERE u.UserID = 'user_0004' AND u.Username = 'admin_van';
GO

-- User: phamthid (user_0005) - Password: 123456a@
;WITH HashData AS (
    SELECT CAST('' as xml).value('xs:base64Binary(sql:column("hb"))','varchar(max)') as PasswordHashBase64
    FROM (SELECT CONVERT(varbinary(32), HASHBYTES('SHA2_256', CONVERT(VARCHAR(200), '123456a@'))) as hb) H
)
UPDATE u
SET u.PasswordHash = h.PasswordHashBase64
FROM Users u
CROSS JOIN HashData h
WHERE u.UserID = 'user_0005' AND u.Username = 'phamthid';
GO

-- User: pt_nguyen (user_0006) - Password: 123456a@
;WITH HashData AS (
    SELECT CAST('' as xml).value('xs:base64Binary(sql:column("hb"))','varchar(max)') as PasswordHashBase64
    FROM (SELECT CONVERT(varbinary(32), HASHBYTES('SHA2_256', CONVERT(VARCHAR(200), '123456a@'))) as hb) H
)
UPDATE u
SET u.PasswordHash = h.PasswordHashBase64
FROM Users u
CROSS JOIN HashData h
WHERE u.UserID = 'user_0006' AND u.Username = 'pt_nguyen';
GO

-- User: hoangvane (user_0007) - Password: 123456a@
;WITH HashData AS (
    SELECT CAST('' as xml).value('xs:base64Binary(sql:column("hb"))','varchar(max)') as PasswordHashBase64
    FROM (SELECT CONVERT(varbinary(32), HASHBYTES('SHA2_256', CONVERT(VARCHAR(200), '123456a@'))) as hb) H
)
UPDATE u
SET u.PasswordHash = h.PasswordHashBase64
FROM Users u
CROSS JOIN HashData h
WHERE u.UserID = 'user_0007' AND u.Username = 'hoangvane';
GO

-- User: tranthanh (user_0008) - Password: 123456a@
;WITH HashData AS (
    SELECT CAST('' as xml).value('xs:base64Binary(sql:column("hb"))','varchar(max)') as PasswordHashBase64
    FROM (SELECT CONVERT(varbinary(32), HASHBYTES('SHA2_256', CONVERT(VARCHAR(200), '123456a@'))) as hb) H
)
UPDATE u
SET u.PasswordHash = h.PasswordHashBase64
FROM Users u
CROSS JOIN HashData h
WHERE u.UserID = 'user_0008' AND u.Username = 'tranthanh';
GO

-- ============================================================
-- KIỂM TRA KẾT QUẢ
-- ============================================================
-- Chạy query sau để xem password hash đã được cập nhật chưa:
-- SELECT UserID, Username, LEFT(PasswordHash, 20) + '...' as PasswordHashPreview
-- FROM Users
-- WHERE UserID IN ('user_0001', 'user_0002', 'user_0003', 'user_0004', 'user_0005', 'user_0006', 'user_0007', 'user_0008')
-- ORDER BY UserID;
-- ============================================================

PRINT 'Đã cập nhật password hash cho tất cả users!';
PRINT 'Bạn có thể đăng nhập với:';
PRINT '  - Username: nguyenvana, Password: 123456a@';
PRINT '  - Username: admin_van, Password: Admin@123';
PRINT '  - Hoặc các user khác với password tương ứng';
GO

