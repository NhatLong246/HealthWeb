using System;

namespace HealthWeb.Models.Entities
{
    public class User
    {
        public string UserID { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string Role { get; set; } = "Client";
        public string? Email { get; set; }
        public string? HoTen { get; set; }
        public DateTime? NgaySinh { get; set; }
        public string? GioiTinh { get; set; }
        public string? AnhDaiDien { get; set; }
        public string Theme { get; set; } = "Light";
        public string NgonNgu { get; set; } = "vi";
        public string TimeZone { get; set; } = "SE Asia Standard Time";
        public string? ResetToken { get; set; }
        public DateTime? ResetTokenExpiry { get; set; }
        public DateTime CreatedDate { get; set; }
        
        // Navigation properties
        public ICollection<XepHang> XepHang { get; set; } = new List<XepHang>();
    }
}

