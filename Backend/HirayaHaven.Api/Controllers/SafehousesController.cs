using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class SafehousesController(HirayaContext db) : CrudControllerBase<Safehouse>(db)
{
    protected override DbSet<Safehouse> Entities => Db.Safehouses;

    [HttpGet("{id:int}")]
    public override async Task<IActionResult> GetById([FromRoute] int id, CancellationToken ct)
    {
        var row = await Db.Safehouses
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
                s.OpenDate,
                s.Status,
                s.CapacityGirls,
                s.CapacityStaff,
                s.CurrentOccupancy,
                s.Notes,
                ActiveResidents = Db.Residents.Count(r => r.SafehouseId == s.SafehouseId && r.CaseStatus == "Active")
            })
            .FirstOrDefaultAsync(ct);

        return row is null ? NotFound() : Ok(row);
    }
}
