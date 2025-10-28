using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class KeHoachAnUong
{
    public int KeHoachAnUongId { get; set; }

    public string? NguoiTao { get; set; }

    public string TenKeHoach { get; set; } = null!;

    public string? MoTa { get; set; }

    public int? LuongCaloMucTieu { get; set; }

    public string? TiLeMacro { get; set; }

    public string? LoaiKeHoach { get; set; }

    public int? SoNgay { get; set; }

    public string? CanhBaoDiUng { get; set; }

    public bool? CongKhai { get; set; }

    public bool? DaXacThuc { get; set; }

    public int? SoLanSuDung { get; set; }

    public double? DiemTrungBinh { get; set; }

    public DateTime? NgayTao { get; set; }

    public DateTime? NgayChinhSua { get; set; }

    public virtual ICollection<ChiTietKeHoachAnUong> ChiTietKeHoachAnUongs { get; set; } = new List<ChiTietKeHoachAnUong>();

    public virtual HuanLuyenVien? NguoiTaoNavigation { get; set; }

    public virtual ICollection<PhanCongKeHoachAnUong> PhanCongKeHoachAnUongs { get; set; } = new List<PhanCongKeHoachAnUong>();
}
