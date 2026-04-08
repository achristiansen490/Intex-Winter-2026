using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using HirayaHaven.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class SupportersController(HirayaContext db, IPermissionService permissions, UserManager<AppUser> userManager)
    : CrudControllerBase<Supporter>(db, permissions, userManager)
{
    protected override DbSet<Supporter> Entities => Db.Supporters;

    [AllowAnonymous]
    [HttpGet]
    public override async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var supporters = await Db.Supporters.AsNoTracking().ToListAsync(ct);
        return Ok(supporters);
    }
}
