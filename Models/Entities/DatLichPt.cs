using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class DatLichPt
{
    public string DatLichId { get; set; } = null!;

    public string KhacHangId { get; set; } = null!;

    public string? Ptid { get; set; }

    public DateTime NgayGioDat { get; set; }

    public string? LoaiBuoiTap { get; set; }

    public string? TrangThai { get; set; }

    public string? LyDoTuChoi { get; set; }

    public string? NguoiHuy { get; set; }

    public double? TienHoan { get; set; }

    public bool? ChoXemSucKhoe { get; set; }

    public string? GhiChu { get; set; }

    public DateTime? NgayTao { get; set; }

    public virtual GiaoDich? GiaoDich { get; set; }

    public virtual User KhacHang { get; set; } = null!;

    public virtual HuanLuyenVien? Pt { get; set; }

    public virtual ICollection<TinNhan> TinNhans { get; set; } = new List<TinNhan>();
}
