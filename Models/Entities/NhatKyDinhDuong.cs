using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class NhatKyDinhDuong
{
    public string DinhDuongId { get; set; } = null!;

    public string UserId { get; set; } = null!;

    public DateOnly NgayGhiLog { get; set; }

    public string MonAnId { get; set; } = null!;

    public double? LuongThucAn { get; set; }

    public string? GhiChu { get; set; }

    public virtual DinhDuongMonAn MonAn { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
