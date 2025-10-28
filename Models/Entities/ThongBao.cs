using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class ThongBao
{
    public int ThongBaoId { get; set; }

    public string UserId { get; set; } = null!;

    public string? NoiDung { get; set; }

    public string? Loai { get; set; }

    public int? MaLienQuan { get; set; }

    public bool? DaDoc { get; set; }

    public DateTime? NgayTao { get; set; }

    public virtual User User { get; set; } = null!;
}
