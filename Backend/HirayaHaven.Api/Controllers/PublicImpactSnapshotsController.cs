using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using HirayaHaven.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class PublicImpactSnapshotsController(HirayaContext db, IPermissionService permissions, UserManager<AppUser> userManager)
    : CrudControllerBase<PublicImpactSnapshot>(db, permissions, userManager)
{
    protected override DbSet<PublicImpactSnapshot> Entities => Db.PublicImpactSnapshots;

    /// <summary>Published impact snapshots are public — shown on landing page.</summary>
    [AllowAnonymous]
    [HttpGet]
    public override async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var snapshots = await Db.PublicImpactSnapshots
            .AsNoTracking()
            .Where(s => s.IsPublished == true)
            .OrderByDescending(s => s.PublishedAt)
            .ThenByDescending(s => s.SnapshotDate)
            .ToListAsync(ct);

        return Ok(snapshots);
    }
}
