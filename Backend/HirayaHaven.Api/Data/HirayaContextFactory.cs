using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace HirayaHaven.Api.Data;

/// <summary>Design-time factory so <c>dotnet ef migrations</c> targets SQLite <see cref="HirayaContext"/>, not <see cref="HirayaSqlServerContext"/>.</summary>
public class HirayaContextFactory : IDesignTimeDbContextFactory<HirayaContext>
{
    public HirayaContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<HirayaContext>();
        optionsBuilder.UseSqlite("Data Source=../../Data/hiraya.db");
        return new HirayaContext(optionsBuilder.Options);
    }
}
