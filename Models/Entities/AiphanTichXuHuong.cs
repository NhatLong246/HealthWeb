using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class AiphanTichXuHuong
{
    public int PhanTichId { get; set; }

    public string UserId { get; set; } = null!;

    public DateOnly? NgayPhanTich { get; set; }

    public string? LoaiChiSo { get; set; }

    public string? HuongXuHuong { get; set; }

    public double? TyLeThayDoi { get; set; }

    public string? NhanXet { get; set; }

    public string? MucDo { get; set; }

    public virtual User User { get; set; } = null!;
}
