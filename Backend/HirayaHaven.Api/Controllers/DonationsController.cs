using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class DonationsController(HirayaContext db) : CrudControllerBase<Donation>(db)
{
    protected override DbSet<Donation> Entities => Db.Donations;

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(CancellationToken ct)
    {
        var totalDonationRows = await Db.Donations.CountAsync(ct);
        var totalMonetaryAmount = await Db.Donations
            .Where(d => d.DonationType == "Monetary")
            .SumAsync(d => d.Amount ?? 0, ct);

        var totalEstimatedValue = await Db.Donations.SumAsync(d => d.EstimatedValue ?? 0, ct);

        var byType = await Db.Donations
            .GroupBy(d => d.DonationType)
            .Select(g => new
            {
                DonationType = g.Key,
                Count = g.Count(),
                TotalAmount = g.Sum(x => x.Amount ?? 0),
                TotalEstimatedValue = g.Sum(x => x.EstimatedValue ?? 0)
            })
            .OrderByDescending(x => x.TotalEstimatedValue)
            .ToListAsync(ct);

        return Ok(new
        {
            totalDonationRows,
            totalMonetaryAmount,
            totalEstimatedValue,
            byType
        });
    }
}
