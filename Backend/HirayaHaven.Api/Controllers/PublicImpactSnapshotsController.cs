using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using HirayaHaven.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class PublicImpactSnapshotsController(HirayaContext db, IPermissionService permissions, UserManager<AppUser> userManager)
    : CrudControllerBase<PublicImpactSnapshot>(db, permissions, userManager)
{
    protected override DbSet<PublicImpactSnapshot> Entities => Db.PublicImpactSnapshots;

    [AllowAnonymous]
    [HttpGet]
    public override async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var snapshots = await Db.PublicImpactSnapshots
            .AsNoTracking()
            .OrderByDescending(s => s.PublishedAt)
            .ThenByDescending(s => s.SnapshotDate)
            .ToListAsync(ct);

        return Ok(snapshots);
    }
}
