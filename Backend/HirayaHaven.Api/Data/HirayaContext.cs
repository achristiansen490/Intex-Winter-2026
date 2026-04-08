using System.Security.Claims;
using HirayaHaven.Api.Models;
using HirayaHaven.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Data;

public partial class HirayaContext : IdentityDbContext<AppUser, IdentityRole<int>, int>
{
    protected readonly IHttpContextAccessor? HttpContextAccessor;

    public HirayaContext(DbContextOptions<HirayaContext> options, IHttpContextAccessor? httpContextAccessor = null)
        : base(options) { HttpContextAccessor = httpContextAccessor; }

    // Protected ctor for derived contexts (e.g. HirayaSqlServerContext)
    protected HirayaContext(DbContextOptions options, IHttpContextAccessor? httpContextAccessor = null)
        : base(options) { HttpContextAccessor = httpContextAccessor; }

    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<ProgramArea> ProgramAreas => Set<ProgramArea>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<Safehouse> Safehouses => Set<Safehouse>();
    public DbSet<Staff> Staff => Set<Staff>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<PartnerAssignment> PartnerAssignments => Set<PartnerAssignment>();
    public DbSet<Supporter> Supporters => Set<Supporter>();
    public DbSet<Donation> Donations => Set<Donation>();
    public DbSet<InKindDonationItem> InKindDonationItems => Set<InKindDonationItem>();
    public DbSet<DonationAllocation> DonationAllocations => Set<DonationAllocation>();
    public DbSet<SocialMediaPost> SocialMediaPosts => Set<SocialMediaPost>();
    public DbSet<Resident> Residents => Set<Resident>();
    public DbSet<ProcessRecording> ProcessRecordings => Set<ProcessRecording>();
    public DbSet<HomeVisitation> HomeVisitations => Set<HomeVisitation>();
    public DbSet<EducationRecord> EducationRecords => Set<EducationRecord>();
    public DbSet<HealthWellbeingRecord> HealthWellbeingRecords => Set<HealthWellbeingRecord>();
    public DbSet<InterventionPlan> InterventionPlans => Set<InterventionPlan>();
    public DbSet<IncidentReport> IncidentReports => Set<IncidentReport>();
    public DbSet<SafehouseMonthlyMetric> SafehouseMonthlyMetrics => Set<SafehouseMonthlyMetric>();
    public DbSet<PublicImpactSnapshot> PublicImpactSnapshots => Set<PublicImpactSnapshot>();

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        int? userId = null;
        string? ipAddress = null;

        if (HttpContextAccessor?.HttpContext is { } ctx)
        {
            var userIdClaim = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (int.TryParse(userIdClaim, out var uid)) userId = uid;
            ipAddress = ctx.Connection.RemoteIpAddress?.ToString();
        }

        // Registration and other anonymous flows don't have a valid user FK for audit_log.user_id.
        // Skip automatic audit rows unless we have an authenticated user id.
        var auditEntries = userId.HasValue
            ? AuditInterceptor.GetAuditEntries(ChangeTracker, userId, ipAddress)
            : [];

        var result = await base.SaveChangesAsync(cancellationToken);

        // Add audit entries after save so we have generated PKs for INSERTs
        if (auditEntries.Count > 0)
        {
            AuditLogs.AddRange(auditEntries);
            await base.SaveChangesAsync(cancellationToken);
        }

        return result;
    }
}
