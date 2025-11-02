using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class TinNhan
{
    public int TinNhanId { get; set; }

    public string NguoiGuiId { get; set; } = null!;

    public string NguoiNhanId { get; set; } = null!;

    public string? DatLichId { get; set; }

    public string? NoiDung { get; set; }

    public bool? DaDoc { get; set; }

    public DateTime? NgayGui { get; set; }

    public virtual DatLichPt? DatLich { get; set; }

    public virtual User NguoiGui { get; set; } = null!;

    public virtual User NguoiNhan { get; set; } = null!;
}
