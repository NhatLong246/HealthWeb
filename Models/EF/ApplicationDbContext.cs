using Microsoft.EntityFrameworkCore;

namespace HealthWeb.Models.EF
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }
        // Add DbSet<T> properties later when mapping your SQL tables
    }
}
