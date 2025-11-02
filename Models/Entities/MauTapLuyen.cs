using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class MauTapLuyen
{
    public int MauTapLuyenId { get; set; }

    public string? NguoiTao { get; set; }

    public string TenMauTapLuyen { get; set; } = null!;

    public string? MoTa { get; set; }

    public string? DoKho { get; set; }

    public string? MucTieu { get; set; }

    public int? SoTuan { get; set; }

    public int? CaloUocTinh { get; set; }

    public string? ThietBiCan { get; set; }

    public bool? CongKhai { get; set; }

    public bool? DaXacThuc { get; set; }

    public int? SoLanSuDung { get; set; }

    public double? DiemTrungBinh { get; set; }

    public DateTime? NgayTao { get; set; }

    public DateTime? NgayChinhSua { get; set; }

    public virtual ICollection<ChiTietMauTapLuyen> ChiTietMauTapLuyens { get; set; } = new List<ChiTietMauTapLuyen>();

    public virtual ICollection<GiaoBaiTapChoUser> GiaoBaiTapChoUsers { get; set; } = new List<GiaoBaiTapChoUser>();

    public virtual HuanLuyenVien? NguoiTaoNavigation { get; set; }
}
