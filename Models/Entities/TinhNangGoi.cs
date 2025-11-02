using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class TinhNangGoi
{
    public int TinhNangId { get; set; }

    public string TenTinhNang { get; set; } = null!;

    public string? GoiToiThieu { get; set; }

    public string? MoTa { get; set; }

    public bool? ConHoatDong { get; set; }
}
