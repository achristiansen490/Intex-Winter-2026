using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using HirayaHaven.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class SocialMediaPostsController(HirayaContext db, IPermissionService permissions, UserManager<AppUser> userManager)
    : CrudControllerBase<SocialMediaPost>(db, permissions, userManager)
{
    protected override DbSet<SocialMediaPost> Entities => Db.SocialMediaPosts;

    /// <summary>
    /// Public endpoint — social media posts are public content.
    /// Authenticated users get up to 500 posts; anonymous users get up to 100.
    /// </summary>
    [AllowAnonymous]
    [HttpGet]
    public override async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var isAuthenticated = User.Identity?.IsAuthenticated ?? false;
        var maxTake = isAuthenticated ? 500 : 100;

        var take = maxTake;
        if (HttpContext.Request.Query.TryGetValue("take", out var raw) && int.TryParse(raw, out var t))
            take = Math.Clamp(t, 1, maxTake);

        var posts = await Db.SocialMediaPosts
            .AsNoTracking()
            .OrderByDescending(p => p.CreatedAt)
            .Take(take)
            .ToListAsync(ct);

        return Ok(posts);
    }
}
