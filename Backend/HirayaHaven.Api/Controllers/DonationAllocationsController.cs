using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using HirayaHaven.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class DonationAllocationsController(HirayaContext db, IPermissionService permissions, UserManager<AppUser> userManager)
    : CrudControllerBase<DonationAllocation>(db, permissions, userManager)
{
    protected override DbSet<DonationAllocation> Entities => Db.DonationAllocations;

    /// <summary>
    /// Optional filter for donation detail UIs: <c>/api/donationallocations?donationId=123</c>.
    /// Still applies RBAC + scoping from <see cref="CrudControllerBase{TEntity}"/>.
    /// </summary>
    [HttpGet]
    public override async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var role = await GetUserRoleAsync();
        if (role is null) return Forbid();
        if (!await Permissions.CanAsync(role, ResourceName, "Read")) return Forbid();

        var user = await GetCurrentUserAsync();
        if (user is null) return Forbid();

        var query = Entities.AsNoTracking().AsQueryable();
        query = await ApplyScopingAsync(query, user, role);

        if (HttpContext.Request.Query.TryGetValue("donationId", out var raw) && int.TryParse(raw, out var donationId))
        {
            query = query.Where(x => x.DonationId == donationId);
        }

        var list = await query.ToListAsync(ct);
        foreach (var item in list) RedactForRole(item, role);
        return Ok(list);
    }
}
