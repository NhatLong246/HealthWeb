using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class ThanhTuu
{
    public int ThanhTuuId { get; set; }

    public string UserId { get; set; } = null!;

    public string TenBadge { get; set; } = null!;

    public int? Diem { get; set; }

    public DateTime? NgayDatDuoc { get; set; }

    public string? MoTa { get; set; }

    public virtual ICollection<ChiaSeThanhTuu> ChiaSeThanhTuus { get; set; } = new List<ChiaSeThanhTuu>();

    public virtual User User { get; set; } = null!;
}
