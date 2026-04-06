using HirayaHaven.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public abstract class CrudControllerBase<TEntity> : ControllerBase where TEntity : class
{
    protected readonly HirayaContext Db;

    protected CrudControllerBase(HirayaContext db) => Db = db;

    protected abstract DbSet<TEntity> Entities { get; }

    [HttpGet]
    public virtual async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var list = await Entities.AsNoTracking().ToListAsync(ct);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public virtual async Task<IActionResult> GetById([FromRoute] int id, CancellationToken ct)
    {
        var entity = await Entities.FindAsync([id], ct);
        return entity is null ? NotFound() : Ok(entity);
    }

    [HttpPost]
    public virtual async Task<IActionResult> Create([FromBody] TEntity entity, CancellationToken ct)
    {
        Entities.Add(entity);
        await Db.SaveChangesAsync(ct);
        var id = (int)GetPrimaryKeyValue(entity)!;
        return CreatedAtAction(nameof(GetById), new { id }, entity);
    }

    [HttpPut("{id:int}")]
    public virtual async Task<IActionResult> Update([FromRoute] int id, [FromBody] TEntity entity, CancellationToken ct)
    {
        var existing = await Entities.FindAsync([id], ct);
        if (existing is null) return NotFound();
        Db.Entry(existing).CurrentValues.SetValues(entity);
        await Db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public virtual async Task<IActionResult> Delete([FromRoute] int id, CancellationToken ct)
    {
        var entity = await Entities.FindAsync([id], ct);
        if (entity is null) return NotFound();
        Entities.Remove(entity);
        await Db.SaveChangesAsync(ct);
        return NoContent();
    }

    protected object? GetPrimaryKeyValue(TEntity entity)
    {
        var pk = Db.Model.FindEntityType(typeof(TEntity))!.FindPrimaryKey()!.Properties[0];
        return entity.GetType().GetProperty(pk.Name)!.GetValue(entity);
    }
}
