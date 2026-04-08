using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using HirayaHaven.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class OrganizationsController(HirayaContext db, IPermissionService permissions, UserManager<AppUser> userManager)
    : CrudControllerBase<Organization>(db, permissions, userManager)
{
    protected override DbSet<Organization> Entities => Db.Organizations;

    /// <summary>Basic org info is public — used on the landing page.</summary>
    [AllowAnonymous]
    [HttpGet]
    public override async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var organizations = await Db.Organizations.AsNoTracking().ToListAsync(ct);
        return Ok(organizations);
    }
}
