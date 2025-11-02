using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class Benh
{
    public string BenhId { get; set; } = null!;

    public string? TenBenh { get; set; }

    public virtual ICollection<LuuTruSucKhoe> LuuTruSucKhoes { get; set; } = new List<LuuTruSucKhoe>();
}
