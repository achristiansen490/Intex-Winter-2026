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
    {
        if (quarter is < 1 or > 4) return BadRequest("Quarter must be 1-4.");
        if (targetAttendanceRate is < 0 or > 1) return BadRequest("Target attendance rate must be between 0 and 1.");

        var existing = await context.OkrTargets
            .FirstOrDefaultAsync(t => t.MetricKey == EducationAttendanceMetricKey && t.Year == year && t.Quarter == quarter, ct);

        if (existing is null)
        {
            context.OkrTargets.Add(new OkrTarget
            {
                MetricKey = EducationAttendanceMetricKey,
                Year = year,
                Quarter = quarter,
                TargetValue = targetAttendanceRate
            });
        }
        else
        {
            existing.TargetValue = targetAttendanceRate;
        }

        await context.SaveChangesAsync(ct);
        return NoContent();
    }
}

