using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class XepHang
{
    public int XepHangId { get; set; }

    public string UserId { get; set; } = null!;

    public string? ChuKy { get; set; }

    public int? TongDiem { get; set; }

    public int? ThuHang { get; set; }

    public DateOnly? NgayBatDauChuKy { get; set; }

    public DateOnly? NgayKetThucChuKy { get; set; }

    public DateTime? NgayCapNhat { get; set; }

    public virtual User User { get; set; } = null!;
}
