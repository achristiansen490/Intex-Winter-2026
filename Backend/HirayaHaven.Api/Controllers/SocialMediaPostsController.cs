using HirayaHaven.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SocialMediaPostsController(HirayaContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int take = 100)
    {
        take = Math.Clamp(take, 1, 500);

        var posts = await context.SocialMediaPosts
            .AsNoTracking()
            .OrderByDescending(p => p.CreatedAt)
            .Take(take)
            .Select(p => new
            {
                p.PostId,
                p.Platform,
                p.CreatedAt,
                p.PostType,
                p.ContentTopic,
                p.CampaignName,
                p.Impressions,
                p.Reach,
                p.Likes,
                p.Comments,
                p.Shares,
                p.EngagementRate,
                p.DonationReferrals,
                p.EstimatedDonationValuePhp
            })
            .ToListAsync();

        return Ok(posts);
    }
}
