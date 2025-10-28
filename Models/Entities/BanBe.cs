using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class BanBe
{
    public int BanBeId { get; set; }

    public string UserId { get; set; } = null!;

    public string NguoiNhanId { get; set; } = null!;

    public string? TrangThai { get; set; }

    public DateTime? NgayGui { get; set; }

    public DateTime? NgayChapNhan { get; set; }

    public virtual User NguoiNhan { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
