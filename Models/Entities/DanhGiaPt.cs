using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class DanhGiaPt
{
    public int DanhGiaId { get; set; }

    public string KhachHangId { get; set; } = null!;

    public string Ptid { get; set; } = null!;

    public int? Diem { get; set; }

    public string? BinhLuan { get; set; }

    public DateTime? NgayDanhGia { get; set; }

    public virtual User KhachHang { get; set; } = null!;

    public virtual HuanLuyenVien Pt { get; set; } = null!;
}
