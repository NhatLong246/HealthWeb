-- ==========================================
-- SCRIPT KIỂM TRA DỮ LIỆU TẤT CẢ CÁC BẢNG
-- Mục đích: Kiểm tra lỗi font chữ tiếng Việt
-- ==========================================

USE HealthTracker;
GO

PRINT N'==========================================';
PRINT N'KIỂM TRA DỮ LIỆU TẤT CẢ CÁC BẢNG';
PRINT N'==========================================';
PRINT N'';

-- 1. Bảng Users
PRINT N'1. BẢNG Users:';
SELECT * FROM Users;
PRINT N'';
GO

-- 2. Bảng Benh
PRINT N'2. BẢNG Benh:';
SELECT * FROM Benh;
PRINT N'';
GO

-- 3. Bảng LuuTruSucKhoe
PRINT N'3. BẢNG LuuTruSucKhoe:';
SELECT * FROM LuuTruSucKhoe;
PRINT N'';
GO

-- 4. Bảng MucTieu
PRINT N'4. BẢNG MucTieu:';
SELECT * FROM MucTieu;
PRINT N'';
GO

-- 5. Bảng ThanhTuu
PRINT N'5. BẢNG ThanhTuu:';
SELECT * FROM ThanhTuu;
PRINT N'';
GO

-- 6. Bảng XepHang
PRINT N'6. BẢNG XepHang:';
SELECT * FROM XepHang;
PRINT N'';
GO

-- 7. Bảng NhatKyThoiTiet
PRINT N'7. BẢNG NhatKyThoiTiet:';
SELECT * FROM NhatKyThoiTiet;
PRINT N'';
GO

-- 8. Bảng DinhDuongMonAn
PRINT N'8. BẢNG DinhDuongMonAn:';
SELECT * FROM DinhDuongMonAn;
PRINT N'';
GO

-- 9. Bảng NhatKyDinhDuong
PRINT N'9. BẢNG NhatKyDinhDuong:';
SELECT * FROM NhatKyDinhDuong;
PRINT N'';
GO

-- 10. Bảng AIGoiY
PRINT N'10. BẢNG AIGoiY:';
SELECT * FROM AIGoiY;
PRINT N'';
GO

-- 11. Bảng AIPhanTichXuHuong
PRINT N'11. BẢNG AIPhanTichXuHuong:';
SELECT * FROM AIPhanTichXuHuong;
PRINT N'';
GO

-- 12. Bảng AICanhBaoSucKhoe
PRINT N'12. BẢNG AICanhBaoSucKhoe:';
SELECT * FROM AICanhBaoSucKhoe;
PRINT N'';
GO

-- 13. Bảng NhacNho
PRINT N'13. BẢNG NhacNho:';
SELECT * FROM NhacNho;
PRINT N'';
GO

-- 14. Bảng ThongBao
PRINT N'14. BẢNG ThongBao:';
SELECT * FROM ThongBao;
PRINT N'';
GO

-- 15. Bảng KeHoachTapLuyen
PRINT N'15. BẢNG KeHoachTapLuyen:';
SELECT * FROM KeHoachTapLuyen;
PRINT N'';
GO

-- 16. Bảng ChiTietKeHoachTapLuyen
PRINT N'16. BẢNG ChiTietKeHoachTapLuyen:';
SELECT * FROM ChiTietKeHoachTapLuyen;
PRINT N'';
GO

-- 17. Bảng NhatKyHoanThanhBaiTap
PRINT N'17. BẢNG NhatKyHoanThanhBaiTap:';
SELECT * FROM NhatKyHoanThanhBaiTap;
PRINT N'';
GO

-- 18. Bảng NhatKyTamTrang
PRINT N'18. BẢNG NhatKyTamTrang:';
SELECT * FROM NhatKyTamTrang;
PRINT N'';
GO

-- 19. Bảng NhatKyDongBo
PRINT N'19. BẢNG NhatKyDongBo:';
SELECT * FROM NhatKyDongBo;
PRINT N'';
GO

-- 20. Bảng NhatKyUngDung
PRINT N'20. BẢNG NhatKyUngDung:';
SELECT * FROM NhatKyUngDung;
PRINT N'';
GO

-- 21. Bảng HuanLuyenVien
PRINT N'21. BẢNG HuanLuyenVien:';
SELECT * FROM HuanLuyenVien;
PRINT N'';
GO

-- 22. Bảng DatLichPT
PRINT N'22. BẢNG DatLichPT:';
SELECT * FROM DatLichPT;
PRINT N'';
GO

-- 23. Bảng DanhGiaPT
PRINT N'23. BẢNG DanhGiaPT:';
SELECT * FROM DanhGiaPT;
PRINT N'';
GO

-- 24. Bảng TinNhan
PRINT N'24. BẢNG TinNhan:';
SELECT * FROM TinNhan;
PRINT N'';
GO

-- 25. Bảng QuyenPT_KhachHang
PRINT N'25. BẢNG QuyenPT_KhachHang:';
SELECT * FROM QuyenPT_KhachHang;
PRINT N'';
GO

-- 26. Bảng GiaoDich
PRINT N'26. BẢNG GiaoDich:';
SELECT * FROM GiaoDich;
PRINT N'';
GO

-- 27. Bảng BanBe
PRINT N'27. BẢNG BanBe:';
SELECT * FROM BanBe;
PRINT N'';
GO

-- 28. Bảng ChiaSeThanhTuu
PRINT N'28. BẢNG ChiaSeThanhTuu:';
SELECT * FROM ChiaSeThanhTuu;
PRINT N'';
GO

-- 29. Bảng LuotThichChiaSeThanhTuu
PRINT N'29. BẢNG LuotThichChiaSeThanhTuu:';
SELECT * FROM LuotThichChiaSeThanhTuu;
PRINT N'';
GO

-- 30. Bảng MauTapLuyen
PRINT N'30. BẢNG MauTapLuyen:';
SELECT * FROM MauTapLuyen;
PRINT N'';
GO

-- 31. Bảng ChiTietMauTapLuyen
PRINT N'31. BẢNG ChiTietMauTapLuyen:';
SELECT * FROM ChiTietMauTapLuyen;
PRINT N'';
GO

-- 32. Bảng GiaoBaiTapChoUser
PRINT N'32. BẢNG GiaoBaiTapChoUser:';
SELECT * FROM GiaoBaiTapChoUser;
PRINT N'';
GO

-- 33. Bảng TheoDoiHoanThanhBaiTap
PRINT N'33. BẢNG TheoDoiHoanThanhBaiTap:';
SELECT * FROM TheoDoiHoanThanhBaiTap;
PRINT N'';
GO

-- 34. Bảng KeHoachAnUong
PRINT N'34. BẢNG KeHoachAnUong:';
SELECT * FROM KeHoachAnUong;
PRINT N'';
GO

-- 35. Bảng ChiTietKeHoachAnUong
PRINT N'35. BẢNG ChiTietKeHoachAnUong:';
SELECT * FROM ChiTietKeHoachAnUong;
PRINT N'';
GO

-- 36. Bảng PhanCongKeHoachAnUong
PRINT N'36. BẢNG PhanCongKeHoachAnUong:';
SELECT * FROM PhanCongKeHoachAnUong;
PRINT N'';
GO

-- 37. Bảng GoiThanhVien
PRINT N'37. BẢNG GoiThanhVien:';
SELECT * FROM GoiThanhVien;
PRINT N'';
GO

-- 38. Bảng TinhNangGoi
PRINT N'38. BẢNG TinhNangGoi:';
SELECT * FROM TinhNangGoi;
PRINT N'';
GO

-- 39. Bảng TapTin
PRINT N'39. BẢNG TapTin:';
SELECT * FROM TapTin;
PRINT N'';
GO

PRINT N'==========================================';
PRINT N'HOÀN TẤT KIỂM TRA TẤT CẢ CÁC BẢNG';
PRINT N'==========================================';
GO

