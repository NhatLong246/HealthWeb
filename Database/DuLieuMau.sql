INSERT INTO Benh (BenhID, TenBenh) VALUES
('benh_0001', N'Bệnh tăng huyết áp'),
('benh_0002', N'Bệnh tim mạch vành'),
('benh_0003', N'Viêm khớp dạng thấp'),
('benh_0004', N'Loãng xương'),
('benh_0005', N'Suy tim');


INSERT INTO Users (UserID, Username, PasswordHash, Role, Email, HoTen, NgaySinh, GioiTinh, AnhDaiDien, Theme, NgonNgu, TimeZone, ResetToken, ResetTokenExpiry, CreatedDate)
VALUES 
    ('user_0001', 'nguyenvana', '$2a$10$hash1', 'Client', 'nguyenvana@example.com', N'Nguyễn Văn An', '1995-06-20', 'Male', '/uploads/users/user_0001.jpg', 'Dark', 'vi', 'SE Asia Standard Time', NULL, NULL, '2025-01-10 09:00:00'),
    ('user_0002', 'tranthib', '$2a$10$hash2', 'Client', 'tranthib@example.com', N'Trần Thị Bình', '1998-04-15', 'Female', '/uploads/users/user_0002.jpg', 'Dark', 'vi', 'SE Asia Standard Time', NULL, NULL, '2025-01-12 14:30:00'),
    ('user_0003', 'leminhhoang', '$2a$10$hash3', 'PT', 'leminhhoang@example.com', N'Lê Minh Hoàng', '1990-09-10', 'Male', '/uploads/users/pt_0003.jpg', 'Dark', 'vi', 'SE Asia Standard Time', NULL, NULL, '2025-01-15 10:00:00'),
    ('user_0004', 'admin_van', '$2a$10$hash4', 'Admin', 'admin_van@example.com', N'Phạm Văn Cường', '1985-12-05', 'Male', NULL, 'Dark', 'vi', 'SE Asia Standard Time', NULL, NULL, '2025-01-01 08:00:00'),
    ('user_0005', 'phamthid', '$2a$10$hash5', 'Client', 'phamthid@example.com', N'Phạm Thị Dung', '1997-03-25', 'Female', '/uploads/users/user_0005.jpg', 'Dark', 'en', 'SE Asia Standard Time', NULL, NULL, '2025-02-01 11:00:00'),
    ('user_0006', 'pt_nguyen', '$2a$10$hash6', 'PT', 'pt_nguyen@example.com', N'Nguyễn Thị Lan', '1988-07-12', 'Female', '/uploads/users/pt_0006.jpg', 'Dark', 'vi', 'SE Asia Standard Time', NULL, NULL, '2025-02-05 09:30:00'),
    ('user_0007', 'hoangvane', '$2a$10$hash7', 'Client', 'hoangvane@example.com', N'Hoàng Văn Em', '1993-11-30', 'Male', '/uploads/users/user_0007.jpg', 'Dark', 'vi', 'SE Asia Standard Time', NULL, NULL, '2025-02-10 13:00:00'),
    ('user_0008', 'tranthanh', '$2a$10$hash8', 'Client', 'tranthanh@example.com', N'Trần Thanh Hằng', '1996-02-18', 'Female', '/uploads/users/user_0008.jpg', 'Dark', 'vi', 'SE Asia Standard Time', NULL, NULL, '2025-02-15 15:00:00');

	-- BẢNG TẠM CHỨA DỮ LIỆU NGƯỜI DÙNG
DECLARE @SeedUsers TABLE(
  UserID NVARCHAR(20),
  Username NVARCHAR(50),
  PlainPassword NVARCHAR(200),
  Role NVARCHAR(20),
  Email NVARCHAR(100),
  HoTen NVARCHAR(100),
  NgaySinh DATE NULL,
  GioiTinh NVARCHAR(10),
  AnhDaiDien NVARCHAR(200),
  Theme NVARCHAR(20),
  NgonNgu NVARCHAR(10),
  TimeZone NVARCHAR(50),
  CreatedDate DATETIME
);

-- DỮ LIỆU NGƯỜI DÙNG (với mật khẩu thuần bạn có thể định nghĩa)
INSERT INTO @SeedUsers
VALUES
('user_0001', 'nguyenvana', '123456a@', 'Client', 'nguyenvana@example.com', N'Nguyễn Văn An', '1995-06-20', 'Male', '/uploads/users/user_0001.jpg', 'Dark', 'vi', 'SE Asia Standard Time', '2025-01-10 09:00:00'),
('user_0002', 'tranthib', '123456a@', 'Client', 'tranthib@example.com', N'Trần Thị Bình', '1998-04-15', 'Female', '/uploads/users/user_0002.jpg', 'Dark', 'vi', 'SE Asia Standard Time', '2025-01-12 14:30:00'),
('user_0003', 'leminhhoang', '123456a@', 'PT', 'leminhhoang@example.com', N'Lê Minh Hoàng', '1990-09-10', 'Male', '/uploads/users/pt_0003.jpg', 'Dark', 'vi', 'SE Asia Standard Time', '2025-01-15 10:00:00'),
('user_0004', 'admin_van', 'Admin@123', 'Admin', 'admin_van@example.com', N'Phạm Văn Cường', '1985-12-05', 'Male', NULL, 'Dark', 'vi', 'SE Asia Standard Time', '2025-01-01 08:00:00'),
('user_0005', 'phamthid', '123456a@', 'Client', 'phamthid@example.com', N'Phạm Thị Dung', '1997-03-25', 'Female', '/uploads/users/user_0005.jpg', 'Dark', 'en', 'SE Asia Standard Time', '2025-02-01 11:00:00'),
('user_0006', 'pt_nguyen', '123456a@', 'PT', 'pt_nguyen@example.com', N'Nguyễn Thị Lan', '1988-07-12', 'Female', '/uploads/users/pt_0006.jpg', 'Dark', 'vi', 'SE Asia Standard Time', '2025-02-05 09:30:00'),
('user_0007', 'hoangvane', '123456a@', 'Client', 'hoangvane@example.com', N'Hoàng Văn Em', '1993-11-30', 'Male', '/uploads/users/user_0007.jpg', 'Dark', 'vi', 'SE Asia Standard Time', '2025-02-10 13:00:00'),
('user_0008', 'tranthanh', '123456a@', 'Client', 'tranthanh@example.com', N'Trần Thanh Hằng', '1996-02-18', 'Female', '/uploads/users/user_0008.jpg', 'Dark', 'vi', 'SE Asia Standard Time', '2025-02-15 15:00:00');

-- BĂM MẬT KHẨU SHA256 → BASE64
;WITH Src AS (
  SELECT 
    su.UserID,
    su.Username,
    CAST('' as xml).value('xs:base64Binary(xs:hexBinary(sql:column("hb")))','varchar(max)') as PasswordHashBase64,
    su.Role,
    su.Email,
    su.HoTen,
    su.NgaySinh,
    su.GioiTinh,
    su.AnhDaiDien,
    su.Theme,
    su.NgonNgu,
    su.TimeZone,
    su.CreatedDate
  FROM @SeedUsers su
  CROSS APPLY (SELECT CONVERT(varbinary(32), HASHBYTES('SHA2_256', su.PlainPassword))) H(hb)
)

-- CHÈN VÀO BẢNG Users
INSERT INTO Users (
  UserID, Username, PasswordHash, Role, Email, HoTen, NgaySinh, GioiTinh,
  AnhDaiDien, Theme, NgonNgu, TimeZone,
  ResetToken, ResetTokenExpiry, CreatedDate
)
SELECT 
  s.UserID,
  s.Username,
  s.PasswordHashBase64,
  s.Role,
  s.Email,
  s.HoTen,
  s.NgaySinh,
  s.GioiTinh,
  s.AnhDaiDien,
  s.Theme,
  s.NgonNgu,
  s.TimeZone,
  NULL AS ResetToken,
  NULL AS ResetTokenExpiry,
  s.CreatedDate
FROM Src s;

INSERT INTO LuuTruSucKhoe (MaBanGhi, UserID, NgayGhiNhan, SoBuoc, CaloTieuThu, SoGioNgu, CanNang, ChieuCao, BMI, SoDoVong1, SoDoVong2, SoDoVong3, SoDoBapTay, SoDoBapChan, TiLeMo, BenhID, LuongNuocUong)
VALUES 
    ('rec_0001', 'user_0001', '2025-11-01', 8500, 550.0, NULL, 72.0, 172.0, NULL, 86.0, 71.0, 91.0, 31.0, 41.0, 21.0, 'benh_0003', 2.2),
    ('rec_0002', 'user_0001', '2025-11-02', 9200, 600.0, NULL, 71.8, 172.0, NULL, 85.5, 70.5, 90.5, 31.0, 41.0, 20.8, 'benh_0003', 2.5),
    ('rec_0003', 'user_0002', '2025-11-01', 11000, 650.0, NULL, 56.0, 161.0, NULL, 79.0, 61.0, 86.0, 28.5, 38.5, 18.5, NULL, 1.8),
    ('rec_0004', 'user_0002', '2025-11-02', 12500, 720.0, NULL, 55.8, 161.0, NULL, 78.5, 60.5, 85.5, 28.5, 38.5, 18.3, NULL, 2.0),
    ('rec_0005', 'user_0005', '2025-11-01', 7000, 450.0, NULL, 65.0, 165.0, NULL, 82.0, 68.0, 88.0, 29.0, 39.0, 22.0, 'benh_0001', 1.5),
    ('rec_0006', 'user_0005', '2025-11-02', 7500, 480.0, NULL, 64.8, 165.0, NULL, 81.5, 67.5, 87.5, 29.0, 39.0, 21.8, 'benh_0001', 1.7),
    ('rec_0007', 'user_0007', '2025-11-01', 9500, 580.0, NULL, 78.0, 175.0, NULL, 88.0, 73.0, 92.0, 32.0, 42.0, 23.0, NULL, 2.3),
    ('rec_0008', 'user_0007', '2025-11-02', 9800, 600.0, NULL, 77.8, 175.0, NULL, 87.5, 72.5, 91.5, 32.0, 42.0, 22.8, NULL, 2.4),
    ('rec_0009', 'user_0008', '2025-11-01', 6000, 400.0, NULL, 60.0, 158.0, NULL, 80.0, 62.0, 85.0, 27.0, 37.0, 19.0, NULL, 1.6),
    ('rec_0010', 'user_0008', '2025-11-02', 6500, 420.0, NULL, 59.8, 158.0, NULL, 79.5, 61.5, 84.5, 27.0, 37.0, 18.8, NULL, 1.8);

INSERT INTO MucTieu (MucTieuID, UserID, LoaiMucTieu, GiaTriMucTieu, NgayBatDau, NgayKetThuc, TienDoHienTai, DaHoanThanh, ThuTuHienThi, GhiChu)
VALUES
    ('goal_0001', 'user_0001', N'Giảm Cân', 80.0, '2025-11-01', '2025-12-31', 20.0, 0, 1, N'Giảm cân để đạt 80% vóc dáng mong muốn'),
    ('goal_0002', 'user_0001', N'Cơ Tay', 90.0, '2025-11-01', '2025-11-30', 25.0, 0, 2, N'Tăng cơ tay, đạt 90% sức mạnh mong muốn'),
    ('goal_0003', 'user_0002', N'Cơ Bụng', 85.0, '2025-11-01', NULL, 15.0, 0, 1, N'Tập cơ bụng để đạt 85% hình thể lý tưởng'),
    ('goal_0004', 'user_0002', N'Cơ Chân', 75.0, '2025-11-01', '2026-01-15', 20.0, 0, 2, N'Tăng cơ chân để đạt 75% sức mạnh mong muốn'),
    ('goal_0005', 'user_0005', N'Cơ Đùi', 90.0, '2025-11-01', '2025-11-30', 10.0, 0, 1, N'Tăng cơ đùi, đạt 90% sức mạnh mong muốn'),
    ('goal_0006', 'user_0005', N'Cơ Mông', 85.0, '2025-11-01', '2025-12-01', 15.0, 0, 2, N'Tập cơ mông để đạt 85% hình thể mong muốn'),
    ('goal_0007', 'user_0007', N'Cơ Ngực', 80.0, '2025-11-01', '2026-02-28', 10.0, 0, 1, N'Tăng cơ ngực, đạt 80% sức mạnh mong muốn'),
    ('goal_0008', 'user_0007', N'Cơ Vai', 85.0, '2025-11-01', NULL, 12.0, 0, 2, N'Tập cơ vai để đạt 85% hình thể lý tưởng'),
    ('goal_0009', 'user_0008', N'Cơ Xô', 80.0, '2025-11-01', '2025-12-31', 18.0, 0, 1, N'Tăng cơ xô, đạt 80% sức mạnh mong muốn'),
    ('goal_0010', 'user_0008', N'Cơ Cổ', 75.0, '2025-11-01', '2025-11-30', 10.0, 0, 2, N'Tập cơ cổ để đạt 75% sức mạnh mong muốn');

INSERT INTO ThanhTuu (UserID, TenBadge, Diem, NgayDatDuoc, MoTa)
VALUES
    ('user_0001', '10 Bài Tập Hoàn Thành', 45, '2025-11-02 09:00:00', N'Chúc mừng bạn đã hoàn thành 10 bài tập. Hãy tiếp tục nhé!'),
    ('user_0001', '20 Bài Tập Hoàn Thành', 90, '2025-11-03 15:00:00', N'Chúc mừng bạn đã hoàn thành 20 bài tập. Tiếp tục phát huy!'),
    ('user_0002', '10 Bài Tập Hoàn Thành', 45, '2025-11-01 18:00:00', N'Chúc mừng bạn đã hoàn thành 10 bài tập. Giữ vững phong độ!'),
    ('user_0002', '20 Bài Tập Hoàn Thành', 90, '2025-11-02 08:00:00', N'Chúc mừng bạn đã hoàn thành 20 bài tập. Bạn thật tuyệt vời!'),
    ('user_0005', '10 Bài Tập Hoàn Thành', 45, '2025-11-02 12:00:00', N'Chúc mừng bạn đã hoàn thành 10 bài tập. Hãy tiếp tục nhé!'),
    ('user_0007', '20 Bài Tập Hoàn Thành', 90, '2025-11-01 20:00:00', N'Chúc mừng bạn đã hoàn thành 20 bài tập. Tiếp tục chinh phục!'),
    ('user_0008', '30 Bài Tập Hoàn Thành', 135, '2025-11-02 07:00:00', N'Chúc mừng bạn đã hoàn thành 30 bài tập. Bạn là một ngôi sao!');

INSERT INTO NhatKyDinhDuong (DinhDuongID, UserID, NgayGhiLog, MonAnID, LuongThucAn, GhiChu)
VALUES
    ('nut_0001', 'user_0001', '2025-11-01', 'monan_0001', 200.0, N'Buổi Trưa'),
    ('nut_0002', 'user_0001', '2025-11-01', 'monan_0002', 150.0, N'Buổi Sáng'),
    ('nut_0003', 'user_0001', '2025-11-02', 'monan_0003', 16.0, N'Buổi Tối'),
    ('nut_0004', 'user_0002', '2025-11-01', 'monan_0001', 150.0, N'Buổi Trưa'),
    ('nut_0005', 'user_0002', '2025-11-02', 'monan_0002', 200.0, N'Buổi Sáng'),
    ('nut_0006', 'user_0005', '2025-11-01', 'monan_0003', 32.0, N'Buổi Tối'),
    ('nut_0007', 'user_0007', '2025-11-01', 'monan_0001', 250.0, N'Buổi Tối'),
    ('nut_0008', 'user_0008', '2025-11-02', 'monan_0002', 100.0, N'Buổi Sáng');

INSERT INTO KeHoachTapLuyen (KeHoachID, UserID, MucTieuID, TenKeHoach, LoaiKeHoach, MucDo, SoTuan, SoBuoi, ThoiLuongPhut, CaloTieuHaoMoiBuoi, Nguon, DangSuDung, NgayTao)
VALUES
    ('plan_0001', 'user_0001', 'goal_0001', N'Kế Hoạch Giảm Cân 12 Tuần', N'Có Động', 'Beginner', 12, 3, 45, 300.0, 'PT', 1, '2025-11-01 09:00:00'),
    ('plan_0002', 'user_0001', 'goal_0002', N'Kế Hoạch Tăng Cơ Tay 4 Tuần', N'Sức Mạnh', 'Intermediate', 4, 4, 60, 350.0, 'PT', 1, '2025-11-01 10:00:00'),
    ('plan_0003', 'user_0002', 'goal_0003', N'Kế Hoạch Tập Cơ Bụng 8 Tuần', N'Sức Mạnh', 'Intermediate', 8, 3, 50, 250.0, 'AI', 1, '2025-11-01 11:00:00'),
    ('plan_0004', 'user_0002', 'goal_0004', N'Kế Hoạch Tăng Cơ Chân 12 Tuần', N'Sức Mạnh', 'Beginner', 12, 4, 60, 400.0, 'PT', 1, '2025-11-01 12:00:00'),
    ('plan_0005', 'user_0005', 'goal_0005', N'Kế Hoạch Tăng Cơ Đùi 4 Tuần', N'Sức Mạnh', 'Intermediate', 4, 5, 45, 300.0, 'PT', 1, '2025-11-01 13:00:00'),
    ('plan_0006', 'user_0005', 'goal_0006', N'Kế Hoạch Tập Cơ Mông 6 Tuần', N'Sức Mạnh', 'Beginner', 6, 3, 40, 250.0, 'AI', 1, '2025-11-01 14:00:00'),
    ('plan_0007', 'user_0007', 'goal_0007', N'Kế Hoạch Tăng Cơ Ngực 12 Tuần', N'Sức Mạnh', 'Advanced', 12, 5, 75, 500.0, 'PT', 1, '2025-11-01 15:00:00'),
    ('plan_0008', 'user_0007', 'goal_0008', N'Kế Hoạch Tăng Cơ Vai 8 Tuần', N'Sức Mạnh', 'Intermediate', 8, 4, 60, 350.0, 'PT', 1, '2025-11-01 16:00:00'),
    ('plan_0009', 'user_0008', 'goal_0009', N'Kế Hoạch Tăng Cơ Xô 12 Tuần', N'Sức Mạnh', 'Intermediate', 12, 4, 60, 400.0, 'PT', 1, '2025-11-01 17:00:00'),
    ('plan_0010', 'user_0008', 'goal_0010', N'Kế Hoạch Tăng Cơ Cổ 4 Tuần', N'Sức Mạnh', 'Beginner', 4, 3, 30, 200.0, 'AI', 1, '2025-11-01 18:00:00');

INSERT INTO ChiTietKeHoachTapLuyen (
    KeHoachID, TenBaiTap, SoHiep, SoLan, CaloTieuHaoDuKien, 
    ThoiGianPhut, NgayTrongTuan, Tuan, ThuTuHienThi, DanhGiaDoKho, 
    DanhGiaHieuQua, VideoUrl, CanhBao, NoiDung, HuongDan
)
VALUES
    ('plan_0001', N'Yoga - Tư Thế Plank', NULL, NULL, 150.0, 1, 1, 1, 1, 1, 4, NULL, N'Giữ bụng căng', N'Giữ tư thế plank, siết cơ lõi', N'Giữ lưng thẳng, hít thở đều'),
    ('plan_0001', N'Yoga - Tư Thế Chiến Binh', NULL, NULL, 150.0, 2, 2, 1, 2, 2, 4, NULL, N'Giữ thăng bằng', N'Chùng chân trước, tay nâng cao', N'Bước rộng, giữ tư thế'),
    ('plan_0002', N'Tay Trước - Tập Curls Cơ Bản', 3, 12, 200.0, NULL, 3, 1, 1, 1, 4, NULL, N'Giữ khuỷu tay cố định', N'Tập cơ tay trước với curls', N'Hít vào khi hạ tạ'),
    ('plan_0003', N'Bụng - Tập Plank', NULL, NULL, 150.0, 1, 4, 1, 1, 1, 5, NULL, N'Giữ bụng căng', N'Giữ tư thế plank', N'Giữ lưng thẳng'),
    ('plan_0003', N'Bụng - Tập Russian Twist', 3, 20, 150.0, NULL, 5, 1, 2, 2, 4, NULL, N'Không cong lưng', N'Xoay người', N'Giữ tạ nhẹ'),
    ('plan_0004', N'Chân - Tập Squat', 3, 15, 300.0, NULL, 6, 1, 1, 1, 5, NULL, N'Giữ lưng thẳng', N'Hạ thấp người', N'Hạ thấp mông'),
    ('plan_0005', N'Đùi - Tập Lunges', 3, 12, 250.0, NULL, 1, 1, 1, 1, 5, NULL, N'Giữ đầu gối không vượt mũi chân', N'Chùng chân trước', N'Bước dài'),
    ('plan_0006', N'Mông - Tập Glute Bridge', 3, 15, 200.0, NULL, 2, 1, 1, 1, 4, NULL, N'Giữ lưng thẳng', N'Nâng hông', N'Siết cơ mông'),
    ('plan_0007', N'Ngực - Tập Push Ups', 3, 15, 250.0, NULL, 3, 1, 1, 1, 4, NULL, N'Không khóa khuỷu tay', N'Hít đất', N'Siết cơ ngực'),
    ('plan_0007', N'Ngực - Tập Bench Press', 4, 10, 350.0, NULL, 4, 1, 2, 2, 5, NULL, N'Không khóa khuỷu tay', N'Đẩy thanh tạ nằm', N'Hít vào khi hạ tạ'),
    ('plan_0008', N'Vai - Tập Shoulder Press', 3, 12, 250.0, NULL, 5, 1, 1, 1, 5, NULL, N'Giữ lưng thẳng', N'Đẩy tạ tay lên', N'Giữ khuỷu ổn định'),
    ('plan_0009', N'Lưng - Tập Lat Pulldown', 3, 12, 250.0, NULL, 6, 1, 1, 1, 5, NULL, N'Không kéo quá thấp', N'Kéo cáp xuống', N'Tập trung cơ lưng trên'),
    ('plan_0010', N'Yoga - Tư Thế Cobra', NULL, NULL, 100.0, 1, 1, 1, 1, 1, 4, NULL, N'Chuyển động chậm', N'Nâng ngực', N'Kéo giãn lưng');

INSERT INTO DinhDuongMonAn (MonAnID, TenMonAn, DonViTinh, HinhAnh, LuongCalo, Protein, ChatBeo, Carbohydrate) VALUES
('monan_0001', N'Gà nướng', N'100g', NULL, 165, 31, 3.6, 0),
('monan_0002', N'Cá hồi áp chảo', N'100g', NULL, 206, 22, 13, 0),
('monan_0003', N'Cơm gạo lứt', N'1 chén', NULL, 216, 5, 1.8, 45),
('monan_0004', N'Salad rau trộn', N'1 bát', NULL, 33, 1.3, 0.2, 7),
('monan_0005', N'Sữa chua không đường', N'100g', NULL, 61, 3.5, 3.3, 4.7),
('monan_0006', N'Khoai lang luộc', N'100g', NULL, 86, 1.6, 0.1, 20),
('monan_0007', N'Bông cải xanh luộc', N'100g', NULL, 35, 2.8, 0.4, 7),
('monan_0008', N'Ức gà luộc', N'100g', NULL, 165, 31, 3.6, 0),
('monan_0009', N'Trứng luộc', N'1 quả', NULL, 68, 6, 5, 0.6),
('monan_0010', N'Yến mạch', N'100g', NULL, 389, 13, 6.9, 66),
('monan_0011', N'Chuối chín', N'1 quả', NULL, 90, 1.1, 0.3, 23),
('monan_0012', N'Táo', N'1 quả', NULL, 95, 0.5, 0.3, 25),
('monan_0013', N'Bánh mì nguyên cám', N'1 lát', NULL, 80, 3, 1, 14),
('monan_0014', N'Sườn heo nướng', N'100g', NULL, 260, 22, 18, 0),
('monan_0015', N'Cá thu chiên', N'100g', NULL, 305, 19, 25, 0),
('monan_0016', N'Rau muống xào', N'100g', NULL, 45, 2, 3, 4),
('monan_0017', N'Đậu phụ chiên', N'100g', NULL, 271, 17, 20, 10),
('monan_0018', N'Sữa tươi không đường', N'1 ly', NULL, 122, 8, 5, 12),
('monan_0019', N'Hạnh nhân', N'28g', NULL, 161, 6, 14, 6),
('monan_0020', N'Mì ống nguyên cám', N'100g', NULL, 131, 5, 1.1, 25),
('monan_0021', N'Bò nướng', N'100g', NULL, 250, 26, 15, 0),
('monan_0022', N'Cá ngừ đóng hộp', N'100g', NULL, 116, 26, 1, 0),
('monan_0023', N'Gạo trắng', N'1 chén', NULL, 205, 4.3, 0.4, 45),
('monan_0024', N'Rau cải bó xôi luộc', N'100g', NULL, 23, 2.9, 0.4, 3.6),
('monan_0025', N'Sữa đậu nành', N'1 ly', NULL, 80, 7, 4, 4),
('monan_0026', N'Khoai tây nướng', N'100g', NULL, 93, 2.5, 0.1, 21),
('monan_0027', N'Cà rốt luộc', N'100g', NULL, 41, 0.9, 0.2, 9.6),
('monan_0028', N'Thịt lợn nạc', N'100g', NULL, 143, 21, 6, 0),
('monan_0029', N'Trứng chiên', N'1 quả', NULL, 80, 6, 6, 1),
('monan_0030', N'Bột yến mạch', N'100g', NULL, 350, 12, 7, 59),
('monan_0031', N'Cam', N'1 quả', NULL, 62, 1.2, 0.2, 15),
('monan_0032', N'Lê', N'1 quả', NULL, 57, 0.4, 0.1, 15),
('monan_0033', N'Bánh quy nguyên cám', N'1 cái', NULL, 70, 2, 2.5, 10),
('monan_0034', N'Tôm luộc', N'100g', NULL, 99, 21, 0.3, 1.1),
('monan_0035', N'Cá mòi chiên', N'100g', NULL, 208, 25, 11, 0),
('monan_0036', N'Rau cải thìa xào', N'100g', NULL, 40, 1.5, 3, 4),
('monan_0037', N'Đậu hũ hấp', N'100g', NULL, 70, 8, 4, 2),
('monan_0038', N'Sữa hạnh nhân', N'1 ly', NULL, 40, 1, 3, 2),
('monan_0039', N'Hạt óc chó', N'28g', NULL, 185, 4.3, 18, 4),
('monan_0040', N'Mì gạo', N'100g', NULL, 110, 2, 0.5, 24),
('monan_0041', N'Ức vịt nướng', N'100g', NULL, 202, 20, 13, 0),
('monan_0042', N'Nấm hương xào', N'100g', NULL, 35, 3, 0.5, 7),
('monan_0043', N'Bí đỏ hấp', N'100g', NULL, 26, 1, 0.1, 6),
('monan_0044', N'Thịt bò xay', N'100g', NULL, 176, 20, 10, 0),
('monan_0045', N'Hạt chia', N'28g', NULL, 137, 5, 9, 12),
('monan_0046', N'Bánh mì đen', N'1 lát', NULL, 90, 3.5, 1.5, 16),
('monan_0047', N'Đậu đỏ luộc', N'100g', NULL, 125, 7, 0.5, 23),
('monan_0048', N'Sữa bò nguyên kem', N'1 ly', NULL, 150, 8, 8, 12),
('monan_0049', N'Xoài chín', N'1 quả', NULL, 107, 0.8, 0.4, 25),
('monan_0050', N'Bắp rang không bơ', N'100g', NULL, 375, 12, 4, 74),
('monan_0051', N'Cá basa chiên', N'100g', NULL, 200, 15, 14, 0),
('monan_0052', N'Rau bina luộc', N'100g', NULL, 23, 3, 0.4, 3.6),
('monan_0053', N'Đậu phộng rang', N'28g', NULL, 160, 7, 14, 5),
('monan_0054', N'Bánh bao chay', N'1 cái', NULL, 150, 4, 2, 28),
('monan_0055', N'Nước ép táo', N'1 ly', NULL, 112, 0.2, 0.3, 28),
('monan_0056', N'Bí xanh luộc', N'100g', NULL, 17, 0.4, 0.2, 4),
('monan_0057', N'Thịt gà xay', N'100g', NULL, 150, 20, 7, 0),
('monan_0058', N'Hạt dưa', N'28g', NULL, 160, 5, 14, 4),
('monan_0059', N'Mì trứng', N'100g', NULL, 138, 4, 1, 26),
('monan_0060', N'Dưa hấu', N'100g', NULL, 30, 0.6, 0.2, 8),
('monan_0061', N'Thịt heo xào', N'100g', NULL, 200, 18, 14, 0),
('monan_0062', N'Rau mồng tơi', N'100g', NULL, 19, 1.8, 0.3, 3),
('monan_0063', N'Hạt điều rang', N'28g', NULL, 157, 5, 12, 9),
('monan_0064', N'Bánh gạo', N'1 cái', NULL, 35, 0.7, 0.1, 7),
('monan_0065', N'Nước ép cam', N'1 ly', NULL, 112, 1.7, 0.5, 26),
('monan_0066', N'Cải ngọt luộc', N'100g', NULL, 20, 1.5, 0.2, 3.5),
('monan_0067', N'Thịt vịt luộc', N'100g', NULL, 180, 18, 11, 0),
('monan_0068', N'Hạt hướng dương', N'28g', NULL, 163, 5, 14, 6),
('monan_0069', N'Bún gạo', N'100g', NULL, 110, 2.5, 0.3, 24),
('monan_0070', N'Nhãn', N'100g', NULL, 60, 1.3, 0.1, 15),
('monan_0071', N'Cá thu nướng', N'100g', NULL, 220, 20, 15, 0),
('monan_0072', N'Rau dền luộc', N'100g', NULL, 21, 2, 0.3, 4),
('monan_0073', N'Sữa chua có đường', N'100g', NULL, 112, 3, 3, 17),
('monan_0074', N'Bánh quy yến mạch', N'1 cái', NULL, 80, 2, 3, 12),
('monan_0075', N'Nước ép dứa', N'1 ly', NULL, 132, 0.5, 0.3, 32),
('monan_0076', N'Đậu xanh luộc', N'100g', NULL, 105, 7, 0.4, 19),
('monan_0077', N'Thịt bò áp chảo', N'100g', NULL, 200, 25, 10, 0),
('monan_0078', N'Hạt lanh', N'28g', NULL, 150, 5, 12, 8),
('monan_0079', N'Bánh mì trắng', N'1 lát', NULL, 80, 2.5, 1, 15),
('monan_0080', N'Chôm chôm', N'100g', NULL, 68, 0.9, 0.2, 16),
('monan_0081', N'Cá lóc nướng', N'100g', NULL, 150, 20, 7, 0),
('monan_0082', N'Rau ngót luộc', N'100g', NULL, 22, 2.5, 0.3, 3),
('monan_0083', N'Sữa dừa', N'1 ly', NULL, 140, 1, 14, 6),
('monan_0084', N'Bánh xèo chay', N'1 cái', NULL, 200, 4, 10, 25),
('monan_0085', N'Nước ép cà rốt', N'1 ly', NULL, 94, 1.9, 0.4, 22),
('monan_0086', N'Đậu lăng luộc', N'100g', NULL, 116, 9, 0.4, 20),
('monan_0087', N'Thịt gà nướng mật ong', N'100g', NULL, 180, 20, 8, 5),
('monan_0088', N'Hạt bí rang', N'28g', NULL, 151, 7, 13, 5),
('monan_0089', N'Mì lúa mạch', N'100g', NULL, 120, 4, 1, 23),
('monan_0090', N'Bưởi', N'100g', NULL, 38, 0.8, 0.1, 9),
('monan_0091', N'Cá chép chiên', N'100g', NULL, 190, 18, 12, 0),
('monan_0092', N'Súp lơ trắng luộc', N'100g', NULL, 25, 2, 0.3, 5),
('monan_0093', N'Sữa chua Hy Lạp', N'100g', NULL, 73, 10, 2, 4),
('monan_0094', N'Bánh quy hạt chia', N'1 cái', NULL, 85, 2, 4, 10),
('monan_0095', N'Nước ép dưa leo', N'1 ly', NULL, 45, 1, 0.2, 10),
('monan_0096', N'Đậu đen luộc', N'100g', NULL, 132, 9, 0.5, 24),
('monan_0097', N'Thịt bò hầm', N'100g', NULL, 170, 20, 9, 0),
('monan_0098', N'Hạt mè rang', N'28g', NULL, 160, 5, 14, 7),
('monan_0099', N'Bánh mì lúa mạch đen', N'1 lát', NULL, 85, 3, 1.5, 16),
('monan_0100', N'Mận', N'100g', NULL, 46, 0.7, 0.3, 11);

INSERT INTO MauTapLuyen (NguoiTao, TenMauTapLuyen, MoTa, DoKho, MucTieu, SoTuan, CaloUocTinh, ThietBiCan, CongKhai, DaXacThuc, SoLanSuDung, DiemTrungBinh, NgayTao, NgayChinhSua) VALUES
(NULL, N'Tay Trước - Tập Curls Cơ Bản', N'Tăng sức mạnh tay trước với curls', N'Beginner', N'Tay Khỏe', 4, 200, N'Không cần thiết bị', 1, 1, 40, 4.2, GETDATE(), GETDATE()),
(NULL, N'Tay Sau - Tập Tricep Dips', N'Phát triển tay sau với chống đẩy ngược', N'Beginner', N'Tay Khỏe', 4, 200, N'Không cần thiết bị', 1, 1, 45, 4.3, GETDATE(), GETDATE()),
(NULL, N'Tay Trước - Tập Hammer Curls', N'Tăng cơ tay trước với tạ tay', N'Intermediate', N'Tay Khỏe', 6, 250, N'Tạ tay', 1, 1, 50, 4.4, GETDATE(), GETDATE()),
(NULL, N'Tay Sau - Tập Pushdown', N'Tập tay sau với máy cáp', N'Intermediate', N'Tay Khỏe', 6, 250, N'Máy cáp', 0, 1, 55, 4.5, GETDATE(), GETDATE()),
(NULL, N'Chân - Tập Squat', N'Tăng cơ chân với squat', N'Beginner', N'Chân To', 4, 300, N'Không cần thiết bị', 1, 1, 60, 4.6, GETDATE(), GETDATE()),
(NULL, N'Chân - Tập Leg Press', N'Phát triển chân với máy ép', N'Intermediate', N'Chân To', 6, 350, N'Máy ép chân', 0, 1, 65, 4.7, GETDATE(), GETDATE()),
(NULL, N'Đùi - Tập Lunges', N'Tập đùi trước và sau với chùng chân', N'Beginner', N'Chân To', 4, 250, N'Không cần thiết bị', 1, 1, 70, 4.5, GETDATE(), GETDATE()),
(NULL, N'Đùi - Tập Leg Extension', N'Tập đùi trước với máy duỗi', N'Intermediate', N'Chân To', 6, 300, N'Máy duỗi đùi', 0, 1, 75, 4.6, GETDATE(), GETDATE()),
(NULL, N'Mông - Tập Glute Bridge', N'Tăng độ săn chắc mông với nâng hông', N'Beginner', N'Mông Săn Chắc', 4, 200, N'Không cần thiết bị', 1, 1, 80, 4.4, GETDATE(), GETDATE()),
(NULL, N'Mông - Tập Hip Thrust', N'Phát triển mông với thanh tạ', N'Intermediate', N'Mông Săn Chắc', 6, 300, N'Thanh tạ', 1, 1, 85, 4.7, GETDATE(), GETDATE()),
(NULL, N'Bụng - Tập Plank', N'Tăng cơ bụng với plank', N'Beginner', N'Bụng 6 Múi', 4, 150, N'Không cần thiết bị', 1, 1, 90, 4.5, GETDATE(), GETDATE()),
(NULL, N'Bụng - Tập Cable Crunch', N'Tập bụng với máy cáp', N'Intermediate', N'Bụng 6 Múi', 6, 200, N'Máy cáp', 0, 1, 95, 4.6, GETDATE(), GETDATE()),
(NULL, N'Vai - Tập Shoulder Press', N'Tăng độ rộng vai với đẩy vai', N'Beginner', N'Vai Rộng', 4, 250, N'Tạ tay', 1, 1, 100, 4.7, GETDATE(), GETDATE()),
(NULL, N'Vai - Tập Lateral Raise', N'Phát triển vai bên với nâng tạ ngang', N'Intermediate', N'Vai Rộng', 6, 200, N'Tạ tay', 0, 1, 105, 4.5, GETDATE(), GETDATE()),
(NULL, N'Lưng - Tập Pull Ups', N'Tập lưng với hít xà', N'Intermediate', N'Lưng Chắc Khỏe', 6, 300, N'Xà đơn', 1, 1, 110, 4.6, GETDATE(), GETDATE()),
(NULL, N'Lưng - Tập Deadlift', N'Tăng cơ lưng dưới với deadlift', N'Advanced', N'Lưng Chắc Khỏe', 8, 400, N'Thanh tạ', 0, 1, 115, 4.8, GETDATE(), GETDATE()),
(NULL, N'Ngực - Tập Push Ups', N'Tập ngực với hít đất', N'Beginner', N'Ngực Nở', 4, 250, N'Không cần thiết bị', 1, 1, 120, 4.4, GETDATE(), GETDATE()),
(NULL, N'Ngực - Tập Bench Press', N'Phát triển ngực với đẩy tạ nằm', N'Intermediate', N'Ngực Nở', 6, 350, N'Thanh tạ, Ghế nằm', 0, 1, 125, 4.7, GETDATE(), GETDATE()),
(NULL, N'Tay Trước - Tập Preacher Curl', N'Tập tay trước với ghế preacher', N'Advanced', N'Tay Khỏe', 8, 250, N'Ghế preacher, Thanh tạ', 1, 1, 130, 4.5, GETDATE(), GETDATE()),
(NULL, N'Tay Sau - Tập Skull Crusher', N'Tập tay sau với skull crusher', N'Intermediate', N'Tay Khỏe', 6, 250, N'Thanh tạ', 0, 1, 135, 4.6, GETDATE(), GETDATE()),
(NULL, N'Chân - Tập Calf Raise', N'Tập bắp chân với nâng gót', N'Beginner', N'Chân To', 4, 200, N'Không cần thiết bị', 1, 1, 140, 4.3, GETDATE(), GETDATE()),
(NULL, N'Chân - Tập Leg Curl', N'Tập chân sau với máy cuốn', N'Intermediate', N'Chân To', 6, 300, N'Máy cuốn chân', 0, 1, 145, 4.5, GETDATE(), GETDATE()),
(NULL, N'Đùi - Tập Hack Squat', N'Tập đùi với hack squat', N'Advanced', N'Chân To', 8, 350, N'Máy hack squat', 1, 1, 150, 4.7, GETDATE(), GETDATE()),
(NULL, N'Mông - Tập Romanian Deadlift', N'Tập mông và đùi sau', N'Intermediate', N'Mông Săn Chắc', 6, 300, N'Thanh tạ', 0, 1, 155, 4.6, GETDATE(), GETDATE()),
(NULL, N'Bụng - Tập Russian Twist', N'Tập bụng với xoay người', N'Beginner', N'Bụng 6 Múi', 4, 150, N'Không cần thiết bị', 1, 1, 160, 4.4, GETDATE(), GETDATE()),
(NULL, N'Bụng - Tập Leg Raise', N'Tập bụng dưới với nâng chân', N'Intermediate', N'Bụng 6 Múi', 6, 200, N'Xà đơn', 0, 1, 165, 4.5, GETDATE(), GETDATE()),
(NULL, N'Vai - Tập Front Raise', N'Tập vai trước với nâng tạ', N'Beginner', N'Vai Rộng', 4, 200, N'Tạ tay', 1, 1, 170, 4.3, GETDATE(), GETDATE()),
(NULL, N'Vai - Tập Rear Delt Fly', N'Tập vai sau với fly', N'Intermediate', N'Vai Rộng', 6, 250, N'Tạ tay, Máy cáp', 0, 1, 175, 4.6, GETDATE(), GETDATE()),
(NULL, N'Lưng - Tập Bent Over Row', N'Tập lưng với rowing', N'Intermediate', N'Lưng Chắc Khỏe', 6, 300, N'Thanh tạ', 1, 1, 180, 4.7, GETDATE(), GETDATE()),
(NULL, N'Lưng - Tập Lat Pulldown', N'Tập lưng với pulldown', N'Beginner', N'Lưng Chắc Khỏe', 4, 250, N'Máy pulldown', 0, 1, 185, 4.5, GETDATE(), GETDATE()),
(NULL, N'Ngực - Tập Fly Machine', N'Tập ngực với máy fly', N'Intermediate', N'Ngực Nở', 6, 300, N'Máy fly', 1, 1, 190, 4.6, GETDATE(), GETDATE()),
(NULL, N'Ngực - Tập Incline Press', N'Tập ngực trên với đẩy nghiêng', N'Advanced', N'Ngực Nở', 8, 350, N'Thanh tạ, Ghế nghiêng', 0, 1, 195, 4.8, GETDATE(), GETDATE()),
(NULL, N'Yoga - Tư Thế Cây', N'Yoga tăng cân bằng và linh hoạt', N'Beginner', N'Dẻo Dai', 4, 100, N'Không cần thiết bị', 1, 1, 200, 4.2, GETDATE(), GETDATE()),
(NULL, N'Yoga - Tư Thế Chiến Binh', N'Yoga tăng sức mạnh chân và dẻo dai', N'Intermediate', N'Dẻo Dai', 6, 150, N'Thảm yoga', 0, 1, 205, 4.4, GETDATE(), GETDATE()),
(NULL, N'Yoga - Tư Thế Plank', N'Yoga tăng cơ lõi và độ bền', N'Beginner', N'Dẻo Dai', 4, 150, N'Thảm yoga', 1, 1, 210, 4.3, GETDATE(), GETDATE()),
(NULL, N'Yoga - Tư Thế Downward Dog', N'Yoga kéo giãn toàn thân', N'Intermediate', N'Dẻo Dai', 6, 200, N'Thảm yoga', 0, 1, 215, 4.5, GETDATE(), GETDATE()),
(NULL, N'Yoga - Tư Thế Cobra', N'Yoga tăng dẻo lưng', N'Beginner', N'Dẻo Dai', 4, 100, N'Thảm yoga', 1, 1, 220, 4.2, GETDATE(), GETDATE()),
(NULL, N'Tay Trước - Tập Concentration Curl', N'Tập tay trước tập trung', N'Advanced', N'Tay Khỏe', 8, 250, N'Tạ tay', 0, 1, 225, 4.6, GETDATE(), GETDATE()),
(NULL, N'Tay Sau - Tập Rope Pushdown', N'Tập tay sau với dây cáp', N'Intermediate', N'Tay Khỏe', 6, 250, N'Máy cáp', 1, 1, 230, 4.5, GETDATE(), GETDATE()),
(NULL, N'Chân - Tập Step Up', N'Tập chân với bước lên', N'Beginner', N'Chân To', 4, 300, N'Hộp nhảy', 0, 1, 235, 4.4, GETDATE(), GETDATE()),
(NULL, N'Đùi - Tập Goblet Squat', N'Tập đùi với squat cầm tạ', N'Intermediate', N'Chân To', 6, 350, N'Tạ ấm', 1, 1, 240, 4.7, GETDATE(), GETDATE()),
(NULL, N'Mông - Tập Cable Kickback', N'Tập mông với đá cáp', N'Advanced', N'Mông Săn Chắc', 8, 300, N'Máy cáp', 0, 1, 245, 4.6, GETDATE(), GETDATE()),
(NULL, N'Bụng - Tập Bicycle Crunch', N'Tập bụng với đạp xe', N'Beginner', N'Bụng 6 Múi', 4, 200, N'Không cần thiết bị', 1, 1, 250, 4.3, GETDATE(), GETDATE()),
(NULL, N'Vai - Tập Upright Row', N'Tập vai với rowing đứng', N'Intermediate', N'Vai Rộng', 6, 250, N'Thanh tạ', 0, 1, 255, 4.5, GETDATE(), GETDATE()),
(NULL, N'Lưng - Tập Seated Row', N'Tập lưng với rowing ngồi', N'Intermediate', N'Lưng Chắc Khỏe', 6, 300, N'Máy rowing', 1, 1, 260, 4.6, GETDATE(), GETDATE()),
(NULL, N'Ngực - Tập Cable Crossover', N'Tập ngực với crossover', N'Advanced', N'Ngực Nở', 8, 350, N'Máy cáp', 0, 1, 265, 4.7, GETDATE(), GETDATE()),
(NULL, N'Yoga - Tư Thế Triangle', N'Yoga kéo giãn bên hông', N'Intermediate', N'Dẻo Dai', 6, 150, N'Thảm yoga', 1, 1, 270, 4.4, GETDATE(), GETDATE()),
(NULL, N'Yoga - Tư Thế Wheel', N'Yoga tăng dẻo lưng nâng cao', N'Advanced', N'Dẻo Dai', 8, 200, N'Thảm yoga', 0, 1, 275, 4.6, GETDATE(), GETDATE()),
(NULL, N'Yoga - Tư Thế Headstand', N'Yoga đảo ngược cơ thể', N'Advanced', N'Dẻo Dai', 8, 250, N'Thảm yoga', 1, 1, 280, 4.7, GETDATE(), GETDATE()),
(NULL, N'Yoga - Tư Thế Lotus', N'Yoga thiền định', N'Beginner', N'Dẻo Dai', 4, 100, N'Thảm yoga', 0, 1, 285, 4.2, GETDATE(), GETDATE());

INSERT INTO ChiTietMauTapLuyen (MauTapLuyenID, TenBaiTap, SoSets, SoReps, ThoiLuongPhut, ThoiGianNghiGiay, Tuan, NgayTrongTuan, ThuTuHienThi, VideoUrl, GhiChu) VALUES
(1, N'Tay Trước - Bottle Curl', 3, 15, 3, 60, 1, 1, 1, '/videos/bottle_curl.mp4', N'Dùng chai nước 1.5L làm tạ, siết cơ bắp tay trước'),
(2, N'Tay Sau - Diamond Push Ups', 3, 12, 3, 60, 1, 1, 1, '/videos/diamond_pushups.mp4', N'Hít đất tay hẹp, tập trung cơ tay sau'),
(3, N'Tay Trước - Hammer Curl Với Tạ', 4, 10, 4, 90, 1, 1, 1, '/videos/hammer_curl.mp4', N'Nâng tạ với lòng bàn tay hướng vào nhau'),
(4, N'Tay Sau - Tricep Pushdown Cáp', 4, 12, 4, 60, 1, 1, 1, '/videos/tricep_pushdown.mp4', N'Đẩy cáp xuống, giữ khuỷu tay sát thân'),
(5, N'Chân - Bodyweight Squat', 3, 15, 3, 60, 1, 1, 1, '/videos/bodyweight_squat.mp4', N'Hạ thấp người, giữ lưng thẳng, tập trung cơ chân'),
(6, N'Chân - Leg Press', 4, 12, 4, 90, 1, 1, 1, '/videos/leg_press.mp4', N'Ép chân trên máy, siết cơ chân và đùi'),
(7, N'Đùi - Lunges', 3, 12, 3, 60, 1, 1, 1, '/videos/lunges.mp4', N'Chùng chân trước, giữ lưng thẳng'),
(8, N'Đùi - Leg Extension', 4, 12, 4, 60, 1, 1, 1, '/videos/leg_extension.mp4', N'Duỗi chân trên máy, tập trung cơ đùi trước'),
(9, N'Mông - Glute Bridge', 3, 15, 3, 60, 1, 1, 1, '/videos/glute_bridge.mp4', N'Nâng hông, siết cơ mông, giữ lưng thẳng'),
(10, N'Mông - Hip Thrust', 4, 10, 4, 90, 1, 1, 1, '/videos/hip_thrust.mp4', N'Nâng thanh tạ, siết cơ mông mạnh'),
(11, N'Bụng - Plank', 3, NULL, 2, 60, 1, 1, 1, '/videos/plank.mp4', N'Giữ tư thế plank, siết cơ bụng'),
(12, N'Bụng - Cable Crunch', 4, 12, 4, 60, 1, 1, 1, '/videos/cable_crunch.mp4', N'Kéo cáp xuống, tập trung cơ bụng trên'),
(13, N'Vai - Shoulder Press Với Tạ', 3, 12, 3, 60, 1, 1, 1, '/videos/shoulder_press.mp4', N'Đẩy tạ tay lên, giữ khuỷu ổn định'),
(14, N'Vai - Lateral Raise', 4, 12, 4, 60, 1, 1, 1, '/videos/lateral_raise.mp4', N'Nâng tạ ngang vai, siết cơ vai bên'),
(15, N'Lưng - Pull Ups', 3, 10, 4, 90, 1, 1, 1, '/videos/pull_ups.mp4', N'Hít xà đơn, tập trung cơ lưng trên'),
(16, N'Lưng - Deadlift', 4, 8, 5, 120, 1, 1, 1, '/videos/deadlift.mp4', N'Nâng thanh tạ, giữ lưng thẳng, siết lưng dưới'),
(17, N'Ngực - Push Ups', 3, 15, 3, 60, 1, 1, 1, '/videos/push_ups.mp4', N'Hít đất, siết cơ ngực, giữ thân thẳng'),
(18, N'Ngực - Bench Press', 4, 10, 4, 90, 1, 1, 1, '/videos/bench_press.mp4', N'Đẩy thanh tạ nằm, tập trung cơ ngực'),
(19, N'Tay Trước - Preacher Curl', 4, 10, 4, 90, 1, 1, 1, '/videos/preacher_curl.mp4', N'Nâng tạ trên ghế preacher, siết bắp tay'),
(20, N'Tay Sau - Skull Crusher', 4, 10, 4, 60, 1, 1, 1, '/videos/skull_crusher.mp4', N'Nâng thanh tạ nằm, tập trung cơ tay sau'),
(21, N'Chân - Calf Raise', 3, 15, 3, 60, 1, 1, 1, '/videos/calf_raise.mp4', N'Nâng gót chân, tập trung cơ bắp chân'),
(22, N'Chân - Leg Curl', 4, 12, 4, 60, 1, 1, 1, '/videos/leg_curl.mp4', N'Cuốn chân trên máy, siết cơ chân sau'),
(23, N'Đùi - Hack Squat', 4, 10, 4, 90, 1, 1, 1, '/videos/hack_squat.mp4', N'Ép đùi trên máy hack squat, giữ lưng thẳng'),
(24, N'Mông - Romanian Deadlift', 4, 10, 4, 90, 1, 1, 1, '/videos/romanian_deadlift.mp4', N'Nâng thanh tạ, siết cơ mông và đùi sau'),
(25, N'Bụng - Russian Twist', 3, 20, 3, 60, 1, 1, 1, '/videos/russian_twist.mp4', N'Xoay người, giữ cơ bụng siết chặt'),
(26, N'Bụng - Leg Raise', 3, 12, 3, 60, 1, 1, 1, '/videos/leg_raise.mp4', N'Nâng chân trên xà, tập trung cơ bụng dưới'),
(27, N'Vai - Front Raise', 3, 12, 3, 60, 1, 1, 1, '/videos/front_raise.mp4', N'Nâng tạ trước, siết cơ vai trước'),
(28, N'Vai - Rear Delt Fly', 4, 12, 4, 60, 1, 1, 1, '/videos/rear_delt_fly.mp4', N'Nâng tạ hoặc cáp, siết cơ vai sau'),
(29, N'Lưng - Bent Over Row', 4, 10, 4, 90, 1, 1, 1, '/videos/bent_over_row.mp4', N'Kéo thanh tạ, siết cơ lưng giữa'),
(30, N'Lưng - Lat Pulldown', 3, 12, 3, 60, 1, 1, 1, '/videos/lat_pulldown.mp4', N'Kéo cáp xuống, tập trung cơ lưng trên'),
(31, N'Ngực - Fly Machine', 4, 12, 4, 60, 1, 1, 1, '/videos/fly_machine.mp4', N'Ép ngực trên máy, siết cơ ngực giữa'),
(32, N'Ngực - Incline Press', 4, 10, 4, 90, 1, 1, 1, '/videos/incline_press.mp4', N'Đẩy thanh tạ trên ghế nghiêng, siết ngực trên'),
(33, N'Yoga - Tư Thế Cây (Vrksasana)', NULL, NULL, 1, NULL, 1, 1, 1, '/videos/vrksasana.mp4', N'Đứng một chân, giữ cân bằng, tập trung hít thở'),
(34, N'Yoga - Tư Thế Chiến Binh 1', NULL, NULL, 1, NULL, 1, 1, 1, '/videos/warrior_1.mp4', N'Chùng chân trước, tay nâng cao, giữ hông ổn định'),
(35, N'Yoga - Tư Thế Plank', NULL, NULL, 1, NULL, 1, 1, 1, '/videos/yoga_plank.mp4', N'Giữ tư thế plank, siết cơ lõi, hít thở đều'),
(36, N'Yoga - Tư Thế Downward Dog', NULL, NULL, 1, NULL, 1, 1, 1, '/videos/downward_dog.mp4', N'Kéo giãn toàn thân, giữ vai và hông thẳng'),
(37, N'Yoga - Tư Thế Cobra', NULL, NULL, 1, NULL, 1, 1, 1, '/videos/cobra_pose.mp4', N'Nâng ngực, kéo giãn lưng, hít thở sâu'),
(38, N'Tay Trước - Concentration Curl', 4, 10, 4, 90, 1, 1, 1, '/videos/concentration_curl.mp4', N'Nâng tạ tay, tập trung siết cơ bắp tay'),
(39, N'Tay Sau - Rope Pushdown', 4, 12, 4, 60, 1, 1, 1, '/videos/rope_pushdown.mp4', N'Đẩy dây cáp, mở tay cuối động tác'),
(40, N'Chân - Step Up', 3, 12, 3, 60, 1, 1, 1, '/videos/step_up.mp4', N'Bước lên hộp, siết cơ chân và đùi'),
(41, N'Đùi - Goblet Squat', 4, 10, 4, 90, 1, 1, 1, '/videos/goblet_squat.mp4', N'Cầm tạ ấm, hạ squat, siết cơ đùi'),
(42, N'Mông - Cable Kickback', 4, 12, 4, 60, 1, 1, 1, '/videos/cable_kickback.mp4', N'Đá chân với cáp, siết cơ mông'),
(43, N'Bụng - Bicycle Crunch', 3, 20, 3, 60, 1, 1, 1, '/videos/bicycle_crunch.mp4', N'Đạp xe trên không, siết cơ bụng chéo'),
(44, N'Vai - Upright Row', 4, 12, 4, 60, 1, 1, 1, '/videos/upright_row.mp4', N'Kéo thanh tạ đứng, siết cơ vai và lưng trên'),
(45, N'Lưng - Seated Row', 4, 12, 4, 60, 1, 1, 1, '/videos/seated_row.mp4', N'Kéo cáp ngồi, siết cơ lưng giữa'),
(46, N'Ngực - Cable Crossover', 4, 12, 4, 60, 1, 1, 1, '/videos/cable_crossover.mp4', N'Kéo cáp chéo, siết cơ ngực giữa'),
(47, N'Yoga - Tư Thế Triangle', NULL, NULL, 1, NULL, 1, 1, 1, '/videos/triangle_pose.mp4', N'Kéo giãn bên hông, giữ hông ổn định'),
(48, N'Yoga - Tư Thế Wheel', NULL, NULL, 1, NULL, 1, 1, 1, '/videos/wheel_pose.mp4', N'Nâng lưng cong, kéo giãn ngực và lưng'),
(49, N'Yoga - Tư Thế Headstand', NULL, NULL, 1, NULL, 1, 1, 1, '/videos/headstand.mp4', N'Đảo ngược cơ thể, giữ cân bằng, hít thở đều'),
(50, N'Yoga - Tư Thế Lotus', NULL, NULL, 1, NULL, 1, 1, 1, '/videos/lotus_pose.mp4', N'Ngồi thiền, giữ lưng thẳng, tập trung hít thở');

INSERT INTO HuanLuyenVien (PTID, UserID, ChungChi, ChuyenMon, SoNamKinhNghiem, ThanhPho, GiaTheoGio, TieuSu, AnhDaiDien, AnhCCCD, AnhChanDung, FileTaiLieu, DaXacMinh, GioRanh, SoKhachHienTai, NhanKhach, TongDanhGia, DiemTrungBinh, TiLeThanhCong)
VALUES
    ('ptr_0001', 'user_0003', N'ACE Certified, NASM', N'Weight Loss, Strength Training, Cardio', 5, N'Hà Nội', 500000, N'Chuyên gia 5 năm kinh nghiệm, giúp hơn 50 khách hàng đạt mục tiêu giảm cân và tăng cơ', '/uploads/pt/ptr_0001.jpg', '/uploads/pt/ptr_0001_cccd.jpg', '/uploads/pt/ptr_0001_portrait.jpg', '/uploads/pt/ptr_0001_doc.pdf', 1, N'{"Mon": "08:00-12:00", "Wed": "14:00-18:00", "Fri": "09:00-11:00"}', 3, 1, 15, 4.7, 95.0),
    ('ptr_0002', 'user_0006', N'ISSA Certified', N'Yoga, Cardio, Muscle Gain', 3, N'TP.HCM', 400000, N'Chuyên về yoga và dinh dưỡng, hỗ trợ giảm cân và tăng sức bền', '/uploads/pt/ptr_0002.jpg', '/uploads/pt/ptr_0002_cccd.jpg', '/uploads/pt/ptr_0002_portrait.jpg', '/uploads/pt/ptr_0002_doc.pdf', 1, N'{"Tue": "07:00-10:00", "Thu": "15:00-18:00", "Sat": "08:00-11:00"}', 2, 1, 10, 4.5, 90.0);

INSERT INTO DatLichPT (DatLichID, KhacHangID, PTID, NgayGioDat, LoaiBuoiTap, TrangThai, LyDoTuChoi, NguoiHuy, TienHoan, ChoXemSucKhoe, GhiChu, NgayTao)
VALUES
    ('bkg_0001', 'user_0001', 'ptr_0001', '2025-11-05 08:00:00', N'In-person', N'Confirmed', NULL, NULL, 0, 1, N'Tập tại gym A, tập trung giảm cân', '2025-11-01 10:00:00'),
    ('bkg_0002', 'user_0002', 'ptr_0001', '2025-11-06 10:00:00', N'Online', N'Pending', NULL, NULL, 0, 0, N'Tập qua Zoom, tập cơ bụng', '2025-11-02 12:00:00'),
    ('bkg_0003', 'user_0005', 'ptr_0002', '2025-11-07 07:00:00', N'In-person', N'Confirmed', NULL, NULL, 0, 1, N'Tập yoga tại studio, phù hợp tăng huyết áp', '2025-11-02 14:00:00'),
    ('bkg_0004', 'user_0007', 'ptr_0001', '2025-11-08 18:00:00', N'In-person', N'Cancelled', N'PT bận lịch', 'ptr_0001', 500000, 0, N'Tập tại gym B, tập cơ ngực', '2025-11-03 09:00:00'),
    ('bkg_0005', 'user_0008', 'ptr_0002', '2025-11-09 09:00:00', N'Online', N'Confirmed', NULL, NULL, 0, 1, N'Tập qua Google Meet, tập cơ xô', '2025-11-03 10:00:00');

INSERT INTO DanhGiaPT (KhachHangID, PTID, Diem, BinhLuan, NgayDanhGia)
VALUES
    ('user_0001', 'ptr_0001', 5, N'PT nhiệt tình, hướng dẫn giảm cân hiệu quả', '2025-11-03 15:00:00'),
    ('user_0002', 'ptr_0001', 4, N'Tốt nhưng lịch hơi linh hoạt', '2025-11-04 10:00:00'),
    ('user_0005', 'ptr_0002', 5, N'Yoga thư giãn, phù hợp với tình trạng sức khỏe', '2025-11-04 12:00:00'),
    ('user_0007', 'ptr_0001', 4, N'Hướng dẫn tập cơ ngực tốt, cần thêm bài đa dạng', '2025-11-05 09:00:00'),
    ('user_0008', 'ptr_0002', 5, N'PT tận tâm, hỗ trợ tập cơ xô hiệu quả', '2025-11-05 10:00:00');

INSERT INTO QuyenPT_KhachHang ( KhachHangID, PTID, NgayCapQuyen, DangHoatDong)
VALUES
    ('user_0001', 'ptr_0001', '2025-11-01 09:00:00', 1),
    ('user_0002', 'ptr_0001', '2025-11-02 10:00:00', 1),
    ('user_0005', 'ptr_0002', '2025-11-02 11:00:00', 1),
    ('user_0007', 'ptr_0001', '2025-11-03 08:00:00', 0),
    ('user_0008', 'ptr_0002', '2025-11-03 09:00:00', 1);

INSERT INTO GiaoDich (GiaoDichID, DatLichID, KhachHangID, PTID, SoTien, HoaHongApp, SoTienPTNhan, TrangThaiThanhToan, PhuongThucThanhToan, NgayGiaoDich)
VALUES
    ('txn_20251101_001', 'bkg_0001', 'user_0001', 'ptr_0001', 500000, 75000, 425000, N'Completed', N'Credit Card', '2025-11-01 10:30:00'),
    ('txn_20251102_001', 'bkg_0002', 'user_0002', 'ptr_0001', 500000, 75000, 425000, N'Pending', N'PayPal', '2025-11-02 12:30:00'),
    ('txn_20251102_002', 'bkg_0003', 'user_0005', 'ptr_0002', 400000, 60000, 340000, N'Completed', N'Bank Transfer', '2025-11-02 14:30:00'),
    ('txn_20251103_001', 'bkg_0004', 'user_0007', 'ptr_0001', 500000, 75000, 425000, N'Refunded', N'Credit Card', '2025-11-03 09:30:00'),
    ('txn_20251103_002', 'bkg_0005', 'user_0008', 'ptr_0002', 400000, 60000, 340000, N'Completed', N'PayPal', '2025-11-03 10:30:00');

INSERT INTO KeHoachAnUong 
    (NguoiTao, TenKeHoach, MoTa, LuongCaloMucTieu, TiLeMacro, LoaiKeHoach, SoNgay, CanhBaoDiUng, CongKhai, DaXacThuc, SoLanSuDung, DiemTrungBinh, NgayTao, NgayChinhSua) 
VALUES
    ('ptr_0001', N'Chế Độ Ăn Ít Carb', N'Giàu protein, ít carb để giảm cân', 2000, N'40:20:40', N'Giảm Cân', 30, N'Sữa, đậu phộng', 1, 1, 5, 4.5, '2025-11-01 08:00:00', '2025-11-01 08:00:00'),
    ('ptr_0002', N'Chế Độ Ăn Giàu Protein', N'Cân bằng để tăng cơ', 2500, N'40:30:30', N'Tăng Cơ', 28, N'Không có', 1, 1, 3, 4.2, '2025-11-02 09:00:00', '2025-11-02 09:00:00'),
    (NULL, N'Chế Độ Ăn Cân Bằng', N'Chế độ ăn duy trì chung', 2200, N'30:40:30', N'Duy Trì', 14, N'Hải sản', 1, 0, 2, 4.0, '2025-11-03 10:00:00', '2025-11-03 10:00:00');

INSERT INTO ChiTietKeHoachAnUong (KeHoachAnUongID, BuaAn, TenMonAn, KhauPhan, LuongCalo, Protein, Carbs, ChatBeo, ChatXo, ThuTrongKeHoach, ThuTuHienThi, GhiChuCheBien, LinkCongThuc)
VALUES
    (1, 'Breakfast', N'Gà nướng', N'100g', 165, 31, 0, 3.6, 0, 1, 1, N'Nướng với gia vị nhẹ', NULL),
    (1, 'Lunch', N'Cơm gạo lứt', N'1 chén', 216, 5, 45, 1.8, 3.5, 1, 2, N'Nấu với nước', NULL),
    (1, 'Dinner', N'Salad rau trộn', N'1 bát', 33, 1.3, 7, 0.2, 0, 1, 3, N'Trộn với dầu olive', NULL),
    (2, 'Breakfast', N'Cá hồi áp chảo', N'100g', 206, 22, 0, 13, 0, 1, 1, N'Áp chảo với chanh', NULL),
    (2, 'Lunch', N'Sữa chua không đường', N'100g', 61, 3.5, 4.7, 3.3, 0, 1, 2, N'Ăn lạnh', NULL),
    (2, 'Dinner', N'Khoai lang luộc', N'100g', 86, 1.6, 20, 0.1, 0, 1, 3, N'Luộc chín', NULL),
    (3, 'Breakfast', N'Bông cải xanh luộc', N'100g', 35, 2.8, 7, 0.4, 0, 1, 1, N'Luộc 5 phút', NULL),
    (3, 'Lunch', N'Ức gà luộc', N'100g', 165, 31, 0, 3.6, 0, 1, 2, N'Luộc với gia vị', NULL),
    (3, 'Dinner', N'Trứng luộc', N'1 quả', 68, 6, 0.6, 5, 0, 1, 3, N'Luộc 10 phút', NULL);

INSERT INTO PhanCongKeHoachAnUong 
    (UserID, KeHoachAnUongID, NguoiGiao, NgayBatDau, NgayKetThuc, NgayHienTai, TiLeTuanThu, TrangThai, NgayGiao)
VALUES
    ('user_0001', 1, 'ptr_0001', '2025-11-01', '2025-11-30', 2, 20.0, N'Active', '2025-11-01 09:00:00'),
    ('user_0002', 3, NULL, '2025-11-01', '2025-11-14', 2, 15.0, N'Active', '2025-11-01 10:00:00'),
    ('user_0005', 2, 'ptr_0002', '2025-11-01', '2025-11-28', 2, 10.0, N'Active', '2025-11-01 11:00:00'),
    ('user_0007', 1, 'ptr_0001', '2025-11-01', '2025-11-30', 2, 10.0, N'Active', '2025-11-01 12:00:00'),
    ('user_0008', 3, 'ptr_0002', '2025-11-01', '2025-11-14', 2, 18.0, N'Active', '2025-11-01 13:00:00');


	INSERT INTO GiaoBaiTapChoUser (UserID, MauTapLuyenID, NguoiGiao, NgayBatDau, NgayKetThuc, TuanHienTai, TiLeHoanThanh, TrangThai, NgayGiao)
VALUES
    ('user_0001', 33, 'ptr_0001', '2025-11-01', '2025-11-30', 1, 20.0, N'Active', '2025-11-01 09:00:00'), -- Yoga for Giảm Cân
    ('user_0001', 1, 'ptr_0001', '2025-11-01', '2025-11-30', 1, 25.0, N'Active', '2025-11-01 10:00:00'), -- Tay Trước for Cơ Tay
    ('user_0002', 11, 'ptr_0001', '2025-11-01', NULL, 1, 15.0, N'Active', '2025-11-01 11:00:00'), -- Bụng for Cơ Bụng
    ('user_0002', 5, 'ptr_0001', '2025-11-01', '2026-01-15', 1, 20.0, N'Active', '2025-11-01 12:00:00'), -- Chân for Cơ Chân
    ('user_0005', 7, 'ptr_0002', '2025-11-01', '2025-11-30', 1, 10.0, N'Active', '2025-11-01 13:00:00'), -- Đùi for Cơ Đùi
    ('user_0005', 9, 'ptr_0002', '2025-11-01', '2025-12-01', 1, 15.0, N'Active', '2025-11-01 14:00:00'), -- Mông for Cơ Mông
    ('user_0007', 17, 'ptr_0001', '2025-11-01', '2026-02-28', 1, 10.0, N'Active', '2025-11-01 15:00:00'), -- Ngực for Cơ Ngực (Beginner)
    ('user_0007', 13, 'ptr_0001', '2025-11-01', NULL, 1, 12.0, N'Active', '2025-11-01 16:00:00'), -- Vai for Cơ Vai
    ('user_0008', 30, 'ptr_0002', '2025-11-01', '2025-12-31', 1, 18.0, N'Active', '2025-11-01 17:00:00'), -- Lưng for Cơ Xô
    ('user_0008', 37, 'ptr_0002', '2025-11-01', '2025-11-30', 1, 10.0, N'Active', '2025-11-01 18:00:00'); -- Yoga Cobra for Cơ Cổ
	INSERT INTO TheoDoiHoanThanhBaiTap (GiaBtID, BaiTapID, NgayHoanThanh, SoSetThucTe, SoRepThucTe, ThoiGianThucTe, CaloTieuHao, DoKho)
VALUES
     (1, 35, '2025-11-01', NULL, NULL, 1, 140.0, 3 ),
    ( 1, 34, '2025-11-02', NULL, NULL, 2, 140.0, 3 ),
    ( 2, 1, '2025-11-01', 3, 12, NULL, 180.0, 3 ),
    (3, 11, '2025-11-01', NULL, NULL, 1, 140.0, 3),
    (3, 25, '2025-11-02', 3, 18, NULL, 140.0, 3 ),
    ( 4, 5, '2025-11-01', 3, 12, NULL, 280.0, 3 ),
    ( 5, 7, '2025-11-01', 3, 8, NULL, 230.0, 3 ),
    ( 6, 9, '2025-11-01', 3, 12, NULL, 180.0, 3 ),
    ( 7, 17, '2025-11-01', 3, 12, NULL, 230.0, 3 ),
    ( 7, 18, '2025-11-02', 4, 8, NULL, 320.0, 4 ),
    ( 8, 13, '2025-11-01', 3, 10, NULL, 230.0, 3),
    ( 9, 30, '2025-11-01', 3, 10, NULL, 230.0, 3 ),
    ( 10, 37, '2025-11-01', NULL, NULL, 1, 90.0, 2),
    ( 10, 48, '2025-11-02', NULL, NULL, 1, 180.0, 4);

	-- Dữ liệu mẫu cho NhatKyHoanThanhBaiTap
-- Dựa trên ChiTietKeHoachTapLuyen đã có và Users đang tập

INSERT INTO NhatKyHoanThanhBaiTap (
    UserID, ChiTietID, NgayHoanThanh, SoHiepThucTe, SoLanThucTe, 
    ThoiLuongThucTePhut, CaloTieuHao, DanhGiaBaiTap, GhiChu
)
VALUES
    -- user_0001 (plan_0001 - Yoga Giảm Cân): ChiTietID 1, 2
    ('user_0001', 1, '2025-11-01', NULL, NULL, 1, 140.0, 3, N'Giữ được plank 1 phút, hơi run tay'),
    ('user_0001', 1, '2025-11-02', NULL, NULL, 1, 145.0, 4, N'Tốt hơn hôm qua, giữ được lâu hơn'),
    ('user_0001', 2, '2025-11-02', NULL, NULL, 2, 155.0, 3, N'Tư thế chiến binh khá khó, cần luyện thêm'),
    
    -- user_0001 (plan_0002 - Tay Trước): ChiTietID 3
    ('user_0001', 3, '2025-11-03', 3, 10, NULL, 180.0, 4, N'Giảm từ 12 xuống 10 reps vì mệt'),
    ('user_0001', 3, '2025-11-04', 3, 12, NULL, 200.0, 4, N'Đã làm đủ 12 reps, cảm thấy tốt'),
    
    -- user_0002 (plan_0003 - Bụng): ChiTietID 4, 5
    ('user_0002', 4, '2025-11-04', NULL, NULL, 1, 145.0, 4, N'Plank bụng căng, giữ được 1 phút'),
    ('user_0002', 5, '2025-11-05', 3, 18, NULL, 140.0, 3, N'Russian Twist hơi khó, chỉ làm được 18 lần'),
    ('user_0002', 5, '2025-11-06', 3, 20, NULL, 150.0, 4, N'Đã cải thiện, làm đủ 20 lần'),
    
    -- user_0002 (plan_0004 - Chân): ChiTietID 6
    ('user_0002', 6, '2025-11-06', 3, 12, NULL, 280.0, 4, N'Squat hơi nặng, giảm từ 15 xuống 12 lần'),
    ('user_0002', 6, '2025-11-07', 3, 15, NULL, 300.0, 5, N'Hoàn thành tốt 15 lần, cảm thấy mạnh mẽ'),
    
    -- user_0005 (plan_0005 - Đùi): ChiTietID 7
    ('user_0005', 7, '2025-11-01', 3, 10, NULL, 230.0, 3, N'Lunges khó, chỉ làm được 10 lần'),
    ('user_0005', 7, '2025-11-02', 3, 12, NULL, 250.0, 4, N'Đã đạt mục tiêu 12 lần'),
    
    -- user_0005 (plan_0006 - Mông): ChiTietID 8
    ('user_0005', 8, '2025-11-02', 3, 13, NULL, 180.0, 4, N'Glute Bridge tốt, giảm 2 lần so với kế hoạch'),
    ('user_0005', 8, '2025-11-03', 3, 15, NULL, 200.0, 5, N'Hoàn thành xuất sắc'),
    
    -- user_0007 (plan_0007 - Ngực): ChiTietID 9, 10
    ('user_0007', 9, '2025-11-03', 3, 12, NULL, 230.0, 4, N'Push Ups giảm từ 15 xuống 12, hơi mệt'),
    ('user_0007', 9, '2025-11-04', 3, 15, NULL, 250.0, 5, N'Đã cải thiện, hoàn thành 15 lần'),
    ('user_0007', 10, '2025-11-04', 4, 8, NULL, 320.0, 4, N'Bench Press nặng, giảm từ 10 xuống 8 reps'),
    ('user_0007', 10, '2025-11-05', 4, 10, NULL, 350.0, 5, N'Đạt mục tiêu 10 reps, rất tốt'),
    
    -- user_0007 (plan_0008 - Vai): ChiTietID 11
    ('user_0007', 11, '2025-11-05', 3, 10, NULL, 230.0, 3, N'Shoulder Press khó, chỉ làm được 10 lần'),
    ('user_0007', 11, '2025-11-06', 3, 12, NULL, 250.0, 4, N'Tiến bộ, đã đạt 12 lần'),
    
    -- user_0008 (plan_0009 - Lưng): ChiTietID 12
    ('user_0008', 12, '2025-11-06', 3, 10, NULL, 230.0, 4, N'Lat Pulldown tốt, giảm 2 lần'),
    ('user_0008', 12, '2025-11-07', 3, 12, NULL, 250.0, 5, N'Hoàn thành đủ 12 lần'),
    
    -- user_0008 (plan_0010 - Yoga Cobra): ChiTietID 13
    ('user_0008', 13, '2025-11-01', NULL, NULL, 1, 95.0, 3, N'Yoga Cobra dễ, nhưng lưng hơi căng'),
    ('user_0008', 13, '2025-11-02', NULL, NULL, 1, 100.0, 4, N'Dẻo hơn, cảm giác thoải mái');
---Update

-- Tay Khỏe
UPDATE MauTapLuyen 
SET MucTieu = N'Tay Khỏe' 
WHERE TenMauTapLuyen LIKE N'%Tay Trước%' 
   OR TenMauTapLuyen LIKE N'%Tay Sau%';

-- Chân To
UPDATE MauTapLuyen 
SET MucTieu = N'Chân To' 
WHERE TenMauTapLuyen LIKE N'%Chân %' 
   OR TenMauTapLuyen LIKE N'%Đùi%';

-- Mông Săn Chắc
UPDATE MauTapLuyen 
SET MucTieu = N'Mông Săn Chắc' 
WHERE TenMauTapLuyen LIKE N'%Mông%';

-- Bụng 6 Múi
UPDATE MauTapLuyen 
SET MucTieu = N'Bụng 6 Múi' 
WHERE TenMauTapLuyen LIKE N'%Bụng%';

-- Vai Rộng
UPDATE MauTapLuyen 
SET MucTieu = N'Vai Rộng' 
WHERE TenMauTapLuyen LIKE N'%Vai %';

-- Lưng Chắc Khỏe
UPDATE MauTapLuyen 
SET MucTieu = N'Lưng Chắc Khỏe' 
WHERE TenMauTapLuyen LIKE N'%Lưng%';

-- Ngực Nở
UPDATE MauTapLuyen 
SET MucTieu = N'Ngực Nở' 
WHERE TenMauTapLuyen LIKE N'%Ngực%';

-- Dẻo Dai
UPDATE MauTapLuyen 
SET MucTieu = N'Dẻo Dai' 
WHERE TenMauTapLuyen LIKE N'%Yoga%';

-- ===== UPDATE ThietBiCan =====
-- Không cần thiết bị
UPDATE MauTapLuyen 
SET ThietBiCan = N'Không cần thiết bị' 
WHERE TenMauTapLuyen IN (
    N'Tay Trước - Tập Curls Cơ Bản',
    N'Tay Sau - Tập Tricep Dips',
    N'Chân - Tập Squat',
    N'Đùi - Tập Lunges',
    N'Mông - Tập Glute Bridge',
    N'Bụng - Tập Plank',
    N'Ngực - Tập Push Ups',
    N'Chân - Tập Calf Raise',
    N'Bụng - Tập Russian Twist',
    N'Bụng - Tập Bicycle Crunch',
    N'Yoga - Tư Thế Cây'
);

-- Tạ tay
UPDATE MauTapLuyen 
SET ThietBiCan = N'Tạ tay' 
WHERE TenMauTapLuyen IN (
    N'Tay Trước - Tập Hammer Curls',
    N'Vai - Tập Shoulder Press',
    N'Vai - Tập Lateral Raise',
    N'Vai - Tập Front Raise',
    N'Tay Trước - Tập Concentration Curl'
);

-- Máy cáp
UPDATE MauTapLuyen 
SET ThietBiCan = N'Máy cáp' 
WHERE TenMauTapLuyen IN (
    N'Tay Sau - Tập Pushdown',
    N'Bụng - Tập Cable Crunch',
    N'Tay Sau - Tập Rope Pushdown',
    N'Mông - Tập Cable Kickback',
    N'Ngực - Tập Cable Crossover'
);

-- Thanh tạ
UPDATE MauTapLuyen 
SET ThietBiCan = N'Thanh tạ' 
WHERE TenMauTapLuyen IN (
    N'Mông - Tập Hip Thrust',
    N'Lưng - Tập Deadlift',
    N'Tay Sau - Tập Skull Crusher',
    N'Mông - Tập Romanian Deadlift',
    N'Lưng - Tập Bent Over Row',
    N'Vai - Tập Upright Row'
);

-- Xà đơn
UPDATE MauTapLuyen 
SET ThietBiCan = N'Xà đơn' 
WHERE TenMauTapLuyen IN (
    N'Lưng - Tập Pull Ups',
    N'Bụng - Tập Leg Raise'
);

-- Máy ép chân
UPDATE MauTapLuyen 
SET ThietBiCan = N'Máy ép chân' 
WHERE TenMauTapLuyen = N'Chân - Tập Leg Press';

-- Máy duỗi đùi
UPDATE MauTapLuyen 
SET ThietBiCan = N'Máy duỗi đùi' 
WHERE TenMauTapLuyen = N'Đùi - Tập Leg Extension';

-- Máy cuốn chân
UPDATE MauTapLuyen 
SET ThietBiCan = N'Máy cuốn chân' 
WHERE TenMauTapLuyen = N'Chân - Tập Leg Curl';

-- Máy hack squat
UPDATE MauTapLuyen 
SET ThietBiCan = N'Máy hack squat' 
WHERE TenMauTapLuyen = N'Đùi - Tập Hack Squat';

-- Máy pulldown
UPDATE MauTapLuyen 
SET ThietBiCan = N'Máy pulldown' 
WHERE TenMauTapLuyen = N'Lưng - Tập Lat Pulldown';

-- Máy fly
UPDATE MauTapLuyen 
SET ThietBiCan = N'Máy fly' 
WHERE TenMauTapLuyen = N'Ngực - Tập Fly Machine';

-- Máy rowing
UPDATE MauTapLuyen 
SET ThietBiCan = N'Máy rowing' 
WHERE TenMauTapLuyen = N'Lưng - Tập Seated Row';

-- Hộp nhảy
UPDATE MauTapLuyen 
SET ThietBiCan = N'Hộp nhảy' 
WHERE TenMauTapLuyen = N'Chân - Tập Step Up';

-- Tạ ấm
UPDATE MauTapLuyen 
SET ThietBiCan = N'Tạ ấm' 
WHERE TenMauTapLuyen = N'Đùi - Tập Goblet Squat';

-- Thảm yoga
UPDATE MauTapLuyen 
SET ThietBiCan = N'Thảm yoga' 
WHERE TenMauTapLuyen IN (
    N'Yoga - Tư Thế Chiến Binh',
    N'Yoga - Tư Thế Plank',
    N'Yoga - Tư Thế Downward Dog',
    N'Yoga - Tư Thế Cobra',
    N'Yoga - Tư Thế Triangle',
    N'Yoga - Tư Thế Wheel',
    N'Yoga - Tư Thế Headstand',
    N'Yoga - Tư Thế Lotus'
);

-- Thanh tạ, Ghế nằm
UPDATE MauTapLuyen 
SET ThietBiCan = N'Thanh tạ, Ghế nằm' 
WHERE TenMauTapLuyen = N'Ngực - Tập Bench Press';

-- Ghế preacher, Thanh tạ
UPDATE MauTapLuyen 
SET ThietBiCan = N'Ghế preacher, Thanh tạ' 
WHERE TenMauTapLuyen = N'Tay Trước - Tập Preacher Curl';

-- Thanh tạ, Ghế nghiêng
UPDATE MauTapLuyen 
SET ThietBiCan = N'Thanh tạ, Ghế nghiêng' 
WHERE TenMauTapLuyen = N'Ngực - Tập Incline Press';

-- Tạ tay, Máy cáp
UPDATE MauTapLuyen 
SET ThietBiCan = N'Tạ tay, Máy cáp' 
WHERE TenMauTapLuyen = N'Vai - Tập Rear Delt Fly';

UPDATE DinhDuongMonAn SET TenMonAn = N'Gà nướng' WHERE MonAnID = 'monan_0001';
UPDATE DinhDuongMonAn SET TenMonAn = N'Cá hồi áp chảo' WHERE MonAnID = 'monan_0002';
UPDATE DinhDuongMonAn SET TenMonAn = N'Cơm gạo lứt' WHERE MonAnID = 'monan_0003';
UPDATE DinhDuongMonAn SET TenMonAn = N'Salad rau trộn' WHERE MonAnID = 'monan_0004';
UPDATE DinhDuongMonAn SET TenMonAn = N'Sữa chua không đường' WHERE MonAnID = 'monan_0005';
UPDATE DinhDuongMonAn SET TenMonAn = N'Khoai lang luộc' WHERE MonAnID = 'monan_0006';
UPDATE DinhDuongMonAn SET TenMonAn = N'Bông cải xanh luộc' WHERE MonAnID = 'monan_0007';
UPDATE DinhDuongMonAn SET TenMonAn = N'Ức gà luộc' WHERE MonAnID = 'monan_0008';
UPDATE DinhDuongMonAn SET TenMonAn = N'Trứng luộc' WHERE MonAnID = 'monan_0009';
UPDATE DinhDuongMonAn SET TenMonAn = N'Yến mạch' WHERE MonAnID = 'monan_0010';
UPDATE DinhDuongMonAn SET TenMonAn = N'Chuối chín' WHERE MonAnID = 'monan_0011';
UPDATE DinhDuongMonAn SET TenMonAn = N'Táo' WHERE MonAnID = 'monan_0012';
UPDATE DinhDuongMonAn SET TenMonAn = N'Bánh mì nguyên cám' WHERE MonAnID = 'monan_0013';
UPDATE DinhDuongMonAn SET TenMonAn = N'Sườn heo nướng' WHERE MonAnID = 'monan_0014';
UPDATE DinhDuongMonAn SET TenMonAn = N'Cá thu chiên' WHERE MonAnID = 'monan_0015';
UPDATE DinhDuongMonAn SET TenMonAn = N'Rau muống xào' WHERE MonAnID = 'monan_0016';
UPDATE DinhDuongMonAn SET TenMonAn = N'Đậu phụ chiên' WHERE MonAnID = 'monan_0017';
UPDATE DinhDuongMonAn SET TenMonAn = N'Sữa tươi không đường' WHERE MonAnID = 'monan_0018';
UPDATE DinhDuongMonAn SET TenMonAn = N'Hạnh nhân' WHERE MonAnID = 'monan_0019';
UPDATE DinhDuongMonAn SET TenMonAn = N'Mì ống nguyên cám' WHERE MonAnID = 'monan_0020';
UPDATE DinhDuongMonAn SET TenMonAn = N'Bò nướng' WHERE MonAnID = 'monan_0021';
UPDATE DinhDuongMonAn SET TenMonAn = N'Cá ngừ đóng hộp' WHERE MonAnID = 'monan_0022';
UPDATE DinhDuongMonAn SET TenMonAn = N'Gạo trắng' WHERE MonAnID = 'monan_0023';
UPDATE DinhDuongMonAn SET TenMonAn = N'Rau cải bó xôi luộc' WHERE MonAnID = 'monan_0024';
UPDATE DinhDuongMonAn SET TenMonAn = N'Sữa đậu nành' WHERE MonAnID = 'monan_0025';
UPDATE DinhDuongMonAn SET TenMonAn = N'Khoai tây nướng' WHERE MonAnID = 'monan_0026';
UPDATE DinhDuongMonAn SET TenMonAn = N'Cà rốt luộc' WHERE MonAnID = 'monan_0027';
UPDATE DinhDuongMonAn SET TenMonAn = N'Thịt lợn nạc' WHERE MonAnID = 'monan_0028';
UPDATE DinhDuongMonAn SET TenMonAn = N'Trứng chiên' WHERE MonAnID = 'monan_0029';
UPDATE DinhDuongMonAn SET TenMonAn = N'Bột yến mạch' WHERE MonAnID = 'monan_0030';
UPDATE DinhDuongMonAn SET TenMonAn = N'Cam' WHERE MonAnID = 'monan_0031';
UPDATE DinhDuongMonAn SET TenMonAn = N'Lê' WHERE MonAnID = 'monan_0032';
UPDATE DinhDuongMonAn SET TenMonAn = N'Bánh quy nguyên cám' WHERE MonAnID = 'monan_0033';
UPDATE DinhDuongMonAn SET TenMonAn = N'Tôm luộc' WHERE MonAnID = 'monan_0034';
UPDATE DinhDuongMonAn SET TenMonAn = N'Cá mòi chiên' WHERE MonAnID = 'monan_0035';
UPDATE DinhDuongMonAn SET TenMonAn = N'Rau cải thìa xào' WHERE MonAnID = 'monan_0036';
UPDATE DinhDuongMonAn SET TenMonAn = N'Đậu hũ hấp' WHERE MonAnID = 'monan_0037';
UPDATE DinhDuongMonAn SET TenMonAn = N'Sữa hạnh nhân' WHERE MonAnID = 'monan_0038';
UPDATE DinhDuongMonAn SET TenMonAn = N'Hạt óc chó' WHERE MonAnID = 'monan_0039';
UPDATE DinhDuongMonAn SET TenMonAn = N'Mì gạo' WHERE MonAnID = 'monan_0040';
UPDATE DinhDuongMonAn SET TenMonAn = N'Ức vịt nướng' WHERE MonAnID = 'monan_0041';
UPDATE DinhDuongMonAn SET TenMonAn = N'Nấm hương xào' WHERE MonAnID = 'monan_0042';
UPDATE DinhDuongMonAn SET TenMonAn = N'Bí đỏ hấp' WHERE MonAnID = 'monan_0043';
UPDATE DinhDuongMonAn SET TenMonAn = N'Thịt bò xay' WHERE MonAnID = 'monan_0044';
UPDATE DinhDuongMonAn SET TenMonAn = N'Hạt chia' WHERE MonAnID = 'monan_0045';
UPDATE DinhDuongMonAn SET TenMonAn = N'Bánh mì đen' WHERE MonAnID = 'monan_0046';
UPDATE DinhDuongMonAn SET TenMonAn = N'Đậu đỏ luộc' WHERE MonAnID = 'monan_0047';
UPDATE DinhDuongMonAn SET TenMonAn = N'Sữa bò nguyên kem' WHERE MonAnID = 'monan_0048';
UPDATE DinhDuongMonAn SET TenMonAn = N'Xoài chín' WHERE MonAnID = 'monan_0049';
UPDATE DinhDuongMonAn SET TenMonAn = N'Bắp rang không bơ' WHERE MonAnID = 'monan_0050';
UPDATE DinhDuongMonAn SET TenMonAn = N'Cá basa chiên' WHERE MonAnID = 'monan_0051';
UPDATE DinhDuongMonAn SET TenMonAn = N'Rau bina luộc' WHERE MonAnID = 'monan_0052';
UPDATE DinhDuongMonAn SET TenMonAn = N'Đậu phộng rang' WHERE MonAnID = 'monan_0053';
UPDATE DinhDuongMonAn SET TenMonAn = N'Bánh bao chay' WHERE MonAnID = 'monan_0054';
UPDATE DinhDuongMonAn SET TenMonAn = N'Nước ép táo' WHERE MonAnID = 'monan_0055';
UPDATE DinhDuongMonAn SET TenMonAn = N'Bí xanh luộc' WHERE MonAnID = 'monan_0056';
UPDATE DinhDuongMonAn SET TenMonAn = N'Thịt gà xay' WHERE MonAnID = 'monan_0057';
UPDATE DinhDuongMonAn SET TenMonAn = N'Hạt dưa' WHERE MonAnID = 'monan_0058';
UPDATE DinhDuongMonAn SET TenMonAn = N'Mì trứng' WHERE MonAnID = 'monan_0059';
UPDATE DinhDuongMonAn SET TenMonAn = N'Dưa hấu' WHERE MonAnID = 'monan_0060';
UPDATE DinhDuongMonAn SET TenMonAn = N'Thịt heo xào' WHERE MonAnID = 'monan_0061';
UPDATE DinhDuongMonAn SET TenMonAn = N'Rau mồng tơi' WHERE MonAnID = 'monan_0062';
UPDATE DinhDuongMonAn SET TenMonAn = N'Hạt điều rang' WHERE MonAnID = 'monan_0063';
UPDATE DinhDuongMonAn SET TenMonAn = N'Bánh gạo' WHERE MonAnID = 'monan_0064';
UPDATE DinhDuongMonAn SET TenMonAn = N'Nước ép cam' WHERE MonAnID = 'monan_0065';
UPDATE DinhDuongMonAn SET TenMonAn = N'Cải ngọt luộc' WHERE MonAnID = 'monan_0066';
UPDATE DinhDuongMonAn SET TenMonAn = N'Thịt vịt luộc' WHERE MonAnID = 'monan_0067';
UPDATE DinhDuongMonAn SET TenMonAn = N'Hạt hướng dương' WHERE MonAnID = 'monan_0068';
UPDATE DinhDuongMonAn SET TenMonAn = N'Bún gạo' WHERE MonAnID = 'monan_0069';
UPDATE DinhDuongMonAn SET TenMonAn = N'Nhãn' WHERE MonAnID = 'monan_0070';
UPDATE DinhDuongMonAn SET TenMonAn = N'Cá thu nướng' WHERE MonAnID = 'monan_0071';
UPDATE DinhDuongMonAn SET TenMonAn = N'Rau dền luộc' WHERE MonAnID = 'monan_0072';
UPDATE DinhDuongMonAn SET TenMonAn = N'Sữa chua có đường' WHERE MonAnID = 'monan_0073';
UPDATE DinhDuongMonAn SET TenMonAn = N'Bánh quy yến mạch' WHERE MonAnID = 'monan_0074';
UPDATE DinhDuongMonAn SET TenMonAn = N'Nước ép dứa' WHERE MonAnID = 'monan_0075';
UPDATE DinhDuongMonAn SET TenMonAn = N'Đậu xanh luộc' WHERE MonAnID = 'monan_0076';
UPDATE DinhDuongMonAn SET TenMonAn = N'Thịt bò áp chảo' WHERE MonAnID = 'monan_0077';
UPDATE DinhDuongMonAn SET TenMonAn = N'Hạt lanh' WHERE MonAnID = 'monan_0078';
UPDATE DinhDuongMonAn SET TenMonAn = N'Bánh mì trắng' WHERE MonAnID = 'monan_0079';
UPDATE DinhDuongMonAn SET TenMonAn = N'Chôm chôm' WHERE MonAnID = 'monan_0080';
UPDATE DinhDuongMonAn SET TenMonAn = N'Cá lóc nướng' WHERE MonAnID = 'monan_0081';
UPDATE DinhDuongMonAn SET TenMonAn = N'Rau ngót luộc' WHERE MonAnID = 'monan_0082';
UPDATE DinhDuongMonAn SET TenMonAn = N'Sữa dừa' WHERE MonAnID = 'monan_0083';
UPDATE DinhDuongMonAn SET TenMonAn = N'Bánh xèo chay' WHERE MonAnID = 'monan_0084';
UPDATE DinhDuongMonAn SET TenMonAn = N'Nước ép cà rốt' WHERE MonAnID = 'monan_0085';
UPDATE DinhDuongMonAn SET TenMonAn = N'Đậu lăng luộc' WHERE MonAnID = 'monan_0086';
UPDATE DinhDuongMonAn SET TenMonAn = N'Thịt gà nướng mật ong' WHERE MonAnID = 'monan_0087';
UPDATE DinhDuongMonAn SET TenMonAn = N'Hạt bí rang' WHERE MonAnID = 'monan_0088';
UPDATE DinhDuongMonAn SET TenMonAn = N'Mì lúa mạch' WHERE MonAnID = 'monan_0089';
UPDATE DinhDuongMonAn SET TenMonAn = N'Bưởi' WHERE MonAnID = 'monan_0090';
UPDATE DinhDuongMonAn SET TenMonAn = N'Cá chép chiên' WHERE MonAnID = 'monan_0091';
UPDATE DinhDuongMonAn SET TenMonAn = N'Súp lơ trắng luộc' WHERE MonAnID = 'monan_0092';
UPDATE DinhDuongMonAn SET TenMonAn = N'Sữa chua Hy Lạp' WHERE MonAnID = 'monan_0093';
UPDATE DinhDuongMonAn SET TenMonAn = N'Bánh quy hạt chia' WHERE MonAnID = 'monan_0094';
UPDATE DinhDuongMonAn SET TenMonAn = N'Nước ép dưa leo' WHERE MonAnID = 'monan_0095';
UPDATE DinhDuongMonAn SET TenMonAn = N'Đậu đen luộc' WHERE MonAnID = 'monan_0096';
UPDATE DinhDuongMonAn SET TenMonAn = N'Thịt bò hầm' WHERE MonAnID = 'monan_0097';
UPDATE DinhDuongMonAn SET TenMonAn = N'Hạt mè rang' WHERE MonAnID = 'monan_0098';
UPDATE DinhDuongMonAn SET TenMonAn = N'Bánh mì lúa mạch đen' WHERE MonAnID = 'monan_0099';
UPDATE DinhDuongMonAn SET TenMonAn = N'Mận' WHERE MonAnID = 'monan_0100';

UPDATE MucTieu SET LoaiMucTieu = N'Giảm Cân' WHERE MucTieuID = 'goal_0001';
UPDATE MucTieu SET LoaiMucTieu = N'Cơ Tay' WHERE MucTieuID = 'goal_0002';
UPDATE MucTieu SET LoaiMucTieu = N'Cơ Bụng' WHERE MucTieuID = 'goal_0003';
UPDATE MucTieu SET LoaiMucTieu = N'Cơ Chân' WHERE MucTieuID = 'goal_0004';
UPDATE MucTieu SET LoaiMucTieu = N'Cơ Đùi' WHERE MucTieuID = 'goal_0005';
UPDATE MucTieu SET LoaiMucTieu = N'Cơ Mông' WHERE MucTieuID = 'goal_0006';
UPDATE MucTieu SET LoaiMucTieu = N'Cơ Ngực' WHERE MucTieuID = 'goal_0007';
UPDATE MucTieu SET LoaiMucTieu = N'Cơ Vai' WHERE MucTieuID = 'goal_0008';
UPDATE MucTieu SET LoaiMucTieu = N'Cơ Xô' WHERE MucTieuID = 'goal_0009';
UPDATE MucTieu SET LoaiMucTieu = N'Cơ Cổ' WHERE MucTieuID = 'goal_0010';

-- Cập nhật tất cả TrangThaiThanhToan thành 'Completed'
UPDATE GiaoDich
SET TrangThaiThanhToan = N'Completed';

-- Cập nhật PhuongThucThanhToan cho từng giao dịch
UPDATE GiaoDich
SET PhuongThucThanhToan = N'ZaloPay'
WHERE GiaoDichID = 'txn_20251101_001';

UPDATE GiaoDich
SET PhuongThucThanhToan = N'Momo'
WHERE GiaoDichID = 'txn_20251102_001';

UPDATE GiaoDich
SET PhuongThucThanhToan = N'VNPay'
WHERE GiaoDichID = 'txn_20251102_002';

UPDATE GiaoDich
SET PhuongThucThanhToan = N'ZaloPay'
WHERE GiaoDichID = 'txn_20251103_001';

UPDATE GiaoDich
SET PhuongThucThanhToan = N'Momo'
WHERE GiaoDichID = 'txn_20251103_002';