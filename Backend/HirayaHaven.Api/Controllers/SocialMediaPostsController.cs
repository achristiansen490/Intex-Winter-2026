using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using HirayaHaven.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class SocialMediaPostsController(HirayaContext db, IPermissionService permissions, UserManager<AppUser> userManager)
    : CrudControllerBase<SocialMediaPost>(db, permissions, userManager)
{
    protected override DbSet<SocialMediaPost> Entities => Db.SocialMediaPosts;

    [HttpGet]
    public override async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var role = await GetUserRoleAsync();
        if (role is null) return Forbid();
        if (!await Permissions.CanAsync(role, ResourceName, "Read")) return Forbid();

        var take = 500;
        if (HttpContext.Request.Query.TryGetValue("take", out var raw) && int.TryParse(raw, out var t))
            take = Math.Clamp(t, 1, 500);

        var posts = await Db.SocialMediaPosts
            .AsNoTracking()
            .OrderByDescending(p => p.CreatedAt)
            .Take(take)
            .ToListAsync(ct);

        return Ok(posts);
    }
}
