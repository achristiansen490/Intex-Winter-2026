using System.Security.Claims;
using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using HirayaHaven.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public abstract class CrudControllerBase<TEntity>(
    HirayaContext db,
    IPermissionService permissions,
    UserManager<AppUser> userManager) : ControllerBase where TEntity : class
{
    protected readonly HirayaContext Db = db;
    protected readonly IPermissionService Permissions = permissions;
    protected readonly UserManager<AppUser> UserManager = userManager;

    protected abstract DbSet<TEntity> Entities { get; }

    protected virtual string ResourceName => typeof(TEntity).Name.ToLowerInvariant() switch
    {
        "resident" => "residents",
        "healthwellbeingrecord" => "health_records",
        "educationrecord" => "education_records",
        "processrecording" => "process_recordings",
        "homevisitation" => "home_visitations",
        "incidentreport" => "incident_reports",
        "interventionplan" => "intervention_plans",
        "donation" => "donations",
        "appuser" => "users",
        "staff" => "staff",
        "safehouse" => "safehouses",
        "auditlog" => "audit_log",
        "organization" => "organization",
        "rolepermission" => "roles_permissions",
        "publicimpactsnapshot" => "reports",
        _ => typeof(TEntity).Name.ToLowerInvariant()
    };

    /// <summary>Sensitive fields per resource that require approval instead of immediate save.</summary>
    private static readonly Dictionary<string, HashSet<string>> SensitiveFields =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["residents"] = new(StringComparer.OrdinalIgnoreCase)
                { "CurrentRiskLevel", "CaseStatus", "ReintegrationStatus", "DateClosed" },
            ["intervention_plans"] = new(StringComparer.OrdinalIgnoreCase)
                { "Status" },
        };

    protected async Task<string?> GetUserRoleAsync()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return null;
        var user = await UserManager.FindByIdAsync(userId);
        if (user is null) return null;
        var roles = await UserManager.GetRolesAsync(user);
        foreach (var r in new[] { "Admin", "Supervisor", "CaseManager", "SocialWorker", "FieldWorker", "Resident", "Donor" })
            if (roles.Contains(r)) return r;
        return roles.FirstOrDefault();
    }

    protected async Task<AppUser?> GetCurrentUserAsync()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return null;
        return await UserManager.FindByIdAsync(userId);
    }

    /// <summary>
    /// Returns the safehouse ID for the current staff user.
    /// Returns null if the user has no StaffId or the Staff record isn't found.
    /// Callers that need scoping must treat null as "no access".
    /// </summary>
    protected async Task<int?> GetUserSafehouseIdAsync(AppUser user)
    {
        if (!user.StaffId.HasValue) return null;
        var staff = await Db.Staff.AsNoTracking()
            .FirstOrDefaultAsync(s => s.StaffId == user.StaffId.Value);
        return staff?.SafehouseId;
    }

    protected virtual async Task<IQueryable<TEntity>> ApplyScopingAsync(
        IQueryable<TEntity> query, AppUser user, string role)
    {
        // Staff roles: MUST be scoped to their safehouse
        if (role is "Supervisor" or "CaseManager" or "SocialWorker" or "FieldWorker")
        {
            var safehouseId = await GetUserSafehouseIdAsync(user);

            // Bug fix: if we can't determine their safehouse, deny all records
            if (!safehouseId.HasValue)
                return query.Where(_ => false);

            var hasSafehouseId = typeof(TEntity).GetProperty("SafehouseId") is not null;
            var hasResidentId = typeof(TEntity).GetProperty("ResidentId") is not null;

            if (hasSafehouseId)
            {
                query = query.Where(e => EF.Property<int?>(e, "SafehouseId") == safehouseId.Value);
            }
            else if (hasResidentId)
            {
                // Scope through the resident's safehouse
                var safehouseResidentIds = Db.Residents
                    .Where(r => r.SafehouseId == safehouseId.Value)
                    .Select(r => r.ResidentId);
                query = query.Where(e => safehouseResidentIds.Contains(EF.Property<int>(e, "ResidentId")));
            }
            // If the entity has neither property (e.g. Safehouse itself), no additional filter needed
        }

        // Resident: own records only
        if (role == "Resident" && user.ResidentId.HasValue)
        {
            if (typeof(TEntity).GetProperty("ResidentId") is not null)
                query = query.Where(e => EF.Property<int>(e, "ResidentId") == user.ResidentId.Value);
            else if (typeof(TEntity) == typeof(Resident))
                query = query.Where(e => EF.Property<int>(e, "ResidentId") == user.ResidentId.Value);
        }

        // Donor: own records only
        if (role == "Donor" && user.SupporterId.HasValue)
        {
            if (typeof(TEntity).GetProperty("SupporterId") is not null)
                query = query.Where(e => EF.Property<int>(e, "SupporterId") == user.SupporterId.Value);
        }

        return query;
    }

    protected virtual void RedactForRole(TEntity entity, string role)
    {
        if (role is not "Admin" and not "Supervisor")
        {
            var notesProp = typeof(TEntity).GetProperty("NotesRestricted");
            if (notesProp is not null && notesProp.CanWrite)
                notesProp.SetValue(entity, null);
        }
    }

    [HttpGet]
    public virtual async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var role = await GetUserRoleAsync();
        if (role is null) return Forbid();
        if (!await Permissions.CanAsync(role, ResourceName, "Read")) return Forbid();

        var user = await GetCurrentUserAsync();
        if (user is null) return Forbid();

        var query = Entities.AsNoTracking();
        query = await ApplyScopingAsync(query, user, role);

        var list = await query.ToListAsync(ct);
        foreach (var item in list) RedactForRole(item, role);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public virtual async Task<IActionResult> GetById([FromRoute] int id, CancellationToken ct)
    {
        var role = await GetUserRoleAsync();
        if (role is null) return Forbid();
        if (!await Permissions.CanAsync(role, ResourceName, "Read")) return Forbid();

        var user = await GetCurrentUserAsync();
        if (user is null) return Forbid();

        var query = Entities.AsQueryable();
        query = await ApplyScopingAsync(query, user, role);

        var pkName = Db.Model.FindEntityType(typeof(TEntity))!.FindPrimaryKey()!.Properties[0].Name;
        var entity = await query.FirstOrDefaultAsync(e => EF.Property<int>(e, pkName) == id, ct);
        if (entity is null) return NotFound();

        RedactForRole(entity, role);
        return Ok(entity);
    }

    [HttpPost]
    public virtual async Task<IActionResult> Create([FromBody] TEntity entity, CancellationToken ct)
    {
        var role = await GetUserRoleAsync();
        if (role is null) return Forbid();
        if (!await Permissions.CanAsync(role, ResourceName, "Create")) return Forbid();

        Entities.Add(entity);
        await Db.SaveChangesAsync(ct);
        var id = (int)GetPrimaryKeyValue(entity)!;
        return CreatedAtAction(nameof(GetById), new { id }, entity);
    }

    [HttpPut("{id:int}")]
    public virtual async Task<IActionResult> Update([FromRoute] int id, [FromBody] TEntity entity, CancellationToken ct)
    {
        var role = await GetUserRoleAsync();
        if (role is null) return Forbid();
        if (!await Permissions.CanAsync(role, ResourceName, "Update")) return Forbid();

        var user = await GetCurrentUserAsync();
        if (user is null) return Forbid();

        // Verify scoping — user can only update records they can see
        var query = Entities.AsQueryable();
        query = await ApplyScopingAsync(query, user, role);
        var pkName = Db.Model.FindEntityType(typeof(TEntity))!.FindPrimaryKey()!.Properties[0].Name;
        var existing = await query.FirstOrDefaultAsync(e => EF.Property<int>(e, pkName) == id, ct);
        if (existing is null) return NotFound();

        // Check if any sensitive fields are being changed and user's role requires approval
        if (role is "SocialWorker" or "CaseManager" or "FieldWorker"
            && SensitiveFields.TryGetValue(ResourceName, out var sensitiveSet))
        {
            var approval = HttpContext.RequestServices.GetService<IApprovalService>();
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            var pendingApprovals = new List<string>();

            foreach (var fieldName in sensitiveSet)
            {
                var prop = typeof(TEntity).GetProperty(fieldName);
                if (prop is null) continue;

                var oldVal = prop.GetValue(existing)?.ToString();
                var newVal = prop.GetValue(entity)?.ToString();

                if (oldVal == newVal) continue; // Not changed

                // Queue for approval instead of saving
                if (approval is not null)
                    await approval.QueueForApprovalAsync(userId, ResourceName, id, fieldName, oldVal, newVal, ip);

                // Reset the field on the incoming entity so it doesn't get saved
                prop.SetValue(entity, prop.GetValue(existing));
                pendingApprovals.Add(fieldName);
            }

            if (pendingApprovals.Count > 0)
            {
                // Save any non-sensitive field changes, then return a partial-success response
                Db.Entry(existing).CurrentValues.SetValues(entity);
                await Db.SaveChangesAsync(ct);
                return Accepted(new
                {
                    message = "Update saved. The following fields require supervisor approval before taking effect.",
                    pendingApproval = pendingApprovals
                });
            }
        }

        Db.Entry(existing).CurrentValues.SetValues(entity);
        await Db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public virtual async Task<IActionResult> Delete([FromRoute] int id, CancellationToken ct)
    {
        var role = await GetUserRoleAsync();
        if (role is null) return Forbid();
        if (!await Permissions.CanAsync(role, ResourceName, "Delete")) return Forbid();

        var user = await GetCurrentUserAsync();
        if (user is null) return Forbid();

        // Bug fix: apply scoping to delete — user can only delete records they own/can see
        var query = Entities.AsQueryable();
        query = await ApplyScopingAsync(query, user, role);
        var pkName = Db.Model.FindEntityType(typeof(TEntity))!.FindPrimaryKey()!.Properties[0].Name;
        var entity = await query.FirstOrDefaultAsync(e => EF.Property<int>(e, pkName) == id, ct);
        if (entity is null) return NotFound();

        Entities.Remove(entity);
        await Db.SaveChangesAsync(ct);
        return NoContent();
    }

    protected object? GetPrimaryKeyValue(TEntity entity)
    {
        var pk = Db.Model.FindEntityType(typeof(TEntity))!.FindPrimaryKey()!.Properties[0];
        return entity.GetType().GetProperty(pk.Name)!.GetValue(entity);
    }
}
