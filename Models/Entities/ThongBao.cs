using System;

namespace HealthWeb.Models.Entities
{
    public class ThongBao
    {
        public int ThongBaoID { get; set; }
        public string UserID { get; set; } = string.Empty;
        public string? NoiDung { get; set; }
        public string? Loai { get; set; }
        public int? MaLienQuan { get; set; }
        public bool DaDoc { get; set; }
        public DateTime NgayTao { get; set; }
    }
}


