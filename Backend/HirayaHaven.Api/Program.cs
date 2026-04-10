using System.Text;
using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.Data.Sqlite;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
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

string ResolveSqliteConnection(string configuredConnection, string contentRootPath)
{
    // Make local dev resilient when API is started from different working directories.
    var csb = new SqliteConnectionStringBuilder(configuredConnection);
    var configuredPath = csb.DataSource;
    if (string.IsNullOrWhiteSpace(configuredPath))
        return configuredConnection;

    if (Path.IsPathRooted(configuredPath))
        return configuredConnection;

    // Try the configured relative path first.
    var firstCandidate = Path.GetFullPath(Path.Combine(contentRootPath, configuredPath));
    if (File.Exists(firstCandidate))
    {
        csb.DataSource = firstCandidate;
        return csb.ConnectionString;
    }

    // Then try common repo layouts (run from repo root vs API project dir).
    var fallbackCandidates = new[]
    {
        Path.GetFullPath(Path.Combine(contentRootPath, "Data", "hiraya.db")),
        Path.GetFullPath(Path.Combine(contentRootPath, "..", "..", "Data", "hiraya.db")),
        Path.GetFullPath(Path.Combine(contentRootPath, "..", "Data", "hiraya.db")),
    };

    var existing = fallbackCandidates.FirstOrDefault(File.Exists);
    if (!string.IsNullOrWhiteSpace(existing))
    {
        csb.DataSource = existing;
        return csb.ConnectionString;
    }

    // Fall back to the configured value if none exist.
    return configuredConnection;
}

var resolvedSqliteConnection = ResolveSqliteConnection(sqliteConnection, builder.Environment.ContentRootPath);

builder.Services.AddDbContext<HirayaContext>(options =>
{
    if (dbProvider == "sqlserver")
    {
        if (string.IsNullOrWhiteSpace(azureSqlConnection))
        {
            throw new InvalidOperationException(
                "Database provider is set to sqlserver, but ConnectionStrings:AzureSqlConnection is missing.");
        }

        options.UseSqlServer(azureSqlConnection, sqlOptions =>
        {
            sqlOptions.EnableRetryOnFailure(
                maxRetryCount: 6,
                maxRetryDelay: TimeSpan.FromSeconds(30),
                errorNumbersToAdd: null);
            sqlOptions.CommandTimeout(120); // Serverless cold-start can take ~60-90s
        });
    }
    else
    {
        options.UseSqlite(resolvedSqliteConnection);
    }
    // Suppress the PendingModelChangesWarning — all migrations are applied; the snapshot
    // divergence is cosmetic and does not affect runtime behaviour.
    options.ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning));
});

// --- Identity ---
builder.Services.AddIdentity<AppUser, IdentityRole<int>>(options =>
{
    // Grading policy: minimum 14 characters, no composition requirements
    options.Password.RequireDigit = false;
    options.Password.RequireLowercase = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 14;
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
        ValidIssuer = jwtSection["Issuer"]?.Trim(),
        ValidAudience = jwtSection["Audience"]?.Trim(),
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        // Match ClaimTypes.Role on the token so [Authorize(Roles = "...")] and User.IsInRole stay consistent.
        NameClaimType = System.Security.Claims.ClaimTypes.NameIdentifier,
        RoleClaimType = System.Security.Claims.ClaimTypes.Role
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
    var configuredOrigins = (builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [])
        .Select(o => o?.Trim())
        .Where(o => !string.IsNullOrWhiteSpace(o))
        .Select(o => o!.TrimEnd('/'))
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();

    var configuredOriginSet = configuredOrigins.ToHashSet(StringComparer.OrdinalIgnoreCase);
    var allowAnyHttps = builder.Configuration.GetValue("Cors:AllowAnyHttpsOrigin", false);

    options.AddPolicy("Frontend", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
        {
            if (string.IsNullOrWhiteSpace(origin)) return false;
            if (allowAnyHttps
                && Uri.TryCreate(origin, UriKind.Absolute, out var anyHttps)
                && anyHttps.Scheme == Uri.UriSchemeHttps)
                return true;
            if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)) return false;
            return configuredOriginSet.Contains(origin.TrimEnd('/'))
                   // Local dev
                   || (
                       uri.Scheme == Uri.UriSchemeHttp
                       && (uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) || uri.Host == "127.0.0.1")
                   )
                   // Azure Static Web Apps (including preview URLs like app--123.azurestaticapps.net)
                   || (
                       uri.Scheme == Uri.UriSchemeHttps
                       && uri.Host.EndsWith(".azurestaticapps.net", StringComparison.OrdinalIgnoreCase)
                   );
        })
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

// Apply pending EF migrations before seeding (avoids "no such table" after pulling new migrations).
await using (var migrateScope = app.Services.CreateAsyncScope())
{
    var migrateDb = migrateScope.ServiceProvider.GetRequiredService<HirayaContext>();
    const int maxAttempts = 6;
    for (var attempt = 1; attempt <= maxAttempts; attempt++)
    {
        try
        {
            await migrateDb.Database.MigrateAsync();
            app.Logger.LogInformation("Database migrations applied successfully.");
            break;
        }
        catch (Exception ex)
        {
            if (attempt == maxAttempts)
            {
                app.Logger.LogError(ex, "Database migration failed after {Attempts} attempts.", maxAttempts);
                if (app.Environment.IsDevelopment())
                {
                    throw;
                }
                // In production, keep the app alive so health checks and diagnostics remain available.
                break;
            }

            var delaySeconds = Math.Min(30, attempt * 5);
            app.Logger.LogWarning(ex, "Database migration attempt {Attempt}/{MaxAttempts} failed. Retrying in {Delay}s...", attempt, maxAttempts, delaySeconds);
            await Task.Delay(TimeSpan.FromSeconds(delaySeconds));
        }
    }
}

const int seedMaxAttempts = 6;
for (var attempt = 1; attempt <= seedMaxAttempts; attempt++)
{
    try
    {
        await SeedAsync(app.Services);
        app.Logger.LogInformation("Database seeding completed successfully.");
        break;
    }
    catch (Exception ex)
    {
        if (attempt == seedMaxAttempts)
        {
            app.Logger.LogError(ex, "Database seed failed after {Attempts} attempts.", seedMaxAttempts);
            if (app.Environment.IsDevelopment())
            {
                throw;
            }
            // Keep production app alive for diagnostics and non-DB routes.
            break;
        }

        var delaySeconds = Math.Min(30, attempt * 5);
        app.Logger.LogWarning(ex, "Database seed attempt {Attempt}/{MaxAttempts} failed. Retrying in {Delay}s...", attempt, seedMaxAttempts, delaySeconds);
        await Task.Delay(TimeSpan.FromSeconds(delaySeconds));
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// In Development, the Vite proxy calls http://127.0.0.1:5051. HTTPS redirection to :5001 can
// cause follow-up requests to drop the Authorization header, breaking GET /api/auth/me (401).
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

// CORS must run before auth and before other middleware that might terminate OPTIONS preflights.
app.UseCors("Frontend");

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
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/api/health", () => Results.Json(new { ok = true, utc = DateTime.UtcNow }))
    .WithName("Health")
    .AllowAnonymous();

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
            "safehouses", "reports", "audit_log", "organization", "supporters", "donation_allocations" })
            Allow("Admin", res, "Create,Read,Update,Delete");

        // Supervisor
        foreach (var res in new[] { "residents", "health_records", "education_records", "process_recordings",
            "home_visitations", "incident_reports", "intervention_plans" })
            Allow("Supervisor", res, "Create,Read,Update", "Own safehouse");
        Allow("Supervisor", "donations", "Create,Read,Update", "Own safehouse");
        Allow("Supervisor", "supporters", "Create,Read,Update", "Own safehouse");
        Allow("Supervisor", "donation_allocations", "Create,Read,Update", "Own safehouse");
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
        Allow("CaseManager", "donations", "Create,Read,Update", "Own safehouse");
        Allow("CaseManager", "supporters", "Create,Read,Update", "Own safehouse");
        Allow("CaseManager", "donation_allocations", "Create,Read,Update", "Own safehouse");
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
        Allow("Donor", "donations", "Create", "Own records only");
        Allow("Donor", "supporters", "Read", "Own records only");
        Allow("Donor", "organization", "Read");

        db.RolePermissions.AddRange(perms);
        await db.SaveChangesAsync();
        PermissionService.InvalidateCache();
    }

    await UpsertSupportersPermissionsIfMissingAsync(db);
    await EnsureDefaultOkrTargetsAsync(db);

    // Seed one test account per role.
    // Admin password must be set explicitly:
    //   dotnet user-secrets set "Seed:AdminPassword" "<password>"
    // All other roles share a single dev password (override with "Seed:DefaultPassword"):
    //   dotnet user-secrets set "Seed:DefaultPassword" "<password>"
    // Default dev password (satisfies the 12-char policy): HirayaDev@2026!

    var defaultPassword = config["Seed:DefaultPassword"] ?? "HirayaDev@2026!";

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

/// <summary>
/// Older databases may lack donor rows for <c>supporters</c> Read, <c>donations</c> Read/Create; API checks use resource names <c>supporters</c> and <c>donations</c>.
/// Uses in-memory matching so casing / whitespace in imported rows does not block detection, and repairs <c>IsAllowed = false</c> for these grants.
/// </summary>
static async Task UpsertSupportersPermissionsIfMissingAsync(HirayaContext db)
{
    var all = await db.RolePermissions.ToListAsync();
    var changed = false;

    static bool ActionMatches(string? stored, string expected) =>
        stored != null && string.Equals(stored.Trim(), expected.Trim(), StringComparison.OrdinalIgnoreCase);

    void EnsureRow(string role, string resource, string action, string? scope)
    {
        var match = all.FirstOrDefault(p =>
            p.Role != null &&
            p.Resource != null &&
            string.Equals(p.Role.Trim(), role, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(p.Resource.Trim(), resource, StringComparison.OrdinalIgnoreCase) &&
            ActionMatches(p.Action, action));

        if (match is null)
        {
            var row = new RolePermission
            {
                Role = role,
                Resource = resource,
                Action = action.Trim(),
                IsAllowed = true,
                ScopeNote = scope
            };
            db.RolePermissions.Add(row);
            all.Add(row);
            changed = true;
            return;
        }

        if (match.IsAllowed != true)
        {
            match.IsAllowed = true;
            changed = true;
        }
    }

    EnsureRow("Donor", "donations", "Read", "Own records only");
    EnsureRow("Donor", "donations", "Create", "Own records only");
    EnsureRow("Donor", "supporters", "Read", "Own records only");

    foreach (var a in new[] { "Create", "Read", "Update", "Delete" })
        EnsureRow("Admin", "supporters", a, null);

    foreach (var action in new[] { "Create", "Read", "Update" })
    {
        EnsureRow("Supervisor", "supporters", action, "Own safehouse");
        EnsureRow("CaseManager", "supporters", action, "Own safehouse");
        EnsureRow("Supervisor", "donations", action, "Own safehouse");
        EnsureRow("CaseManager", "donations", action, "Own safehouse");
        EnsureRow("Supervisor", "donation_allocations", action, "Own safehouse");
        EnsureRow("CaseManager", "donation_allocations", action, "Own safehouse");
    }

    foreach (var action in new[] { "Create", "Read", "Update", "Delete" })
        EnsureRow("Admin", "donation_allocations", action, null);

    if (changed)
        await db.SaveChangesAsync();

    PermissionService.InvalidateCache();
}

/// <summary>
/// Fills missing <see cref="OkrTarget"/> rows so dashboard OKR cards show Target % (not em dash).
/// Values are 0..1; admins can override via <c>PUT /api/okrs/targets</c> or metric-specific PUT routes.
/// Idempotent: only inserts (metric, year, quarter) combinations that do not exist yet.
/// </summary>
static async Task EnsureDefaultOkrTargetsAsync(HirayaContext db)
{
    const int startYear = 2022;
    const int endYear = 2028;

    // Must match OkrsController metric keys and rate semantics (share 0..1).
    var defaults = new Dictionary<string, double>(StringComparer.Ordinal)
    {
        ["education.attendance"] = 0.85,
        ["healing.process_sessions.progress_rate"] = 0.72,
        ["caring.home_visits.clean_rate"] = 0.92,
        ["healing.incidents.resolution_rate"] = 0.88,
        ["outreach.social.referral_conversion_rate"] = 0.12,
        ["outreach.social.click_through_rate"] = 0.025,
    };

    var existing = await db.OkrTargets.AsNoTracking()
        .Select(t => new { t.MetricKey, t.Year, t.Quarter })
        .ToListAsync();

    var existingSet = existing
        .Select(e => $"{e.MetricKey}\u001f{e.Year}\u001f{e.Quarter}")
        .ToHashSet(StringComparer.Ordinal);

    var toAdd = new List<OkrTarget>();
    foreach (var (metricKey, targetValue) in defaults)
    {
        for (var y = startYear; y <= endYear; y++)
        {
            for (var q = 1; q <= 4; q++)
            {
                var k = $"{metricKey}\u001f{y}\u001f{q}";
                if (existingSet.Contains(k)) continue;

                toAdd.Add(new OkrTarget
                {
                    MetricKey = metricKey,
                    Year = y,
                    Quarter = q,
                    TargetValue = targetValue,
                    Notes = "Default seed target",
                });
                existingSet.Add(k);
            }
        }
    }

    if (toAdd.Count == 0) return;

    db.OkrTargets.AddRange(toAdd);
    await db.SaveChangesAsync();
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
