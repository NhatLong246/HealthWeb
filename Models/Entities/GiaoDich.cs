using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class GiaoDich
{
    public string GiaoDichId { get; set; } = null!;

    public string DatLichId { get; set; } = null!;

    public string KhachHangId { get; set; } = null!;

    public string Ptid { get; set; } = null!;

    public double SoTien { get; set; }

    public double? HoaHongApp { get; set; }

    public double? SoTienPtnhan { get; set; }

    public string? TrangThaiThanhToan { get; set; }

    public string? PhuongThucThanhToan { get; set; }

    public DateTime? NgayGiaoDich { get; set; }

    public virtual DatLichPt DatLich { get; set; } = null!;

    public virtual User KhachHang { get; set; } = null!;

    public virtual HuanLuyenVien Pt { get; set; } = null!;
}
