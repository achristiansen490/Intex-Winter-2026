using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class SocialMediaPostsController(HirayaContext db) : CrudControllerBase<SocialMediaPost>(db)
{
    protected override DbSet<SocialMediaPost> Entities => Db.SocialMediaPosts;

    [HttpGet]
    public override async Task<IActionResult> GetAll(CancellationToken ct)
    {
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
