using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class TheoDoiHoanThanhBaiTap
{
    public int TheoDoiId { get; set; }

    public int GiaBtId { get; set; }

    public int BaiTapId { get; set; }

    public DateOnly NgayHoanThanh { get; set; }

    public int? SoSetThucTe { get; set; }

    public int? SoRepThucTe { get; set; }

    public int? ThoiGianThucTe { get; set; }

    public double? CaloTieuHao { get; set; }

    public int? DoKho { get; set; }

    public string? GhiChu { get; set; }

    public virtual ChiTietMauTapLuyen BaiTap { get; set; } = null!;

    public virtual GiaoBaiTapChoUser GiaBt { get; set; } = null!;
}
