using System;

namespace HealthWeb.Models.Entities
{
    public class XepHang
    {
        public int XepHangID { get; set; }
        public string UserID { get; set; } = string.Empty;
        public string ChuKy { get; set; } = string.Empty; // Daily, Weekly, Monthly
        public int TongDiem { get; set; }
        public int ThuHang { get; set; }
        public DateTime NgayBatDauChuKy { get; set; }
        public DateTime NgayKetThucChuKy { get; set; }
        public DateTime NgayCapNhat { get; set; }
        
        // Navigation properties
        public User User { get; set; } = null!;
    }
}

