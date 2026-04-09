using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using HirayaHaven.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

// Supporter data contains donor contact info — NOT public, requires auth
public class SupportersController(HirayaContext db, IPermissionService permissions, UserManager<AppUser> userManager)
    : CrudControllerBase<Supporter>(db, permissions, userManager)
{
    protected override DbSet<Supporter> Entities => Db.Supporters;

    [HttpGet]
    public override async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var role = await GetUserRoleAsync();
        if (role is null) return Forbid();
        if (!await Permissions.CanAsync(role, ResourceName, "Read")) return Forbid();

        var user = await GetCurrentUserAsync();
        if (user is null) return Forbid();

        if (role == "Donor")
            user = await EnsureDonorSupporterLinkedAsync(user, ct);

        var query = Entities.AsNoTracking();
        query = await ApplyScopingAsync(query, user, role);

        var list = await query.ToListAsync(ct);
        foreach (var item in list) RedactForRole(item, role);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public override async Task<IActionResult> GetById([FromRoute] int id, CancellationToken ct)
    {
        var role = await GetUserRoleAsync();
        if (role is null) return Forbid();
        if (!await Permissions.CanAsync(role, ResourceName, "Read")) return Forbid();

        var user = await GetCurrentUserAsync();
        if (user is null) return Forbid();

        if (role == "Donor")
            user = await EnsureDonorSupporterLinkedAsync(user, ct);

        var query = Entities.AsQueryable();
        query = await ApplyScopingAsync(query, user, role);

        var pkName = Db.Model.FindEntityType(typeof(Supporter))!.FindPrimaryKey()!.Properties[0].Name;
        var entity = await query.FirstOrDefaultAsync(e => EF.Property<int>(e, pkName) == id, ct);
        if (entity is null) return NotFound();

        RedactForRole(entity, role);
        return Ok(entity);
    }
}
