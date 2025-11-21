using System;
using System.Collections.Generic;
using HealthWeb.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace HealthWeb.Models.EF;

public partial class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public virtual DbSet<AicanhBaoSucKhoe> AicanhBaoSucKhoes { get; set; }

    public virtual DbSet<AigoiY> AigoiYs { get; set; }

    public virtual DbSet<AiphanTichXuHuong> AiphanTichXuHuongs { get; set; }

    public virtual DbSet<BanBe> BanBes { get; set; }

    public virtual DbSet<Benh> Benhs { get; set; }

    public virtual DbSet<ChiTietKeHoachAnUong> ChiTietKeHoachAnUongs { get; set; }

    public virtual DbSet<ChiTietKeHoachTapLuyen> ChiTietKeHoachTapLuyens { get; set; }

    public virtual DbSet<ChiTietMauTapLuyen> ChiTietMauTapLuyens { get; set; }

    public virtual DbSet<ChiaSeThanhTuu> ChiaSeThanhTuus { get; set; }

    public virtual DbSet<DanhGiaPt> DanhGiaPts { get; set; }

    public virtual DbSet<DatLichPt> DatLichPts { get; set; }

    public virtual DbSet<DinhDuongMonAn> DinhDuongMonAns { get; set; }

    public virtual DbSet<GiaoBaiTapChoUser> GiaoBaiTapChoUsers { get; set; }

    public virtual DbSet<GiaoDich> GiaoDiches { get; set; }

    public virtual DbSet<GoiThanhVien> GoiThanhViens { get; set; }

    public virtual DbSet<HuanLuyenVien> HuanLuyenViens { get; set; }

    public virtual DbSet<KeHoachAnUong> KeHoachAnUongs { get; set; }

    public virtual DbSet<KeHoachTapLuyen> KeHoachTapLuyens { get; set; }

    public virtual DbSet<LuotThichChiaSeThanhTuu> LuotThichChiaSeThanhTuus { get; set; }

    public virtual DbSet<LuuTruSucKhoe> LuuTruSucKhoes { get; set; }

    public virtual DbSet<MauTapLuyen> MauTapLuyens { get; set; }

    public virtual DbSet<MucTieu> MucTieus { get; set; }

    public virtual DbSet<MucTieuChonBaiTap> MucTieuChonBaiTaps { get; set; }

    public virtual DbSet<NhacNho> NhacNhos { get; set; }

    public virtual DbSet<NhatKyDinhDuong> NhatKyDinhDuongs { get; set; }

    public virtual DbSet<NhatKyDongBo> NhatKyDongBos { get; set; }

    public virtual DbSet<NhatKyHoanThanhBaiTap> NhatKyHoanThanhBaiTaps { get; set; }

    public virtual DbSet<NhatKyTamTrang> NhatKyTamTrangs { get; set; }

    public virtual DbSet<NhatKyThoiTiet> NhatKyThoiTiets { get; set; }

    public virtual DbSet<NhatKyUngDung> NhatKyUngDungs { get; set; }

    public virtual DbSet<PhanCongKeHoachAnUong> PhanCongKeHoachAnUongs { get; set; }

    public virtual DbSet<QuyenPtKhachHang> QuyenPtKhachHangs { get; set; }

    public virtual DbSet<TapTin> TapTins { get; set; }

    public virtual DbSet<ThanhTuu> ThanhTuus { get; set; }

    public virtual DbSet<TheoDoiHoanThanhBaiTap> TheoDoiHoanThanhBaiTaps { get; set; }

    public virtual DbSet<ThongBao> ThongBaos { get; set; }

    public virtual DbSet<TinNhan> TinNhans { get; set; }

    public virtual DbSet<TinhNangGoi> TinhNangGois { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<XepHang> XepHangs { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            // Không cấu hình gì ở đây để tránh ghi đè connection string được truyền từ bên ngoài.
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AicanhBaoSucKhoe>(entity =>
        {
            entity.HasKey(e => e.CanhBaoId).HasName("PK__AICanhBa__DDF1CA276817F56C");

            entity.ToTable("AICanhBaoSucKhoe");

            entity.Property(e => e.CanhBaoId).HasColumnName("CanhBaoID");
            entity.Property(e => e.DaBoQua).HasDefaultValue(false);
            entity.Property(e => e.HanhDongDeXuat).HasMaxLength(500);
            entity.Property(e => e.LoaiRuiRo).HasMaxLength(50);
            entity.Property(e => e.MucDo).HasMaxLength(20);
            entity.Property(e => e.NgayBoQua).HasColumnType("datetime");
            entity.Property(e => e.NgayCanhBao).HasDefaultValueSql("(CONVERT([date],getdate()))");
            entity.Property(e => e.NoiDung).HasMaxLength(500);
            entity.Property(e => e.UserId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("UserID");

            entity.HasOne(d => d.User).WithMany(p => p.AicanhBaoSucKhoes)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_AICanhBaoSucKhoe_Users");
        });

        modelBuilder.Entity<AigoiY>(entity =>
        {
            entity.HasKey(e => e.GoiYid).HasName("PK__AIGoiY__55AEE427547236F8");

            entity.ToTable("AIGoiY");

            entity.Property(e => e.GoiYid).HasColumnName("GoiYID");
            entity.Property(e => e.DaHoanThanh).HasDefaultValue(false);
            entity.Property(e => e.NgayHoanThanh).HasColumnType("datetime");
            entity.Property(e => e.NoiDungGoiY).HasMaxLength(500);
            entity.Property(e => e.UserId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("UserID");

            entity.HasOne(d => d.User).WithMany(p => p.AigoiYs)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_AIGoiY_Users");
        });

        modelBuilder.Entity<AiphanTichXuHuong>(entity =>
        {
            entity.HasKey(e => e.PhanTichId).HasName("PK__AIPhanTi__EE2548ABF752978F");

            entity.ToTable("AIPhanTichXuHuong");

            entity.Property(e => e.PhanTichId).HasColumnName("PhanTichID");
            entity.Property(e => e.HuongXuHuong).HasMaxLength(20);
            entity.Property(e => e.LoaiChiSo).HasMaxLength(50);
            entity.Property(e => e.MucDo).HasMaxLength(20);
            entity.Property(e => e.NgayPhanTich).HasDefaultValueSql("(CONVERT([date],getdate()))");
            entity.Property(e => e.NhanXet).HasMaxLength(500);
            entity.Property(e => e.UserId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("UserID");

            entity.HasOne(d => d.User).WithMany(p => p.AiphanTichXuHuongs)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_AIPhanTichXuHuong_Users");
        });

        modelBuilder.Entity<BanBe>(entity =>
        {
            entity.HasKey(e => e.BanBeId).HasName("PK__BanBe__94BB58318DD3F6AF");

            entity.ToTable("BanBe");

            entity.HasIndex(e => new { e.UserId, e.NguoiNhanId }, "UK_BanBe").IsUnique();

            entity.Property(e => e.BanBeId).HasColumnName("BanBeID");
            entity.Property(e => e.NgayChapNhan).HasColumnType("datetime");
            entity.Property(e => e.NgayGui)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.NguoiNhanId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("NguoiNhanID");
            entity.Property(e => e.TrangThai)
                .HasMaxLength(20)
                .HasDefaultValue("Pending");
            entity.Property(e => e.UserId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("UserID");

            entity.HasOne(d => d.NguoiNhan).WithMany(p => p.BanBeNguoiNhans)
                .HasForeignKey(d => d.NguoiNhanId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_BanBe_NguoiNhan");

            entity.HasOne(d => d.User).WithMany(p => p.BanBeUsers)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_BanBe_User");
        });

        modelBuilder.Entity<Benh>(entity =>
        {
            entity.HasKey(e => e.BenhId).HasName("PK__Benh__145E310C88A28159");

            entity.ToTable("Benh");

            entity.Property(e => e.BenhId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("BenhID");
            entity.Property(e => e.TenBenh).HasMaxLength(200);
        });

        modelBuilder.Entity<ChiTietKeHoachAnUong>(entity =>
        {
            entity.HasKey(e => e.MonAnId).HasName("PK__ChiTietK__272259EF6D8FD2D2");

            entity.ToTable("ChiTietKeHoachAnUong");

            entity.Property(e => e.MonAnId).HasColumnName("MonAnID");
            entity.Property(e => e.BuaAn).HasMaxLength(20);
            entity.Property(e => e.GhiChuCheBien).HasMaxLength(500);
            entity.Property(e => e.KeHoachAnUongId).HasColumnName("KeHoachAnUongID");
            entity.Property(e => e.KhauPhan).HasMaxLength(50);
            entity.Property(e => e.LinkCongThuc).HasMaxLength(500);
            entity.Property(e => e.TenMonAn).HasMaxLength(100);
            entity.Property(e => e.ThuTuHienThi).HasDefaultValue(0);

            entity.HasOne(d => d.KeHoachAnUong).WithMany(p => p.ChiTietKeHoachAnUongs)
                .HasForeignKey(d => d.KeHoachAnUongId)
                .HasConstraintName("FK_ChiTietKeHoachAnUong_KeHoachAnUong");
        });

        modelBuilder.Entity<ChiTietKeHoachTapLuyen>(entity =>
        {
            entity.HasKey(e => e.ChiTietId).HasName("PK__ChiTietK__B117E9EAB53E7106");

            entity.ToTable("ChiTietKeHoachTapLuyen");

            entity.HasIndex(e => e.NgayTap, "IX_ChiTietKeHoachTapLuyen_NgayTap")
                .HasFilter("[NgayTap] IS NOT NULL");

            entity.Property(e => e.ChiTietId).HasColumnName("ChiTietID");
            entity.Property(e => e.CanhBao).HasMaxLength(500);
            entity.Property(e => e.HuongDan).HasMaxLength(1000);
            entity.Property(e => e.KeHoachId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("KeHoachID");
            entity.Property(e => e.NoiDung).HasMaxLength(1000);
            entity.Property(e => e.TenBaiTap).HasMaxLength(100);
            entity.Property(e => e.ThuTuHienThi).HasDefaultValue(0);
            entity.Property(e => e.VideoUrl).HasMaxLength(500);

            entity.HasOne(d => d.KeHoach).WithMany(p => p.ChiTietKeHoachTapLuyens)
                .HasForeignKey(d => d.KeHoachId)
                .HasConstraintName("FK_ChiTietKeHoachTapLuyen_KeHoachTapLuyen");
        });

        modelBuilder.Entity<ChiTietMauTapLuyen>(entity =>
        {
            entity.HasKey(e => e.BaiTapId).HasName("PK__ChiTietM__48494B656F76728F");

            entity.ToTable("ChiTietMauTapLuyen");

            entity.Property(e => e.BaiTapId).HasColumnName("BaiTapID");
            entity.Property(e => e.GhiChu).HasMaxLength(500);
            entity.Property(e => e.MauTapLuyenId).HasColumnName("MauTapLuyenID");
            entity.Property(e => e.TenbaiTap).HasMaxLength(100);
            entity.Property(e => e.ThuTuHienThi).HasDefaultValue(0);
            entity.Property(e => e.VideoUrl).HasMaxLength(500);

            entity.HasOne(d => d.MauTapLuyen).WithMany(p => p.ChiTietMauTapLuyens)
                .HasForeignKey(d => d.MauTapLuyenId)
                .HasConstraintName("FK_ChiTietMauTapLuyen_MauTapLuyen");
        });

        modelBuilder.Entity<ChiaSeThanhTuu>(entity =>
        {
            entity.HasKey(e => e.ChiaSeId).HasName("PK__ChiaSeTh__8DACC7F3A93B62CC");

            entity.ToTable("ChiaSeThanhTuu");

            entity.Property(e => e.ChiaSeId).HasColumnName("ChiaSeID");
            entity.Property(e => e.ChuThich).HasMaxLength(500);
            entity.Property(e => e.DoiTuongXem)
                .HasMaxLength(20)
                .HasDefaultValue("Friends");
            entity.Property(e => e.NgayChiaSe)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.NguoiChiaSe)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.SoLuongThich).HasDefaultValue(0);
            entity.Property(e => e.ThanhTuuId).HasColumnName("ThanhTuuID");

            entity.HasOne(d => d.NguoiChiaSeNavigation).WithMany(p => p.ChiaSeThanhTuus)
                .HasForeignKey(d => d.NguoiChiaSe)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ChiaSeThanhTuu_User");

            entity.HasOne(d => d.ThanhTuu).WithMany(p => p.ChiaSeThanhTuus)
                .HasForeignKey(d => d.ThanhTuuId)
                .HasConstraintName("FK_ChiaSeThanhTuu_ThanhTuu");
        });

        modelBuilder.Entity<DanhGiaPt>(entity =>
        {
            entity.HasKey(e => e.DanhGiaId).HasName("PK__DanhGiaP__52C0CA25FEB4A737");

            entity.ToTable("DanhGiaPT");

            entity.HasIndex(e => new { e.KhachHangId, e.Ptid }, "UK_DanhGiaPT_ClientTrainer").IsUnique();

            entity.Property(e => e.DanhGiaId).HasColumnName("DanhGiaID");
            entity.Property(e => e.BinhLuan).HasMaxLength(500);
            entity.Property(e => e.KhachHangId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("KhachHangID");
            entity.Property(e => e.NgayDanhGia)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Ptid)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("PTID");

            entity.HasOne(d => d.KhachHang).WithMany(p => p.DanhGiaPts)
                .HasForeignKey(d => d.KhachHangId)
                .HasConstraintName("FK_DanhGiaPTs_Client");

            entity.HasOne(d => d.Pt).WithMany(p => p.DanhGiaPts)
                .HasForeignKey(d => d.Ptid)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DanhGiaPT_Trainer");
        });

        modelBuilder.Entity<DatLichPt>(entity =>
        {
            entity.HasKey(e => e.DatLichId).HasName("PK__DatLichP__F5D06B9F5B5F4186");

            entity.ToTable("DatLichPT");

            entity.Property(e => e.DatLichId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("DatLichID");
            entity.Property(e => e.ChoXemSucKhoe).HasDefaultValue(false);
            entity.Property(e => e.GhiChu).HasMaxLength(500);
            entity.Property(e => e.KhacHangId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("KhacHangID");
            entity.Property(e => e.LoaiBuoiTap).HasMaxLength(50);
            entity.Property(e => e.LyDoTuChoi).HasMaxLength(500);
            entity.Property(e => e.NgayGioDat).HasColumnType("datetime");
            entity.Property(e => e.NgayTao)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.NguoiHuy)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Ptid)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("PTID");
            entity.Property(e => e.TrangThai)
                .HasMaxLength(20)
                .HasDefaultValue("Pending");

            entity.HasOne(d => d.KhacHang).WithMany(p => p.DatLichPts)
                .HasForeignKey(d => d.KhacHangId)
                .HasConstraintName("FK_DatLichPT_KhachHang");

            entity.HasOne(d => d.Pt).WithMany(p => p.DatLichPts)
                .HasForeignKey(d => d.Ptid)
                .HasConstraintName("FK_DatLichPT_HuanLuyenVien");
        });

        modelBuilder.Entity<DinhDuongMonAn>(entity =>
        {
            entity.HasKey(e => e.MonAnId).HasName("PK__DinhDuon__272259EF27D9E65A");

            entity.ToTable("DinhDuongMonAn");

            entity.Property(e => e.MonAnId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("MonAnID");
            entity.Property(e => e.DonViTinh).HasMaxLength(20);
            entity.Property(e => e.HinhAnh)
                .HasMaxLength(200)
                .IsUnicode(false);
            entity.Property(e => e.TenMonAn)
                .HasMaxLength(200)
                .IsUnicode(true); // Đổi thành true để hỗ trợ Unicode (tiếng Việt)
        });

        modelBuilder.Entity<GiaoBaiTapChoUser>(entity =>
        {
            entity.HasKey(e => e.GiaBtId).HasName("PK__GiaoBaiT__B72954648CB1D210");

            entity.ToTable("GiaoBaiTapChoUser");

            entity.Property(e => e.GiaBtId).HasColumnName("GiaBtID");
            entity.Property(e => e.MauTapLuyenId).HasColumnName("MauTapLuyenID");
            entity.Property(e => e.NgayGiao)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.NguoiGiao)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.TiLeHoanThanh).HasDefaultValue(0.0);
            entity.Property(e => e.TrangThai)
                .HasMaxLength(20)
                .HasDefaultValue("Active");
            entity.Property(e => e.TuanHienTai).HasDefaultValue(1);
            entity.Property(e => e.UserId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("UserID");
            entity.Property(e => e.DatLichId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("DatLichID");

            entity.HasOne(d => d.MauTapLuyen).WithMany(p => p.GiaoBaiTapChoUsers)
                .HasForeignKey(d => d.MauTapLuyenId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GiaoBaiTapChoUser_MauTapLuyen");

            entity.HasOne(d => d.NguoiGiaoNavigation).WithMany(p => p.GiaoBaiTapChoUsers)
                .HasForeignKey(d => d.NguoiGiao)
                .HasConstraintName("FK_GiaoBaiTapChoUser_NguoiGiao");

            entity.HasOne(d => d.User).WithMany(p => p.GiaoBaiTapChoUsers)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_GiaoBaiTapChoUser_User");

            entity.HasOne(d => d.DatLich).WithMany()
                .HasForeignKey(d => d.DatLichId)
                .OnDelete(DeleteBehavior.NoAction) 
                .HasConstraintName("FK_GiaoBaiTapChoUser_DatLichPT");
        });

        modelBuilder.Entity<GiaoDich>(entity =>
        {
            entity.HasKey(e => e.GiaoDichId).HasName("PK__GiaoDich__D8D14B31A884D595");

            entity.ToTable("GiaoDich");

            entity.HasIndex(e => e.DatLichId, "UQ_GiaoDich_DatLichPT").IsUnique();

            entity.Property(e => e.GiaoDichId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("GiaoDichID");
            entity.Property(e => e.DatLichId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("DatLichID");
            entity.Property(e => e.KhachHangId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("KhachHangID");
            entity.Property(e => e.NgayGiaoDich)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.PhuongThucThanhToan).HasMaxLength(50);
            entity.Property(e => e.Ptid)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("PTID");
            entity.Property(e => e.SoTienPtnhan).HasColumnName("SoTienPTNhan");
            entity.Property(e => e.TrangThaiThanhToan)
                .HasMaxLength(20)
                .HasDefaultValue("Pending");

            entity.HasOne(d => d.DatLich).WithOne(p => p.GiaoDich)
                .HasForeignKey<GiaoDich>(d => d.DatLichId)
                .HasConstraintName("FK_GiaoDich_DatLichPT");

            entity.HasOne(d => d.KhachHang).WithMany(p => p.GiaoDiches)
                .HasForeignKey(d => d.KhachHangId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GiaoDich_KhachHang");

            entity.HasOne(d => d.Pt).WithMany(p => p.GiaoDiches)
                .HasForeignKey(d => d.Ptid)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_GiaoDich_HLV");
        });

        modelBuilder.Entity<GoiThanhVien>(entity =>
        {
            entity.HasKey(e => e.GoiThanhVienId).HasName("PK__GoiThanh__DEE8F32774AB5FEC");

            entity.ToTable("GoiThanhVien");

            entity.Property(e => e.GoiThanhVienId).HasColumnName("GoiThanhVienID");
            entity.Property(e => e.ChuKyThanhToan).HasMaxLength(20);
            entity.Property(e => e.LoaiGoi).HasMaxLength(20);
            entity.Property(e => e.LyDoHuy).HasMaxLength(500);
            entity.Property(e => e.NgayDangKy)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.NgayHuy).HasColumnType("datetime");
            entity.Property(e => e.PhuongThucThanhToan).HasMaxLength(50);
            entity.Property(e => e.TrangThai)
                .HasMaxLength(20)
                .HasDefaultValue("Active");
            entity.Property(e => e.TuDongGiaHan).HasDefaultValue(true);
            entity.Property(e => e.UserId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("UserID");

            entity.HasOne(d => d.User).WithMany(p => p.GoiThanhViens)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_GoiThanhVien_User");
        });

        modelBuilder.Entity<HuanLuyenVien>(entity =>
        {
            entity.HasKey(e => e.Ptid).HasName("PK__HuanLuye__BCC07F4FC4B715B7");

            entity.ToTable("HuanLuyenVien");

            entity.Property(e => e.Ptid)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("PTID");
            entity.Property(e => e.AnhCccd)
                .HasMaxLength(255)
                .HasColumnName("AnhCCCD");
            entity.Property(e => e.AnhChanDung).HasMaxLength(255);
            entity.Property(e => e.AnhDaiDien).HasMaxLength(255);
            entity.Property(e => e.ChungChi).HasMaxLength(500);
            entity.Property(e => e.ChuyenMon).HasMaxLength(200);
            entity.Property(e => e.DaXacMinh).HasDefaultValue(false);
            entity.Property(e => e.FileTaiLieu).HasMaxLength(255);
            entity.Property(e => e.GioRanh).HasMaxLength(500);
            entity.Property(e => e.NhanKhach).HasDefaultValue(true);
            entity.Property(e => e.SoKhachHienTai).HasDefaultValue(0);
            entity.Property(e => e.ThanhPho).HasMaxLength(50);
            entity.Property(e => e.TieuSu).HasMaxLength(1000);
            entity.Property(e => e.UserId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("UserID");

            entity.HasOne(d => d.User).WithMany(p => p.HuanLuyenViens)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_HuanLuyenVien_Users");
        });

        modelBuilder.Entity<KeHoachAnUong>(entity =>
        {
            entity.HasKey(e => e.KeHoachAnUongId).HasName("PK__KeHoachA__3E693E115026F1B0");

            entity.ToTable("KeHoachAnUong");

            entity.Property(e => e.KeHoachAnUongId).HasColumnName("KeHoachAnUongID");
            entity.Property(e => e.CanhBaoDiUng).HasMaxLength(200);
            entity.Property(e => e.CongKhai).HasDefaultValue(false);
            entity.Property(e => e.DaXacThuc).HasDefaultValue(false);
            entity.Property(e => e.LoaiKeHoach).HasMaxLength(50);
            entity.Property(e => e.MoTa).HasMaxLength(500);
            entity.Property(e => e.NgayChinhSua)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.NgayTao)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.NguoiTao)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.SoLanSuDung).HasDefaultValue(0);
            entity.Property(e => e.TenKeHoach).HasMaxLength(100);
            entity.Property(e => e.TiLeMacro).HasMaxLength(50);

            entity.HasOne(d => d.NguoiTaoNavigation).WithMany(p => p.KeHoachAnUongs)
                .HasForeignKey(d => d.NguoiTao)
                .HasConstraintName("FK_KeHoachAnUong_NguoiTao");
        });

        modelBuilder.Entity<KeHoachTapLuyen>(entity =>
        {
            entity.HasKey(e => e.KeHoachId).HasName("PK__KeHoachT__3E9CDCA1A4D5B09B");

            entity.ToTable("KeHoachTapLuyen");

            entity.Property(e => e.KeHoachId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("KeHoachID");
            entity.Property(e => e.DangSuDung).HasDefaultValue(true);
            entity.Property(e => e.LoaiKeHoach).HasMaxLength(50);
            entity.Property(e => e.MucDo).HasMaxLength(20);
            entity.Property(e => e.MucTieuId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("MucTieuID");
            entity.Property(e => e.NgayTao)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Nguon).HasMaxLength(20);
            entity.Property(e => e.TenKeHoach).HasMaxLength(100);
            entity.Property(e => e.UserId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("UserID");

            entity.HasOne(d => d.MucTieu).WithMany(p => p.KeHoachTapLuyens)
                .HasForeignKey(d => d.MucTieuId)
                .HasConstraintName("FK_KeHoachTapLuyen_Goals");

            entity.HasOne(d => d.User).WithMany(p => p.KeHoachTapLuyens)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_KeHoachTapLuyen_Users");
        });

        modelBuilder.Entity<LuotThichChiaSeThanhTuu>(entity =>
        {
            entity.HasKey(e => e.ThichId).HasName("PK__LuotThic__D7AEC3D4E3841E48");

            entity.ToTable("LuotThichChiaSeThanhTuu");

            entity.HasIndex(e => new { e.ChiaSeId, e.UserId }, "UK_Like").IsUnique();

            entity.Property(e => e.ThichId).HasColumnName("ThichID");
            entity.Property(e => e.ChiaSeId).HasColumnName("ChiaSeID");
            entity.Property(e => e.NgayThich)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.UserId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("UserID");

            entity.HasOne(d => d.ChiaSe).WithMany(p => p.LuotThichChiaSeThanhTuus)
                .HasForeignKey(d => d.ChiaSeId)
                .HasConstraintName("FK_LuotThichChiaSeThanhTuu_ChiaSe");

            entity.HasOne(d => d.User).WithMany(p => p.LuotThichChiaSeThanhTuus)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LuotThichChiaSeThanhTuu_User");
        });

        modelBuilder.Entity<LuuTruSucKhoe>(entity =>
        {
            entity.HasKey(e => e.MaBanGhi).HasName("PK__LuuTruSu__49DB9535ED4C5F30");

            entity.ToTable("LuuTruSucKhoe", tb => tb.HasTrigger("TR_TinhBMI"));

            entity.HasIndex(e => new { e.UserId, e.NgayGhiNhan }, "UK_LuuTruSucKhoe").IsUnique();

            entity.Property(e => e.MaBanGhi)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.BenhId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("BenhID");
            entity.Property(e => e.Bmi).HasColumnName("BMI");
            entity.Property(e => e.CaloTieuThu).HasDefaultValue(0.0);
            entity.Property(e => e.GhiChu).HasMaxLength(500);
            entity.Property(e => e.LuongNuocUong).HasDefaultValue(0.0);
            entity.Property(e => e.SoBuoc).HasDefaultValue(0);
            entity.Property(e => e.SoGioNgu).HasDefaultValue(0.0);
            entity.Property(e => e.UserId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("UserID");

            entity.HasOne(d => d.Benh).WithMany(p => p.LuuTruSucKhoes)
                .HasForeignKey(d => d.BenhId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("FK_LuuTruSucKhoe_Benh");

            entity.HasOne(d => d.User).WithMany(p => p.LuuTruSucKhoes)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_LuuTruSucKhoe_Users");
        });

        modelBuilder.Entity<MauTapLuyen>(entity =>
        {
            entity.HasKey(e => e.MauTapLuyenId).HasName("PK__MauTapLu__C83D4803729C1D6F");

            entity.ToTable("MauTapLuyen");

            entity.Property(e => e.MauTapLuyenId).HasColumnName("MauTapLuyenID");
            entity.Property(e => e.CongKhai).HasDefaultValue(false);
            entity.Property(e => e.DaXacThuc).HasDefaultValue(false);
            entity.Property(e => e.DoKho).HasMaxLength(20);
            entity.Property(e => e.MoTa).HasMaxLength(500);
            entity.Property(e => e.MucTieu).HasMaxLength(50);
            entity.Property(e => e.NgayChinhSua)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.NgayTao)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.NguoiTao)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.SoLanSuDung).HasDefaultValue(0);
            entity.Property(e => e.TenMauTapLuyen).HasMaxLength(100);
            entity.Property(e => e.ThietBiCan).HasMaxLength(200);

            entity.HasOne(d => d.NguoiTaoNavigation).WithMany(p => p.MauTapLuyens)
                .HasForeignKey(d => d.NguoiTao)
                .HasConstraintName("FK_MauTapLuyen_HLV");
        });

        modelBuilder.Entity<MucTieu>(entity =>
        {
            entity.HasKey(e => e.MucTieuId).HasName("PK__MucTieu__2190967492433D75");

            entity.ToTable("MucTieu");

            entity.Property(e => e.MucTieuId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("MucTieuID");
            entity.Property(e => e.DaHoanThanh).HasDefaultValue(false);
            entity.Property(e => e.GhiChu).HasMaxLength(500);
            entity.Property(e => e.LoaiMucTieu).HasMaxLength(50);
            entity.Property(e => e.ThuTuHienThi).HasDefaultValue(0);
            entity.Property(e => e.TienDoHienTai).HasDefaultValue(0.0);
            entity.Property(e => e.UserId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("UserID");

            entity.HasOne(d => d.User).WithMany(p => p.MucTieus)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_MucTieu_Users");
        });

        modelBuilder.Entity<MucTieuChonBaiTap>(entity =>
        {
            entity.HasKey(e => e.ChonBaiTapId).HasName("PK_MucTieuChonBaiTap");

            entity.ToTable("MucTieuChonBaiTap");

            entity.Property(e => e.ChonBaiTapId).HasColumnName("ChonBaiTapID");
            entity.Property(e => e.MucTieuId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("MucTieuId");
            entity.Property(e => e.MauTapLuyenId).HasColumnName("MauTapLuyenId");
            entity.Property(e => e.ThuTuHienThi).HasDefaultValue(0);
            entity.Property(e => e.DaLapLich).HasDefaultValue(false);
            entity.Property(e => e.NgayChon)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");

            // PHẢI chỉ định rõ ràng navigation property để tránh EF tạo shadow properties
            entity.HasOne(d => d.MucTieu)
                .WithMany(p => p.MucTieuChonBaiTaps)  // ✅ Chỉ định navigation property từ MucTieu
                .HasForeignKey(d => d.MucTieuId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_MucTieuChonBaiTap_MucTieu");

            entity.HasOne(d => d.MauTapLuyen)
                .WithMany(p => p.MucTieuChonBaiTaps)  // ✅ Chỉ định navigation property từ MauTapLuyen
                .HasForeignKey(d => d.MauTapLuyenId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_MucTieuChonBaiTap_MauTapLuyen");

            entity.HasIndex(e => new { e.MucTieuId, e.MauTapLuyenId })
                .IsUnique()
                .HasDatabaseName("UK_MucTieuChonBaiTap");
        });

        modelBuilder.Entity<NhacNho>(entity =>
        {
            entity.HasKey(e => e.NhacNhoId).HasName("PK__NhacNho__969E202414656086");

            entity.ToTable("NhacNho");

            entity.Property(e => e.NhacNhoId).HasColumnName("NhacNhoID");
            entity.Property(e => e.DieuKienThoiTiet).HasMaxLength(50);
            entity.Property(e => e.KichHoat).HasDefaultValue(true);
            entity.Property(e => e.NgayTao)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.NoiDung).HasMaxLength(200);
            entity.Property(e => e.ThoiGianNhac).HasColumnType("datetime");
            entity.Property(e => e.UserId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("UserID");

            entity.HasOne(d => d.User).WithMany(p => p.NhacNhos)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_NhacNho_Users");
        });

        modelBuilder.Entity<NhatKyDinhDuong>(entity =>
        {
            entity.HasKey(e => e.DinhDuongId).HasName("PK__NhatKyDi__560354F3B40480BE");

            entity.ToTable("NhatKyDinhDuong");

            entity.Property(e => e.DinhDuongId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("DinhDuongID");
            entity.Property(e => e.GhiChu).HasMaxLength(500);
            entity.Property(e => e.MonAnId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("MonAnID");
            entity.Property(e => e.UserId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("UserID");

            entity.HasOne(d => d.MonAn).WithMany(p => p.NhatKyDinhDuongs)
                .HasForeignKey(d => d.MonAnId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_NhatKyDinhDuong_MonAn");

            entity.HasOne(d => d.User).WithMany(p => p.NhatKyDinhDuongs)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_NhatKyDinhDuong_Users");
        });

        modelBuilder.Entity<NhatKyDongBo>(entity =>
        {
            entity.HasKey(e => e.DongBoId).HasName("PK__NhatKyDo__E4527EA2B6C91C02");

            entity.ToTable("NhatKyDongBo");

            entity.Property(e => e.DongBoId).HasColumnName("DongBoID");
            entity.Property(e => e.ChiTiet).HasMaxLength(500);
            entity.Property(e => e.NgayDongBo)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.NoiDongBo).HasMaxLength(50);
            entity.Property(e => e.TrangThaiDongBo).HasMaxLength(20);
            entity.Property(e => e.UserId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("UserID");

            entity.HasOne(d => d.User).WithMany(p => p.NhatKyDongBos)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_NhatKyDongBo_Users");
        });

        modelBuilder.Entity<NhatKyHoanThanhBaiTap>(entity =>
        {
            entity.HasKey(e => e.NhatKyId).HasName("PK__NhatKyHo__DF38EB8FBF6BC92F");

            entity.ToTable("NhatKyHoanThanhBaiTap");

            entity.HasIndex(e => new { e.UserId, e.ChiTietId, e.NgayHoanThanh }, "UK_NhatKyHoanThanhBaiTap").IsUnique();

            entity.Property(e => e.NhatKyId).HasColumnName("NhatKyID");
            entity.Property(e => e.ChiTietId).HasColumnName("ChiTietID");
            entity.Property(e => e.GhiChu).HasMaxLength(500);
            entity.Property(e => e.UserId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("UserID");

            entity.HasOne(d => d.ChiTiet).WithMany(p => p.NhatKyHoanThanhBaiTaps)
                .HasForeignKey(d => d.ChiTietId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_NhatKyHoanThanhBaiTap_ChiTietKeHoachTapLuyen");

            entity.HasOne(d => d.User).WithMany(p => p.NhatKyHoanThanhBaiTaps)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_NhatKyHoanThanhBaiTap_Users");
        });

        modelBuilder.Entity<NhatKyTamTrang>(entity =>
        {
            entity.HasKey(e => e.TamTrangId).HasName("PK__NhatKyTa__6BC7760F70A4697F");

            entity.ToTable("NhatKyTamTrang");

            entity.HasIndex(e => new { e.UserId, e.NgayGhi }, "UK_NhatKyTamTrang").IsUnique();

            entity.Property(e => e.TamTrangId).HasColumnName("TamTrangID");
            entity.Property(e => e.GhiChu).HasMaxLength(500);
            entity.Property(e => e.TamTrang).HasMaxLength(50);
            entity.Property(e => e.UserId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("UserID");

            entity.HasOne(d => d.User).WithMany(p => p.NhatKyTamTrangs)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_NhatKyTamTrang_Users");
        });

        modelBuilder.Entity<NhatKyThoiTiet>(entity =>
        {
            entity.HasKey(e => e.ThoiTietId).HasName("PK__NhatKyTh__EE89634DC0B3F9A4");

            entity.ToTable("NhatKyThoiTiet");

            entity.Property(e => e.ThoiTietId).HasColumnName("ThoiTietID");
            entity.Property(e => e.GoiY).HasMaxLength(200);
            entity.Property(e => e.ThanhPho).HasMaxLength(50);
            entity.Property(e => e.TinhTrang).HasMaxLength(50);
            entity.Property(e => e.UserId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("UserID");

            entity.HasOne(d => d.User).WithMany(p => p.NhatKyThoiTiets)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_NhatKyThoiTiet_Users");
        });

        modelBuilder.Entity<NhatKyUngDung>(entity =>
        {
            entity.HasKey(e => e.NhatKyId).HasName("PK__NhatKyUn__DF38EB8FB9B17961");

            entity.ToTable("NhatKyUngDung");

            entity.Property(e => e.NhatKyId).HasColumnName("NhatKyID");
            entity.Property(e => e.MucDoLog).HasMaxLength(20);
            entity.Property(e => e.ThoiGian)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.UserId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("UserID");

            entity.HasOne(d => d.User).WithMany(p => p.NhatKyUngDungs)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_NhatKyUngDung_Users");
        });

        modelBuilder.Entity<PhanCongKeHoachAnUong>(entity =>
        {
            entity.HasKey(e => e.PhanCongId).HasName("PK__PhanCong__7EF840DD7E06EB88");

            entity.ToTable("PhanCongKeHoachAnUong");

            entity.Property(e => e.PhanCongId).HasColumnName("PhanCongID");
            entity.Property(e => e.KeHoachAnUongId).HasColumnName("KeHoachAnUongID");
            entity.Property(e => e.NgayGiao)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.NgayHienTai).HasDefaultValue(1);
            entity.Property(e => e.NguoiGiao)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.TiLeTuanThu).HasDefaultValue(0.0);
            entity.Property(e => e.TrangThai)
                .HasMaxLength(20)
                .HasDefaultValue("Active");
            entity.Property(e => e.UserId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("UserID");

            entity.HasOne(d => d.KeHoachAnUong).WithMany(p => p.PhanCongKeHoachAnUongs)
                .HasForeignKey(d => d.KeHoachAnUongId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_PhanCongKeHoachAnUong_KeHoachAnUong");

            entity.HasOne(d => d.NguoiGiaoNavigation).WithMany(p => p.PhanCongKeHoachAnUongs)
                .HasForeignKey(d => d.NguoiGiao)
                .HasConstraintName("FK_PhanCongKeHoachAnUong_NguoiGiao");

            entity.HasOne(d => d.User).WithMany(p => p.PhanCongKeHoachAnUongs)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_PhanCongKeHoachAnUong_User");
        });

        modelBuilder.Entity<QuyenPtKhachHang>(entity =>
        {
            entity.HasKey(e => e.QuyenId).HasName("PK__QuyenPT___12926E0CA057F8F3");

            entity.ToTable("QuyenPT_KhachHang");

            entity.HasIndex(e => new { e.KhachHangId, e.Ptid }, "UK_ClientPTAccess").IsUnique();

            entity.Property(e => e.QuyenId).HasColumnName("QuyenID");
            entity.Property(e => e.DangHoatDong).HasDefaultValue(true);
            entity.Property(e => e.KhachHangId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("KhachHangID");
            entity.Property(e => e.NgayCapQuyen)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Ptid)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("PTID");

            entity.HasOne(d => d.KhachHang).WithMany(p => p.QuyenPtKhachHangs)
                .HasForeignKey(d => d.KhachHangId)
                .HasConstraintName("FK_QuyenPT_KhachHang_KhachHang");

            entity.HasOne(d => d.Pt).WithMany(p => p.QuyenPtKhachHangs)
                .HasForeignKey(d => d.Ptid)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_QuyenPT_KhachHang_HLV");
        });

        modelBuilder.Entity<TapTin>(entity =>
        {
            entity.HasKey(e => e.TapTinId).HasName("PK__TapTin__D8F29D36812C9FE7");

            entity.ToTable("TapTin");

            entity.HasIndex(e => e.TenLuuTrenServer, "UQ__TapTin__DB6F45005E3333D5").IsUnique();

            entity.Property(e => e.TapTinId).HasColumnName("TapTinID");
            entity.Property(e => e.DaXoa).HasDefaultValue(false);
            entity.Property(e => e.DuongDan).HasMaxLength(500);
            entity.Property(e => e.LoaiFile).HasMaxLength(50);
            entity.Property(e => e.MimeType).HasMaxLength(100);
            entity.Property(e => e.MucDich).HasMaxLength(50);
            entity.Property(e => e.NgayUpload)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.NgayXoa).HasColumnType("datetime");
            entity.Property(e => e.TenLuuTrenServer).HasMaxLength(255);
            entity.Property(e => e.TenTapTin).HasMaxLength(255);
            entity.Property(e => e.UserId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("UserID");

            entity.HasOne(d => d.User).WithMany(p => p.TapTins)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_TapTin_Users");
        });

        modelBuilder.Entity<ThanhTuu>(entity =>
        {
            entity.HasKey(e => e.ThanhTuuId).HasName("PK__ThanhTuu__94C474078398EF43");

            entity.ToTable("ThanhTuu");

            entity.Property(e => e.ThanhTuuId).HasColumnName("ThanhTuuID");
            entity.Property(e => e.Diem).HasDefaultValue(0);
            entity.Property(e => e.MoTa).HasMaxLength(200);
            entity.Property(e => e.NgayDatDuoc)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.TenBadge).HasMaxLength(50);
            entity.Property(e => e.UserId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("UserID");

            entity.HasOne(d => d.User).WithMany(p => p.ThanhTuus)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_ThanhTuu_Users");
        });

        modelBuilder.Entity<TheoDoiHoanThanhBaiTap>(entity =>
        {
            entity.HasKey(e => e.TheoDoiId).HasName("PK__TheoDoiH__32D1ADBC6E57C2E8");

            entity.ToTable("TheoDoiHoanThanhBaiTap");

            entity.Property(e => e.TheoDoiId).HasColumnName("TheoDoiID");
            entity.Property(e => e.BaiTapId).HasColumnName("BaiTapID");
            entity.Property(e => e.GhiChu).HasMaxLength(500);
            entity.Property(e => e.GiaBtId).HasColumnName("GiaBtID");

            entity.HasOne(d => d.BaiTap).WithMany(p => p.TheoDoiHoanThanhBaiTaps)
                .HasForeignKey(d => d.BaiTapId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TheoDoiHoanThanhBaiTap_Exercise");

            entity.HasOne(d => d.GiaBt).WithMany(p => p.TheoDoiHoanThanhBaiTaps)
                .HasForeignKey(d => d.GiaBtId)
                .HasConstraintName("FK_TheoDoiHoanThanhBaiTap_Assignment");
        });

        modelBuilder.Entity<ThongBao>(entity =>
        {
            entity.HasKey(e => e.ThongBaoId).HasName("PK__ThongBao__6E51A53B0FDD98D5");

            entity.ToTable("ThongBao");

            entity.Property(e => e.ThongBaoId).HasColumnName("ThongBaoID");
            entity.Property(e => e.DaDoc).HasDefaultValue(false);
            entity.Property(e => e.Loai).HasMaxLength(50);
            entity.Property(e => e.NgayTao)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.NoiDung).HasMaxLength(500);
            entity.Property(e => e.UserId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("UserID");

            entity.HasOne(d => d.User).WithMany(p => p.ThongBaos)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_ThongBao_Users");
        });

        modelBuilder.Entity<TinNhan>(entity =>
        {
            entity.HasKey(e => e.TinNhanId).HasName("PK__TinNhan__40CE177C524E2C96");

            entity.ToTable("TinNhan");

            entity.Property(e => e.TinNhanId).HasColumnName("TinNhanID");
            entity.Property(e => e.DaDoc).HasDefaultValue(false);
            entity.Property(e => e.DatLichId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("DatLichID");
            entity.Property(e => e.NgayGui)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.NguoiGuiId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("NguoiGuiID");
            entity.Property(e => e.NguoiNhanId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("NguoiNhanID");

            entity.HasOne(d => d.DatLich).WithMany(p => p.TinNhans)
                .HasForeignKey(d => d.DatLichId)
                .HasConstraintName("FK_Messages_Booking");

            entity.HasOne(d => d.NguoiGui).WithMany(p => p.TinNhanNguoiGuis)
                .HasForeignKey(d => d.NguoiGuiId)
                .HasConstraintName("FK_TinNhan_NguoiGui");

            entity.HasOne(d => d.NguoiNhan).WithMany(p => p.TinNhanNguoiNhans)
                .HasForeignKey(d => d.NguoiNhanId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TinNhan_NguoiNhan");
        });

        modelBuilder.Entity<TinhNangGoi>(entity =>
        {
            entity.HasKey(e => e.TinhNangId).HasName("PK__TinhNang__6A614EF217498B47");

            entity.ToTable("TinhNangGoi");

            entity.HasIndex(e => e.TenTinhNang, "UQ__TinhNang__AAC9BF6479BAA4DB").IsUnique();

            entity.Property(e => e.TinhNangId).HasColumnName("TinhNangID");
            entity.Property(e => e.ConHoatDong).HasDefaultValue(true);
            entity.Property(e => e.GoiToiThieu).HasMaxLength(20);
            entity.Property(e => e.MoTa).HasMaxLength(200);
            entity.Property(e => e.TenTinhNang).HasMaxLength(50);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PK__Users__1788CCAC4E2E9F40");

            entity.HasIndex(e => e.Username, "UQ__Users__536C85E4B3A75ACB").IsUnique();

            entity.HasIndex(e => e.Email, "UQ__Users__A9D10534DDFA8C30").IsUnique();

            entity.Property(e => e.UserId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("UserID");
            entity.Property(e => e.AnhDaiDien).HasMaxLength(200);
            entity.Property(e => e.CreatedDate)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Email).HasMaxLength(100);
            entity.Property(e => e.GioiTinh).HasMaxLength(10);
            entity.Property(e => e.HoTen).HasMaxLength(100);
            entity.Property(e => e.NgonNgu)
                .HasMaxLength(10)
                .HasDefaultValue("vi");
            entity.Property(e => e.PasswordHash).HasMaxLength(256);
            entity.Property(e => e.ResetToken).HasMaxLength(256);
            entity.Property(e => e.ResetTokenExpiry).HasColumnType("datetime");
            entity.Property(e => e.Role)
                .HasMaxLength(20)
                .HasDefaultValue("Client");
            entity.Property(e => e.Theme)
                .HasMaxLength(10)
                .HasDefaultValue("Light");
            entity.Property(e => e.TimeZone)
                .HasMaxLength(50)
                .HasDefaultValue("SE Asia Standard Time");
            entity.Property(e => e.Username).HasMaxLength(50);
        });

        modelBuilder.Entity<XepHang>(entity =>
        {
            entity.HasKey(e => e.XepHangId).HasName("PK__XepHang__D76E9F00428F44DF");

            entity.ToTable("XepHang");

            entity.Property(e => e.XepHangId).HasColumnName("XepHangID");
            entity.Property(e => e.ChuKy).HasMaxLength(20);
            entity.Property(e => e.NgayCapNhat)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.UserId)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasColumnName("UserID");

            entity.HasOne(d => d.User).WithMany(p => p.XepHangs)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_XepHang_Users");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
