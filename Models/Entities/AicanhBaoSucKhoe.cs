using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class AicanhBaoSucKhoe
{
    public int CanhBaoId { get; set; }

    public string UserId { get; set; } = null!;

    public DateOnly? NgayCanhBao { get; set; }

    public string? LoaiRuiRo { get; set; }

    public string? MucDo { get; set; }

    public string? NoiDung { get; set; }

    public string? HanhDongDeXuat { get; set; }

    public bool? DaBoQua { get; set; }

    public DateTime? NgayBoQua { get; set; }

    public virtual User User { get; set; } = null!;
}
