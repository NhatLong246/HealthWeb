using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class ChiTietMauTapLuyen
{
    public int BaiTapId { get; set; }

    public int MauTapLuyenId { get; set; }

    public string TenbaiTap { get; set; } = null!;

    public int? SoSets { get; set; }

    public int? SoReps { get; set; }

    public int? ThoiLuongPhut { get; set; }

    public int? ThoiGianNghiGiay { get; set; }

    public int? Tuan { get; set; }

    public int? NgayTrongTuan { get; set; }

    public int? ThuTuHienThi { get; set; }

    public string? VideoUrl { get; set; }

    public string? GhiChu { get; set; }

    public virtual MauTapLuyen MauTapLuyen { get; set; } = null!;

    public virtual ICollection<TheoDoiHoanThanhBaiTap> TheoDoiHoanThanhBaiTaps { get; set; } = new List<TheoDoiHoanThanhBaiTap>();
}
