using HirayaHaven.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DonationsController(HirayaContext context) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int take = 100)
    {
        take = Math.Clamp(take, 1, 500);

        var donations = await context.Donations
            .AsNoTracking()
            .OrderByDescending(d => d.DonationDate)
            .Take(take)
            .Select(d => new
            {
                d.DonationId,
                d.DonationDate,
                d.DonationType,
                d.ChannelSource,
                d.CampaignName,
                d.CurrencyCode,
                d.Amount,
                d.EstimatedValue,
                d.ImpactUnit,
                SupporterName = d.Supporter != null ? d.Supporter.DisplayName : null
            })
            .ToListAsync();

        return Ok(donations);
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var totalDonationRows = await context.Donations.CountAsync();
        var totalMonetaryAmount = await context.Donations
            .Where(d => d.DonationType == "Monetary")
            .SumAsync(d => d.Amount ?? 0);

        var totalEstimatedValue = await context.Donations.SumAsync(d => d.EstimatedValue ?? 0);

        var byType = await context.Donations
            .GroupBy(d => d.DonationType)
            .Select(g => new
            {
                DonationType = g.Key,
                Count = g.Count(),
                TotalAmount = g.Sum(x => x.Amount ?? 0),
                TotalEstimatedValue = g.Sum(x => x.EstimatedValue ?? 0)
            })
            .OrderByDescending(x => x.TotalEstimatedValue)
            .ToListAsync();

        return Ok(new
        {
            totalDonationRows,
            totalMonetaryAmount,
            totalEstimatedValue,
            byType
        });
    }
}
