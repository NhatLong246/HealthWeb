using Microsoft.EntityFrameworkCore;
using HealthWeb.Models.Entities;

namespace HealthWeb.Models.EF
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }
        
        // DbSet mappings
        public DbSet<User> Users { get; set; }
        public DbSet<XepHang> XepHang { get; set; }
        public DbSet<ThongBao> ThongBao { get; set; }
        public DbSet<LuuTruSucKhoe> LuuTruSucKhoe { get; set; }
        
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // User configuration
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.UserID);
                entity.Property(e => e.UserID).HasMaxLength(20);
                entity.Property(e => e.Username).HasMaxLength(50).IsRequired();
                entity.Property(e => e.Role).HasMaxLength(20).HasDefaultValue("Client");
                entity.Property(e => e.Email).HasMaxLength(100);
                entity.Property(e => e.HoTen).HasMaxLength(100);
                entity.Property(e => e.GioiTinh).HasMaxLength(10);
                entity.Property(e => e.AnhDaiDien).HasMaxLength(200);
            });
            
            // XepHang configuration
            modelBuilder.Entity<XepHang>(entity =>
            {
                entity.HasKey(e => e.XepHangID);
                entity.Property(e => e.UserID).HasMaxLength(20).IsRequired();
                entity.Property(e => e.ChuKy).HasMaxLength(20);
                entity.HasOne(e => e.User)
                    .WithMany(u => u.XepHang)
                    .HasForeignKey(e => e.UserID)
                    .OnDelete(DeleteBehavior.Cascade);
            });
            
            // ThongBao configuration
            modelBuilder.Entity<ThongBao>(entity =>
            {
                entity.HasKey(e => e.ThongBaoID);
                entity.Property(e => e.UserID).HasMaxLength(20).IsRequired();
                entity.Property(e => e.NoiDung).HasMaxLength(500);
                entity.Property(e => e.Loai).HasMaxLength(50);
            });
        }
    }
}
