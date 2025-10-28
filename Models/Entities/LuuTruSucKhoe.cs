using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class LuuTruSucKhoe
{
    public string MaBanGhi { get; set; } = null!;

    public string UserId { get; set; } = null!;

    public DateOnly NgayGhiNhan { get; set; }

    public int? SoBuoc { get; set; }

    public double? CaloTieuThu { get; set; }

    public double? SoGioNgu { get; set; }

    public double? CanNang { get; set; }

    public double? ChieuCao { get; set; }

    public double? Bmi { get; set; }

    public double? SoDoVong1 { get; set; }

    public double? SoDoVong2 { get; set; }

    public double? SoDoVong3 { get; set; }

    public double? SoDoBapTay { get; set; }

    public double? SoDoBapChan { get; set; }

    public double? TiLeMo { get; set; }

    public string? BenhId { get; set; }

    public double? LuongNuocUong { get; set; }

    public string? GhiChu { get; set; }

    public virtual Benh? Benh { get; set; }

    public virtual User User { get; set; } = null!;
}
