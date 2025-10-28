using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class NhacNho
{
    public int NhacNhoId { get; set; }

    public string UserId { get; set; } = null!;

    public DateTime ThoiGianNhac { get; set; }

    public string NoiDung { get; set; } = null!;

    public bool? KichHoat { get; set; }

    public string? DieuKienThoiTiet { get; set; }

    public DateTime? NgayTao { get; set; }

    public virtual User User { get; set; } = null!;
}
