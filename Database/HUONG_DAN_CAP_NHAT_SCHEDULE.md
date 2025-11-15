# Hướng Dẫn Xử Lý Dữ Liệu Lịch Tập Luyện (Không Thay Đổi Database)

## Tóm tắt giải pháp

**KHÔNG thay đổi cấu trúc database**, tất cả thông tin được lưu vào các trường hiện có dưới dạng JSON.

### 1. Ngày bắt đầu trong MucTieu ✅
- **Đã xử lý**: Ngày bắt đầu tự động lấy là ngày tạo (ngày hiện tại) trong controller.

### 2. Phần "Xếp lịch cho bạn" (Lịch tập)
**Cách lưu trữ**:
- Lưu vào `ChiTietKeHoachTapLuyen.CanhBao` hoặc `ChiTietKeHoachTapLuyen.NoiDung` dưới dạng JSON
- Format: `{"LichTap": {"Buoi": "Sáng", "GioBatDau": "07:00", "GioKetThuc": "11:00"}}`
- Mỗi bài tập có `NgayTrongTuan` sẽ được gán thông tin lịch tập tương ứng

### 3. Địa điểm tập luyện
**Cách lưu trữ**:
- Lưu vào `MucTieu.GhiChu` dưới dạng JSON
- Format: `{"DiaDiemTapLuyen": "GYM", "NgayKhongTap": [1, 6, 7]}`
- Giá trị: 'GYM' hoặc 'Home'

### 4. Trình độ hiện tại
✅ **Không thừa**: Đã có sẵn trong `KeHoachTapLuyen.MucDo` ('Beginner', 'Intermediate', 'Advanced')

### 5. Ngày không tập
**Cách lưu trữ**:
- Lưu cùng với địa điểm trong `MucTieu.GhiChu` dưới dạng JSON
- Format: `{"DiaDiemTapLuyen": "GYM", "NgayKhongTap": [1, 6, 7]}`
- Mảng các số từ 1-7 (1=Monday, 7=Sunday)

## Cấu trúc dữ liệu JSON

### Trong MucTieu.GhiChu:
```json
{
  "DiaDiemTapLuyen": "GYM",
  "NgayKhongTap": [1, 6, 7]
}
```

### Trong ChiTietKeHoachTapLuyen.CanhBao hoặc NoiDung:
```json
{
  "LichTap": {
    "Buoi": "Sáng",
    "GioBatDau": "07:00",
    "GioKetThuc": "11:00"
  }
}
```

## Cách đọc dữ liệu

### Đọc thông tin từ MucTieu.GhiChu:
```csharp
var mucTieu = await _context.MucTieus.FindAsync(mucTieuId);
if (!string.IsNullOrEmpty(mucTieu?.GhiChu))
{
    var thongTin = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(mucTieu.GhiChu);
    var diaDiem = thongTin?.ContainsKey("DiaDiemTapLuyen") 
        ? thongTin["DiaDiemTapLuyen"]?.ToString() 
        : null;
    var ngayKhongTap = thongTin?.ContainsKey("NgayKhongTap") 
        ? System.Text.Json.JsonSerializer.Deserialize<List<int>>(thongTin["NgayKhongTap"].ToString())
        : null;
}
```

### Đọc thông tin lịch tập từ ChiTietKeHoachTapLuyen:
```csharp
var chiTiet = await _context.ChiTietKeHoachTapLuyens.FindAsync(chiTietId);
if (!string.IsNullOrEmpty(chiTiet?.CanhBao))
{
    try
    {
        var lichTapData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(chiTiet.CanhBao);
        if (lichTapData?.ContainsKey("LichTap") == true)
        {
            var lichTap = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(
                lichTapData["LichTap"].ToString());
            var buoi = lichTap?["Buoi"];
            var gioBatDau = lichTap?["GioBatDau"];
            var gioKetThuc = lichTap?["GioKetThuc"];
        }
    }
    catch
    {
        // Nếu không phải JSON, có thể là text thông thường
    }
}
```

## Lưu ý

1. **Không cần thay đổi database**: Tất cả thông tin được lưu vào các trường text hiện có
2. **Format JSON**: Đảm bảo format JSON đúng để có thể parse lại sau này
3. **Backward compatibility**: Nếu các trường đã có nội dung text, code sẽ cố gắng parse JSON, nếu không được thì xem như text thông thường
4. **Trình độ**: Đã có sẵn trong `KeHoachTapLuyen.MucDo`, không cần lưu thêm

## Code đã được cập nhật

✅ Controller (`MucTieuController.cs`):
- Lưu ngày bắt đầu = ngày tạo
- Lưu địa điểm và ngày không tập vào `MucTieu.GhiChu`
- Lưu lịch tập vào `ChiTietKeHoachTapLuyen.CanhBao` hoặc `NoiDung`

✅ JavaScript (`mucTieu.js`):
- Thu thập thông tin từ form (địa điểm, trình độ, lịch tập, ngày không tập)
- Gửi lên server khi click "Thêm bài tập"
