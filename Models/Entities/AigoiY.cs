using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class AigoiY
{
    public int GoiYid { get; set; }

    public string UserId { get; set; } = null!;

    public DateOnly NgayGoiY { get; set; }

    public string NoiDungGoiY { get; set; } = null!;

    public bool? DaHoanThanh { get; set; }

    public DateTime? NgayHoanThanh { get; set; }

    public int? DiemThuong { get; set; }

    public virtual User User { get; set; } = null!;
}
