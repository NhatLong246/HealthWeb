using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class NhatKyHoanThanhBaiTap
{
    public int NhatKyId { get; set; }

    public string UserId { get; set; } = null!;

    public int ChiTietId { get; set; }

    public DateOnly NgayHoanThanh { get; set; }

    public int? SoHiepThucTe { get; set; }

    public int? SoLanThucTe { get; set; }

    public int? ThoiLuongThucTePhut { get; set; }

    public double? CaloTieuHao { get; set; }

    public int? DanhGiaBaiTap { get; set; }

    public string? GhiChu { get; set; }

    public virtual ChiTietKeHoachTapLuyen ChiTiet { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
