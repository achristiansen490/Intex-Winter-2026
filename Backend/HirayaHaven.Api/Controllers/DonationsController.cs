using System.Security.Claims;
using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class DonationsController(HirayaContext db, UserManager<AppUser> userManager)
    : CrudControllerBase<Donation>(db)
{
    protected override DbSet<Donation> Entities => Db.Donations;

    [Authorize(Roles = "Admin,Donor")]
    [HttpGet]
    public override async Task<IActionResult> GetAll(CancellationToken ct)
    {
        if (User.IsInRole("Admin"))
        {
            var all = await Db.Donations.AsNoTracking().ToListAsync(ct);
            return Ok(all);
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await userManager.FindByIdAsync(userId!);
        if (user?.SupporterId is null) return Forbid();

        var donations = await Db.Donations
            .Where(d => d.SupporterId == user.SupporterId)
            .AsNoTracking()
            .ToListAsync(ct);
        return Ok(donations);
    }

    [HttpGet("summary")]
    [AllowAnonymous]
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

    [HttpGet("public")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublicDonations(CancellationToken ct)
    {
        var take = 25;
        if (HttpContext.Request.Query.TryGetValue("take", out var raw) && int.TryParse(raw, out var t))
            take = Math.Clamp(t, 1, 100);

        var donations = await Db.Donations
            .AsNoTracking()
            .OrderByDescending(d => d.DonationDate)
            .Take(take)
            .Select(d => new
            {
                d.DonationId,
                d.DonationDate,
                d.DonationType,
                d.CampaignName,
                d.ChannelSource,
                d.CurrencyCode,
                d.Amount,
                d.EstimatedValue
            })
            .ToListAsync(ct);

        return Ok(donations);
    }
}
