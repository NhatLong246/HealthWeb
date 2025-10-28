using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class ChiTietKeHoachAnUong
{
    public int MonAnId { get; set; }

    public int KeHoachAnUongId { get; set; }

    public string? BuaAn { get; set; }

    public string TenMonAn { get; set; } = null!;

    public string? KhauPhan { get; set; }

    public int? LuongCalo { get; set; }

    public double? Protein { get; set; }

    public double? Carbs { get; set; }

    public double? ChatBeo { get; set; }

    public double? ChatXo { get; set; }

    public int? ThuTrongKeHoach { get; set; }

    public int? ThuTuHienThi { get; set; }

    public string? GhiChuCheBien { get; set; }

    public string? LinkCongThuc { get; set; }

    public virtual KeHoachAnUong KeHoachAnUong { get; set; } = null!;
}
