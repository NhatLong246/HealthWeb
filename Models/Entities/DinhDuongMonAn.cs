using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class DinhDuongMonAn
{
    public string MonAnId { get; set; } = null!;

    public string? TenMonAn { get; set; }

    public string? DonViTinh { get; set; }

    public string? HinhAnh { get; set; }

    public double? LuongCalo { get; set; }

    public double? Protein { get; set; }

    public double? ChatBeo { get; set; }

    public double? Carbohydrate { get; set; }

    public virtual ICollection<NhatKyDinhDuong> NhatKyDinhDuongs { get; set; } = new List<NhatKyDinhDuong>();
}
