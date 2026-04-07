using HirayaHaven.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController(HirayaContext context) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
    {
        var safehouseCount = await context.Safehouses.CountAsync();
        var activeResidentCount = await context.Residents.CountAsync(r => r.CaseStatus == "Active");
        var partnerCount = await context.Partners.CountAsync(p => p.Status == "Active");
        var totalMonetaryAmount = await context.Donations
            .Where(d => d.DonationType == "Monetary")
            .SumAsync(d => d.Amount ?? 0);

        var topPost = await context.SocialMediaPosts
            .AsNoTracking()
            .OrderByDescending(p => p.EngagementRate)
            .ThenByDescending(p => p.Reach)
            .Select(p => new
            {
                p.PostId,
                p.Platform,
                p.CreatedAt,
                p.CampaignName,
                p.EngagementRate,
                p.Reach,
                p.DonationReferrals,
                p.EstimatedDonationValuePhp
            })
            .FirstOrDefaultAsync();

        return Ok(new
        {
            safehouseCount,
            activeResidentCount,
            partnerCount,
            totalMonetaryAmount,
            topPost
        });
    }
}
