using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class ChiTietKeHoachTapLuyen
{
    public int ChiTietId { get; set; }

    public string KeHoachId { get; set; } = null!;

    public string TenBaiTap { get; set; } = null!;

    public int? SoHiep { get; set; }

    public int? SoLan { get; set; }

    public double? CaloTieuHaoDuKien { get; set; }

    public int? ThoiGianPhut { get; set; }

    public int? NgayTrongTuan { get; set; }

    public int? Tuan { get; set; }

    public int? ThuTuHienThi { get; set; }

    public int? DanhGiaDoKho { get; set; }

    public int? DanhGiaHieuQua { get; set; }

    public string? VideoUrl { get; set; }

    public string? CanhBao { get; set; }

    public string? NoiDung { get; set; }

    public string? HuongDan { get; set; }

    public virtual KeHoachTapLuyen KeHoach { get; set; } = null!;

    public virtual ICollection<NhatKyHoanThanhBaiTap> NhatKyHoanThanhBaiTaps { get; set; } = new List<NhatKyHoanThanhBaiTap>();
}
