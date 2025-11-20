-- Script SQL để cập nhật hình ảnh cho các món ăn trong bảng DinhDuongMonAn
-- Sử dụng URL hình ảnh từ Unsplash (miễn phí, không cần API key)
-- Các URL này sử dụng Unsplash Image API với photo ID cụ thể để đảm bảo hình ảnh ổn định
-- Format: https://images.unsplash.com/photo-[photo-id]?w=400&h=300&fit=crop

USE HealthTracker;
GO

-- Cập nhật hình ảnh cho các món ăn
-- Lưu ý: Các URL này sử dụng Unsplash Image API, có thể cần thay đổi nếu URL không còn hoạt động

-- Cập nhật hình ảnh cho các món ăn sử dụng Unsplash Image API
-- Format: /image/[ten-mon-an].jpg (lưu trữ local) hoặc URL từ Unsplash

-- Option 1: Sử dụng URL từ Unsplash (khuyến nghị cho development)
-- Option 2: Lưu hình ảnh vào thư mục wwwroot/image và sử dụng đường dẫn tương đối

-- Gà nướng
UPDATE DinhDuongMonAn SET HinhAnh = 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=300&fit=crop' WHERE MonAnID = 'monan_0001';
-- Cá hồi áp chảo
UPDATE DinhDuongMonAn SET HinhAnh = 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop' WHERE MonAnID = 'monan_0002';
-- Cơm gạo lứt
UPDATE DinhDuongMonAn SET HinhAnh = 'https://images.unsplash.com/photo-1516684669134-de6f7d473a2a?w=400&h=300&fit=crop' WHERE MonAnID = 'monan_0003';
-- Salad rau trộn
UPDATE DinhDuongMonAn SET HinhAnh = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop' WHERE MonAnID = 'monan_0004';
-- Sữa chua không đường
UPDATE DinhDuongMonAn SET HinhAnh = 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop' WHERE MonAnID = 'monan_0005';
-- Khoai lang luộc
UPDATE DinhDuongMonAn SET HinhAnh = 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=300&fit=crop' WHERE MonAnID = 'monan_0006';
-- Bông cải xanh luộc
UPDATE DinhDuongMonAn SET HinhAnh = 'https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?w=400&h=300&fit=crop' WHERE MonAnID = 'monan_0007';
-- Ức gà luộc
UPDATE DinhDuongMonAn SET HinhAnh = 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=300&fit=crop' WHERE MonAnID = 'monan_0008';
-- Trứng luộc
UPDATE DinhDuongMonAn SET HinhAnh = 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop' WHERE MonAnID = 'monan_0009';
-- Yến mạch
UPDATE DinhDuongMonAn SET HinhAnh = 'https://images.unsplash.com/photo-1606312619070-d48b4cbc6b3c?w=400&h=300&fit=crop' WHERE MonAnID = 'monan_0010';
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?banana' WHERE MonAnID = 'monan_0011'; -- Chuối chín
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?apple' WHERE MonAnID = 'monan_0012'; -- Táo
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?whole+wheat+bread' WHERE MonAnID = 'monan_0013'; -- Bánh mì nguyên cám
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?grilled+pork+ribs' WHERE MonAnID = 'monan_0014'; -- Sườn heo nướng
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?fried+mackerel' WHERE MonAnID = 'monan_0015'; -- Cá thu chiên
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?water+spinach+stir+fry' WHERE MonAnID = 'monan_0016'; -- Rau muống xào
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?fried+tofu' WHERE MonAnID = 'monan_0017'; -- Đậu phụ chiên
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?milk' WHERE MonAnID = 'monan_0018'; -- Sữa tươi không đường
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?almonds' WHERE MonAnID = 'monan_0019'; -- Hạnh nhân
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?whole+wheat+pasta' WHERE MonAnID = 'monan_0020'; -- Mì ống nguyên cám
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?grilled+beef' WHERE MonAnID = 'monan_0021'; -- Bò nướng
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?canned+tuna' WHERE MonAnID = 'monan_0022'; -- Cá ngừ đóng hộp
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?white+rice' WHERE MonAnID = 'monan_0023'; -- Gạo trắng
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?spinach+steamed' WHERE MonAnID = 'monan_0024'; -- Rau cải bó xôi luộc
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?soy+milk' WHERE MonAnID = 'monan_0025'; -- Sữa đậu nành
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?baked+potato' WHERE MonAnID = 'monan_0026'; -- Khoai tây nướng
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?boiled+carrot' WHERE MonAnID = 'monan_0027'; -- Cà rốt luộc
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?lean+pork' WHERE MonAnID = 'monan_0028'; -- Thịt lợn nạc
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?fried+egg' WHERE MonAnID = 'monan_0029'; -- Trứng chiên
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?oat+flour' WHERE MonAnID = 'monan_0030'; -- Bột yến mạch
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?orange' WHERE MonAnID = 'monan_0031'; -- Cam
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?pear' WHERE MonAnID = 'monan_0032'; -- Lê
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?whole+wheat+cracker' WHERE MonAnID = 'monan_0033'; -- Bánh quy nguyên cám
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?boiled+shrimp' WHERE MonAnID = 'monan_0034'; -- Tôm luộc
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?fried+sardine' WHERE MonAnID = 'monan_0035'; -- Cá mòi chiên
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?bok+choy+stir+fry' WHERE MonAnID = 'monan_0036'; -- Rau cải thìa xào
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?steamed+tofu' WHERE MonAnID = 'monan_0037'; -- Đậu hũ hấp
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?almond+milk' WHERE MonAnID = 'monan_0038'; -- Sữa hạnh nhân
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?walnuts' WHERE MonAnID = 'monan_0039'; -- Hạt óc chó
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?rice+noodles' WHERE MonAnID = 'monan_0040'; -- Mì gạo
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?grilled+duck+breast' WHERE MonAnID = 'monan_0041'; -- Ức vịt nướng
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?stir+fried+mushroom' WHERE MonAnID = 'monan_0042'; -- Nấm hương xào
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?steamed+pumpkin' WHERE MonAnID = 'monan_0043'; -- Bí đỏ hấp
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?ground+beef' WHERE MonAnID = 'monan_0044'; -- Thịt bò xay
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?chia+seeds' WHERE MonAnID = 'monan_0045'; -- Hạt chia
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?dark+rye+bread' WHERE MonAnID = 'monan_0046'; -- Bánh mì đen
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?boiled+red+beans' WHERE MonAnID = 'monan_0047'; -- Đậu đỏ luộc
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?whole+milk' WHERE MonAnID = 'monan_0048'; -- Sữa bò nguyên kem
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?mango' WHERE MonAnID = 'monan_0049'; -- Xoài chín
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?popcorn+no+butter' WHERE MonAnID = 'monan_0050'; -- Bắp rang không bơ
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?fried+catfish' WHERE MonAnID = 'monan_0051'; -- Cá basa chiên
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?boiled+spinach' WHERE MonAnID = 'monan_0052'; -- Rau bina luộc
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?roasted+peanuts' WHERE MonAnID = 'monan_0053'; -- Đậu phộng rang
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?vegetarian+steamed+bun' WHERE MonAnID = 'monan_0054'; -- Bánh bao chay
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?apple+juice' WHERE MonAnID = 'monan_0055'; -- Nước ép táo
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?boiled+zucchini' WHERE MonAnID = 'monan_0056'; -- Bí xanh luộc
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?ground+chicken' WHERE MonAnID = 'monan_0057'; -- Thịt gà xay
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?sunflower+seeds' WHERE MonAnID = 'monan_0058'; -- Hạt dưa
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?egg+noodles' WHERE MonAnID = 'monan_0059'; -- Mì trứng
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?watermelon' WHERE MonAnID = 'monan_0060'; -- Dưa hấu
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?stir+fried+pork' WHERE MonAnID = 'monan_0061'; -- Thịt heo xào
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?malabar+spinach' WHERE MonAnID = 'monan_0062'; -- Rau mồng tơi
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?roasted+cashews' WHERE MonAnID = 'monan_0063'; -- Hạt điều rang
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?rice+cake' WHERE MonAnID = 'monan_0064'; -- Bánh gạo
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?orange+juice' WHERE MonAnID = 'monan_0065'; -- Nước ép cam
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?boiled+choy+sum' WHERE MonAnID = 'monan_0066'; -- Cải ngọt luộc
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?boiled+duck' WHERE MonAnID = 'monan_0067'; -- Thịt vịt luộc
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?sunflower+seeds' WHERE MonAnID = 'monan_0068'; -- Hạt hướng dương
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?rice+vermicelli' WHERE MonAnID = 'monan_0069'; -- Bún gạo
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?longan' WHERE MonAnID = 'monan_0070'; -- Nhãn
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?grilled+mackerel' WHERE MonAnID = 'monan_0071'; -- Cá thu nướng
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?boiled+amaranth' WHERE MonAnID = 'monan_0072'; -- Rau dền luộc
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?sweetened+yogurt' WHERE MonAnID = 'monan_0073'; -- Sữa chua có đường
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?oat+cracker' WHERE MonAnID = 'monan_0074'; -- Bánh quy yến mạch
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?pineapple+juice' WHERE MonAnID = 'monan_0075'; -- Nước ép dứa
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?boiled+mung+beans' WHERE MonAnID = 'monan_0076'; -- Đậu xanh luộc
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?pan+seared+beef' WHERE MonAnID = 'monan_0077'; -- Thịt bò áp chảo
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?flax+seeds' WHERE MonAnID = 'monan_0078'; -- Hạt lanh
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?white+bread' WHERE MonAnID = 'monan_0079'; -- Bánh mì trắng
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?rambutan' WHERE MonAnID = 'monan_0080'; -- Chôm chôm
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?grilled+snakehead+fish' WHERE MonAnID = 'monan_0081'; -- Cá lóc nướng
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?boiled+sauropus' WHERE MonAnID = 'monan_0082'; -- Rau ngót luộc
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?coconut+milk' WHERE MonAnID = 'monan_0083'; -- Sữa dừa
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?vegetarian+pancake' WHERE MonAnID = 'monan_0084'; -- Bánh xèo chay
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?carrot+juice' WHERE MonAnID = 'monan_0085'; -- Nước ép cà rốt
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?boiled+lentils' WHERE MonAnID = 'monan_0086'; -- Đậu lăng luộc
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?honey+glazed+chicken' WHERE MonAnID = 'monan_0087'; -- Thịt gà nướng mật ong
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?roasted+pumpkin+seeds' WHERE MonAnID = 'monan_0088'; -- Hạt bí rang
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?barley+noodles' WHERE MonAnID = 'monan_0089'; -- Mì lúa mạch
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?grapefruit' WHERE MonAnID = 'monan_0090'; -- Bưởi
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?fried+carp' WHERE MonAnID = 'monan_0091'; -- Cá chép chiên
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?boiled+cauliflower' WHERE MonAnID = 'monan_0092'; -- Súp lơ trắng luộc
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?greek+yogurt' WHERE MonAnID = 'monan_0093'; -- Sữa chua Hy Lạp
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?chia+seed+cracker' WHERE MonAnID = 'monan_0094'; -- Bánh quy hạt chia
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?cucumber+juice' WHERE MonAnID = 'monan_0095'; -- Nước ép dưa leo
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?boiled+black+beans' WHERE MonAnID = 'monan_0096'; -- Đậu đen luộc
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?braised+beef' WHERE MonAnID = 'monan_0097'; -- Thịt bò hầm
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?roasted+sesame+seeds' WHERE MonAnID = 'monan_0098'; -- Hạt mè rang
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?rye+bread' WHERE MonAnID = 'monan_0099'; -- Bánh mì lúa mạch đen
UPDATE DinhDuongMonAn SET HinhAnh = 'https://source.unsplash.com/400x300/?plum' WHERE MonAnID = 'monan_0100'; -- Mận

GO

-- Kiểm tra kết quả
SELECT MonAnID, TenMonAn, HinhAnh 
FROM DinhDuongMonAn 
WHERE HinhAnh IS NOT NULL
ORDER BY MonAnID;

