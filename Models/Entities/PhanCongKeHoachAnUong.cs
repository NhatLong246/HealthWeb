using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class PhanCongKeHoachAnUong
{
    public int PhanCongId { get; set; }

    public string UserId { get; set; } = null!;

    public int KeHoachAnUongId { get; set; }

    public string? NguoiGiao { get; set; }

    public DateOnly NgayBatDau { get; set; }

    public DateOnly? NgayKetThuc { get; set; }

    public int? NgayHienTai { get; set; }

    public double? TiLeTuanThu { get; set; }

    public string? TrangThai { get; set; }

    public DateTime? NgayGiao { get; set; }

    public virtual KeHoachAnUong KeHoachAnUong { get; set; } = null!;

    public virtual HuanLuyenVien? NguoiGiaoNavigation { get; set; }

    public virtual User User { get; set; } = null!;
}
