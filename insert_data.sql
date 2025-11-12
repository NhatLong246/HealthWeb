-- Seed data for HealthTracker database
USE HealthTracker;
GO

/* ============================
   USERS (idempotent seed, rerunnable)
   ============================ */
DECLARE @SeedUsers TABLE(
  UserID nvarchar(20),
  Username nvarchar(50),
  PlainPassword nvarchar(200),
  Role nvarchar(20),
  Email nvarchar(100),
  HoTen nvarchar(100),
  NgaySinh date NULL,
  GioiTinh nvarchar(10)
);

INSERT INTO @SeedUsers(UserID, Username, PlainPassword, Role, Email, HoTen, NgaySinh, GioiTinh)
VALUES
('user_0001','demo','demo12345','Client','demo@healthweb.test',N'Người dùng Demo','1995-05-12','Male'),
('user_0002','minhthu','mt@123456','Client','minhthu@healthweb.test',N'Nguyễn Minh Thư','1999-11-30','Female'),
('admin_0001','admin','Admin@123','Admin','admin@healthweb.test',N'Quản trị viên','1990-01-01','Other'),
('user_0003','quanghuy','qh@123456','Client','quanghuy@healthweb.test',N'Phạm Quang Huy','1992-02-02','Male'),
('user_0004','linhchi','lc@123456','Client','linhchi@healthweb.test',N'Hoàng Linh Chi','2001-03-12','Female'),
('user_0005','anhkhoa','ak@123456','Client','anhkhoa@healthweb.test',N'Lê Anh Khoa','1997-07-07','Male'),
('user_0006','thutrang','tt@123456','Client','thutrang@healthweb.test',N'Đặng Thu Trang','1998-08-18','Female');

;WITH Src AS (
  SELECT 
    su.UserID,
    su.Username,
    -- Tính SHA256 -> Base64
    CAST('' as xml).value(
      'xs:base64Binary(xs:hexBinary(sql:column("hb")))',
      'varchar(max)'
    ) as PasswordHashBase64,
    su.Role,
    su.Email,
    su.HoTen,
    su.NgaySinh,
    su.GioiTinh
  FROM @SeedUsers su
  -- LƯU Ý: SQL Server HASHBYTES có thể dùng encoding khác với C# UTF-8
  -- Hash tạm thời này sẽ được cập nhật bằng hash đúng ở cuối script
  CROSS APPLY (SELECT CONVERT(varbinary(32), HASHBYTES('SHA2_256', su.PlainPassword)) as hb) H
)
MERGE dbo.Users AS t
USING Src AS s
ON t.UserID = s.UserID
WHEN MATCHED THEN
  UPDATE SET 
    t.Username = s.Username,
    t.Email = s.Email,
    t.Role = s.Role,
    t.HoTen = s.HoTen,
    t.NgaySinh = s.NgaySinh,
    t.GioiTinh = s.GioiTinh,
    t.PasswordHash = s.PasswordHashBase64 -- đảm bảo đồng bộ mỗi lần seed
WHEN NOT MATCHED THEN
  INSERT (UserID, Username, PasswordHash, Role, Email, HoTen, NgaySinh, GioiTinh)
  VALUES (s.UserID, s.Username, s.PasswordHashBase64, s.Role, s.Email, s.HoTen, s.NgaySinh, s.GioiTinh);

INSERT INTO Benh (BenhID, TenBenh)
SELECT v.BenhID, v.TenBenh
FROM (VALUES
  ('benh_001', N'Tăng huyết áp'),
  ('benh_002', N'Tiểu đường'),
  ('benh_003', N'Béo phì')
) v(BenhID, TenBenh)
WHERE NOT EXISTS (SELECT 1 FROM Benh b WHERE b.BenhID = v.BenhID);

/* ============================
   DAILY HEALTH LOGS
   ============================ */
INSERT INTO LuuTruSucKhoe (MaBanGhi, UserID, NgayGhiNhan, SoBuoc, CaloTieuThu, SoGioNgu, CanNang, ChieuCao, BenhID, LuongNuocUong, GhiChu)
SELECT v.MaBanGhi, v.UserID, v.NgayGhiNhan, v.SoBuoc, v.CaloTieuThu, v.SoGioNgu, v.CanNang, v.ChieuCao, v.BenhID, v.LuongNuocUong, v.GhiChu
FROM (VALUES
('rec_0001','user_0001','2025-10-28',8500,2300,7.0,72,175,'benh_001',2.1,N'Ngày chạy bộ'),
('rec_0002','user_0001','2025-10-29',6500,2100,6.5,71.8,175,'benh_001',1.8,N'Nghỉ nhẹ'),
('rec_0003','user_0002','2025-10-29',10200,2550,7.5,54.0,162,NULL,2.3,N'HIIT 20p')
) v(MaBanGhi,UserID,NgayGhiNhan,SoBuoc,CaloTieuThu,SoGioNgu,CanNang,ChieuCao,BenhID,LuongNuocUong,GhiChu)
WHERE NOT EXISTS (SELECT 1 FROM LuuTruSucKhoe l WHERE l.MaBanGhi = v.MaBanGhi);

/* ============================
   GOALS / ACHIEVEMENTS / RANKING
   ============================ */
INSERT INTO MucTieu (MucTieuID, UserID, LoaiMucTieu, GiaTriMucTieu, NgayBatDau, NgayKetThuc, TienDoHienTai, DaHoanThanh, ThuTuHienThi, GhiChu)
SELECT v.MucTieuID, v.UserID, v.LoaiMucTieu, v.GiaTriMucTieu, v.NgayBatDau, v.NgayKetThuc, v.TienDoHienTai, v.DaHoanThanh, v.ThuTuHienThi, v.GhiChu
FROM (VALUES
('goal_0001','user_0001','WeightLoss',68,'2025-10-01',NULL,71.8,0,1,N'Giảm cân lành mạnh'),
('goal_0002','user_0001','StepsTarget',10000,'2025-10-20','2025-11-20',8500,0,2,N'Đi bộ mỗi ngày'),
('goal_0003','user_0002','SleepImprovement',8,'2025-10-10',NULL,7.2,0,1,N'Ngủ đủ 8 giờ')
) v(MucTieuID,UserID,LoaiMucTieu,GiaTriMucTieu,NgayBatDau,NgayKetThuc,TienDoHienTai,DaHoanThanh,ThuTuHienThi,GhiChu)
WHERE NOT EXISTS (SELECT 1 FROM MucTieu m WHERE m.MucTieuID = v.MucTieuID);

INSERT INTO ThanhTuu (UserID, TenBadge, Diem, MoTa)
VALUES
('user_0001',N'10k Steps',100,N'Đạt 10.000 bước'),
('user_0002',N'Consistency',150,N'Đăng nhập 7 ngày liên tiếp');

INSERT INTO XepHang (UserID, ChuKy, TongDiem, ThuHang, NgayBatDauChuKy, NgayKetThucChuKy)
VALUES
('user_0001','Weekly',250,2,'2025-10-27','2025-11-02'),
('user_0002','Weekly',300,1,'2025-10-27','2025-11-02');

/* ============================
   WEATHER LOGS
   ============================ */
INSERT INTO NhatKyThoiTiet (UserID, NgayGhiLog, ThanhPho, NhietDo, TinhTrang, DoAm, GoiY)
VALUES
('user_0001','2025-10-29',N'Hà Nội',28,N'Nắng',65,N'Nên chạy bộ buổi chiều'),
('user_0002','2025-10-29',N'Đà Nẵng',26,N'Mát mẻ',70,N'Đi bộ công viên');

/* ============================
   NUTRITION DATA
   ============================ */
INSERT INTO DinhDuongMonAn (MonAnID, TenMonAn, DonViTinh, HinhAnh, LuongCalo, Protein, ChatBeo, Carbohydrate)
SELECT v.MonAnID, v.TenMonAn, v.DonViTinh, v.HinhAnh, v.LuongCalo, v.Protein, v.ChatBeo, v.Carbohydrate
FROM (VALUES
('food_001',N'Ức gà áp chảo',N'200g',NULL,330,60,5,0),
('food_002',N'Cơm gạo lứt',N'1 chén',NULL,216,5,2,45),
('food_003',N'Táo',N'1 quả',NULL,95,0.5,0.3,25)
) v(MonAnID,TenMonAn,DonViTinh,HinhAnh,LuongCalo,Protein,ChatBeo,Carbohydrate)
WHERE NOT EXISTS (SELECT 1 FROM DinhDuongMonAn d WHERE d.MonAnID = v.MonAnID);

INSERT INTO NhatKyDinhDuong (DinhDuongID, UserID, NgayGhiLog, MonAnID, LuongThucAn, GhiChu)
SELECT v.DinhDuongID, v.UserID, v.NgayGhiLog, v.MonAnID, v.LuongThucAn, v.GhiChu
FROM (VALUES
('nut_0001','user_0001','2025-10-29','food_001',200,N'Bữa trưa'),
('nut_0002','user_0001','2025-10-29','food_002',150,N'Bữa trưa'),
('nut_0003','user_0002','2025-10-29','food_003',1,N'Bữa phụ')
) v(DinhDuongID,UserID,NgayGhiLog,MonAnID,LuongThucAn,GhiChu)
WHERE NOT EXISTS (SELECT 1 FROM NhatKyDinhDuong n WHERE n.DinhDuongID = v.DinhDuongID);

/* ============================
   AI SUGGESTIONS / ANALYTICS / ALERTS
   ============================ */
INSERT INTO AIGoiY (UserID, NgayGoiY, NoiDungGoiY, DaHoanThanh, DiemThuong)
VALUES
('user_0001','2025-10-29',N'Giảm 300 kcal hôm nay',0,10),
('user_0002','2025-10-29',N'Tập HIIT 15 phút',0,10);

INSERT INTO AIPhanTichXuHuong (UserID, NgayPhanTich, LoaiChiSo, HuongXuHuong, TyLeThayDoi, NhanXet, MucDo)
VALUES
('user_0001','2025-10-29','Weight','Decreasing',-2.5,N'Giảm 1.8kg trong 3 tuần',N'ThongTin'),
('user_0002','2025-10-29','Steps','Increasing',12.0,N'Tăng bước đi tuần này',N'ThongTin');

INSERT INTO AICanhBaoSucKhoe (UserID, NgayCanhBao, LoaiRuiRo, MucDo, NoiDung, HanhDongDeXuat)
VALUES
('user_0001','2025-10-29','HighBMI','Medium',N'BMI tiến gần ngưỡng 25',N'Tăng vận động, kiểm soát calo'),
('user_0002','2025-10-29','InsufficientSleep','Low',N'Giấc ngủ < 7h',N'Đi ngủ sớm hơn 30 phút');

/* ============================
   REMINDERS & NOTIFICATIONS
   ============================ */
INSERT INTO NhacNho (UserID, ThoiGianNhac, NoiDung)
VALUES
('user_0001','2025-10-30 08:00',N'Uống 500ml nước'),
('user_0002','2025-10-30 18:30',N'Đi bộ 20 phút');

INSERT INTO ThongBao (UserID, NoiDung, Loai, MaLienQuan, DaDoc)
VALUES
('user_0001',N'Chào mừng đến với HealthWeb!',N'Achievement',NULL,0),
('user_0001',N'Uống thêm 1 ly nước hôm nay nhé.',N'Reminder',NULL,0),
('user_0002',N'Bạn đạt 10.000 bước hôm nay!',N'Achievement',NULL,0);

/* ============================
   TRAINERS & BOOKINGS
   ============================ */
INSERT INTO HuanLuyenVien (PTID, UserID, ChungChi, ChuyenMon, SoNamKinhNghiem, ThanhPho, GiaTheoGio, TieuSu, DaXacMinh)
SELECT v.PTID, v.UserID, v.ChungChi, v.ChuyenMon, v.SoNamKinhNghiem, v.ThanhPho, v.GiaTheoGio, v.TieuSu, v.DaXacMinh
FROM (VALUES
('pt_0001','user_0002',N'ACE Certified',N'Weight Loss, Yoga',3,N'Hà Nội',250000,N'PT nhiệt huyết',1)
) v(PTID,UserID,ChungChi,ChuyenMon,SoNamKinhNghiem,ThanhPho,GiaTheoGio,TieuSu,DaXacMinh)
WHERE NOT EXISTS (SELECT 1 FROM HuanLuyenVien h WHERE h.PTID = v.PTID);

INSERT INTO DatLichPT (DatLichID, KhacHangID, PTID, NgayGioDat, LoaiBuoiTap, TrangThai)
SELECT v.DatLichID, v.KhacHangID, v.PTID, v.NgayGioDat, v.LoaiBuoiTap, v.TrangThai
FROM (VALUES
('bkg_0001','user_0001','pt_0001','2025-11-02 07:30',N'Online',N'Confirmed')
) v(DatLichID,KhacHangID,PTID,NgayGioDat,LoaiBuoiTap,TrangThai)
WHERE NOT EXISTS (SELECT 1 FROM DatLichPT d WHERE d.DatLichID = v.DatLichID);

INSERT INTO DanhGiaPT (KhachHangID, PTID, Diem, BinhLuan)
SELECT v.KhachHangID, v.PTID, v.Diem, v.BinhLuan
FROM (VALUES
('user_0001','pt_0001',5,N'PT rất nhiệt tình!')
) v(KhachHangID,PTID,Diem,BinhLuan)
WHERE NOT EXISTS (SELECT 1 FROM DanhGiaPT dg WHERE dg.KhachHangID = v.KhachHangID AND dg.PTID = v.PTID);

INSERT INTO TinNhan (NguoiGuiID, NguoiNhanID, DatLichID, NoiDung)
VALUES
('user_0001','user_0002','bkg_0001',N'Chào PT, mai mình tập gì ạ?'),
('user_0002','user_0001','bkg_0001',N'Chúng ta tập HIIT nhẹ nhé!');

INSERT INTO QuyenPT_KhachHang (KhachHangID, PTID, DangHoatDong)
SELECT v.KhachHangID, v.PTID, v.DangHoatDong
FROM (VALUES ('user_0001','pt_0001',1)) v(KhachHangID,PTID,DangHoatDong)
WHERE NOT EXISTS (SELECT 1 FROM QuyenPT_KhachHang q WHERE q.KhachHangID = v.KhachHangID AND q.PTID = v.PTID);

INSERT INTO GiaoDich (GiaoDichID, DatLichID, KhachHangID, PTID, SoTien, HoaHongApp, SoTienPTNhan, TrangThaiThanhToan, PhuongThucThanhToan)
SELECT v.GiaoDichID, v.DatLichID, v.KhachHangID, v.PTID, v.SoTien, v.HoaHongApp, v.SoTienPTNhan, v.TrangThaiThanhToan, v.PhuongThucThanhToan
FROM (VALUES ('txn_20251029_001','bkg_0001','user_0001','pt_0001',500000,75000,425000,'Completed','Momo'))
v(GiaoDichID,DatLichID,KhachHangID,PTID,SoTien,HoaHongApp,SoTienPTNhan,TrangThaiThanhToan,PhuongThucThanhToan)
WHERE NOT EXISTS (SELECT 1 FROM GiaoDich g WHERE g.GiaoDichID = v.GiaoDichID);

/* ============================
   SOCIAL
   ============================ */
INSERT INTO BanBe (UserID, NguoiNhanID, TrangThai)
SELECT v.UserID, v.NguoiNhanID, v.TrangThai
FROM (VALUES ('user_0001','user_0002','Accepted')) v(UserID,NguoiNhanID,TrangThai)
WHERE NOT EXISTS (SELECT 1 FROM BanBe b WHERE b.UserID = v.UserID AND b.NguoiNhanID = v.NguoiNhanID);

INSERT INTO ChiaSeThanhTuu (ThanhTuuID, NguoiChiaSe, DoiTuongXem, ChuThich)
SELECT TOP 1 ThanhTuuID, 'user_0001', 'Public', N'Chia sẻ thành tích mới'
FROM ThanhTuu WHERE UserID='user_0001' ORDER BY NgayDatDuoc DESC;

INSERT INTO LuotThichChiaSeThanhTuu (ChiaSeID, UserID)
SELECT TOP 1 ChiaSeID, 'user_0002' FROM ChiaSeThanhTuu ORDER BY NgayChiaSe DESC;

/* ============================
   WORKOUT TEMPLATES & ASSIGNMENTS
   ============================ */
INSERT INTO MauTapLuyen (NguoiTao, TenMauTapLuyen, MoTa, DoKho, MucTieu, SoTuan, CaloUocTinh, ThietBiCan, CongKhai, DaXacThuc)
VALUES ('pt_0001',N'Fat Loss Beginner',N'Giảm mỡ 4 tuần','Beginner','WeightLoss',4,250,N'Không cần thiết bị',1,1);

INSERT INTO ChiTietMauTapLuyen (MauTapLuyenID, TenbaiTap, SoSets, SoReps, ThoiLuongPhut, Tuan, NgayTrongTuan, ThuTuHienThi)
SELECT TOP 1 MauTapLuyenID, N'Jumping Jacks',3,20,10,1,1,1 FROM MauTapLuyen ORDER BY MauTapLuyenID DESC;

INSERT INTO GiaoBaiTapChoUser (UserID, MauTapLuyenID, NguoiGiao, NgayBatDau, NgayKetThuc, TuanHienTai)
SELECT 'user_0001', MauTapLuyenID, 'pt_0001', '2025-10-29', '2025-11-26', 1 FROM MauTapLuyen ORDER BY MauTapLuyenID DESC;

INSERT INTO TheoDoiHoanThanhBaiTap (GiaBtID, BaiTapID, NgayHoanThanh, SoSetThucTe, SoRepThucTe, ThoiGianThucTe, CaloTieuHao, DoKho)
SELECT TOP 1 g.GiaBtID, c.BaiTapID, '2025-10-29', 3, 20, 15, 200, 3
FROM GiaoBaiTapChoUser g CROSS JOIN ChiTietMauTapLuyen c
ORDER BY g.GiaBtID DESC, c.BaiTapID DESC;

/* ============================
   MEAL PLANS
   ============================ */
INSERT INTO KeHoachAnUong (NguoiTao, TenKeHoach, MoTa, LuongCaloMucTieu, TiLeMacro, LoaiKeHoach, SoNgay, CongKhai, DaXacThuc)
VALUES ('pt_0001',N'Low Carb 7 ngày',N'Giảm carb cho cắt mỡ',1800,'40:30:30','WeightLoss',7,1,1);

INSERT INTO ChiTietKeHoachAnUong (KeHoachAnUongID, BuaAn, TenMonAn, KhauPhan, LuongCalo, Protein, Carbs, ChatBeo, ThuTrongKeHoach, ThuTuHienThi)
SELECT TOP 1 KeHoachAnUongID,'Breakfast',N'Trứng ốp la','2 quả',180,12,1,10,1,1 FROM KeHoachAnUong ORDER BY KeHoachAnUongID DESC;

INSERT INTO PhanCongKeHoachAnUong (UserID, KeHoachAnUongID, NguoiGiao, NgayBatDau, NgayKetThuc, NgayHienTai)
SELECT 'user_0001', KeHoachAnUongID, 'pt_0001', '2025-10-29','2025-11-04',1 FROM KeHoachAnUong ORDER BY KeHoachAnUongID DESC;

/* ============================
   SUBSCRIPTIONS / FEATURES
   ============================ */
INSERT INTO GoiThanhVien (UserID, LoaiGoi, NgayBatDau, NgayKetThuc, TrangThai, SoTien, ChuKyThanhToan, TuDongGiaHan)
VALUES ('user_0001','Basic','2025-10-01','2025-11-01','Active',99000,'Monthly',1);

INSERT INTO TinhNangGoi (TenTinhNang, GoiToiThieu, MoTa)
SELECT v.TenTinhNang, v.GoiToiThieu, v.MoTa
FROM (VALUES
('AI_Suggestions','Basic',N'Nhận gợi ý AI hằng ngày'),
('Unlimited_Goals','Free',N'Tạo mục tiêu không giới hạn')
) v(TenTinhNang,GoiToiThieu,MoTa)
WHERE NOT EXISTS (SELECT 1 FROM TinhNangGoi t WHERE t.TenTinhNang = v.TenTinhNang);

/* ============================
   FILE STORAGE & LOGS
   ============================ */
INSERT INTO TapTin (UserID, TenTapTin, TenLuuTrenServer, DuongDan, KichThuoc, MimeType, LoaiFile, MucDich)
SELECT v.UserID, v.TenTapTin, v.TenLuuTrenServer, v.DuongDan, v.KichThuoc, v.MimeType, v.LoaiFile, v.MucDich
FROM (VALUES ('user_0001','avatar.png','u1_avatar.png','/uploads/users/user_0001/',20480,'image/png','Image','AnhDaiDien'))
v(UserID,TenTapTin,TenLuuTrenServer,DuongDan,KichThuoc,MimeType,LoaiFile,MucDich)
WHERE NOT EXISTS (SELECT 1 FROM TapTin t WHERE t.TenLuuTrenServer = v.TenLuuTrenServer);

INSERT INTO NhatKyTamTrang (UserID, NgayGhi, TamTrang, MucDoStress, GhiChu)
SELECT v.UserID, v.NgayGhi, v.TamTrang, v.MucDoStress, v.GhiChu
FROM (VALUES ('user_0001','2025-10-29','Happy',3,N'Cảm thấy tràn đầy năng lượng'))
v(UserID,NgayGhi,TamTrang,MucDoStress,GhiChu)
WHERE NOT EXISTS (SELECT 1 FROM NhatKyTamTrang t WHERE t.UserID = v.UserID AND t.NgayGhi = v.NgayGhi);

INSERT INTO NhatKyDongBo (UserID, TrangThaiDongBo, NoiDongBo, ChiTiet)
VALUES ('user_0001','Success','OneDrive',N'Đồng bộ 3 file');

-- DONE

/* ============================
   EXTRA SEED PACK (x3 volume)
   ============================ */

-- More users đã được đưa vào @SeedUsers bên trên (idempotent)

-- Health logs
INSERT INTO LuuTruSucKhoe (MaBanGhi, UserID, NgayGhiNhan, SoBuoc, CaloTieuThu, SoGioNgu, CanNang, ChieuCao, BenhID, LuongNuocUong)
SELECT v.MaBanGhi, v.UserID, v.NgayGhiNhan, v.SoBuoc, v.CaloTieuThu, v.SoGioNgu, v.CanNang, v.ChieuCao, v.BenhID, v.LuongNuocUong
FROM (VALUES
('rec_0101','user_0003','2025-10-28',9000,2400,7.2,68,172,NULL,2.0),
('rec_0102','user_0003','2025-10-29',12000,2700,7.9,67.6,172,NULL,2.5),
('rec_0103','user_0004','2025-10-29',7200,2000,6.8,50.5,160,NULL,1.9),
('rec_0104','user_0005','2025-10-29',5300,1950,6.2,80.1,178,'benh_003',1.5),
('rec_0105','user_0006','2025-10-29',11000,2600,7.6,55.3,164,NULL,2.4)
) v(MaBanGhi,UserID,NgayGhiNhan,SoBuoc,CaloTieuThu,SoGioNgu,CanNang,ChieuCao,BenhID,LuongNuocUong)
WHERE NOT EXISTS (SELECT 1 FROM LuuTruSucKhoe l WHERE l.MaBanGhi = v.MaBanGhi);

-- Goals
INSERT INTO MucTieu (MucTieuID, UserID, LoaiMucTieu, GiaTriMucTieu, NgayBatDau, NgayKetThuc, TienDoHienTai)
SELECT v.MucTieuID, v.UserID, v.LoaiMucTieu, v.GiaTriMucTieu, v.NgayBatDau, v.NgayKetThuc, v.TienDoHienTai
FROM (VALUES
('goal_0101','user_0003','StepsTarget',12000,'2025-10-20',NULL,9000),
('goal_0102','user_0004','WeightLoss',48,'2025-09-15',NULL,50.5),
('goal_0103','user_0005','WeightLoss',75,'2025-10-01',NULL,80.1),
('goal_0104','user_0006','SleepImprovement',8,'2025-10-10',NULL,7.1)
) v(MucTieuID,UserID,LoaiMucTieu,GiaTriMucTieu,NgayBatDau,NgayKetThuc,TienDoHienTai)
WHERE NOT EXISTS (SELECT 1 FROM MucTieu m WHERE m.MucTieuID = v.MucTieuID);

-- Achievements
INSERT INTO ThanhTuu (UserID, TenBadge, Diem, MoTa)
VALUES
('user_0003',N'Week Streak',120,N'Đăng nhập 5 ngày'),
('user_0004',N'First Goal',80,N'Tạo mục tiêu đầu tiên'),
('user_0005',N'Walker',60,N'Đi bộ 5k bước'),
('user_0006',N'7h Sleep',70,N'Ngủ đủ >7h');

-- Ranking
INSERT INTO XepHang (UserID, ChuKy, TongDiem, ThuHang, NgayBatDauChuKy, NgayKetThucChuKy)
VALUES
('user_0003','Weekly',210,3,'2025-10-27','2025-11-02'),
('user_0004','Weekly',160,5,'2025-10-27','2025-11-02'),
('user_0005','Weekly',120,7,'2025-10-27','2025-11-02'),
('user_0006','Weekly',240,4,'2025-10-27','2025-11-02');

-- Weather
INSERT INTO NhatKyThoiTiet (UserID, NgayGhiLog, ThanhPho, NhietDo, TinhTrang, DoAm, GoiY)
VALUES
('user_0003','2025-10-29',N'Hải Phòng',27,N'Nắng nhẹ',60,N'Đạp xe buổi sáng'),
('user_0004','2025-10-29',N'Huế',25,N'Mưa nhẹ',85,N'Tập yoga trong nhà');

-- Nutrition logs
INSERT INTO NhatKyDinhDuong (DinhDuongID, UserID, NgayGhiLog, MonAnID, LuongThucAn, GhiChu)
SELECT v.DinhDuongID, v.UserID, v.NgayGhiLog, v.MonAnID, v.LuongThucAn, v.GhiChu
FROM (VALUES
('nut_0101','user_0003','2025-10-29','food_001',180,N'Bữa tối'),
('nut_0102','user_0003','2025-10-29','food_002',100,N'Bữa tối'),
('nut_0103','user_0004','2025-10-29','food_003',2,N'Bữa phụ'),
('nut_0104','user_0005','2025-10-29','food_001',220,N'Bữa trưa'),
('nut_0105','user_0006','2025-10-29','food_002',150,N'Bữa tối')
) v(DinhDuongID,UserID,NgayGhiLog,MonAnID,LuongThucAn,GhiChu)
WHERE NOT EXISTS (SELECT 1 FROM NhatKyDinhDuong n WHERE n.DinhDuongID = v.DinhDuongID);

-- AI suggestions/analytics/alerts
INSERT INTO AIGoiY (UserID, NgayGoiY, NoiDungGoiY, DaHoanThanh, DiemThuong)
VALUES
('user_0003','2025-10-29',N'Đi bộ thêm 3000 bước',0,10),
('user_0004','2025-10-29',N'Uống đủ 2 lít nước',0,10),
('user_0005','2025-10-29',N'Giảm 200 kcal hôm nay',0,10),
('user_0006','2025-10-29',N'Thiền 10 phút trước khi ngủ',0,10);

INSERT INTO AIPhanTichXuHuong (UserID, NgayPhanTich, LoaiChiSo, HuongXuHuong, TyLeThayDoi, NhanXet, MucDo)
VALUES
('user_0003','2025-10-29','Steps','Increasing',8.0,N'Tăng hoạt động',N'ThongTin'),
('user_0004','2025-10-29','Weight','Decreasing',-1.5,N'Xu hướng giảm cân',N'ThongTin');

INSERT INTO AICanhBaoSucKhoe (UserID, NgayCanhBao, LoaiRuiRo, MucDo, NoiDung, HanhDongDeXuat)
VALUES
('user_0005','2025-10-29','HighCalorieIntake','Medium',N'Nạp calo cao',N'Giảm đồ chiên, thêm rau'),
('user_0006','2025-10-29','LowActivity','Low',N'Hoạt động thấp 2 ngày',N'Đi bộ 20 phút');

-- Reminders & Notifications
INSERT INTO NhacNho (UserID, ThoiGianNhac, NoiDung)
VALUES
('user_0003','2025-10-30 07:30',N'Khởi động 10 phút'),
('user_0004','2025-10-30 12:00',N'Uống 1 ly nước'),
('user_0005','2025-10-30 21:30',N'Đi ngủ sớm');

INSERT INTO ThongBao (UserID, NoiDung, Loai, DaDoc)
VALUES
('user_0003',N'Hoàn thành 12.000 bước!',N'Achievement',0),
('user_0004',N'Đạt 2 lít nước/ngày',N'Reminder',0),
('user_0005',N'Có kế hoạch ăn uống mới',N'AIRecommendation',0),
('user_0006',N'Lịch tập mới đã được thêm',N'PT',0);

-- Trainers & relations
INSERT INTO HuanLuyenVien (PTID, UserID, ChungChi, ChuyenMon, SoNamKinhNghiem, ThanhPho, GiaTheoGio, TieuSu, DaXacMinh)
SELECT v.PTID, v.UserID, v.ChungChi, v.ChuyenMon, v.SoNamKinhNghiem, v.ThanhPho, v.GiaTheoGio, v.TieuSu, v.DaXacMinh
FROM (VALUES
('pt_0002','user_0003',N'NASM',N'Cardio, Endurance',4,N'Đà Nẵng',300000,N'Tập trung sức bền',1)
) v(PTID,UserID,ChungChi,ChuyenMon,SoNamKinhNghiem,ThanhPho,GiaTheoGio,TieuSu,DaXacMinh)
WHERE NOT EXISTS (SELECT 1 FROM HuanLuyenVien h WHERE h.PTID = v.PTID);

INSERT INTO DatLichPT (DatLichID, KhacHangID, PTID, NgayGioDat, LoaiBuoiTap, TrangThai)
SELECT v.DatLichID, v.KhacHangID, v.PTID, v.NgayGioDat, v.LoaiBuoiTap, v.TrangThai
FROM (VALUES
('bkg_0002','user_0003','pt_0002','2025-11-03 06:30',N'In-person',N'Pending')
) v(DatLichID,KhacHangID,PTID,NgayGioDat,LoaiBuoiTap,TrangThai)
WHERE NOT EXISTS (SELECT 1 FROM DatLichPT d WHERE d.DatLichID = v.DatLichID);

-- Social
INSERT INTO BanBe (UserID, NguoiNhanID, TrangThai)
SELECT v.UserID, v.NguoiNhanID, v.TrangThai
FROM (VALUES ('user_0003','user_0004','Accepted')) v(UserID,NguoiNhanID,TrangThai)
WHERE NOT EXISTS (SELECT 1 FROM BanBe b WHERE b.UserID = v.UserID AND b.NguoiNhanID = v.NguoiNhanID);

-- Templates / assignments
INSERT INTO MauTapLuyen (NguoiTao, TenMauTapLuyen, MoTa, DoKho, MucTieu, SoTuan, CaloUocTinh, ThietBiCan, CongKhai, DaXacThuc)
VALUES ('pt_0002',N'Endurance Boost',N'Tăng sức bền 4 tuần','Intermediate','Endurance',4,300,N'Dây kháng lực',1,1);

INSERT INTO ChiTietMauTapLuyen (MauTapLuyenID, TenbaiTap, SoSets, SoReps, ThoiLuongPhut, Tuan, NgayTrongTuan, ThuTuHienThi)
SELECT TOP 1 MauTapLuyenID, N'Burpees',4,12,12,1,2,1 FROM MauTapLuyen ORDER BY MauTapLuyenID DESC;

INSERT INTO GiaoBaiTapChoUser (UserID, MauTapLuyenID, NguoiGiao, NgayBatDau, NgayKetThuc, TuanHienTai)
SELECT 'user_0003', MauTapLuyenID, 'pt_0002', '2025-10-30', '2025-11-27', 1 FROM MauTapLuyen ORDER BY MauTapLuyenID DESC;

-- Meal plans
INSERT INTO KeHoachAnUong (NguoiTao, TenKeHoach, MoTa, LuongCaloMucTieu, TiLeMacro, LoaiKeHoach, SoNgay, CongKhai, DaXacThuc)
VALUES ('pt_0002',N'High Protein 7 ngày',N'Tăng protein xây cơ',2200,'40:35:25','MuscleGain',7,1,1);

INSERT INTO ChiTietKeHoachAnUong (KeHoachAnUongID, BuaAn, TenMonAn, KhauPhan, LuongCalo, Protein, Carbs, ChatBeo, ThuTrongKeHoach, ThuTuHienThi)
SELECT TOP 1 KeHoachAnUongID,'Dinner',N'Ức gà luộc','200g',320,60,0,5,1,1 FROM KeHoachAnUong ORDER BY KeHoachAnUongID DESC;

INSERT INTO PhanCongKeHoachAnUong (UserID, KeHoachAnUongID, NguoiGiao, NgayBatDau, NgayKetThuc, NgayHienTai)
SELECT 'user_0003', KeHoachAnUongID, 'pt_0002', '2025-10-30','2025-11-05',1 FROM KeHoachAnUong ORDER BY KeHoachAnUongID DESC;

-- Subscriptions
INSERT INTO GoiThanhVien (UserID, LoaiGoi, NgayBatDau, NgayKetThuc, TrangThai, SoTien, ChuKyThanhToan, TuDongGiaHan)
VALUES ('user_0003','Premium','2025-10-01','2025-11-01','Active',299000,'Monthly',1);

-- Files & logs
INSERT INTO TapTin (UserID, TenTapTin, TenLuuTrenServer, DuongDan, KichThuoc, MimeType, LoaiFile, MucDich)
SELECT v.UserID, v.TenTapTin, v.TenLuuTrenServer, v.DuongDan, v.KichThuoc, v.MimeType, v.LoaiFile, v.MucDich
FROM (VALUES ('user_0003','report.pdf','u3_report.pdf','/uploads/users/user_0003/',502400,'application/pdf','PDF','BaoCao'))
v(UserID,TenTapTin,TenLuuTrenServer,DuongDan,KichThuoc,MimeType,LoaiFile,MucDich)
WHERE NOT EXISTS (SELECT 1 FROM TapTin t WHERE t.TenLuuTrenServer = v.TenLuuTrenServer);

INSERT INTO NhatKyTamTrang (UserID, NgayGhi, TamTrang, MucDoStress, GhiChu)
SELECT v.UserID, v.NgayGhi, v.TamTrang, v.MucDoStress, v.GhiChu
FROM (VALUES ('user_0003','2025-10-29','Calm',2,N'Thư giãn tốt'))
v(UserID,NgayGhi,TamTrang,MucDoStress,GhiChu)
WHERE NOT EXISTS (SELECT 1 FROM NhatKyTamTrang t WHERE t.UserID = v.UserID AND t.NgayGhi = v.NgayGhi);

INSERT INTO NhatKyDongBo (UserID, TrangThaiDongBo, NoiDongBo, ChiTiet)
VALUES ('user_0003','Failed','OneDrive',N'Lỗi kết nối tạm thời');


/* ============================
   FIX PASSWORDS - Hash đúng cách để khớp với C# (UTF-8)
   ============================
   LƯU Ý QUAN TRỌNG:
   SQL Server HASHBYTES có thể dùng encoding khác với C# UTF-8.
   Vì vậy cần chạy script fix_passwords_utf8.sql sau khi chạy insert_data.sql
   để đảm bảo password hash khớp với cách verify trong C#.
   
   Hoặc dùng các hash đã được tính sẵn từ C# (xem bên dưới).
   ============================ */

-- Cách 1: Dùng hash đã tính sẵn từ C# (khuyến nghị)
-- Các hash này được tính bằng: SHA256(UTF8(password)) -> Base64
-- Để tính lại hash mới, chạy: powershell -File calculate_hashes.ps1
UPDATE dbo.Users SET PasswordHash = 'UUWcI8qR684nFEndi1wmdRyZA5wq5MYoBniYyg4QQDk=' WHERE Username = 'demo';
UPDATE dbo.Users SET PasswordHash = 'z45MivdOKrUIj6bPSxy/I/Q8kdMkdt5RkPUR44Z2BJI=' WHERE Username = 'minhthu';
UPDATE dbo.Users SET PasswordHash = '6G94qKPK8LYNjnTllCqm2G3BUM08AzOK7yW30tfjrMc=' WHERE Username = 'admin';
UPDATE dbo.Users SET PasswordHash = 'PGCziXf4tT8VcJrhJzipnk0pLgsvjWyIRHJycQ52iv8=' WHERE Username = 'quanghuy';
UPDATE dbo.Users SET PasswordHash = '/incHhdkrDn25bDNHe5qV8DADX6KkmPyzLHLyt8KoRg=' WHERE Username = 'linhchi';
UPDATE dbo.Users SET PasswordHash = 'gkKqfK0zTP55t80i3SqvAFKeURHJBaF90Mfk210JfUk=' WHERE Username = 'anhkhoa';
UPDATE dbo.Users SET PasswordHash = 'BEry+ow0/W2HZ0Z0qigleZSVSiRn56tTianm0eAF6FE=' WHERE Username = 'thutrang';

PRINT 'Đã cập nhật password hash bằng hash đã tính sẵn từ C# (UTF-8 SHA256 Base64)';
PRINT 'Tất cả tài khoản giờ đã có password hash đúng để đăng nhập được!';
GO

