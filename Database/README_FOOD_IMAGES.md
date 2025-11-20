# Hướng dẫn cập nhật hình ảnh món ăn

## Tổng quan
Script này giúp cập nhật hình ảnh cho 100 món ăn trong bảng `DinhDuongMonAn`.

## Có 2 phương án:

### Phương án 1: Sử dụng URL từ Unsplash (Khuyến nghị cho Development)
- **File**: `update_food_images.sql`
- **Ưu điểm**: Không cần tải hình ảnh, sử dụng trực tiếp từ Unsplash
- **Nhược điểm**: Phụ thuộc vào kết nối internet, URL có thể thay đổi

### Phương án 2: Lưu hình ảnh local (Khuyến nghị cho Production)
- **File**: `update_food_images_local.sql`
- **Ưu điểm**: Tốc độ nhanh, không phụ thuộc internet, kiểm soát được hình ảnh
- **Nhược điểm**: Cần tải và lưu 100 hình ảnh vào thư mục `wwwroot/image`

## Cách sử dụng:

### Sử dụng URL Unsplash:
1. Mở SQL Server Management Studio
2. Kết nối đến database `HealthTracker`
3. Mở file `update_food_images.sql`
4. Chạy script

### Sử dụng hình ảnh local:
1. Tải các hình ảnh món ăn từ các nguồn miễn phí:
   - Unsplash: https://unsplash.com/s/photos/food
   - Pexels: https://www.pexels.com/search/food/
   - Pixabay: https://pixabay.com/images/search/food/

2. Đặt tên file theo format: `[ten-mon-an-khong-dau].jpg`
   - Ví dụ: `ga-nuong.jpg`, `ca-hoi-ap-chao.jpg`, `com-gao-lut.jpg`

3. Lưu tất cả hình ảnh vào thư mục: `wwwroot/image/`

4. Mở SQL Server Management Studio
5. Kết nối đến database `HealthTracker`
6. Mở file `update_food_images_local.sql`
7. Chạy script

## Danh sách tên file cần tải (cho phương án 2):

1. ga-nuong.jpg
2. ca-hoi-ap-chao.jpg
3. com-gao-lut.jpg
4. salad-rau-tron.jpg
5. sua-chua-khong-duong.jpg
6. khoai-lang-luoc.jpg
7. bong-cai-xanh-luoc.jpg
8. uc-ga-luoc.jpg
9. trung-luoc.jpg
10. yen-mach.jpg
... (và 90 món ăn còn lại)

## Lưu ý:
- Kích thước hình ảnh khuyến nghị: 400x300px hoặc tỷ lệ 4:3
- Định dạng: JPG hoặc PNG
- Kích thước file: < 500KB mỗi hình để tối ưu hiệu suất
- Đảm bảo hình ảnh có chất lượng tốt, rõ ràng

## Kiểm tra sau khi cập nhật:
```sql
SELECT MonAnID, TenMonAn, HinhAnh 
FROM DinhDuongMonAn 
WHERE HinhAnh IS NOT NULL
ORDER BY MonAnID;
```

