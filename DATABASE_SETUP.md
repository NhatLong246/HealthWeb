# Hướng dẫn thiết lập Database

## Lỗi kết nối Database

Nếu bạn gặp lỗi: `An error occurred using the connection to database 'HealthTracker' on server 'localhost'`, hãy làm theo các bước sau:

## 1. Kiểm tra SQL Server đang chạy

### Windows:
1. Mở **SQL Server Configuration Manager**
2. Kiểm tra **SQL Server Services** đang chạy
3. Nếu chưa chạy, nhấp chuột phải và chọn **Start**

### Hoặc sử dụng Services:
1. Nhấn `Win + R` và gõ `services.msc`
2. Tìm **SQL Server (MSSQLSERVER)** hoặc **SQL Server (SQLEXPRESS)**
3. Đảm bảo service đang **Running**

## 2. Kiểm tra Connection String

Mở file `appsettings.json` và kiểm tra connection string:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=HealthTracker;MultipleActiveResultSets=True;TrustServerCertificate=True;User id=sa;Password=nhan123;"
  }
}
```

### Các vấn đề có thể xảy ra:

#### a) Instance name không đúng
Nếu bạn sử dụng SQL Server Express, thử thêm instance name:
```
Server=localhost\SQLEXPRESS;Database=HealthTracker;...
```

#### b) Password sai
Kiểm tra password của user `sa` trong SQL Server:
- Mở **SQL Server Management Studio (SSMS)**
- Kết nối với server
- Kiểm tra login `sa` và password

#### c) SQL Server Authentication chưa được bật
1. Mở **SQL Server Management Studio**
2. Kết nối với server (sử dụng Windows Authentication)
3. Nhấp chuột phải vào server > **Properties**
4. Chọn **Security**
5. Chọn **SQL Server and Windows Authentication mode**
6. Nhấn **OK** và khởi động lại SQL Server service

## 3. Tạo Database

### Cách 1: Sử dụng SQL Script
1. Mở **SQL Server Management Studio**
2. Kết nối với server
3. Mở file `Healthtracker.sql` hoặc `DuLieuMau.sql`
4. Chạy script để tạo database và các bảng

### Cách 2: Tạo database thủ công
1. Mở **SQL Server Management Studio**
2. Kết nối với server
3. Nhấp chuột phải vào **Databases** > **New Database**
4. Đặt tên database là `HealthTracker`
5. Nhấn **OK**

## 4. Kiểm tra kết nối

### Sử dụng SQL Server Management Studio:
1. Mở **SQL Server Management Studio**
2. Nhập thông tin kết nối:
   - **Server name**: `localhost` hoặc `localhost\SQLEXPRESS`
   - **Authentication**: **SQL Server Authentication**
   - **Login**: `sa`
   - **Password**: `nhan123` (hoặc password của bạn)
3. Nhấn **Connect**
4. Nếu kết nối thành công, bạn sẽ thấy database `HealthTracker` trong danh sách

### Sử dụng Command Line:
```bash
sqlcmd -S localhost -U sa -P nhan123 -Q "SELECT @@VERSION"
```

## 5. Các Connection String mẫu

### SQL Server với Windows Authentication:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=HealthTracker;Trusted_Connection=True;Integrated Security=True;TrustServerCertificate=True;MultipleActiveResultSets=True;"
  }
}
```

### SQL Server Express:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost\\SQLEXPRESS;Database=HealthTracker;MultipleActiveResultSets=True;TrustServerCertificate=True;User id=sa;Password=nhan123;"
  }
}
```

### SQL Server với port cụ thể:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost,1433;Database=HealthTracker;MultipleActiveResultSets=True;TrustServerCertificate=True;User id=sa;Password=nhan123;"
  }
}
```

## 6. Khắc phục lỗi thường gặp

### Lỗi: "Cannot open database 'HealthTracker'"
**Nguyên nhân**: Database chưa tồn tại
**Giải pháp**: Tạo database bằng cách chạy script SQL hoặc tạo thủ công

### Lỗi: "Login failed for user 'sa'"
**Nguyên nhân**: Password sai hoặc SQL Server Authentication chưa được bật
**Giải pháp**: 
- Kiểm tra password
- Bật SQL Server Authentication mode
- Đảm bảo user `sa` được enable

### Lỗi: "A network-related or instance-specific error"
**Nguyên nhân**: SQL Server chưa chạy hoặc instance name sai
**Giải pháp**: 
- Kiểm tra SQL Server service đang chạy
- Kiểm tra instance name (thử thêm `\SQLEXPRESS` nếu dùng Express)

### Lỗi: "The server was not found or was not accessible"
**Nguyên nhân**: Firewall chặn kết nối hoặc SQL Server không chấp nhận kết nối từ xa
**Giải pháp**: 
- Kiểm tra firewall
- Đảm bảo SQL Server Browser service đang chạy
- Kiểm tra SQL Server Configuration Manager > SQL Server Network Configuration

## 7. Test Connection từ ứng dụng

Sau khi cấu hình xong, khởi động lại ứng dụng và kiểm tra:
- Ứng dụng không còn lỗi kết nối database
- Có thể truy cập các trang admin
- Dữ liệu được load từ database

## 8. Liên hệ hỗ trợ

Nếu vẫn gặp vấn đề, vui lòng cung cấp:
- Version SQL Server đang sử dụng
- Loại SQL Server (Express, Developer, Standard, Enterprise)
- Thông báo lỗi chi tiết
- Connection string đang sử dụng (ẩn password)

