using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Supervisor,CaseManager,SocialWorker,FieldWorker")]
public class OkrsController(HirayaContext context) : ControllerBase
{
    private const string EducationAttendanceMetricKey = "education.attendance";
    private const string ProcessSessionsProgressMetricKey = "healing.process_sessions.progress_rate";
    private const string HomeVisitsCleanRateMetricKey = "caring.home_visits.clean_rate";
    private const string IncidentsResolutionMetricKey = "healing.incidents.resolution_rate";
    private const string SocialReferralConversionMetricKey = "outreach.social.referral_conversion_rate";
    private const string SocialClickThroughMetricKey = "outreach.social.click_through_rate";

    private static readonly HashSet<string> SupportedMetricKeys =
    [
        EducationAttendanceMetricKey,
        ProcessSessionsProgressMetricKey,
        HomeVisitsCleanRateMetricKey,
        IncidentsResolutionMetricKey,
        SocialReferralConversionMetricKey,
        SocialClickThroughMetricKey
    ];

    private static bool TryParseQuarter(string? raw, out int year, out int quarter)
    {
        year = 0;
        quarter = 0;
        if (string.IsNullOrWhiteSpace(raw)) return false;
        var s = raw.Trim();

        // Prefer ISO-ish "YYYY-..."
        if (s.Length >= 4
            && char.IsDigit(s[0]) && char.IsDigit(s[1]) && char.IsDigit(s[2]) && char.IsDigit(s[3])
            && int.TryParse(s[..4], out var y))
        {
            // Attempt to parse month if present: "YYYY-MM"
            if (s.Length >= 7 && s[4] == '-' && int.TryParse(s.Substring(5, 2), out var m) && m is >= 1 and <= 12)
            {
                year = y;
                quarter = ((m - 1) / 3) + 1;
                return true;
            }
        }

        if (!DateTime.TryParse(s, out var dt)) return false;
        year = dt.Year;
        quarter = ((dt.Month - 1) / 3) + 1;
        return true;
    }

    private static string QuarterKey(int year, int quarter) => $"{year}-Q{quarter}";

    [HttpGet("education/attendance/quarterly")]
    public async Task<IActionResult> GetEducationAttendanceQuarterly([FromQuery] int take = 8, CancellationToken ct = default)
    {
        if (take < 1) take = 1;
        if (take > 40) take = 40;

        var rows = await context.EducationRecords.AsNoTracking()
            .Select(r => new { r.RecordDate, r.AttendanceRate, r.ProgressPercent, r.ResidentId })
            .ToListAsync(ct);

        // Group into quarters based on parsed dates.
        var groups = new Dictionary<(int year, int quarter), (List<double> attendance, List<double> progress, HashSet<int> residents)>();
        foreach (var r in rows)
        {
            if (!TryParseQuarter(r.RecordDate, out var y, out var q)) continue;
            if (!groups.TryGetValue((y, q), out var g))
            {
                g = (new List<double>(), new List<double>(), new HashSet<int>());
                groups[(y, q)] = g;
            }

            if (r.AttendanceRate.HasValue) g.attendance.Add(r.AttendanceRate.Value);
            if (r.ProgressPercent.HasValue) g.progress.Add(r.ProgressPercent.Value);
            g.residents.Add(r.ResidentId);
        }

        // Latest quarters first.
        var ordered = groups.Keys
            .OrderByDescending(k => k.year)
            .ThenByDescending(k => k.quarter)
            .Take(take)
            .ToList();

        // Pull targets for those quarters (if any).
        var targetRows = await context.OkrTargets.AsNoTracking()
            .Where(t => t.MetricKey == EducationAttendanceMetricKey)
            .ToListAsync(ct);
        var targetByPeriod = targetRows.ToDictionary(t => (t.Year, t.Quarter), t => t.TargetValue);

        var result = ordered.Select(k =>
        {
            var g = groups[k];
            var attendanceAvg = g.attendance.Count == 0 ? (double?)null : g.attendance.Average();
            var progressAvg = g.progress.Count == 0 ? (double?)null : g.progress.Average();
            targetByPeriod.TryGetValue((k.year, k.quarter), out var target);

            return new
            {
                period = QuarterKey(k.year, k.quarter),
                year = k.year,
                quarter = k.quarter,
                residentCount = g.residents.Count,
                attendanceRateAvg = attendanceAvg,    // often 0..1
                progressPercentAvg = progressAvg,     // often 0..100
                targetAttendanceRate = targetRows.Count == 0 ? (double?)null : (double?)target
            };
        }).ToList();

        return Ok(new
        {
            metricKey = EducationAttendanceMetricKey,
            generatedAtUtc = DateTime.UtcNow,
            items = result
        });
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("education/attendance/targets/{year:int}/{quarter:int}")]
    public async Task<IActionResult> UpsertEducationAttendanceTarget(
        [FromRoute] int year,
        [FromRoute] int quarter,
        [FromBody] double targetAttendanceRate,
        CancellationToken ct)
        => await UpsertTargetValue(EducationAttendanceMetricKey, year, quarter, targetAttendanceRate, ct);

    [HttpGet("healing/process-sessions/quarterly")]
    public async Task<IActionResult> GetProcessSessionsProgressQuarterly([FromQuery] int take = 8, CancellationToken ct = default)
    {
        if (take < 1) take = 1;
        if (take > 40) take = 40;

        var rows = await context.ProcessRecordings.AsNoTracking()
            .Select(r => new { r.SessionDate, r.ProgressNoted })
            .ToListAsync(ct);

        var groups = new Dictionary<(int year, int quarter), (int withProgress, int total)>();
        foreach (var r in rows)
        {
            if (!TryParseQuarter(r.SessionDate, out var y, out var q)) continue;
            if (!groups.TryGetValue((y, q), out var g))
                g = (0, 0);
            g.total++;
            if (r.ProgressNoted == true) g.withProgress++;
            groups[(y, q)] = g;
        }

        return Ok(await BuildRateOkrResponseAsync(
            ProcessSessionsProgressMetricKey,
            groups.ToDictionary(kv => kv.Key, kv => (kv.Value.withProgress, kv.Value.total)),
            take,
            ct));
    }

    [HttpGet("caring/home-visits/clean-rate/quarterly")]
    public async Task<IActionResult> GetHomeVisitsCleanRateQuarterly([FromQuery] int take = 8, CancellationToken ct = default)
    {
        if (take < 1) take = 1;
        if (take > 40) take = 40;

        var rows = await context.HomeVisitations.AsNoTracking()
            .Select(v => new { v.VisitDate, v.SafetyConcernsNoted })
            .ToListAsync(ct);

        var groups = new Dictionary<(int year, int quarter), (int clean, int total)>();
        foreach (var r in rows)
        {
            if (!TryParseQuarter(r.VisitDate, out var y, out var q)) continue;
            if (!groups.TryGetValue((y, q), out var g))
                g = (0, 0);
            g.total++;
            if (r.SafetyConcernsNoted != true) g.clean++;
            groups[(y, q)] = g;
        }

        return Ok(await BuildRateOkrResponseAsync(
            HomeVisitsCleanRateMetricKey,
            groups.ToDictionary(kv => kv.Key, kv => (kv.Value.clean, kv.Value.total)),
            take,
            ct));
    }

    [HttpGet("healing/incidents/resolution-rate/quarterly")]
    public async Task<IActionResult> GetIncidentsResolutionRateQuarterly([FromQuery] int take = 8, CancellationToken ct = default)
    {
        if (take < 1) take = 1;
        if (take > 40) take = 40;

        var rows = await context.IncidentReports.AsNoTracking()
            .Select(i => new { i.IncidentDate, i.Resolved })
            .ToListAsync(ct);

        var groups = new Dictionary<(int year, int quarter), (int resolved, int total)>();
        foreach (var r in rows)
        {
            if (!TryParseQuarter(r.IncidentDate, out var y, out var q)) continue;
            if (!groups.TryGetValue((y, q), out var g))
                g = (0, 0);
            g.total++;
            if (r.Resolved == true) g.resolved++;
            groups[(y, q)] = g;
        }

        return Ok(await BuildRateOkrResponseAsync(
            IncidentsResolutionMetricKey,
            groups.ToDictionary(kv => kv.Key, kv => (kv.Value.resolved, kv.Value.total)),
            take,
            ct));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("healing/process-sessions/targets/{year:int}/{quarter:int}")]
    public Task<IActionResult> UpsertProcessSessionsTarget([FromRoute] int year, [FromRoute] int quarter, [FromBody] double targetRate, CancellationToken ct)
        => UpsertTargetValue(ProcessSessionsProgressMetricKey, year, quarter, targetRate, ct);

    [Authorize(Roles = "Admin")]
    [HttpPut("caring/home-visits/targets/{year:int}/{quarter:int}")]
    public Task<IActionResult> UpsertHomeVisitsCleanRateTarget([FromRoute] int year, [FromRoute] int quarter, [FromBody] double targetRate, CancellationToken ct)
        => UpsertTargetValue(HomeVisitsCleanRateMetricKey, year, quarter, targetRate, ct);

    [Authorize(Roles = "Admin")]
    [HttpPut("healing/incidents/targets/{year:int}/{quarter:int}")]
    public Task<IActionResult> UpsertIncidentsResolutionTarget([FromRoute] int year, [FromRoute] int quarter, [FromBody] double targetRate, CancellationToken ct)
        => UpsertTargetValue(IncidentsResolutionMetricKey, year, quarter, targetRate, ct);

    /// <summary>Share of posts in the quarter with at least one recorded donation referral.</summary>
    [HttpGet("outreach/social/referral-conversion/quarterly")]
    public async Task<IActionResult> GetSocialReferralConversionQuarterly([FromQuery] int take = 8, CancellationToken ct = default)
    {
        if (take < 1) take = 1;
        if (take > 40) take = 40;

        var rows = await context.SocialMediaPosts.AsNoTracking()
            .Select(p => new { p.CreatedAt, p.DonationReferrals })
            .ToListAsync(ct);

        var groups = new Dictionary<(int year, int quarter), (int withReferral, int total)>();
        foreach (var r in rows)
        {
            if (!TryParseQuarter(r.CreatedAt, out var y, out var q)) continue;
            if (!groups.TryGetValue((y, q), out var g))
                g = (0, 0);
            g.total++;
            if ((r.DonationReferrals ?? 0) > 0) g.withReferral++;
            groups[(y, q)] = g;
        }

        return Ok(await BuildRateOkrResponseAsync(
            SocialReferralConversionMetricKey,
            groups.ToDictionary(kv => kv.Key, kv => (kv.Value.withReferral, kv.Value.total)),
            take,
            ct));
    }

    /// <summary>Aggregate click-through rate (sum of clicks ÷ sum of impressions) per calendar quarter.</summary>
    [HttpGet("outreach/social/click-through/quarterly")]
    public async Task<IActionResult> GetSocialClickThroughQuarterly([FromQuery] int take = 8, CancellationToken ct = default)
    {
        if (take < 1) take = 1;
        if (take > 40) take = 40;

        var rows = await context.SocialMediaPosts.AsNoTracking()
            .Select(p => new { p.CreatedAt, p.ClickThroughs, p.Impressions })
            .ToListAsync(ct);

        var groups = new Dictionary<(int year, int quarter), (long clicks, long impressions)>();
        foreach (var r in rows)
        {
            if (!TryParseQuarter(r.CreatedAt, out var y, out var q)) continue;
            if (!groups.TryGetValue((y, q), out var g))
                g = (0, 0);
            g.clicks += (r.ClickThroughs ?? 0);
            g.impressions += (r.Impressions ?? 0);
            groups[(y, q)] = g;
        }

        var asInts = groups.ToDictionary(
            kv => kv.Key,
            kv => ((int)Math.Min(int.MaxValue, kv.Value.clicks), (int)Math.Min(int.MaxValue, kv.Value.impressions)));

        return Ok(await BuildRateOkrResponseAsync(
            SocialClickThroughMetricKey,
            asInts,
            take,
            ct));
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("outreach/social/referral-conversion/targets/{year:int}/{quarter:int}")]
    public Task<IActionResult> UpsertSocialReferralConversionTarget([FromRoute] int year, [FromRoute] int quarter, [FromBody] double targetRate, CancellationToken ct)
        => UpsertTargetValue(SocialReferralConversionMetricKey, year, quarter, targetRate, ct);

    [Authorize(Roles = "Admin")]
    [HttpPut("outreach/social/click-through/targets/{year:int}/{quarter:int}")]
    public Task<IActionResult> UpsertSocialClickThroughTarget([FromRoute] int year, [FromRoute] int quarter, [FromBody] double targetRate, CancellationToken ct)
        => UpsertTargetValue(SocialClickThroughMetricKey, year, quarter, targetRate, ct);

    /// <summary>Sets a quarterly target (0..1) for any supported OKR metric.</summary>
    [Authorize(Roles = "Admin")]
    [HttpPut("targets")]
    public Task<IActionResult> UpsertTarget([FromBody] OkrTargetUpsertRequest body, CancellationToken ct)
    {
        if (body is null || string.IsNullOrWhiteSpace(body.MetricKey))
            return Task.FromResult<IActionResult>(BadRequest("metricKey is required."));
        if (!SupportedMetricKeys.Contains(body.MetricKey.Trim()))
            return Task.FromResult<IActionResult>(BadRequest("Unsupported metricKey."));
        return UpsertTargetValue(body.MetricKey.Trim(), body.Year, body.Quarter, body.TargetValue, ct);
    }

    private async Task<IActionResult> UpsertTargetValue(string metricKey, int year, int quarter, double targetValue, CancellationToken ct)
    {
        if (quarter is < 1 or > 4) return BadRequest("Quarter must be 1-4.");
        if (targetValue is < 0 or > 1) return BadRequest("Target must be between 0 and 1.");

        var existing = await context.OkrTargets
            .FirstOrDefaultAsync(t => t.MetricKey == metricKey && t.Year == year && t.Quarter == quarter, ct);

        if (existing is null)
        {
            context.OkrTargets.Add(new OkrTarget
            {
                MetricKey = metricKey,
                Year = year,
                Quarter = quarter,
                TargetValue = targetValue
            });
        }
        else
        {
            existing.TargetValue = targetValue;
        }

        await context.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task<object> BuildRateOkrResponseAsync(
        string metricKey,
        Dictionary<(int year, int quarter), (int numerator, int denominator)> groups,
        int take,
        CancellationToken ct)
    {
        var ordered = groups.Keys
            .OrderByDescending(k => k.year)
            .ThenByDescending(k => k.quarter)
            .Take(take)
            .ToList();

        var targetRows = await context.OkrTargets.AsNoTracking()
            .Where(t => t.MetricKey == metricKey)
            .ToListAsync(ct);
        var targetByPeriod = targetRows.ToDictionary(t => (t.Year, t.Quarter), t => t.TargetValue);

        var items = ordered.Select(k =>
        {
            var g = groups[k];
            double? rate = g.denominator > 0 ? (double)g.numerator / g.denominator : null;
            var hasTarget = targetByPeriod.TryGetValue((k.year, k.quarter), out var tv);

            return new
            {
                period = QuarterKey(k.year, k.quarter),
                year = k.year,
                quarter = k.quarter,
                rate,
                targetRate = hasTarget ? (double?)tv : null,
                numerator = g.numerator,
                denominator = g.denominator
            };
        }).ToList();

        return new
        {
            metricKey,
            generatedAtUtc = DateTime.UtcNow,
            items
        };
    }
}

