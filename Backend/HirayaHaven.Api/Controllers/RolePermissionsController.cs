using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using HirayaHaven.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class RolePermissionsController(HirayaContext db, IPermissionService permissions, UserManager<AppUser> userManager)
    : CrudControllerBase<RolePermission>(db, permissions, userManager)
{
    protected override DbSet<RolePermission> Entities => Db.RolePermissions;

    public override async Task<IActionResult> Create([FromBody] RolePermission entity, CancellationToken ct)
    {
        var result = await base.Create(entity, ct);
        InvalidateIfSuccess(result);
        return result;
    }

    public override async Task<IActionResult> Update([FromRoute] int id, [FromBody] RolePermission entity, CancellationToken ct)
    {
        var result = await base.Update(id, entity, ct);
        InvalidateIfSuccess(result);
        return result;
    }

    public override async Task<IActionResult> Delete([FromRoute] int id, CancellationToken ct)
    {
        var result = await base.Delete(id, ct);
        InvalidateIfSuccess(result);
        return result;
    }

    private void InvalidateIfSuccess(IActionResult result)
    {
        var ok = result switch
        {
            CreatedAtActionResult => true,
            NoContentResult => true,
            AcceptedResult => true,
            ObjectResult { StatusCode: int sc } => sc >= 200 && sc < 300,
            StatusCodeResult { StatusCode: int sc } => sc >= 200 && sc < 300,
            _ => false
        };
        if (ok)
            Permissions.InvalidatePermissionCache();
    }
}
