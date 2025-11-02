using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class User
{
    public string UserId { get; set; } = null!;

    public string Username { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string? Role { get; set; }

    public string? Email { get; set; }

    public string? HoTen { get; set; }

    public DateOnly? NgaySinh { get; set; }

    public string? GioiTinh { get; set; }

    public string? AnhDaiDien { get; set; }

    public string? Theme { get; set; }

    public string? NgonNgu { get; set; }

    public string? TimeZone { get; set; }

    public string? ResetToken { get; set; }

    public DateTime? ResetTokenExpiry { get; set; }

    public DateTime? CreatedDate { get; set; }

    public virtual ICollection<AicanhBaoSucKhoe> AicanhBaoSucKhoes { get; set; } = new List<AicanhBaoSucKhoe>();

    public virtual ICollection<AigoiY> AigoiYs { get; set; } = new List<AigoiY>();

    public virtual ICollection<AiphanTichXuHuong> AiphanTichXuHuongs { get; set; } = new List<AiphanTichXuHuong>();

    public virtual ICollection<BanBe> BanBeNguoiNhans { get; set; } = new List<BanBe>();

    public virtual ICollection<BanBe> BanBeUsers { get; set; } = new List<BanBe>();

    public virtual ICollection<ChiaSeThanhTuu> ChiaSeThanhTuus { get; set; } = new List<ChiaSeThanhTuu>();

    public virtual ICollection<DanhGiaPt> DanhGiaPts { get; set; } = new List<DanhGiaPt>();

    public virtual ICollection<DatLichPt> DatLichPts { get; set; } = new List<DatLichPt>();

    public virtual ICollection<GiaoBaiTapChoUser> GiaoBaiTapChoUsers { get; set; } = new List<GiaoBaiTapChoUser>();

    public virtual ICollection<GiaoDich> GiaoDiches { get; set; } = new List<GiaoDich>();

    public virtual ICollection<GoiThanhVien> GoiThanhViens { get; set; } = new List<GoiThanhVien>();

    public virtual ICollection<HuanLuyenVien> HuanLuyenViens { get; set; } = new List<HuanLuyenVien>();

    public virtual ICollection<KeHoachTapLuyen> KeHoachTapLuyens { get; set; } = new List<KeHoachTapLuyen>();

    public virtual ICollection<LuotThichChiaSeThanhTuu> LuotThichChiaSeThanhTuus { get; set; } = new List<LuotThichChiaSeThanhTuu>();

    public virtual ICollection<LuuTruSucKhoe> LuuTruSucKhoes { get; set; } = new List<LuuTruSucKhoe>();

    public virtual ICollection<MucTieu> MucTieus { get; set; } = new List<MucTieu>();

    public virtual ICollection<NhacNho> NhacNhos { get; set; } = new List<NhacNho>();

    public virtual ICollection<NhatKyDinhDuong> NhatKyDinhDuongs { get; set; } = new List<NhatKyDinhDuong>();

    public virtual ICollection<NhatKyDongBo> NhatKyDongBos { get; set; } = new List<NhatKyDongBo>();

    public virtual ICollection<NhatKyHoanThanhBaiTap> NhatKyHoanThanhBaiTaps { get; set; } = new List<NhatKyHoanThanhBaiTap>();

    public virtual ICollection<NhatKyTamTrang> NhatKyTamTrangs { get; set; } = new List<NhatKyTamTrang>();

    public virtual ICollection<NhatKyThoiTiet> NhatKyThoiTiets { get; set; } = new List<NhatKyThoiTiet>();

    public virtual ICollection<NhatKyUngDung> NhatKyUngDungs { get; set; } = new List<NhatKyUngDung>();

    public virtual ICollection<PhanCongKeHoachAnUong> PhanCongKeHoachAnUongs { get; set; } = new List<PhanCongKeHoachAnUong>();

    public virtual ICollection<QuyenPtKhachHang> QuyenPtKhachHangs { get; set; } = new List<QuyenPtKhachHang>();

    public virtual ICollection<TapTin> TapTins { get; set; } = new List<TapTin>();

    public virtual ICollection<ThanhTuu> ThanhTuus { get; set; } = new List<ThanhTuu>();

    public virtual ICollection<ThongBao> ThongBaos { get; set; } = new List<ThongBao>();

    public virtual ICollection<TinNhan> TinNhanNguoiGuis { get; set; } = new List<TinNhan>();

    public virtual ICollection<TinNhan> TinNhanNguoiNhans { get; set; } = new List<TinNhan>();

    public virtual ICollection<XepHang> XepHangs { get; set; } = new List<XepHang>();
}
