using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class GoiThanhVien
{
    public int GoiThanhVienId { get; set; }

    public string UserId { get; set; } = null!;

    public string LoaiGoi { get; set; } = null!;

    public DateOnly NgayBatDau { get; set; }

    public DateOnly? NgayKetThuc { get; set; }

    public string? TrangThai { get; set; }

    public double? SoTien { get; set; }

    public string? ChuKyThanhToan { get; set; }

    public DateOnly? NgayGiaHan { get; set; }

    public string? PhuongThucThanhToan { get; set; }

    public bool? TuDongGiaHan { get; set; }

    public DateTime? NgayDangKy { get; set; }

    public DateTime? NgayHuy { get; set; }

    public string? LyDoHuy { get; set; }

    public virtual User User { get; set; } = null!;
}
