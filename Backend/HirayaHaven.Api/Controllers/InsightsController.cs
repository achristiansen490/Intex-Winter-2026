using HirayaHaven.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // These endpoints power portals; keep protected by default.
public class InsightsController(HirayaContext db) : ControllerBase
{
    private static DateTime? ParseDate(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        if (DateTime.TryParse(raw, out var dt)) return dt;
        return null;
    }

    private static DateTime? ToMonthStart(DateTime? dt)
        => dt.HasValue ? new DateTime(dt.Value.Year, dt.Value.Month, 1) : null;

    private static string SupporterDisplayName(HirayaHaven.Api.Models.Supporter s)
    {
        if (!string.IsNullOrWhiteSpace(s.DisplayName)) return s.DisplayName!;
        if (!string.IsNullOrWhiteSpace(s.OrganizationName)) return s.OrganizationName!;
        var first = s.FirstName?.Trim() ?? "";
        var last = s.LastName?.Trim() ?? "";
        var full = (first + " " + last).Trim();
        return string.IsNullOrWhiteSpace(full) ? $"Supporter #{s.SupporterId}" : full;
    }

    [HttpGet("donations/monthly")]
    public async Task<IActionResult> GetDonationsMonthly([FromQuery] int take = 120, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 240);
        // Pull minimal fields then aggregate in-memory to avoid provider-specific date grouping quirks.
        var rows = await db.Donations
            .AsNoTracking()
            .Select(d => new
            {
                d.DonationDate,
                ValuePhp = (decimal?)d.Amount ?? d.EstimatedValue ?? 0m
            })
            .ToListAsync(ct);

        var monthly = rows
            .Select(x => new { Month = ToMonthStart(ParseDate(x.DonationDate)), x.ValuePhp })
            .Where(x => x.Month.HasValue)
            .GroupBy(x => x.Month!.Value)
            .OrderBy(g => g.Key)
            .Select(g => new
            {
                month = g.Key,
                totalValuePhp = g.Sum(x => x.ValuePhp),
                donationCount = g.Count()
            })
            .ToList();

        if (monthly.Count > take)
            monthly = monthly.Skip(monthly.Count - take).ToList();
        return Ok(monthly);
    }

    [HttpGet("donations/by-campaign")]
    public async Task<IActionResult> GetDonationsByCampaign(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int take = 12,
        CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 100);

        // DonationDate is stored as TEXT in SQLite/EF model; parse in-memory for optional filtering.
        var rows = await db.Donations
            .AsNoTracking()
            .Select(d => new
            {
                d.DonationDate,
                d.CampaignName,
                ValuePhp = (decimal?)d.Amount ?? d.EstimatedValue ?? 0m
            })
            .ToListAsync(ct);

        var filtered = rows.Select(r => new { r.CampaignName, r.ValuePhp, Dt = ParseDate(r.DonationDate) });
        if (from.HasValue) filtered = filtered.Where(x => x.Dt.HasValue && x.Dt.Value >= from.Value);
        if (to.HasValue) filtered = filtered.Where(x => x.Dt.HasValue && x.Dt.Value <= to.Value);

        var byCampaign = filtered
            .GroupBy(x => string.IsNullOrWhiteSpace(x.CampaignName) ? "(none)" : x.CampaignName!)
            .Select(g => new
            {
                campaignName = g.Key,
                totalValuePhp = g.Sum(x => x.ValuePhp),
                donationCount = g.Count(),
                avgValuePhp = g.Count() == 0 ? 0 : g.Sum(x => x.ValuePhp) / g.Count()
            })
            .OrderByDescending(x => x.totalValuePhp)
            .ThenByDescending(x => x.donationCount)
            .Take(take)
            .ToList();

        return Ok(byCampaign);
    }

    [HttpGet("bridge/monthly")]
    public async Task<IActionResult> GetBridgeMonthly([FromQuery] int take = 120, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 240);
        // OUTREACH: social posts aggregated to month
        var postRows = await db.SocialMediaPosts
            .AsNoTracking()
            .Select(p => new
            {
                p.CreatedAt,
                p.Impressions,
                p.Reach,
                p.Likes,
                p.Comments,
                p.Shares,
                p.ClickThroughs,
                p.DonationReferrals
            })
            .ToListAsync(ct);

        var outreach = postRows
            .Select(x => new { Month = ToMonthStart(ParseDate(x.CreatedAt)), x.Impressions, x.Reach, x.Likes, x.Comments, x.Shares, x.ClickThroughs, x.DonationReferrals })
            .Where(x => x.Month.HasValue)
            .GroupBy(x => x.Month!.Value)
            .ToDictionary(
                g => g.Key,
                g => new
                {
                    posts_n = g.Count(),
                    impressions = g.Sum(x => (long)(x.Impressions ?? 0)),
                    reach = g.Sum(x => (long)(x.Reach ?? 0)),
                    likes = g.Sum(x => (long)(x.Likes ?? 0)),
                    comments = g.Sum(x => (long)(x.Comments ?? 0)),
                    shares = g.Sum(x => (long)(x.Shares ?? 0)),
                    click_throughs = g.Sum(x => (long)(x.ClickThroughs ?? 0)),
                    donation_referrals = g.Sum(x => (long)(x.DonationReferrals ?? 0)),
                });

        // MONEY: donations aggregated to month
        var donationRows = await db.Donations
            .AsNoTracking()
            .Select(d => new
            {
                d.DonationDate,
                ValuePhp = (decimal?)d.Amount ?? d.EstimatedValue ?? 0m
            })
            .ToListAsync(ct);

        var money = donationRows
            .Select(x => new { Month = ToMonthStart(ParseDate(x.DonationDate)), x.ValuePhp })
            .Where(x => x.Month.HasValue)
            .GroupBy(x => x.Month!.Value)
            .ToDictionary(
                g => g.Key,
                g => new
                {
                    donation_total_php = g.Sum(x => x.ValuePhp),
                    donation_n = g.Count()
                });

        // OUTCOMES: safehouse monthly metrics -> national aggregates by month
        var metricRows = await db.SafehouseMonthlyMetrics
            .AsNoTracking()
            .Select(m => new
            {
                m.MonthStart,
                m.ActiveResidents,
                m.AvgEducationProgress,
                m.AvgHealthScore,
                m.IncidentCount
            })
            .ToListAsync(ct);

        var outcomes = metricRows
            .Select(x => new { Month = ToMonthStart(ParseDate(x.MonthStart)), x.ActiveResidents, x.AvgEducationProgress, x.AvgHealthScore, x.IncidentCount })
            .Where(x => x.Month.HasValue)
            .GroupBy(x => x.Month!.Value)
            .ToDictionary(
                g => g.Key,
                g => new
                {
                    incidents = g.Sum(x => (long)(x.IncidentCount ?? 0)),
                    active_residents = g.Sum(x => (long)(x.ActiveResidents ?? 0)),
                    avg_edu_progress = g.Average(x => (double)(x.AvgEducationProgress ?? 0)),
                    avg_health = g.Average(x => (double)(x.AvgHealthScore ?? 0)),
                });

        var months = outreach.Keys
            .Union(money.Keys)
            .Union(outcomes.Keys)
            .OrderBy(d => d)
            .ToList();

        var bridge = months.Select(month =>
        {
            outreach.TryGetValue(month, out var o);
            money.TryGetValue(month, out var m);
            outcomes.TryGetValue(month, out var outc);

            return new
            {
                month,
                // outreach
                posts_n = o?.posts_n ?? 0,
                impressions = o?.impressions ?? 0,
                reach = o?.reach ?? 0,
                likes = o?.likes ?? 0,
                comments = o?.comments ?? 0,
                shares = o?.shares ?? 0,
                click_throughs = o?.click_throughs ?? 0,
                donation_referrals = o?.donation_referrals ?? 0,
                // money
                donation_total_php = m?.donation_total_php ?? 0m,
                donation_n = m?.donation_n ?? 0,
                // outcomes
                incidents = outc?.incidents ?? 0,
                active_residents = outc?.active_residents ?? 0,
                avg_edu_progress = outc?.avg_edu_progress ?? 0,
                avg_health = outc?.avg_health ?? 0
            };
        }).ToList();

        if (bridge.Count > take)
            bridge = bridge.Skip(bridge.Count - take).ToList();
        return Ok(bridge);
    }

    [HttpGet("donors/upgrade-candidates")]
    public async Task<IActionResult> GetDonorUpgradeCandidates([FromQuery] int take = 25, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 200);

        // Mirror `donor-upgrade-potential.ipynb` intent in a deployable, DB-driven way:
        // compute simple recency/frequency/monetary features and output a ranking.
        var supporters = await db.Supporters
            .AsNoTracking()
            .Select(s => new { s.SupporterId, s.DisplayName, s.OrganizationName, s.FirstName, s.LastName })
            .ToListAsync(ct);

        var donations = await db.Donations
            .AsNoTracking()
            .Select(d => new
            {
                d.SupporterId,
                d.DonationDate,
                ValuePhp = (decimal?)d.Amount ?? d.EstimatedValue ?? 0m
            })
            .ToListAsync(ct);

        var now = DateTime.UtcNow;
        var supporterById = supporters.ToDictionary(x => x.SupporterId);

        var ranked = donations
            .Select(d => new { d.SupporterId, Dt = ParseDate(d.DonationDate), d.ValuePhp })
            .Where(x => x.Dt.HasValue)
            .GroupBy(x => x.SupporterId)
            .Select(g =>
            {
                var ordered = g.OrderBy(x => x.Dt!.Value).ToList();
                var n = ordered.Count;
                var last = ordered[^1];
                var total = ordered.Sum(x => x.ValuePhp);
                var avg = n == 0 ? 0m : total / n;
                var recencyDays = Math.Max(0, (now - last.Dt!.Value).TotalDays);

                // Heuristic "expected next value" score:
                // - anchored to last gift size and historical average
                // - boosted by frequency (log scale)
                // - decayed by time since last gift
                var freqBoost = 1.0 + (Math.Log(1 + n) / 5.0);
                var recencyDecay = Math.Exp(-recencyDays / 180.0);
                var expectedNext = (double)(0.65m * last.ValuePhp + 0.35m * avg) * freqBoost * recencyDecay;

                supporterById.TryGetValue(g.Key, out var s);
                var display = s is null
                    ? $"Supporter #{g.Key}"
                    : SupporterDisplayName(new HirayaHaven.Api.Models.Supporter
                    {
                        SupporterId = s.SupporterId,
                        DisplayName = s.DisplayName,
                        OrganizationName = s.OrganizationName,
                        FirstName = s.FirstName,
                        LastName = s.LastName
                    });

                return new
                {
                    supporterId = g.Key,
                    supporterName = display,
                    donationCount = n,
                    totalValuePhp = total,
                    avgValuePhp = avg,
                    lastDonationDate = last.Dt!.Value,
                    lastValuePhp = last.ValuePhp,
                    recencyDays = (int)Math.Round(recencyDays),
                    expectedNextValuePhp = expectedNext
                };
            })
            .OrderByDescending(x => x.expectedNextValuePhp)
            .ThenByDescending(x => x.lastDonationDate)
            .Take(take)
            .ToList();

        return Ok(ranked);
    }

    [HttpGet("posts/donation-linkage/by-group")]
    public async Task<IActionResult> GetPostDonationLinkageByGroup(
        [FromQuery] string group = "platform",
        [FromQuery] int take = 12,
        CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 100);
        group = (group ?? "platform").Trim().ToLowerInvariant();
        if (group is not ("platform" or "topic" or "cta"))
            group = "platform";

        // Mirror `post-to-donation-linkage.ipynb` intent: summarize what post attributes correlate
        // with donation referrals and estimated referred value, without embedding an ML model server-side.
        var posts = await db.SocialMediaPosts
            .AsNoTracking()
            .Select(p => new
            {
                p.Platform,
                p.ContentTopic,
                p.CallToActionType,
                p.IsBoosted,
                p.DonationReferrals,
                p.EstimatedDonationValuePhp
            })
            .ToListAsync(ct);

        var rows = posts
            .Select(p =>
            {
                var key = group switch
                {
                    "topic" => string.IsNullOrWhiteSpace(p.ContentTopic) ? "(unknown)" : p.ContentTopic!,
                    "cta" => string.IsNullOrWhiteSpace(p.CallToActionType) ? "(none)" : p.CallToActionType!,
                    _ => string.IsNullOrWhiteSpace(p.Platform) ? "(unknown)" : p.Platform!,
                };
                var referrals = (long)(p.DonationReferrals ?? 0);
                var estPhp = (double)(p.EstimatedDonationValuePhp ?? 0.0);
                return new
                {
                    key,
                    isBoosted = p.IsBoosted ?? false,
                    referrals,
                    estPhp,
                    willRefer = referrals > 0
                };
            })
            .GroupBy(x => x.key)
            .Select(g => new
            {
                group = group,
                key = g.Key,
                postCount = g.Count(),
                willReferRate = g.Count() == 0 ? 0 : (double)g.Count(x => x.willRefer) / g.Count(),
                avgReferrals = g.Count() == 0 ? 0 : g.Average(x => (double)x.referrals),
                totalEstimatedValuePhp = g.Sum(x => x.estPhp),
                avgEstimatedValuePhp = g.Count() == 0 ? 0 : g.Average(x => x.estPhp),
                boostedRate = g.Count() == 0 ? 0 : (double)g.Count(x => x.isBoosted) / g.Count()
            })
            .OrderByDescending(x => x.totalEstimatedValuePhp)
            .ThenByDescending(x => x.willReferRate)
            .Take(take)
            .ToList();

        return Ok(rows);
    }
}

