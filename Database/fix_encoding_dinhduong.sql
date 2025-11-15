-- Script để sửa lỗi encoding cho bảng DinhDuongMonAn
-- Vấn đề: TenMonAn đang dùng VARCHAR thay vì NVARCHAR, gây lỗi hiển thị ký tự tiếng Việt

USE HealthTracker;
GO

-- Bước 1: ALTER TABLE để đổi TenMonAn từ VARCHAR sang NVARCHAR
-- Lưu ý: Nếu có dữ liệu, cần backup trước
ALTER TABLE DinhDuongMonAn
ALTER COLUMN TenMonAn NVARCHAR(200);
GO

-- Bước 2: Cập nhật lại tất cả dữ liệu với encoding đúng bằng MERGE
-- Sử dụng MERGE để cập nhật tất cả các món ăn với tên tiếng Việt đúng
-- Bao gồm cả các món có ID food_xxx và monan_xxx

-- Trước tiên, cập nhật các món có ID food_xxx (nếu có)
MERGE DinhDuongMonAn AS target
USING (VALUES
    ('food_001', N'Ức gà áp chảo'),
    ('food_002', N'Cơm gạo lứt'),
    ('food_003', N'Táo')
) AS source (MonAnID, TenMonAn)
ON target.MonAnID = source.MonAnID
WHEN MATCHED THEN
    UPDATE SET TenMonAn = source.TenMonAn;
GO

-- Sau đó cập nhật các món có ID monan_xxx
MERGE DinhDuongMonAn AS target
USING (VALUES
    ('monan_0001', N'Gà nướng'),
    ('monan_0002', N'Cá hồi áp chảo'),
    ('monan_0003', N'Cơm gạo lứt'),
    ('monan_0004', N'Salad rau trộn'),
    ('monan_0005', N'Sữa chua không đường'),
    ('monan_0006', N'Khoai lang luộc'),
    ('monan_0007', N'Bông cải xanh luộc'),
    ('monan_0008', N'Ức gà luộc'),
    ('monan_0009', N'Trứng luộc'),
    ('monan_0010', N'Yến mạch'),
    ('monan_0011', N'Chuối chín'),
    ('monan_0012', N'Táo'),
    ('monan_0013', N'Bánh mì nguyên cám'),
    ('monan_0014', N'Sườn heo nướng'),
    ('monan_0015', N'Cá thu chiên'),
    ('monan_0016', N'Rau muống xào'),
    ('monan_0017', N'Đậu phụ chiên'),
    ('monan_0018', N'Sữa tươi không đường'),
    ('monan_0019', N'Hạnh nhân'),
    ('monan_0020', N'Mì ống nguyên cám'),
    ('monan_0021', N'Bò nướng'),
    ('monan_0022', N'Cá ngừ đóng hộp'),
    ('monan_0023', N'Gạo trắng'),
    ('monan_0024', N'Rau cải bó xôi luộc'),
    ('monan_0025', N'Sữa đậu nành'),
    ('monan_0026', N'Khoai tây nướng'),
    ('monan_0027', N'Cà rốt luộc'),
    ('monan_0028', N'Thịt lợn nạc'),
    ('monan_0029', N'Trứng chiên'),
    ('monan_0030', N'Bột yến mạch'),
    ('monan_0031', N'Cam'),
    ('monan_0032', N'Lê'),
    ('monan_0033', N'Bánh quy nguyên cám'),
    ('monan_0034', N'Tôm luộc'),
    ('monan_0035', N'Cá mòi chiên'),
    ('monan_0036', N'Rau cải thìa xào'),
    ('monan_0037', N'Đậu hũ hấp'),
    ('monan_0038', N'Sữa hạnh nhân'),
    ('monan_0039', N'Hạt óc chó'),
    ('monan_0040', N'Mì gạo'),
    ('monan_0041', N'Ức vịt nướng'),
    ('monan_0042', N'Nấm hương xào'),
    ('monan_0043', N'Bí đỏ hấp'),
    ('monan_0044', N'Thịt bò xay'),
    ('monan_0045', N'Hạt chia'),
    ('monan_0046', N'Bánh mì đen'),
    ('monan_0047', N'Đậu đỏ luộc'),
    ('monan_0048', N'Sữa bò nguyên kem'),
    ('monan_0049', N'Xoài chín'),
    ('monan_0050', N'Bắp rang không bơ'),
    ('monan_0051', N'Cá basa chiên'),
    ('monan_0052', N'Rau bina luộc'),
    ('monan_0053', N'Đậu phộng rang'),
    ('monan_0054', N'Bánh bao chay'),
    ('monan_0055', N'Nước ép táo'),
    ('monan_0056', N'Bí xanh luộc'),
    ('monan_0057', N'Thịt gà xay'),
    ('monan_0058', N'Hạt dưa'),
    ('monan_0059', N'Mì trứng'),
    ('monan_0060', N'Dưa hấu'),
    ('monan_0061', N'Thịt heo xào'),
    ('monan_0062', N'Rau mồng tơi'),
    ('monan_0063', N'Hạt điều rang'),
    ('monan_0064', N'Bánh gạo'),
    ('monan_0065', N'Nước ép cam'),
    ('monan_0066', N'Cải ngọt luộc'),
    ('monan_0067', N'Thịt vịt luộc'),
    ('monan_0068', N'Hạt hướng dương'),
    ('monan_0069', N'Bún gạo'),
    ('monan_0070', N'Nhãn'),
    ('monan_0071', N'Cá thu nướng'),
    ('monan_0072', N'Rau dền luộc'),
    ('monan_0073', N'Sữa chua có đường'),
    ('monan_0074', N'Bánh quy yến mạch'),
    ('monan_0075', N'Nước ép dứa'),
    ('monan_0076', N'Đậu xanh luộc'),
    ('monan_0077', N'Thịt bò áp chảo'),
    ('monan_0078', N'Hạt lanh'),
    ('monan_0079', N'Bánh mì trắng'),
    ('monan_0080', N'Chôm chôm'),
    ('monan_0081', N'Cá lóc nướng'),
    ('monan_0082', N'Rau ngót luộc'),
    ('monan_0083', N'Sữa dừa'),
    ('monan_0084', N'Bánh xèo chay'),
    ('monan_0085', N'Nước ép cà rốt'),
    ('monan_0086', N'Đậu lăng luộc'),
    ('monan_0087', N'Thịt gà nướng mật ong'),
    ('monan_0088', N'Hạt bí rang'),
    ('monan_0089', N'Mì lúa mạch'),
    ('monan_0090', N'Bưởi'),
    ('monan_0091', N'Cá chép chiên'),
    ('monan_0092', N'Súp lơ trắng luộc'),
    ('monan_0093', N'Sữa chua Hy Lạp'),
    ('monan_0094', N'Bánh quy hạt chia'),
    ('monan_0095', N'Nước ép dưa leo'),
    ('monan_0096', N'Đậu đen luộc'),
    ('monan_0097', N'Thịt bò hầm'),
    ('monan_0098', N'Hạt mè rang'),
    ('monan_0099', N'Bánh mì lúa mạch đen'),
    ('monan_0100', N'Mận')
) AS source (MonAnID, TenMonAn)
ON target.MonAnID = source.MonAnID
WHEN MATCHED THEN
    UPDATE SET TenMonAn = source.TenMonAn;
GO

-- Kiểm tra kết quả
SELECT TOP 10 MonAnID, TenMonAn, DonViTinh 
FROM DinhDuongMonAn 
ORDER BY MonAnID;
GO

PRINT 'Đã cập nhật encoding cho bảng DinhDuongMonAn thành công!';
GO

