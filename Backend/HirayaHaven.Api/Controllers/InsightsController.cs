using HirayaHaven.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

[ApiController]
[Route("api/insights")]
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

    private static double QuantileP75(IReadOnlyList<double> values)
    {
        if (values.Count == 0) return 0;
        var sorted = values.OrderBy(x => x).ToList();
        var pos = 0.75 * (sorted.Count - 1);
        var lo = (int)Math.Floor(pos);
        var hi = (int)Math.Ceiling(pos);
        if (lo == hi) return sorted[lo];
        return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
    }

    private static double ZWithinGroup(IReadOnlyList<double> xs, double x)
    {
        if (xs.Count == 0) return 0;
        var mean = xs.Average();
        var variance = xs.Sum(v => (v - mean) * (v - mean)) / xs.Count;
        var std = Math.Sqrt(variance);
        return std < 1e-9 ? 0 : (x - mean) / std;
    }

    /// <summary>Aggregate donation totals by month — allowed for the public Impact page.</summary>
    [AllowAnonymous]
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

    /// <summary>
    /// Engagement vs vanity segment mix (see <c>engagement-vs-vanity.ipynb</c>).
    /// Uses P75 thresholds on the full post set for dashboard use (associative / exploratory).
    /// </summary>
    [HttpGet("social/engagement-vs-vanity")]
    public async Task<IActionResult> GetEngagementVsVanity(CancellationToken ct = default)
    {
        var posts = await db.SocialMediaPosts
            .AsNoTracking()
            .Select(p => new
            {
                p.Likes,
                p.Comments,
                p.Shares,
                p.DonationReferrals
            })
            .ToListAsync(ct);

        var engagementScores = posts
            .Select(p => (double)((p.Likes ?? 0) + (p.Comments ?? 0) + (p.Shares ?? 0)))
            .ToList();
        var referralCounts = posts
            .Select(p => (double)(p.DonationReferrals ?? 0))
            .ToList();

        var engP75 = QuantileP75(engagementScores);
        var donP75 = QuantileP75(referralCounts);

        var counts = new Dictionary<string, int>(StringComparer.Ordinal)
        {
            ["both_high"] = 0,
            ["engagement_only"] = 0,
            ["donation_only"] = 0,
            ["neither"] = 0
        };

        foreach (var p in posts)
        {
            var eng = (double)((p.Likes ?? 0) + (p.Comments ?? 0) + (p.Shares ?? 0));
            var don = (double)(p.DonationReferrals ?? 0);
            var hiE = eng >= engP75 ? 1 : 0;
            var hiD = don >= donP75 ? 1 : 0;
            string seg;
            if (hiE == 1 && hiD == 1) seg = "both_high";
            else if (hiE == 1) seg = "engagement_only";
            else if (hiD == 1) seg = "donation_only";
            else seg = "neither";
            counts[seg]++;
        }

        return Ok(new
        {
            totalPosts = posts.Count,
            thresholds = new { engagementScoreP75 = engP75, donationReferralsP75 = donP75 },
            segments = counts.Select(kv => new { segment = kv.Key, postCount = kv.Value }).ToList()
        });
    }

    /// <summary>
    /// Per-safehouse latest month strain snapshot + simple next-month incident heuristic
    /// (see <c>safehouse-strain-forecast.ipynb</c> for methodology; not the offline RF model).
    /// </summary>
    [HttpGet("safehouses/strain/latest")]
    public async Task<IActionResult> GetSafehouseStrainLatest([FromQuery] int take = 25, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 100);

        var rows = await (
            from m in db.SafehouseMonthlyMetrics.AsNoTracking()
            join s in db.Safehouses.AsNoTracking() on m.SafehouseId equals s.SafehouseId
            select new
            {
                m.SafehouseId,
                SafehouseName = s.Name ?? s.SafehouseCode ?? ("Safehouse " + m.SafehouseId),
                m.MonthStart,
                Incidents = (double)(m.IncidentCount ?? 0),
                Edu = (double)(m.AvgEducationProgress ?? 0),
                Health = (double)(m.AvgHealthScore ?? 0),
                Active = (long)(m.ActiveResidents ?? 0)
            }
        ).ToListAsync(ct);

        var parsed = rows
            .Select(r => new
            {
                r.SafehouseId,
                r.SafehouseName,
                Month = ParseDate(r.MonthStart),
                r.Incidents,
                r.Edu,
                r.Health,
                r.Active
            })
            .Where(x => x.Month.HasValue)
            .ToList();

        var byMonth = parsed.GroupBy(x => x.Month!.Value).ToDictionary(g => g.Key, g => g.ToList());

        double StressFor(int safehouseId, DateTime month, double inc, double edu, double health)
        {
            if (!byMonth.TryGetValue(month, out var bucket) || bucket.Count == 0)
                return 0;
            var incs = bucket.Select(b => b.Incidents).ToList();
            var edus = bucket.Select(b => b.Edu).ToList();
            var healths = bucket.Select(b => b.Health).ToList();
            var zInc = ZWithinGroup(incs, inc);
            var zEdu = ZWithinGroup(edus, edu);
            var zH = ZWithinGroup(healths, health);
            return zInc - zEdu - zH;
        }

        var bySh = parsed.GroupBy(x => x.SafehouseId).ToList();
        var latestRows = new List<(
            int SafehouseId,
            string SafehouseName,
            DateTime Month,
            double IncidentCount,
            double? IncidentLag1,
            double? IncidentLag2,
            double StressIndexZ,
            double ForecastNext,
            long ActiveResidents,
            double AvgEducationProgress,
            double AvgHealthScore)>();

        foreach (var g in bySh)
        {
            var ordered = g.OrderBy(x => x.Month!.Value).ToList();
            if (ordered.Count == 0) continue;
            var last = ordered[^1];
            var month = last.Month!.Value;
            var lag1 = ordered.Count >= 2 ? ordered[^2].Incidents : (double?)null;
            var lag2 = ordered.Count >= 3 ? ordered[^3].Incidents : (double?)null;

            var stress = StressFor(g.Key, month, last.Incidents, last.Edu, last.Health);

            var lag1v = lag1 ?? last.Incidents;
            var lag2v = lag2 ?? lag1v;
            var forecast = Math.Max(0, last.Incidents * 0.55 + lag1v * 0.35 + lag2v * 0.1);

            latestRows.Add((
                g.Key,
                last.SafehouseName,
                month,
                last.Incidents,
                lag1,
                lag2,
                stress,
                Math.Round(forecast, 2),
                last.Active,
                last.Edu,
                last.Health));
        }

        var ranked = latestRows
            .OrderByDescending(x => x.StressIndexZ)
            .Take(take)
            .Select(x => new
            {
                safehouseId = x.SafehouseId,
                safehouseName = x.SafehouseName,
                month = x.Month,
                incidentCount = x.IncidentCount,
                incidentLag1 = x.IncidentLag1,
                incidentLag2 = x.IncidentLag2,
                stressIndexZ = x.StressIndexZ,
                forecastNextMonthIncidents = x.ForecastNext,
                activeResidents = x.ActiveResidents,
                avgEducationProgress = x.AvgEducationProgress,
                avgHealthScore = x.AvgHealthScore
            })
            .ToList();

        return Ok(ranked);
    }

    private static string ResidentLabel(string? caseControlNo, string? internalCode, int residentId)
    {
        if (!string.IsNullOrWhiteSpace(caseControlNo)) return caseControlNo!;
        if (!string.IsNullOrWhiteSpace(internalCode)) return internalCode!;
        return $"Resident #{residentId}";
    }

    private static int CurrentRiskLevelPoints(string? level)
    {
        if (string.IsNullOrWhiteSpace(level)) return 6;
        var x = level.Trim().ToLowerInvariant();
        if (x.Contains("critical")) return 28;
        if (x.Contains("high")) return 18;
        if (x.Contains("medium")) return 10;
        if (x.Contains("low")) return 4;
        return 6;
    }

    private static Dictionary<int, double> LatestEducationProgressByResident(
        IEnumerable<(int ResidentId, string? RecordDate, double? ProgressPercent)> rows)
    {
        return rows
            .Select(x => (x.ResidentId, Dt: ParseDate(x.RecordDate), x.ProgressPercent))
            .Where(x => x.Dt.HasValue && x.ProgressPercent.HasValue)
            .GroupBy(x => x.ResidentId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderByDescending(x => x.Dt!.Value).First().ProgressPercent!.Value);
    }

    private static Dictionary<int, double> LatestHealthScoreByResident(
        IEnumerable<(int ResidentId, string? RecordDate, double? GeneralHealthScore)> rows)
    {
        return rows
            .Select(x => (x.ResidentId, Dt: ParseDate(x.RecordDate), x.GeneralHealthScore))
            .Where(x => x.Dt.HasValue && x.GeneralHealthScore.HasValue)
            .GroupBy(x => x.ResidentId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderByDescending(x => x.Dt!.Value).First().GeneralHealthScore!.Value);
    }

    /// <summary>
    /// Intervention plan categories vs latest education/health outcomes (associative; see <c>intervention-effectiveness.ipynb</c>).
    /// </summary>
    [HttpGet("interventions/by-category")]
    public async Task<IActionResult> GetInterventionsByCategory(CancellationToken ct = default)
    {
        var plans = await db.InterventionPlans
            .AsNoTracking()
            .Select(p => new { p.ResidentId, p.PlanCategory })
            .ToListAsync(ct);

        var eduRows = await db.EducationRecords
            .AsNoTracking()
            .Select(e => new { e.ResidentId, e.RecordDate, e.ProgressPercent })
            .ToListAsync(ct);

        var healthRows = await db.HealthWellbeingRecords
            .AsNoTracking()
            .Select(h => new { h.ResidentId, h.RecordDate, h.GeneralHealthScore })
            .ToListAsync(ct);

        var latestEdu = LatestEducationProgressByResident(
            eduRows.Select(e => (e.ResidentId, e.RecordDate, e.ProgressPercent)));
        var latestHealth = LatestHealthScoreByResident(
            healthRows.Select(h => (h.ResidentId, h.RecordDate, h.GeneralHealthScore)));

        var grouped = plans.GroupBy(p => string.IsNullOrWhiteSpace(p.PlanCategory) ? "(unknown)" : p.PlanCategory!.Trim());
        var list = grouped
            .Select(g =>
            {
                var rids = g.Select(p => p.ResidentId).Distinct().ToList();
                double? avgEdu = null;
                var withEdu = rids.Where(latestEdu.ContainsKey).ToList();
                if (withEdu.Count > 0) avgEdu = withEdu.Average(rid => latestEdu[rid]);

                double? avgHl = null;
                var withHl = rids.Where(latestHealth.ContainsKey).ToList();
                if (withHl.Count > 0) avgHl = withHl.Average(rid => latestHealth[rid]);

                return new
                {
                    planCategory = g.Key,
                    planCount = g.Count(),
                    residentCount = rids.Count,
                    avgLatestProgressPercent = avgEdu,
                    avgLatestHealthScore = avgHl
                };
            })
            .OrderByDescending(x => x.planCount)
            .ToList();

        return Ok(list);
    }

    /// <summary>
    /// Staff triage heuristic for elevated safety concern (not the notebook’s sklearn model; see <c>resident-risk-flag.ipynb</c>).
    /// </summary>
    [HttpGet("residents/risk-flags")]
    public async Task<IActionResult> GetResidentRiskFlags([FromQuery] int take = 50, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 200);
        var now = DateTime.UtcNow;
        var d90 = now.AddDays(-90);

        var residents = await db.Residents
            .AsNoTracking()
            .Select(r => new { r.ResidentId, r.CaseControlNo, r.InternalCode, r.SafehouseId, r.CaseStatus, r.CurrentRiskLevel })
            .ToListAsync(ct);

        var active = residents.Where(r =>
            string.IsNullOrWhiteSpace(r.CaseStatus) ||
            !string.Equals(r.CaseStatus, "Closed", StringComparison.OrdinalIgnoreCase)).ToList();

        var incidents = await db.IncidentReports
            .AsNoTracking()
            .Select(i => new { i.ResidentId, i.IncidentDate })
            .ToListAsync(ct);

        var processes = await db.ProcessRecordings
            .AsNoTracking()
            .Select(p => new { p.ResidentId, p.SessionDate, p.ConcernsFlagged })
            .ToListAsync(ct);

        var visits = await db.HomeVisitations
            .AsNoTracking()
            .Select(v => new { v.ResidentId, v.VisitDate, v.SafetyConcernsNoted })
            .ToListAsync(ct);

        int Incidents90(int rid) => incidents.Count(i =>
            i.ResidentId == rid
            && ParseDate(i.IncidentDate) is { } dt
            && dt >= d90 && dt <= now);

        int Concerns90(int rid) => processes.Count(p =>
            p.ResidentId == rid
            && p.ConcernsFlagged == true
            && ParseDate(p.SessionDate) is { } dt
            && dt >= d90 && dt <= now);

        int SafetyVisits90(int rid) => visits.Count(v =>
            v.ResidentId == rid
            && v.SafetyConcernsNoted == true
            && ParseDate(v.VisitDate) is { } dt
            && dt >= d90 && dt <= now);

        var rows = active
            .Select(r =>
            {
                var i90 = Incidents90(r.ResidentId);
                var c90 = Concerns90(r.ResidentId);
                var s90 = SafetyVisits90(r.ResidentId);
                var pts = CurrentRiskLevelPoints(r.CurrentRiskLevel);
                var score = Math.Min(100.0, i90 * 18 + c90 * 12 + s90 * 14 + pts);
                var band = score >= 60 ? "High" : score >= 35 ? "Medium" : "Low";
                return new
                {
                    r.ResidentId,
                    residentLabel = ResidentLabel(r.CaseControlNo, r.InternalCode, r.ResidentId),
                    r.SafehouseId,
                    riskScore = Math.Round(score, 1),
                    riskBand = band,
                    incidents90d = i90,
                    concernSessions90d = c90,
                    safetyVisitFlags90d = s90,
                    currentRiskLevel = r.CurrentRiskLevel ?? "—"
                };
            })
            .OrderByDescending(x => x.riskScore)
            .Take(take)
            .ToList();

        return Ok(rows);
    }

    /// <summary>
    /// Reintegration readiness-style score (heuristic; see <c>reintegration-readiness.ipynb</c>). Staff-only; not an automated decision.
    /// </summary>
    [HttpGet("residents/reintegration-readiness")]
    public async Task<IActionResult> GetReintegrationReadiness([FromQuery] int take = 50, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 200);
        var now = DateTime.UtcNow;
        var d180 = now.AddDays(-180);
        var d365 = now.AddDays(-365);

        var residents = await db.Residents
            .AsNoTracking()
            .Select(r => new { r.ResidentId, r.CaseControlNo, r.InternalCode, r.SafehouseId, r.CaseStatus, r.ReintegrationStatus })
            .ToListAsync(ct);

        var eduRows = await db.EducationRecords
            .AsNoTracking()
            .Select(e => new { e.ResidentId, e.RecordDate, e.ProgressPercent })
            .ToListAsync(ct);

        var healthRows = await db.HealthWellbeingRecords
            .AsNoTracking()
            .Select(h => new { h.ResidentId, h.RecordDate, h.GeneralHealthScore })
            .ToListAsync(ct);

        var incidents = await db.IncidentReports
            .AsNoTracking()
            .Select(i => new { i.ResidentId, i.IncidentDate })
            .ToListAsync(ct);

        var visits = await db.HomeVisitations
            .AsNoTracking()
            .Select(v => new { v.ResidentId, v.VisitDate })
            .ToListAsync(ct);

        var latestEdu = LatestEducationProgressByResident(
            eduRows.Select(e => (e.ResidentId, e.RecordDate, e.ProgressPercent)));
        var latestHealth = LatestHealthScoreByResident(
            healthRows.Select(h => (h.ResidentId, h.RecordDate, h.GeneralHealthScore)));

        int Incidents365(int rid) => incidents.Count(i =>
            i.ResidentId == rid
            && ParseDate(i.IncidentDate) is { } dt
            && dt >= d365 && dt <= now);

        int Visits180(int rid) => visits.Count(v =>
            v.ResidentId == rid
            && ParseDate(v.VisitDate) is { } dt
            && dt >= d180 && dt <= now);

        var open = residents.Where(r =>
            string.IsNullOrWhiteSpace(r.CaseStatus) ||
            !string.Equals(r.CaseStatus, "Closed", StringComparison.OrdinalIgnoreCase)).ToList();

        var rows = open
            .Select(r =>
            {
                var completed = string.Equals(r.ReintegrationStatus, "Completed", StringComparison.OrdinalIgnoreCase);
                var eduV = latestEdu.TryGetValue(r.ResidentId, out var e) ? e : 50.0;
                var hV = latestHealth.TryGetValue(r.ResidentId, out var h) ? h : 50.0;
                var inc365 = Incidents365(r.ResidentId);
                var v180 = Visits180(r.ResidentId);

                double readiness;
                if (completed)
                {
                    readiness = 100;
                }
                else
                {
                    readiness = eduV * 0.38 + hV * 0.38 + Math.Min(15, v180 * 1.2) - Math.Min(28, inc365 * 5.5);
                    if (string.Equals(r.ReintegrationStatus, "On Hold", StringComparison.OrdinalIgnoreCase))
                        readiness -= 18;
                    if (string.Equals(r.ReintegrationStatus, "Not Started", StringComparison.OrdinalIgnoreCase))
                        readiness -= 8;
                    readiness = Math.Clamp(readiness, 0, 99);
                }

                return new
                {
                    r.ResidentId,
                    residentLabel = ResidentLabel(r.CaseControlNo, r.InternalCode, r.ResidentId),
                    r.SafehouseId,
                    reintegrationStatus = r.ReintegrationStatus ?? "—",
                    readinessScore = Math.Round(readiness, 1),
                    latestProgressPercent = latestEdu.TryGetValue(r.ResidentId, out var le) ? le : (double?)null,
                    latestHealthScore = latestHealth.TryGetValue(r.ResidentId, out var lh) ? lh : (double?)null,
                    incidentsLast365d = inc365,
                    homeVisitsLast180d = v180
                };
            })
            .OrderByDescending(x => x.readinessScore)
            .Take(take)
            .ToList();

        return Ok(rows);
    }
}
