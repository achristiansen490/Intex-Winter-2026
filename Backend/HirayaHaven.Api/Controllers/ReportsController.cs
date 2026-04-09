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
    [HttpGet("annual-accomplishment")]
    public async Task<IActionResult> GetAnnualAccomplishment([FromQuery] int? year, CancellationToken ct)
    {
        var y = year ?? DateTime.UtcNow.Year;
        var yearPrefix = $"{y}-";

        // Services (counts)
        var processSessions = await context.ProcessRecordings.CountAsync(
            r => r.SessionDate != null && EF.Functions.Like(r.SessionDate, $"{yearPrefix}%"), ct);
        var sessionsWithProgress = await context.ProcessRecordings.CountAsync(
            r => r.SessionDate != null && EF.Functions.Like(r.SessionDate, $"{yearPrefix}%") && r.ProgressNoted == true, ct);

        var homeVisits = await context.HomeVisitations.CountAsync(
            v => v.VisitDate != null && EF.Functions.Like(v.VisitDate, $"{yearPrefix}%"), ct);
        var visitsWithSafetyConcern = await context.HomeVisitations.CountAsync(
            v => v.VisitDate != null && EF.Functions.Like(v.VisitDate, $"{yearPrefix}%") && v.SafetyConcernsNoted == true, ct);

        var educationRecords = await context.EducationRecords.CountAsync(
            e => e.RecordDate != null && EF.Functions.Like(e.RecordDate, $"{yearPrefix}%"), ct);
        var avgEducationProgress = await context.EducationRecords
            .Where(e => e.RecordDate != null && EF.Functions.Like(e.RecordDate, $"{yearPrefix}%") && e.ProgressPercent != null)
            .Select(e => e.ProgressPercent!.Value)
            .DefaultIfEmpty()
            .AverageAsync(ct);
        var enrolledCount = await context.EducationRecords.CountAsync(
            e => e.RecordDate != null && EF.Functions.Like(e.RecordDate, $"{yearPrefix}%")
                 && e.EnrollmentStatus != null
                 && EF.Functions.Like(e.EnrollmentStatus.ToLower(), "%enroll%"), ct);

        var healthRecords = await context.HealthWellbeingRecords.CountAsync(
            h => h.RecordDate != null && EF.Functions.Like(h.RecordDate, $"{yearPrefix}%"), ct);
        var avgHealthScore = await context.HealthWellbeingRecords
            .Where(h => h.RecordDate != null && EF.Functions.Like(h.RecordDate, $"{yearPrefix}%") && h.GeneralHealthScore != null)
            .Select(h => h.GeneralHealthScore!.Value)
            .DefaultIfEmpty()
            .AverageAsync(ct);

        var incidentReports = await context.IncidentReports.CountAsync(
            i => i.IncidentDate != null && EF.Functions.Like(i.IncidentDate, $"{yearPrefix}%"), ct);
        var resolvedIncidents = await context.IncidentReports.CountAsync(
            i => i.IncidentDate != null && EF.Functions.Like(i.IncidentDate, $"{yearPrefix}%") && i.Resolved == true, ct);

        var interventionPlans = await context.InterventionPlans.CountAsync(
            p => p.CreatedAt != null && EF.Functions.Like(p.CreatedAt, $"{yearPrefix}%"), ct);

        // Beneficiaries
        var activeResidentsNow = await context.Residents.CountAsync(r => r.CaseStatus == "Active", ct);
        var reintegrationReadyNow = await context.Residents.CountAsync(r =>
            r.ReintegrationStatus != null && EF.Functions.Like(r.ReintegrationStatus.ToLower(), "%ready%"), ct);

        // Unique resident beneficiaries served in the year (any of the core service tables).
        var residentIds = new HashSet<int>();
        var idLists = await Task.WhenAll(
            context.ProcessRecordings.Where(r => r.SessionDate != null && EF.Functions.Like(r.SessionDate, $"{yearPrefix}%")).Select(r => r.ResidentId).Distinct().ToListAsync(ct),
            context.HomeVisitations.Where(v => v.VisitDate != null && EF.Functions.Like(v.VisitDate, $"{yearPrefix}%")).Select(v => v.ResidentId).Distinct().ToListAsync(ct),
            context.EducationRecords.Where(e => e.RecordDate != null && EF.Functions.Like(e.RecordDate, $"{yearPrefix}%")).Select(e => e.ResidentId).Distinct().ToListAsync(ct),
            context.HealthWellbeingRecords.Where(h => h.RecordDate != null && EF.Functions.Like(h.RecordDate, $"{yearPrefix}%")).Select(h => h.ResidentId).Distinct().ToListAsync(ct),
            context.InterventionPlans.Where(p => p.CreatedAt != null && EF.Functions.Like(p.CreatedAt, $"{yearPrefix}%")).Select(p => p.ResidentId).Distinct().ToListAsync(ct),
            context.IncidentReports.Where(i => i.IncidentDate != null && EF.Functions.Like(i.IncidentDate, $"{yearPrefix}%")).Select(i => i.ResidentId).Distinct().ToListAsync(ct)
        );
        foreach (var list in idLists)
            foreach (var id in list)
                residentIds.Add(id);

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

