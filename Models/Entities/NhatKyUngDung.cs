using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class NhatKyUngDung
{
    public int NhatKyId { get; set; }

    public string? UserId { get; set; }

    public DateTime? ThoiGian { get; set; }

    public string? MucDoLog { get; set; }

    public string NoiDung { get; set; } = null!;

    public virtual User? User { get; set; }
}
