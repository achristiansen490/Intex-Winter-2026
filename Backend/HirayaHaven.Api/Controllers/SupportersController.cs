using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class SupportersController(HirayaContext db) : CrudControllerBase<Supporter>(db)
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
