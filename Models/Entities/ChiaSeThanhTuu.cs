using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class ChiaSeThanhTuu
{
    public int ChiaSeId { get; set; }

    public int ThanhTuuId { get; set; }

    public string NguoiChiaSe { get; set; } = null!;

    public DateTime? NgayChiaSe { get; set; }

    public string? DoiTuongXem { get; set; }

    public string? ChuThich { get; set; }

    public int? SoLuongThich { get; set; }

    public virtual ICollection<LuotThichChiaSeThanhTuu> LuotThichChiaSeThanhTuus { get; set; } = new List<LuotThichChiaSeThanhTuu>();

    public virtual User NguoiChiaSeNavigation { get; set; } = null!;

    public virtual ThanhTuu ThanhTuu { get; set; } = null!;
}
