using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class MucTieuChonBaiTap
{
    public int ChonBaiTapId { get; set; }

    public string MucTieuId { get; set; } = null!;

    public int MauTapLuyenId { get; set; }

    public int? ThuTuHienThi { get; set; }

    public bool? DaLapLich { get; set; }

    public DateTime? NgayChon { get; set; }

    public virtual MauTapLuyen MauTapLuyen { get; set; } = null!;

    public virtual MucTieu MucTieu { get; set; } = null!;
}

