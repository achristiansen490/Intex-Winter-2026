using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using HirayaHaven.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class PartnersController(HirayaContext db, IPermissionService permissions, UserManager<AppUser> userManager)
    : CrudControllerBase<Partner>(db, permissions, userManager)
{
    protected override DbSet<Partner> Entities => Db.Partners;

    [HttpGet]
    public override async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var role = await GetUserRoleAsync();
        if (role is null) return Forbid();
        if (!await Permissions.CanAsync(role, ResourceName, "Read")) return Forbid();

        var query = Db.Partners.AsNoTracking();
        if (HttpContext.Request.Query.TryGetValue("activeOnly", out var raw)
            && bool.TryParse(raw, out var activeOnly)
            && activeOnly)
        {
            query = query.Where(p => p.Status == "Active");
        }

        var partners = await query
            .OrderBy(p => p.PartnerName)
            .Select(p => new
            {
                p.PartnerId,
                p.PartnerName,
                p.PartnerType,
                p.RoleType,
                p.Region,
                p.Status,
                Assignments = p.PartnerAssignments.Count
            })
            .ToListAsync(ct);

        return Ok(partners);
    }

    [HttpGet("{id:int}")]
    public override async Task<IActionResult> GetById([FromRoute] int id, CancellationToken ct)
    {
        var role = await GetUserRoleAsync();
        if (role is null) return Forbid();
        if (!await Permissions.CanAsync(role, ResourceName, "Read")) return Forbid();

        var partner = await Db.Partners
            .AsNoTracking()
            .Where(p => p.PartnerId == id)
            .Select(p => new
            {
                p.PartnerId,
                p.PartnerName,
                p.PartnerType,
                p.RoleType,
                p.ContactName,
                p.Email,
                p.Phone,
                p.Region,
                p.Status,
                p.StartDate,
                p.EndDate,
                p.Notes,
                Assignments = p.PartnerAssignments
                    .Select(a => new
                    {
                        a.AssignmentId,
                        a.ProgramArea,
                        a.AssignmentStart,
                        a.AssignmentEnd,
                        a.Status,
                        a.IsPrimary,
                        a.SafehouseId,
                        SafehouseName = a.Safehouse != null ? a.Safehouse.Name : null
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync(ct);

        return partner is null ? NotFound() : Ok(partner);
    }
}
