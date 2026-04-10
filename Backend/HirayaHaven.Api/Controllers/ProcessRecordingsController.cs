using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using HirayaHaven.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class ProcessRecordingsController(HirayaContext db, IPermissionService permissions, UserManager<AppUser> userManager)
    : CrudControllerBase<ProcessRecording>(db, permissions, userManager)
{
    protected override DbSet<ProcessRecording> Entities => Db.ProcessRecordings;

    [HttpGet]
    public override async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var role = await GetUserRoleAsync();
        if (role is null) return Forbid();
        if (!await Permissions.CanAsync(role, ResourceName, "Read")) return Forbid();

        var user = await GetCurrentUserAsync();
        if (user is null) return Forbid();

        var query = Entities.AsNoTracking().AsQueryable();
        query = await ApplyScopingAsync(query, user, role);

        if (HttpContext.Request.Query.TryGetValue("residentId", out var raw)
            && int.TryParse(raw, out var residentId))
        {
            query = query.Where(x => x.ResidentId == residentId);
        }

        // Sort newest-first for timeline views.
        query = query.OrderByDescending(x => x.SessionDate).ThenByDescending(x => x.RecordingId);

        var list = await query.ToListAsync(ct);
        foreach (var item in list) RedactForRole(item, role);
        return Ok(list);
    }
}
