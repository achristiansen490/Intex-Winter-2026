using HirayaHaven.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PartnersController(HirayaContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool activeOnly = false)
    {
        var query = context.Partners.AsNoTracking();

        if (activeOnly)
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
            .ToListAsync();

        return Ok(partners);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var partner = await context.Partners
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
            .FirstOrDefaultAsync();

        return partner is null ? NotFound() : Ok(partner);
    }
}
