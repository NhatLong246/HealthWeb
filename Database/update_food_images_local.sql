-- Script SQL để cập nhật hình ảnh cho các món ăn trong bảng DinhDuongMonAn
-- Sử dụng đường dẫn local từ thư mục wwwroot/image
-- Hình ảnh cần được tải về và lưu vào thư mục wwwroot/image với tên file tương ứng

USE HealthTracker;
GO

-- Cập nhật hình ảnh cho các món ăn sử dụng đường dẫn local
-- Format: /image/[ten-mon-an].jpg

UPDATE DinhDuongMonAn SET HinhAnh = '/image/ga-nuong.jpg' WHERE MonAnID = 'monan_0001'; -- Gà nướng
UPDATE DinhDuongMonAn SET HinhAnh = '/image/ca-hoi-ap-chao.jpg' WHERE MonAnID = 'monan_0002'; -- Cá hồi áp chảo
UPDATE DinhDuongMonAn SET HinhAnh = '/image/com-gao-lut.jpg' WHERE MonAnID = 'monan_0003'; -- Cơm gạo lứt
UPDATE DinhDuongMonAn SET HinhAnh = '/image/salad-rau-tron.jpg' WHERE MonAnID = 'monan_0004'; -- Salad rau trộn
UPDATE DinhDuongMonAn SET HinhAnh = '/image/sua-chua-khong-duong.jpg' WHERE MonAnID = 'monan_0005'; -- Sữa chua không đường
UPDATE DinhDuongMonAn SET HinhAnh = '/image/khoai-lang-luoc.jpg' WHERE MonAnID = 'monan_0006'; -- Khoai lang luộc
UPDATE DinhDuongMonAn SET HinhAnh = '/image/bong-cai-xanh-luoc.jpg' WHERE MonAnID = 'monan_0007'; -- Bông cải xanh luộc
UPDATE DinhDuongMonAn SET HinhAnh = '/image/uc-ga-luoc.jpg' WHERE MonAnID = 'monan_0008'; -- Ức gà luộc
UPDATE DinhDuongMonAn SET HinhAnh = '/image/trung-luoc.jpg' WHERE MonAnID = 'monan_0009'; -- Trứng luộc
UPDATE DinhDuongMonAn SET HinhAnh = '/image/yen-mach.jpg' WHERE MonAnID = 'monan_0010'; -- Yến mạch
UPDATE DinhDuongMonAn SET HinhAnh = '/image/chuoi-chin.jpg' WHERE MonAnID = 'monan_0011'; -- Chuối chín
UPDATE DinhDuongMonAn SET HinhAnh = '/image/tao.jpg' WHERE MonAnID = 'monan_0012'; -- Táo
UPDATE DinhDuongMonAn SET HinhAnh = '/image/banh-mi-nguyen-cam.jpg' WHERE MonAnID = 'monan_0013'; -- Bánh mì nguyên cám
UPDATE DinhDuongMonAn SET HinhAnh = '/image/suon-heo-nuong.jpg' WHERE MonAnID = 'monan_0014'; -- Sườn heo nướng
UPDATE DinhDuongMonAn SET HinhAnh = '/image/ca-thu-chien.jpg' WHERE MonAnID = 'monan_0015'; -- Cá thu chiên
UPDATE DinhDuongMonAn SET HinhAnh = '/image/rau-muong-xao.jpg' WHERE MonAnID = 'monan_0016'; -- Rau muống xào
UPDATE DinhDuongMonAn SET HinhAnh = '/image/dau-phu-chien.jpg' WHERE MonAnID = 'monan_0017'; -- Đậu phụ chiên
UPDATE DinhDuongMonAn SET HinhAnh = '/image/sua-tuoi-khong-duong.jpg' WHERE MonAnID = 'monan_0018'; -- Sữa tươi không đường
UPDATE DinhDuongMonAn SET HinhAnh = '/image/hanh-nhan.jpg' WHERE MonAnID = 'monan_0019'; -- Hạnh nhân
UPDATE DinhDuongMonAn SET HinhAnh = '/image/mi-ong-nguyen-cam.jpg' WHERE MonAnID = 'monan_0020'; -- Mì ống nguyên cám
UPDATE DinhDuongMonAn SET HinhAnh = '/image/bo-nuong.jpg' WHERE MonAnID = 'monan_0021'; -- Bò nướng
UPDATE DinhDuongMonAn SET HinhAnh = '/image/ca-ngu-dong-hop.jpg' WHERE MonAnID = 'monan_0022'; -- Cá ngừ đóng hộp
UPDATE DinhDuongMonAn SET HinhAnh = '/image/gao-trang.jpg' WHERE MonAnID = 'monan_0023'; -- Gạo trắng
UPDATE DinhDuongMonAn SET HinhAnh = '/image/rau-cai-bo-xoi-luoc.jpg' WHERE MonAnID = 'monan_0024'; -- Rau cải bó xôi luộc
UPDATE DinhDuongMonAn SET HinhAnh = '/image/sua-dau-nanh.jpg' WHERE MonAnID = 'monan_0025'; -- Sữa đậu nành
UPDATE DinhDuongMonAn SET HinhAnh = '/image/khoai-tay-nuong.jpg' WHERE MonAnID = 'monan_0026'; -- Khoai tây nướng
UPDATE DinhDuongMonAn SET HinhAnh = '/image/ca-rot-luoc.jpg' WHERE MonAnID = 'monan_0027'; -- Cà rốt luộc
UPDATE DinhDuongMonAn SET HinhAnh = '/image/thit-lon-nac.jpg' WHERE MonAnID = 'monan_0028'; -- Thịt lợn nạc
UPDATE DinhDuongMonAn SET HinhAnh = '/image/trung-chien.jpg' WHERE MonAnID = 'monan_0029'; -- Trứng chiên
UPDATE DinhDuongMonAn SET HinhAnh = '/image/bot-yen-mach.jpg' WHERE MonAnID = 'monan_0030'; -- Bột yến mạch
UPDATE DinhDuongMonAn SET HinhAnh = '/image/cam.jpg' WHERE MonAnID = 'monan_0031'; -- Cam
UPDATE DinhDuongMonAn SET HinhAnh = '/image/le.jpg' WHERE MonAnID = 'monan_0032'; -- Lê
UPDATE DinhDuongMonAn SET HinhAnh = '/image/banh-quy-nguyen-cam.jpg' WHERE MonAnID = 'monan_0033'; -- Bánh quy nguyên cám
UPDATE DinhDuongMonAn SET HinhAnh = '/image/tom-luoc.jpg' WHERE MonAnID = 'monan_0034'; -- Tôm luộc
UPDATE DinhDuongMonAn SET HinhAnh = '/image/ca-moi-chien.jpg' WHERE MonAnID = 'monan_0035'; -- Cá mòi chiên
UPDATE DinhDuongMonAn SET HinhAnh = '/image/rau-cai-thia-xao.jpg' WHERE MonAnID = 'monan_0036'; -- Rau cải thìa xào
UPDATE DinhDuongMonAn SET HinhAnh = '/image/dau-hu-hap.jpg' WHERE MonAnID = 'monan_0037'; -- Đậu hũ hấp
UPDATE DinhDuongMonAn SET HinhAnh = '/image/sua-hanh-nhan.jpg' WHERE MonAnID = 'monan_0038'; -- Sữa hạnh nhân
UPDATE DinhDuongMonAn SET HinhAnh = '/image/hat-oc-cho.jpg' WHERE MonAnID = 'monan_0039'; -- Hạt óc chó
UPDATE DinhDuongMonAn SET HinhAnh = '/image/mi-gao.jpg' WHERE MonAnID = 'monan_0040'; -- Mì gạo
UPDATE DinhDuongMonAn SET HinhAnh = '/image/uc-vit-nuong.jpg' WHERE MonAnID = 'monan_0041'; -- Ức vịt nướng
UPDATE DinhDuongMonAn SET HinhAnh = '/image/nam-huong-xao.jpg' WHERE MonAnID = 'monan_0042'; -- Nấm hương xào
UPDATE DinhDuongMonAn SET HinhAnh = '/image/bi-do-hap.jpg' WHERE MonAnID = 'monan_0043'; -- Bí đỏ hấp
UPDATE DinhDuongMonAn SET HinhAnh = '/image/thit-bo-xay.jpg' WHERE MonAnID = 'monan_0044'; -- Thịt bò xay
UPDATE DinhDuongMonAn SET HinhAnh = '/image/hat-chia.jpg' WHERE MonAnID = 'monan_0045'; -- Hạt chia
UPDATE DinhDuongMonAn SET HinhAnh = '/image/banh-mi-den.jpg' WHERE MonAnID = 'monan_0046'; -- Bánh mì đen
UPDATE DinhDuongMonAn SET HinhAnh = '/image/dau-do-luoc.jpg' WHERE MonAnID = 'monan_0047'; -- Đậu đỏ luộc
UPDATE DinhDuongMonAn SET HinhAnh = '/image/sua-bo-nguyen-kem.jpg' WHERE MonAnID = 'monan_0048'; -- Sữa bò nguyên kem
UPDATE DinhDuongMonAn SET HinhAnh = '/image/xoai-chin.jpg' WHERE MonAnID = 'monan_0049'; -- Xoài chín
UPDATE DinhDuongMonAn SET HinhAnh = '/image/bap-rang-khong-bo.jpg' WHERE MonAnID = 'monan_0050'; -- Bắp rang không bơ
UPDATE DinhDuongMonAn SET HinhAnh = '/image/ca-basa-chien.jpg' WHERE MonAnID = 'monan_0051'; -- Cá basa chiên
UPDATE DinhDuongMonAn SET HinhAnh = '/image/rau-bina-luoc.jpg' WHERE MonAnID = 'monan_0052'; -- Rau bina luộc
UPDATE DinhDuongMonAn SET HinhAnh = '/image/dau-phong-rang.jpg' WHERE MonAnID = 'monan_0053'; -- Đậu phộng rang
UPDATE DinhDuongMonAn SET HinhAnh = '/image/banh-bao-chay.jpg' WHERE MonAnID = 'monan_0054'; -- Bánh bao chay
UPDATE DinhDuongMonAn SET HinhAnh = '/image/nuoc-ep-tao.jpg' WHERE MonAnID = 'monan_0055'; -- Nước ép táo
UPDATE DinhDuongMonAn SET HinhAnh = '/image/bi-xanh-luoc.jpg' WHERE MonAnID = 'monan_0056'; -- Bí xanh luộc
UPDATE DinhDuongMonAn SET HinhAnh = '/image/thit-ga-xay.jpg' WHERE MonAnID = 'monan_0057'; -- Thịt gà xay
UPDATE DinhDuongMonAn SET HinhAnh = '/image/hat-dua.jpg' WHERE MonAnID = 'monan_0058'; -- Hạt dưa
UPDATE DinhDuongMonAn SET HinhAnh = '/image/mi-trung.jpg' WHERE MonAnID = 'monan_0059'; -- Mì trứng
UPDATE DinhDuongMonAn SET HinhAnh = '/image/dua-hau.jpg' WHERE MonAnID = 'monan_0060'; -- Dưa hấu
UPDATE DinhDuongMonAn SET HinhAnh = '/image/thit-heo-xao.jpg' WHERE MonAnID = 'monan_0061'; -- Thịt heo xào
UPDATE DinhDuongMonAn SET HinhAnh = '/image/rau-mong-toi.jpg' WHERE MonAnID = 'monan_0062'; -- Rau mồng tơi
UPDATE DinhDuongMonAn SET HinhAnh = '/image/hat-dieu-rang.jpg' WHERE MonAnID = 'monan_0063'; -- Hạt điều rang
UPDATE DinhDuongMonAn SET HinhAnh = '/image/banh-gao.jpg' WHERE MonAnID = 'monan_0064'; -- Bánh gạo
UPDATE DinhDuongMonAn SET HinhAnh = '/image/nuoc-ep-cam.jpg' WHERE MonAnID = 'monan_0065'; -- Nước ép cam
UPDATE DinhDuongMonAn SET HinhAnh = '/image/cai-ngot-luoc.jpg' WHERE MonAnID = 'monan_0066'; -- Cải ngọt luộc
UPDATE DinhDuongMonAn SET HinhAnh = '/image/thit-vit-luoc.jpg' WHERE MonAnID = 'monan_0067'; -- Thịt vịt luộc
UPDATE DinhDuongMonAn SET HinhAnh = '/image/hat-huong-duong.jpg' WHERE MonAnID = 'monan_0068'; -- Hạt hướng dương
UPDATE DinhDuongMonAn SET HinhAnh = '/image/bun-gao.jpg' WHERE MonAnID = 'monan_0069'; -- Bún gạo
UPDATE DinhDuongMonAn SET HinhAnh = '/image/nhan.jpg' WHERE MonAnID = 'monan_0070'; -- Nhãn
UPDATE DinhDuongMonAn SET HinhAnh = '/image/ca-thu-nuong.jpg' WHERE MonAnID = 'monan_0071'; -- Cá thu nướng
UPDATE DinhDuongMonAn SET HinhAnh = '/image/rau-den-luoc.jpg' WHERE MonAnID = 'monan_0072'; -- Rau dền luộc
UPDATE DinhDuongMonAn SET HinhAnh = '/image/sua-chua-co-duong.jpg' WHERE MonAnID = 'monan_0073'; -- Sữa chua có đường
UPDATE DinhDuongMonAn SET HinhAnh = '/image/banh-quy-yen-mach.jpg' WHERE MonAnID = 'monan_0074'; -- Bánh quy yến mạch
UPDATE DinhDuongMonAn SET HinhAnh = '/image/nuoc-ep-dua.jpg' WHERE MonAnID = 'monan_0075'; -- Nước ép dứa
UPDATE DinhDuongMonAn SET HinhAnh = '/image/dau-xanh-luoc.jpg' WHERE MonAnID = 'monan_0076'; -- Đậu xanh luộc
UPDATE DinhDuongMonAn SET HinhAnh = '/image/thit-bo-ap-chao.jpg' WHERE MonAnID = 'monan_0077'; -- Thịt bò áp chảo
UPDATE DinhDuongMonAn SET HinhAnh = '/image/hat-lanh.jpg' WHERE MonAnID = 'monan_0078'; -- Hạt lanh
UPDATE DinhDuongMonAn SET HinhAnh = '/image/banh-mi-trang.jpg' WHERE MonAnID = 'monan_0079'; -- Bánh mì trắng
UPDATE DinhDuongMonAn SET HinhAnh = '/image/chom-chom.jpg' WHERE MonAnID = 'monan_0080'; -- Chôm chôm
UPDATE DinhDuongMonAn SET HinhAnh = '/image/ca-loc-nuong.jpg' WHERE MonAnID = 'monan_0081'; -- Cá lóc nướng
UPDATE DinhDuongMonAn SET HinhAnh = '/image/rau-ngot-luoc.jpg' WHERE MonAnID = 'monan_0082'; -- Rau ngót luộc
UPDATE DinhDuongMonAn SET HinhAnh = '/image/sua-dua.jpg' WHERE MonAnID = 'monan_0083'; -- Sữa dừa
UPDATE DinhDuongMonAn SET HinhAnh = '/image/banh-xeo-chay.jpg' WHERE MonAnID = 'monan_0084'; -- Bánh xèo chay
UPDATE DinhDuongMonAn SET HinhAnh = '/image/nuoc-ep-ca-rot.jpg' WHERE MonAnID = 'monan_0085'; -- Nước ép cà rốt
UPDATE DinhDuongMonAn SET HinhAnh = '/image/dau-lang-luoc.jpg' WHERE MonAnID = 'monan_0086'; -- Đậu lăng luộc
UPDATE DinhDuongMonAn SET HinhAnh = '/image/thit-ga-nuong-mat-ong.jpg' WHERE MonAnID = 'monan_0087'; -- Thịt gà nướng mật ong
UPDATE DinhDuongMonAn SET HinhAnh = '/image/hat-bi-rang.jpg' WHERE MonAnID = 'monan_0088'; -- Hạt bí rang
UPDATE DinhDuongMonAn SET HinhAnh = '/image/mi-lua-mach.jpg' WHERE MonAnID = 'monan_0089'; -- Mì lúa mạch
UPDATE DinhDuongMonAn SET HinhAnh = '/image/buoi.jpg' WHERE MonAnID = 'monan_0090'; -- Bưởi
UPDATE DinhDuongMonAn SET HinhAnh = '/image/ca-chep-chien.jpg' WHERE MonAnID = 'monan_0091'; -- Cá chép chiên
UPDATE DinhDuongMonAn SET HinhAnh = '/image/sup-lo-trang-luoc.jpg' WHERE MonAnID = 'monan_0092'; -- Súp lơ trắng luộc
UPDATE DinhDuongMonAn SET HinhAnh = '/image/sua-chua-hy-lap.jpg' WHERE MonAnID = 'monan_0093'; -- Sữa chua Hy Lạp
UPDATE DinhDuongMonAn SET HinhAnh = '/image/banh-quy-hat-chia.jpg' WHERE MonAnID = 'monan_0094'; -- Bánh quy hạt chia
UPDATE DinhDuongMonAn SET HinhAnh = '/image/nuoc-ep-dua-leo.jpg' WHERE MonAnID = 'monan_0095'; -- Nước ép dưa leo
UPDATE DinhDuongMonAn SET HinhAnh = '/image/dau-den-luoc.jpg' WHERE MonAnID = 'monan_0096'; -- Đậu đen luộc
UPDATE DinhDuongMonAn SET HinhAnh = '/image/thit-bo-ham.jpg' WHERE MonAnID = 'monan_0097'; -- Thịt bò hầm
UPDATE DinhDuongMonAn SET HinhAnh = '/image/hat-me-rang.jpg' WHERE MonAnID = 'monan_0098'; -- Hạt mè rang
UPDATE DinhDuongMonAn SET HinhAnh = '/image/banh-mi-lua-mach-den.jpg' WHERE MonAnID = 'monan_0099'; -- Bánh mì lúa mạch đen
UPDATE DinhDuongMonAn SET HinhAnh = '/image/man.jpg' WHERE MonAnID = 'monan_0100'; -- Mận

GO

-- Kiểm tra kết quả
SELECT MonAnID, TenMonAn, HinhAnh 
FROM DinhDuongMonAn 
WHERE HinhAnh IS NOT NULL
ORDER BY MonAnID;

