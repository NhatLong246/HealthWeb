using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class GiaoBaiTapChoUser
{
    public int GiaBtId { get; set; }

    public string UserId { get; set; } = null!;

    public int MauTapLuyenId { get; set; }

    public string? NguoiGiao { get; set; }

    public DateOnly NgayBatDau { get; set; }

    public DateOnly? NgayKetThuc { get; set; }

    public int? TuanHienTai { get; set; }

    public double? TiLeHoanThanh { get; set; }

    public string? TrangThai { get; set; }

    public DateTime? NgayGiao { get; set; }

    public virtual MauTapLuyen MauTapLuyen { get; set; } = null!;

    public virtual HuanLuyenVien? NguoiGiaoNavigation { get; set; }

    public virtual ICollection<TheoDoiHoanThanhBaiTap> TheoDoiHoanThanhBaiTaps { get; set; } = new List<TheoDoiHoanThanhBaiTap>();

    public virtual User User { get; set; } = null!;
}
