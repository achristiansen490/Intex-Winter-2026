using HirayaHaven.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SafehousesController(HirayaContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var safehouses = await context.Safehouses
            .AsNoTracking()
            .OrderBy(s => s.SafehouseCode)
            .Select(s => new
            {
                s.SafehouseId,
                s.SafehouseCode,
                s.Name,
                s.Region,
                s.City,
                s.Province,
                s.Status,
                s.CapacityGirls,
                s.CurrentOccupancy
            })
            .ToListAsync();

        return Ok(safehouses);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var safehouse = await context.Safehouses
            .AsNoTracking()
            .Where(s => s.SafehouseId == id)
            .Select(s => new
            {
                s.SafehouseId,
                s.SafehouseCode,
                s.Name,
                s.Region,
                s.City,
                s.Province,
                s.Country,
                s.Status,
                s.CapacityGirls,
                s.CurrentOccupancy,
                ActiveResidents = context.Residents.Count(r => r.SafehouseId == s.SafehouseId && r.CaseStatus == "Active")
            })
            .FirstOrDefaultAsync();

        return safehouse is null ? NotFound() : Ok(safehouse);
    }
}
