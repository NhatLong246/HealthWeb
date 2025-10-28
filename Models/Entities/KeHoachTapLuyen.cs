using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class KeHoachTapLuyen
{
    public string KeHoachId { get; set; } = null!;

    public string UserId { get; set; } = null!;

    public string? MucTieuId { get; set; }

    public string TenKeHoach { get; set; } = null!;

    public string? LoaiKeHoach { get; set; }

    public string? MucDo { get; set; }

    public int? SoTuan { get; set; }

    public int? SoBuoi { get; set; }

    public int? ThoiLuongPhut { get; set; }

    public double? CaloTieuHaoMoiBuoi { get; set; }

    public string? Nguon { get; set; }

    public bool? DangSuDung { get; set; }

    public DateTime? NgayTao { get; set; }

    public virtual ICollection<ChiTietKeHoachTapLuyen> ChiTietKeHoachTapLuyens { get; set; } = new List<ChiTietKeHoachTapLuyen>();

    public virtual MucTieu? MucTieu { get; set; }

    public virtual User User { get; set; } = null!;
}
