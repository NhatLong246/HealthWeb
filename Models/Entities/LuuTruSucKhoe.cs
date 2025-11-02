using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HealthWeb.Models.Entities
{
    public class LuuTruSucKhoe
    {
        [Key]
        [StringLength(20)]
        public string MaBanGhi { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        public string UserID { get; set; } = string.Empty;

        [Required]
        [Column(TypeName = "Date")]
        public DateTime NgayGhiNhan { get; set; }

        public int SoBuoc { get; set; }

        public float CaloTieuThu { get; set; }

        public float SoGioNgu { get; set; }

        public float? CanNang { get; set; }

        public float? ChieuCao { get; set; }

        public float? BMI { get; set; }

        public float? SoDoVong1 { get; set; }
        public float? SoDoVong2 { get; set; }
        public float? SoDoVong3 { get; set; }
        public float? SoDoBapTay { get; set; }
        public float? SoDoBapChan { get; set; }
        public float? TiLeMo { get; set; }

        [StringLength(20)]
        public string? BenhID { get; set; }

        public float LuongNuocUong { get; set; }

        [StringLength(500)]
        public string? GhiChu { get; set; }

        // Navigation property
        public User? User { get; set; }
    }
}

