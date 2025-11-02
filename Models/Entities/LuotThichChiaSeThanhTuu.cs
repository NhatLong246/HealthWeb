using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class LuotThichChiaSeThanhTuu
{
    public int ThichId { get; set; }

    public int ChiaSeId { get; set; }

    public string UserId { get; set; } = null!;

    public DateTime? NgayThich { get; set; }

    public virtual ChiaSeThanhTuu ChiaSe { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
