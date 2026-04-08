using System.Text;
using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using HirayaHaven.Api.Services;

LoadDotEnvIfPresent(Path.Combine(Directory.GetCurrentDirectory(), ".env"));

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddControllers();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IPermissionService, PermissionService>();
builder.Services.AddScoped<IApprovalService, ApprovalService>();
builder.Services.AddHttpClient("PipelineTraining", client => client.Timeout = TimeSpan.FromMinutes(15));
builder.Services.AddScoped<IPipelineTrainingService, PipelineTrainingService>();
builder.Services.AddHostedService<PipelineScheduleHostedService>();

var dbProvider = (builder.Configuration["Database:Provider"] ?? "sqlite").Trim().ToLowerInvariant();
var sqliteConnection = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Data Source=../../Data/hiraya.db";
var azureSqlConnection = builder.Configuration.GetConnectionString("AzureSqlConnection");

builder.Services.AddDbContext<HirayaContext>(options =>
{
    if (dbProvider == "sqlserver")
    {
        if (string.IsNullOrWhiteSpace(azureSqlConnection))
        {
            throw new InvalidOperationException(
                "Database provider is set to sqlserver, but ConnectionStrings:AzureSqlConnection is missing.");
        }

        options.UseSqlServer(azureSqlConnection);
    }
    else
    {
        options.UseSqlite(sqliteConnection);
    }
});

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
    var configuredOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

    options.AddPolicy("Frontend", policy =>
    {
        if (configuredOrigins.Length > 0)
        {
            policy.WithOrigins(configuredOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod();
            return;
        }

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

    string[] roles = ["Admin", "Supervisor", "CaseManager", "SocialWorker", "FieldWorker", "Resident", "Donor"];
    foreach (var role in roles)
    {
        if (!await roleManager.RoleExistsAsync(role))
            await roleManager.CreateAsync(new IdentityRole<int>(role));
    }

    // --- Seed RolePermission matrix ---
    var db = scope.ServiceProvider.GetRequiredService<HirayaContext>();
    if (!db.RolePermissions.Any())
    {
        var perms = new List<RolePermission>();
        void Allow(string role, string resource, string actions, string? scope = null)
        {
            foreach (var action in actions.Split(','))
                perms.Add(new RolePermission { Role = role, Resource = resource, Action = action.Trim(), IsAllowed = true, ScopeNote = scope });
        }

        // Admin — full CRUD on everything
        foreach (var res in new[] { "residents", "health_records", "education_records", "process_recordings",
            "home_visitations", "incident_reports", "intervention_plans", "donations", "users", "staff",
            "safehouses", "reports", "audit_log", "organization" })
            Allow("Admin", res, "Create,Read,Update,Delete");

        // Supervisor
        foreach (var res in new[] { "residents", "health_records", "education_records", "process_recordings",
            "home_visitations", "incident_reports", "intervention_plans" })
            Allow("Supervisor", res, "Create,Read,Update", "Own safehouse");
        Allow("Supervisor", "donations", "Read");
        Allow("Supervisor", "users", "Create,Read,Update", "Resident accounts only");
        Allow("Supervisor", "staff", "Read,Update", "Own safehouse");
        Allow("Supervisor", "safehouses", "Read,Update", "Own safehouse");
        Allow("Supervisor", "reports", "Create,Read");
        Allow("Supervisor", "audit_log", "Read");
        Allow("Supervisor", "organization", "Read");

        // Case Manager
        foreach (var res in new[] { "residents", "health_records", "education_records", "process_recordings",
            "home_visitations", "incident_reports", "intervention_plans" })
            Allow("CaseManager", res, "Create,Read,Update", "Own safehouse");
        Allow("CaseManager", "staff", "Read");
        Allow("CaseManager", "safehouses", "Read");
        Allow("CaseManager", "reports", "Create,Read");
        Allow("CaseManager", "organization", "Read");

        // Social Worker
        Allow("SocialWorker", "residents", "Read,Update", "Own safehouse, sensitive changes require approval");
        foreach (var res in new[] { "health_records", "education_records", "process_recordings",
            "home_visitations", "incident_reports" })
            Allow("SocialWorker", res, "Create,Read,Update", "Assigned residents");
        Allow("SocialWorker", "intervention_plans", "Read,Update", "Assigned residents");
        Allow("SocialWorker", "staff", "Read");
        Allow("SocialWorker", "safehouses", "Read");
        Allow("SocialWorker", "reports", "Read");
        Allow("SocialWorker", "organization", "Read");

        // Field Worker
        Allow("FieldWorker", "residents", "Read", "Own safehouse");
        foreach (var res in new[] { "health_records", "education_records", "process_recordings",
            "home_visitations", "incident_reports" })
            Allow("FieldWorker", res, "Create,Read", "Own safehouse, cannot edit after submission");
        Allow("FieldWorker", "intervention_plans", "Read");
        Allow("FieldWorker", "safehouses", "Read");
        Allow("FieldWorker", "organization", "Read");

        // Resident
        foreach (var res in new[] { "residents", "health_records", "education_records",
            "home_visitations", "intervention_plans" })
            Allow("Resident", res, "Read", "Own records only");
        Allow("Resident", "organization", "Read");

        // Donor
        Allow("Donor", "donations", "Read", "Own records only");
        Allow("Donor", "organization", "Read");

        db.RolePermissions.AddRange(perms);
        await db.SaveChangesAsync();
    }

    // Seed one test account per role.
    // Admin password must be set explicitly:
    //   dotnet user-secrets set "Seed:AdminPassword" "<password>"
    // All other roles share a single dev password (override with "Seed:DefaultPassword"):
    //   dotnet user-secrets set "Seed:DefaultPassword" "<password>"
    // Default dev password (satisfies the 12-char policy): HirayaDev@2025!

    var defaultPassword = config["Seed:DefaultPassword"] ?? "HirayaDev@2025!";

    (string? PasswordConfigKey, string Email, string UserName, string Role)[] seedAccounts =
    [
        ("Seed:AdminPassword", config["Seed:AdminEmail"] ?? "admin@hirayahaven.org", "admin", "Admin"),
        (null, "supervisor@hirayahaven.org", "supervisor", "Supervisor"),
        (null, "casemanager@hirayahaven.org", "casemanager", "CaseManager"),
        (null, "socialworker@hirayahaven.org", "socialworker", "SocialWorker"),
        (null, "fieldworker@hirayahaven.org", "fieldworker", "FieldWorker"),
        (null, "resident@hirayahaven.org", "resident", "Resident"),
        (null, "donor@hirayahaven.org", "donor", "Donor"),
    ];

    foreach (var acct in seedAccounts)
    {
        if (await userManager.FindByEmailAsync(acct.Email) is not null) continue;

        string password;
        if (acct.PasswordConfigKey is not null)
        {
            password = config[acct.PasswordConfigKey]
                ?? throw new InvalidOperationException(
                    $"Admin seed password not configured. Set Seed:AdminPassword in appsettings.Development.json, user-secrets, or .env (see .env.example).");
        }
        else
        {
            password = defaultPassword;
        }

        var user = new AppUser
        {
            UserName = acct.UserName,
            Email = acct.Email,
            EmailConfirmed = true,
            IsActive = true,
            IsApproved = true,
        };

        var result = await userManager.CreateAsync(user, password);
        if (result.Succeeded)
            await userManager.AddToRoleAsync(user, acct.Role);
    }

    if (!await db.PipelineScheduleSettings.AnyAsync())
    {
        db.PipelineScheduleSettings.Add(new PipelineScheduleSettings
        {
            SettingsId = 1,
            Enabled = false,
            HourUtc = 2,
            MinuteUtc = 0
        });
        await db.SaveChangesAsync();
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
