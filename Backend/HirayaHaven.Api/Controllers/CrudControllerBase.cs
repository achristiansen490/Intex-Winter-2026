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

    /// <summary>
    /// The resource name used for permission lookups (matches the keys in the RolePermission table).
    /// Override in derived controllers if the default convention doesn't match.
    /// </summary>
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

    /// <summary>
    /// Gets the primary role of the current user.
    /// </summary>
    protected async Task<string?> GetUserRoleAsync()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return null;
        var user = await UserManager.FindByIdAsync(userId);
        if (user is null) return null;
        var roles = await UserManager.GetRolesAsync(user);
        // Return the highest-privilege role
        foreach (var r in new[] { "Admin", "Supervisor", "CaseManager", "SocialWorker", "FieldWorker", "Resident", "Donor" })
            if (roles.Contains(r)) return r;
        return roles.FirstOrDefault();
    }

    /// <summary>
    /// Gets the current AppUser with their linked Staff/Resident/Supporter IDs.
    /// </summary>
    protected async Task<AppUser?> GetCurrentUserAsync()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return null;
        return await UserManager.FindByIdAsync(userId);
    }

    /// <summary>
    /// Applies data scoping (safehouse, own-records) to a query based on the user's role.
    /// Override in derived controllers for resource-specific scoping.
    /// </summary>
    protected virtual async Task<IQueryable<TEntity>> ApplyScopingAsync(IQueryable<TEntity> query, AppUser user, string role)
    {
        // Staff roles: scope by safehouse
        if (role is "Supervisor" or "CaseManager" or "SocialWorker" or "FieldWorker")
        {
            var safehouseId = user.StaffId.HasValue
                ? (await Db.Staff.AsNoTracking().FirstOrDefaultAsync(s => s.StaffId == user.StaffId))?.SafehouseId
                : null;

            if (safehouseId.HasValue)
            {
                // Check if TEntity has a SafehouseId property
                var prop = typeof(TEntity).GetProperty("SafehouseId");
                if (prop is not null)
                {
                    query = query.Where(e => EF.Property<int?>(e, "SafehouseId") == safehouseId.Value);
                }

                // For records tied to residents, scope through resident's safehouse
                var residentIdProp = typeof(TEntity).GetProperty("ResidentId");
                if (residentIdProp is not null && prop is null)
                {
                    var safehouseResidentIds = Db.Residents
                        .Where(r => r.SafehouseId == safehouseId.Value)
                        .Select(r => r.ResidentId);
                    query = query.Where(e => safehouseResidentIds.Contains(EF.Property<int>(e, "ResidentId")));
                }
            }
        }

        // Resident: own records only
        if (role == "Resident" && user.ResidentId.HasValue)
        {
            var residentIdProp = typeof(TEntity).GetProperty("ResidentId");
            if (residentIdProp is not null)
            {
                query = query.Where(e => EF.Property<int>(e, "ResidentId") == user.ResidentId.Value);
            }
            // If entity IS Resident, filter by PK
            else if (typeof(TEntity) == typeof(Resident))
            {
                query = query.Where(e => EF.Property<int>(e, "ResidentId") == user.ResidentId.Value);
            }
        }

        // Donor: own records only
        if (role == "Donor" && user.SupporterId.HasValue)
        {
            var supporterIdProp = typeof(TEntity).GetProperty("SupporterId");
            if (supporterIdProp is not null)
            {
                query = query.Where(e => EF.Property<int>(e, "SupporterId") == user.SupporterId.Value);
            }
        }

        return query;
    }

    /// <summary>
    /// Strips restricted fields from entities before returning them.
    /// Override in derived controllers for resource-specific redaction.
    /// </summary>
    protected virtual void RedactForRole(TEntity entity, string role)
    {
        // Hide NotesRestricted from Residents (and anyone below Supervisor)
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

        // Apply scoping to make sure the user can access this specific record
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

        var entity = await Entities.FindAsync([id], ct);
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
