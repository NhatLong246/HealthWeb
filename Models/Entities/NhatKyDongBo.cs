using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class NhatKyDongBo
{
    public int DongBoId { get; set; }

    public string UserId { get; set; } = null!;

    public DateTime? NgayDongBo { get; set; }

    public string? TrangThaiDongBo { get; set; }

    public string? NoiDongBo { get; set; }

    public string? ChiTiet { get; set; }

    public virtual User User { get; set; } = null!;
}
