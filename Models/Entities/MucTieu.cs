using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class MucTieu
{
    public string MucTieuId { get; set; } = null!;

    public string UserId { get; set; } = null!;

    public string LoaiMucTieu { get; set; } = null!;

    public double GiaTriMucTieu { get; set; }

    public DateOnly NgayBatDau { get; set; }

    public DateOnly? NgayKetThuc { get; set; }

    public double? TienDoHienTai { get; set; }

    public bool? DaHoanThanh { get; set; }

    public int? ThuTuHienThi { get; set; }

    public string? GhiChu { get; set; }

    public virtual ICollection<KeHoachTapLuyen> KeHoachTapLuyens { get; set; } = new List<KeHoachTapLuyen>();

    public virtual ICollection<MucTieuChonBaiTap> MucTieuChonBaiTaps { get; set; } = new List<MucTieuChonBaiTap>();

    public virtual User User { get; set; } = null!;
}
