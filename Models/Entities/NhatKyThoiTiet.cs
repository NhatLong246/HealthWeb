using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class NhatKyThoiTiet
{
    public int ThoiTietId { get; set; }

    public string UserId { get; set; } = null!;

    public DateOnly NgayGhiLog { get; set; }

    public string? ThanhPho { get; set; }

    public double? NhietDo { get; set; }

    public string? TinhTrang { get; set; }

    public double? DoAm { get; set; }

    public string? GoiY { get; set; }

    public virtual User User { get; set; } = null!;
}
