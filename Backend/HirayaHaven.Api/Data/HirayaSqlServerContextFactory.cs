using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace HirayaHaven.Api.Data;

public class HirayaSqlServerContextFactory : IDesignTimeDbContextFactory<HirayaSqlServerContext>
{
    public HirayaSqlServerContext CreateDbContext(string[] args)
    {
        var projectDir = Directory.GetCurrentDirectory();
        LoadDotEnvIfPresent(Path.Combine(projectDir, ".env"));

        var config = new ConfigurationBuilder()
            .SetBasePath(projectDir)
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString =
            config.GetConnectionString("AzureSqlConnection")
            ?? config["ConnectionStrings:AzureSqlConnection"]
            ?? "Server=(localdb)\\mssqllocaldb;Database=hiraya-haven;Trusted_Connection=True;TrustServerCertificate=True;";

        var optionsBuilder = new DbContextOptionsBuilder<HirayaSqlServerContext>();
        optionsBuilder.UseSqlServer(connectionString);

        return new HirayaSqlServerContext(optionsBuilder.Options);
    }

    private static void LoadDotEnvIfPresent(string path)
    {
        if (!File.Exists(path))
            return;

        foreach (var raw in File.ReadAllLines(path))
        {
            var line = raw.Trim();
            if (line.Length == 0 || line.StartsWith('#'))
                continue;

            var sep = line.IndexOf('=');
            if (sep <= 0)
                continue;

            var key = line[..sep].Trim();
            if (key.Length == 0)
                continue;

            var value = line[(sep + 1)..].Trim();
            if (value.Length >= 2 && ((value.StartsWith('"') && value.EndsWith('"')) || (value.StartsWith('\'') && value.EndsWith('\''))))
                value = value[1..^1];

            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(key)))
                Environment.SetEnvironmentVariable(key, value);
        }
    }
}
