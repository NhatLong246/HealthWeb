using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class QuyenPtKhachHang
{
    public int QuyenId { get; set; }

    public string KhachHangId { get; set; } = null!;

    public string Ptid { get; set; } = null!;

    public DateTime? NgayCapQuyen { get; set; }

    public bool? DangHoatDong { get; set; }

    public virtual User KhachHang { get; set; } = null!;

    public virtual HuanLuyenVien Pt { get; set; } = null!;
}
