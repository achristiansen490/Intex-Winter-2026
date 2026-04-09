using HirayaHaven.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Supervisor,CaseManager,SocialWorker,FieldWorker")]
public class ReportsController(HirayaContext context) : ControllerBase
{
    private static bool IsInYear(string? raw, int year)
    {
        if (string.IsNullOrWhiteSpace(raw)) return false;
        var s = raw.Trim();

        // Fast path for ISO-ish strings: "YYYY-..."
        if (s.Length >= 4
            && char.IsDigit(s[0]) && char.IsDigit(s[1]) && char.IsDigit(s[2]) && char.IsDigit(s[3])
            && int.TryParse(s[..4], out var y))
        {
            return y == year;
        }

        return DateTime.TryParse(s, out var dt) && dt.Year == year;
    }

    private static (double avg, int count) AvgOrEmpty(IEnumerable<double> values)
    {
        var list = values as IList<double> ?? values.ToList();
        return list.Count == 0 ? (0, 0) : (list.Average(), list.Count);
    }

    [HttpGet("annual-accomplishment")]
    public async Task<IActionResult> GetAnnualAccomplishment([FromQuery] int? year, CancellationToken ct)
    {
        var y = year ?? DateTime.UtcNow.Year;
        var yearPrefix = $"{y}-";

        // Services (counts)
        // Hybrid approach:
        // - Fast SQL path for ISO strings: date LIKE 'YYYY-%'
        // - Supplement by parsing non-ISO strings in-memory (date NOT LIKE 'YYYY-%')
        var processSessionsIso = await context.ProcessRecordings.CountAsync(
            r => r.SessionDate != null && EF.Functions.Like(r.SessionDate, $"{yearPrefix}%"), ct);
        var sessionsWithProgressIso = await context.ProcessRecordings.CountAsync(
            r => r.SessionDate != null && EF.Functions.Like(r.SessionDate, $"{yearPrefix}%") && r.ProgressNoted == true, ct);

        var processNonIso = await context.ProcessRecordings.AsNoTracking()
            .Where(r => r.SessionDate != null && !EF.Functions.Like(r.SessionDate, $"{yearPrefix}%"))
            .Select(r => new { r.SessionDate, r.ProgressNoted, r.ResidentId })
            .ToListAsync(ct);
        var processSessionsNonIso = processNonIso.Count(r => IsInYear(r.SessionDate, y));
        var sessionsWithProgressNonIso = processNonIso.Count(r => IsInYear(r.SessionDate, y) && r.ProgressNoted == true);
        var processSessions = processSessionsIso + processSessionsNonIso;
        var sessionsWithProgress = sessionsWithProgressIso + sessionsWithProgressNonIso;

        var homeVisitsIso = await context.HomeVisitations.CountAsync(
            v => v.VisitDate != null && EF.Functions.Like(v.VisitDate, $"{yearPrefix}%"), ct);
        var visitsWithSafetyConcernIso = await context.HomeVisitations.CountAsync(
            v => v.VisitDate != null && EF.Functions.Like(v.VisitDate, $"{yearPrefix}%") && v.SafetyConcernsNoted == true, ct);
        var visitsNonIso = await context.HomeVisitations.AsNoTracking()
            .Where(v => v.VisitDate != null && !EF.Functions.Like(v.VisitDate, $"{yearPrefix}%"))
            .Select(v => new { v.VisitDate, v.SafetyConcernsNoted, v.ResidentId })
            .ToListAsync(ct);
        var homeVisitsNonIso = visitsNonIso.Count(v => IsInYear(v.VisitDate, y));
        var visitsWithSafetyConcernNonIso = visitsNonIso.Count(v => IsInYear(v.VisitDate, y) && v.SafetyConcernsNoted == true);
        var homeVisits = homeVisitsIso + homeVisitsNonIso;
        var visitsWithSafetyConcern = visitsWithSafetyConcernIso + visitsWithSafetyConcernNonIso;

        var educationRecordsIso = await context.EducationRecords.CountAsync(
            e => e.RecordDate != null && EF.Functions.Like(e.RecordDate, $"{yearPrefix}%"), ct);
        var eduProgressIsoValues = await context.EducationRecords
            .Where(e => e.RecordDate != null && EF.Functions.Like(e.RecordDate, $"{yearPrefix}%") && e.ProgressPercent != null)
            .Select(e => e.ProgressPercent!.Value)
            .ToListAsync(ct);
        var (eduAvgIso, eduNiso) = AvgOrEmpty(eduProgressIsoValues);
        var enrolledCountIso = await context.EducationRecords.CountAsync(
            e => e.RecordDate != null && EF.Functions.Like(e.RecordDate, $"{yearPrefix}%")
                 && e.EnrollmentStatus != null
                 && EF.Functions.Like(e.EnrollmentStatus.ToLower(), "%enroll%"), ct);

        var eduNonIso = await context.EducationRecords.AsNoTracking()
            .Where(e => e.RecordDate != null && !EF.Functions.Like(e.RecordDate, $"{yearPrefix}%"))
            .Select(e => new { e.RecordDate, e.ProgressPercent, e.EnrollmentStatus, e.ResidentId })
            .ToListAsync(ct);
        var educationRecordsNonIso = eduNonIso.Count(e => IsInYear(e.RecordDate, y));
        var enrolledCountNonIso = eduNonIso.Count(e => IsInYear(e.RecordDate, y)
                                                     && !string.IsNullOrWhiteSpace(e.EnrollmentStatus)
                                                     && e.EnrollmentStatus!.Contains("enroll", StringComparison.OrdinalIgnoreCase));
        var eduProgressNonIsoValues = eduNonIso
            .Where(e => IsInYear(e.RecordDate, y) && e.ProgressPercent != null)
            .Select(e => e.ProgressPercent!.Value)
            .ToList();
        var (eduAvgNonIso, eduNnonIso) = AvgOrEmpty(eduProgressNonIsoValues);

        var educationRecords = educationRecordsIso + educationRecordsNonIso;
        var enrolledCount = enrolledCountIso + enrolledCountNonIso;
        var avgEducationProgress = (eduNiso + eduNnonIso) == 0
            ? 0
            : ((eduAvgIso * eduNiso) + (eduAvgNonIso * eduNnonIso)) / (eduNiso + eduNnonIso);

        var healthRecordsIso = await context.HealthWellbeingRecords.CountAsync(
            h => h.RecordDate != null && EF.Functions.Like(h.RecordDate, $"{yearPrefix}%"), ct);
        var healthIsoValues = await context.HealthWellbeingRecords
            .Where(h => h.RecordDate != null && EF.Functions.Like(h.RecordDate, $"{yearPrefix}%") && h.GeneralHealthScore != null)
            .Select(h => h.GeneralHealthScore!.Value)
            .ToListAsync(ct);
        var (healthAvgIso, healthNiso) = AvgOrEmpty(healthIsoValues);

        var healthNonIso = await context.HealthWellbeingRecords.AsNoTracking()
            .Where(h => h.RecordDate != null && !EF.Functions.Like(h.RecordDate, $"{yearPrefix}%"))
            .Select(h => new { h.RecordDate, h.GeneralHealthScore, h.ResidentId })
            .ToListAsync(ct);
        var healthRecordsNonIso = healthNonIso.Count(h => IsInYear(h.RecordDate, y));
        var healthNonIsoValues = healthNonIso
            .Where(h => IsInYear(h.RecordDate, y) && h.GeneralHealthScore != null)
            .Select(h => h.GeneralHealthScore!.Value)
            .ToList();
        var (healthAvgNonIso, healthNnonIso) = AvgOrEmpty(healthNonIsoValues);

        var healthRecords = healthRecordsIso + healthRecordsNonIso;
        var avgHealthScore = (healthNiso + healthNnonIso) == 0
            ? 0
            : ((healthAvgIso * healthNiso) + (healthAvgNonIso * healthNnonIso)) / (healthNiso + healthNnonIso);

        var incidentReportsIso = await context.IncidentReports.CountAsync(
            i => i.IncidentDate != null && EF.Functions.Like(i.IncidentDate, $"{yearPrefix}%"), ct);
        var resolvedIncidentsIso = await context.IncidentReports.CountAsync(
            i => i.IncidentDate != null && EF.Functions.Like(i.IncidentDate, $"{yearPrefix}%") && i.Resolved == true, ct);
        var incidentNonIso = await context.IncidentReports.AsNoTracking()
            .Where(i => i.IncidentDate != null && !EF.Functions.Like(i.IncidentDate, $"{yearPrefix}%"))
            .Select(i => new { i.IncidentDate, i.Resolved, i.ResidentId })
            .ToListAsync(ct);
        var incidentReportsNonIso = incidentNonIso.Count(i => IsInYear(i.IncidentDate, y));
        var resolvedIncidentsNonIso = incidentNonIso.Count(i => IsInYear(i.IncidentDate, y) && i.Resolved == true);
        var incidentReports = incidentReportsIso + incidentReportsNonIso;
        var resolvedIncidents = resolvedIncidentsIso + resolvedIncidentsNonIso;

        var interventionPlansIso = await context.InterventionPlans.CountAsync(
            p => p.CreatedAt != null && EF.Functions.Like(p.CreatedAt, $"{yearPrefix}%"), ct);
        var plansNonIso = await context.InterventionPlans.AsNoTracking()
            .Where(p => p.CreatedAt != null && !EF.Functions.Like(p.CreatedAt, $"{yearPrefix}%"))
            .Select(p => new { p.CreatedAt, p.ResidentId })
            .ToListAsync(ct);
        var interventionPlansNonIso = plansNonIso.Count(p => IsInYear(p.CreatedAt, y));
        var interventionPlans = interventionPlansIso + interventionPlansNonIso;

        // Beneficiaries
        var activeResidentsNow = await context.Residents.CountAsync(r => r.CaseStatus == "Active", ct);
        var reintegrationReadyNow = await context.Residents.CountAsync(r =>
            r.ReintegrationStatus != null && EF.Functions.Like(r.ReintegrationStatus.ToLower(), "%ready%"), ct);

        // Unique resident beneficiaries served in the year (any of the core service tables).
        var residentIds = new HashSet<int>();
        // ISO lists
        var isoIdLists = await Task.WhenAll(
            context.ProcessRecordings.Where(r => r.SessionDate != null && EF.Functions.Like(r.SessionDate, $"{yearPrefix}%")).Select(r => r.ResidentId).Distinct().ToListAsync(ct),
            context.HomeVisitations.Where(v => v.VisitDate != null && EF.Functions.Like(v.VisitDate, $"{yearPrefix}%")).Select(v => v.ResidentId).Distinct().ToListAsync(ct),
            context.EducationRecords.Where(e => e.RecordDate != null && EF.Functions.Like(e.RecordDate, $"{yearPrefix}%")).Select(e => e.ResidentId).Distinct().ToListAsync(ct),
            context.HealthWellbeingRecords.Where(h => h.RecordDate != null && EF.Functions.Like(h.RecordDate, $"{yearPrefix}%")).Select(h => h.ResidentId).Distinct().ToListAsync(ct),
            context.InterventionPlans.Where(p => p.CreatedAt != null && EF.Functions.Like(p.CreatedAt, $"{yearPrefix}%")).Select(p => p.ResidentId).Distinct().ToListAsync(ct),
            context.IncidentReports.Where(i => i.IncidentDate != null && EF.Functions.Like(i.IncidentDate, $"{yearPrefix}%")).Select(i => i.ResidentId).Distinct().ToListAsync(ct)
        );
        foreach (var list in isoIdLists)
            foreach (var id in list)
                residentIds.Add(id);

        // Non-ISO supplements already fetched above (processNonIso, visitsNonIso, eduNonIso, healthNonIso, plansNonIso, incidentNonIso)
        foreach (var r in processNonIso.Where(r => IsInYear(r.SessionDate, y))) residentIds.Add(r.ResidentId);
        foreach (var r in visitsNonIso.Where(r => IsInYear(r.VisitDate, y))) residentIds.Add(r.ResidentId);
        foreach (var r in eduNonIso.Where(r => IsInYear(r.RecordDate, y))) residentIds.Add(r.ResidentId);
        foreach (var r in healthNonIso.Where(r => IsInYear(r.RecordDate, y))) residentIds.Add(r.ResidentId);
        foreach (var r in plansNonIso.Where(r => IsInYear(r.CreatedAt, y))) residentIds.Add(r.ResidentId);
        foreach (var r in incidentNonIso.Where(r => IsInYear(r.IncidentDate, y))) residentIds.Add(r.ResidentId);

        var beneficiaryResidents = residentIds.Count;

        // Rates
        var progressSessionRate = processSessions == 0 ? 0 : (double)sessionsWithProgress / processSessions;
        var safetyConcernVisitRate = homeVisits == 0 ? 0 : (double)visitsWithSafetyConcern / homeVisits;
        var incidentResolvedRate = incidentReports == 0 ? 0 : (double)resolvedIncidents / incidentReports;
        var stayedInSchoolRate = educationRecords == 0 ? 0 : (double)enrolledCount / educationRecords;

        return Ok(new
        {
            year = y,
            generatedAtUtc = DateTime.UtcNow,
            beneficiaries = new
            {
                residentBeneficiaries = beneficiaryResidents,
                activeResidentsNow,
            },
            outcomes = new
            {
                reintegrationReadyNow,
                progressSessionRate,
                safetyConcernVisitRate,
                incidentResolvedRate,
                stayedInSchoolRate,
                avgEducationProgressPercent = avgEducationProgress,
                avgGeneralHealthScore = avgHealthScore,
            },
            services = new
            {
                caring = new
                {
                    homeVisits,
                    interventionPlans,
                    visitsWithSafetyConcern,
                },
                healing = new
                {
                    processSessions,
                    sessionsWithProgress,
                    healthRecords,
                    incidentReports,
                    resolvedIncidents,
                },
                teaching = new
                {
                    educationRecords,
                    enrolledCount,
                }
            }
        });
    }
}

