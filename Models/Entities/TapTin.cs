using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class TapTin
{
    public int TapTinId { get; set; }

    public string UserId { get; set; } = null!;

    public string TenTapTin { get; set; } = null!;

    public string TenLuuTrenServer { get; set; } = null!;

    public string DuongDan { get; set; } = null!;

    public long? KichThuoc { get; set; }

    public string? MimeType { get; set; }

    public string? LoaiFile { get; set; }

    public string? MucDich { get; set; }

    public DateTime? NgayUpload { get; set; }

    public bool? DaXoa { get; set; }

    public DateTime? NgayXoa { get; set; }

    public virtual User User { get; set; } = null!;
}
