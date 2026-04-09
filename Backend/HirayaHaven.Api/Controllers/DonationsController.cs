using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using HirayaHaven.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class DonationsController(HirayaContext db, IPermissionService permissions, UserManager<AppUser> userManager)
    : CrudControllerBase<Donation>(db, permissions, userManager)
{
    protected override DbSet<Donation> Entities => Db.Donations;

    [HttpPost]
    public override async Task<IActionResult> Create([FromBody] Donation entity, CancellationToken ct)
    {
        var role = await GetUserRoleAsync();
        if (role is null) return Forbid();
        if (!await Permissions.CanAsync(role, ResourceName, "Create")) return Forbid();

        if (role == "Donor")
        {
            var user = await GetCurrentUserAsync();
            if (user?.SupporterId is null)
                return BadRequest(new { message = "Your account is not linked to a supporter profile." });
            entity.SupporterId = user.SupporterId.Value;
        }

        Entities.Add(entity);
        await Db.SaveChangesAsync(ct);
        var id = (int)GetPrimaryKeyValue(entity)!;
        return CreatedAtAction(nameof(GetById), new { id }, entity);
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(CancellationToken ct)
    {
        var role = await GetUserRoleAsync();
        if (role is null) return Forbid();
        if (!await Permissions.CanAsync(role, ResourceName, "Read")) return Forbid();

        var user = await GetCurrentUserAsync();
        if (user is null) return Forbid();

        IQueryable<Donation> q = Db.Donations.AsNoTracking();
        if (role == "Donor")
        {
            if (!user.SupporterId.HasValue)
            {
                return Ok(new
                {
                    totalDonationRows = 0,
                    totalMonetaryAmount = 0m,
                    totalEstimatedValue = 0m,
                    byType = Array.Empty<object>()
                });
            }

            q = q.Where(d => d.SupporterId == user.SupporterId.Value);
        }

        var totalDonationRows = await q.CountAsync(ct);
        var totalMonetaryAmount = await q
            .Where(d => d.DonationType == "Monetary")
            .SumAsync(d => d.Amount ?? 0, ct);

        var totalEstimatedValue = await q.SumAsync(d => d.EstimatedValue ?? 0, ct);

        var byType = await q
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

        return Ok(new { totalDonationRows, totalMonetaryAmount, totalEstimatedValue, byType });
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
