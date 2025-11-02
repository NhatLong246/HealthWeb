using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class NhatKyTamTrang
{
    public int TamTrangId { get; set; }

    public string UserId { get; set; } = null!;

    public DateOnly NgayGhi { get; set; }

    public string? TamTrang { get; set; }

    public int? MucDoStress { get; set; }

    public string? GhiChu { get; set; }

    public virtual User User { get; set; } = null!;
}
