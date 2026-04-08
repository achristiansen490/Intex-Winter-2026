using System.Text;
using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

LoadDotEnvIfPresent(Path.Combine(Directory.GetCurrentDirectory(), ".env"));

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddControllers();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Data Source=../../Data/hiraya.db";

builder.Services.AddDbContext<HirayaContext>(options => options.UseSqlite(connectionString));

// --- Identity ---
builder.Services.AddIdentity<AppUser, IdentityRole<int>>(options =>
{
    // TODO: Replace these values with the password policy from your class notes/lab
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequiredLength = 12;
    options.Password.RequiredUniqueChars = 1;

    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;

    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<HirayaContext>()
.AddDefaultTokenProviders();

// --- JWT Authentication ---
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection["Key"]
    ?? throw new InvalidOperationException(
        "JWT signing key not configured. Set Jwt:Key in user-secrets or Backend/HirayaHaven.Api/.env.");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSection["Issuer"],
        ValidAudience = jwtSection["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.AddAuthorization();

// --- HSTS ---
builder.Services.AddHsts(options =>
{
    options.MaxAge = TimeSpan.FromDays(365);
    options.IncludeSubDomains = true;
    options.Preload = true;
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
            Uri.TryCreate(origin, UriKind.Absolute, out var uri) &&
            uri.Scheme == Uri.UriSchemeHttp &&
            (uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) || uri.Host == "127.0.0.1"))
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

await SeedAsync(app.Services);

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.Use(async (context, next) =>
{
    context.Response.Headers.Append("Content-Security-Policy",
        "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data:; " +
        "font-src 'self'; " +
        "connect-src 'self'; " +
        "frame-ancestors 'none'");
    await next();
});

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

static async Task SeedAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<int>>>();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

    string[] roles = ["Admin", "Donor"];
    foreach (var role in roles)
    {
        if (!await roleManager.RoleExistsAsync(role))
            await roleManager.CreateAsync(new IdentityRole<int>(role));
    }

    var adminEmail = config["Seed:AdminEmail"] ?? "admin@hirayahaven.org";
    if (await userManager.FindByEmailAsync(adminEmail) is null)
    {
        var adminPassword = config["Seed:AdminPassword"]
            ?? throw new InvalidOperationException(
                "Admin seed password not configured. Run: dotnet user-secrets set \"Seed:AdminPassword\" \"<password>\"");

        var admin = new AppUser
        {
            UserName = "admin",
            Email = adminEmail,
            EmailConfirmed = true,
            IsActive = true,
            IsApproved = true
        };

        var result = await userManager.CreateAsync(admin, adminPassword);
        if (result.Succeeded)
            await userManager.AddToRoleAsync(admin, "Admin");
    }
}

static void LoadDotEnvIfPresent(string path)
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
