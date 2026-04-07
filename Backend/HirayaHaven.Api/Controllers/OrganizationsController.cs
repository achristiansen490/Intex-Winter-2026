using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class OrganizationsController(HirayaContext db) : CrudControllerBase<Organization>(db)
{
    protected override DbSet<Organization> Entities => Db.Organizations;

    [AllowAnonymous]
    [HttpGet]
    public override async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var organizations = await Db.Organizations.AsNoTracking().ToListAsync(ct);
        return Ok(organizations);
    }
}
