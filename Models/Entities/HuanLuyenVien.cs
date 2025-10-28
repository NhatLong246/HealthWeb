using System;
using System.Collections.Generic;

namespace HealthWeb.Models.Entities;

public partial class HuanLuyenVien
{
    public string Ptid { get; set; } = null!;

    public string UserId { get; set; } = null!;

    public string? ChungChi { get; set; }

    public string? ChuyenMon { get; set; }

    public int? SoNamKinhNghiem { get; set; }

    public string? ThanhPho { get; set; }

    public double? GiaTheoGio { get; set; }

    public string? TieuSu { get; set; }

    public string? AnhDaiDien { get; set; }

    public string? AnhCccd { get; set; }

    public string? AnhChanDung { get; set; }

    public string? FileTaiLieu { get; set; }

    public bool? DaXacMinh { get; set; }

    public string? GioRanh { get; set; }

    public int? SoKhachHienTai { get; set; }

    public bool? NhanKhach { get; set; }

    public int? TongDanhGia { get; set; }

    public double? DiemTrungBinh { get; set; }

    public double? TiLeThanhCong { get; set; }

    public virtual ICollection<DanhGiaPt> DanhGiaPts { get; set; } = new List<DanhGiaPt>();

    public virtual ICollection<DatLichPt> DatLichPts { get; set; } = new List<DatLichPt>();

    public virtual ICollection<GiaoBaiTapChoUser> GiaoBaiTapChoUsers { get; set; } = new List<GiaoBaiTapChoUser>();

    public virtual ICollection<GiaoDich> GiaoDiches { get; set; } = new List<GiaoDich>();

    public virtual ICollection<KeHoachAnUong> KeHoachAnUongs { get; set; } = new List<KeHoachAnUong>();

    public virtual ICollection<MauTapLuyen> MauTapLuyens { get; set; } = new List<MauTapLuyen>();

    public virtual ICollection<PhanCongKeHoachAnUong> PhanCongKeHoachAnUongs { get; set; } = new List<PhanCongKeHoachAnUong>();

    public virtual ICollection<QuyenPtKhachHang> QuyenPtKhachHangs { get; set; } = new List<QuyenPtKhachHang>();

    public virtual User User { get; set; } = null!;
}
