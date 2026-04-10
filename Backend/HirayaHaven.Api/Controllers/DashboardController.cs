using HirayaHaven.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController(HirayaContext context) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
    {
        var safehouseCount = await context.Safehouses.CountAsync();
        var activeResidentCount = await context.Residents.CountAsync(r => r.CaseStatus == "Active");
        var partnerCount = await context.Partners.CountAsync(p => p.Status == "Active");
        var totalMonetaryAmount = await context.Donations
            .Where(d => d.DonationType == "Monetary")
            .SumAsync(d => d.Amount ?? 0);

        var topPost = await context.SocialMediaPosts
            .AsNoTracking()
            .OrderByDescending(p => p.EngagementRate)
            .ThenByDescending(p => p.Reach)
            .Select(p => new
            {
                p.PostId,
                p.Platform,
                p.CreatedAt,
                p.CampaignName,
                p.EngagementRate,
                p.Reach,
                p.DonationReferrals,
                p.EstimatedDonationValuePhp
            })
            .FirstOrDefaultAsync();

        return Ok(new
        {
            safehouseCount,
            activeResidentCount,
            partnerCount,
            totalMonetaryAmount,
            topPost
        });
    }

    /// <summary>Donation amounts grouped by program area (allocation rows) — public Impact page.</summary>
    [AllowAnonymous]
    [HttpGet("impact/program-allocation")]
    public async Task<IActionResult> GetImpactProgramAllocation(CancellationToken ct = default)
    {
        var rows = await context.DonationAllocations
            .AsNoTracking()
            .Select(a => new { a.ProgramArea, a.AmountAllocated })
            .ToListAsync(ct);

        var grouped = rows
            .Where(x => x.AmountAllocated is > 0)
            .GroupBy(x => string.IsNullOrWhiteSpace(x.ProgramArea) ? "Other" : x.ProgramArea!.Trim())
            .Select(g => new
            {
                name = g.Key,
                total = g.Sum(x => x.AmountAllocated!.Value)
            })
            .OrderByDescending(x => x.total)
            .ToList();

        return Ok(grouped);
    }

    [AllowAnonymous]
    [HttpGet("kpis")]
    public async Task<IActionResult> GetKpis()
    {
        var totalSupporters = await context.Supporters.CountAsync();
        var activeSupporters = await context.Supporters.CountAsync(s => s.Status == "Active");

        var totalDonations = await context.Donations.CountAsync();
        var uniqueDonors = await context.Donations
            .Select(d => d.SupporterId)
            .Distinct()
            .CountAsync();
        var repeatDonors = await context.Donations
            .GroupBy(d => d.SupporterId)
            .CountAsync(g => g.Count() > 1);

        var recurringDonationCount = await context.Donations.CountAsync(d => d.IsRecurring == true);
        var totalMonetaryAmount = await context.Donations
            .Where(d => d.DonationType == "Monetary")
            .SumAsync(d => d.Amount ?? 0);
        var monetaryDonationCount = await context.Donations
            .CountAsync(d => d.DonationType == "Monetary" && d.Amount != null);
        var avgMonetaryDonation = monetaryDonationCount == 0
            ? 0
            : (double)(totalMonetaryAmount / monetaryDonationCount);

        var activeResidents = await context.Residents.CountAsync(r => r.CaseStatus == "Active");
        var highRiskResidents = await context.Residents.CountAsync(r =>
            EF.Functions.Like((r.CurrentRiskLevel ?? "").ToLower(), "%high%") ||
            EF.Functions.Like((r.CurrentRiskLevel ?? "").ToLower(), "%critical%"));
        var reintegrationReadyResidents = await context.Residents.CountAsync(r =>
            EF.Functions.Like((r.ReintegrationStatus ?? "").ToLower(), "%ready%"));

        var processSessions = await context.ProcessRecordings.CountAsync();
        var sessionsWithProgress = await context.ProcessRecordings.CountAsync(p => p.ProgressNoted == true);
        var homeVisits = await context.HomeVisitations.CountAsync();
        var visitsWithSafetyConcern = await context.HomeVisitations.CountAsync(v => v.SafetyConcernsNoted == true);

        var socialPostCount = await context.SocialMediaPosts.CountAsync();
        var engagementPostCount = await context.SocialMediaPosts
            .CountAsync(p => p.EngagementRate != null);
        var engagementRateSum = await context.SocialMediaPosts
            .Where(p => p.EngagementRate != null)
            .SumAsync(p => p.EngagementRate ?? 0);
        var avgEngagementRate = engagementPostCount == 0 ? 0 : engagementRateSum / engagementPostCount;
        var totalReach = await context.SocialMediaPosts.SumAsync(p => p.Reach ?? 0);
        var totalDonationReferrals = await context.SocialMediaPosts.SumAsync(p => p.DonationReferrals ?? 0);
        var totalEstimatedDonationValuePhp = await context.SocialMediaPosts.SumAsync(p => p.EstimatedDonationValuePhp ?? 0);
        var ctaPostCount = await context.SocialMediaPosts.CountAsync(p => p.HasCallToAction == true);
        var ctaPostsWithReferrals = await context.SocialMediaPosts.CountAsync(p =>
            p.HasCallToAction == true && (p.DonationReferrals ?? 0) > 0);

        var topCampaignByReferrals = await context.SocialMediaPosts
            .Where(p => p.CampaignName != null && !string.IsNullOrWhiteSpace(p.CampaignName))
            .GroupBy(p => p.CampaignName!.Trim())
            .Select(g => new
            {
                campaignName = g.Key,
                postCount = g.Count(),
                donationReferrals = g.Sum(x => x.DonationReferrals ?? 0),
                estimatedDonationValuePhp = g.Sum(x => x.EstimatedDonationValuePhp ?? 0)
            })
            .OrderByDescending(x => x.donationReferrals)
            .ThenByDescending(x => x.estimatedDonationValuePhp)
            .FirstOrDefaultAsync();

        return Ok(new
        {
            donor = new
            {
                totalSupporters,
                activeSupporters,
                totalDonations,
                uniqueDonors,
                repeatDonors,
                recurringDonationCount,
                totalMonetaryAmount,
                avgMonetaryDonation,
                repeatDonorRate = uniqueDonors == 0 ? 0 : (double)repeatDonors / uniqueDonors,
                recurringDonationRate = totalDonations == 0 ? 0 : (double)recurringDonationCount / totalDonations
            },
            operations = new
            {
                activeResidents,
                highRiskResidents,
                reintegrationReadyResidents,
                processSessions,
                sessionsWithProgress,
                homeVisits,
                visitsWithSafetyConcern,
                progressSessionRate = processSessions == 0 ? 0 : (double)sessionsWithProgress / processSessions,
                safetyConcernVisitRate = homeVisits == 0 ? 0 : (double)visitsWithSafetyConcern / homeVisits
            },
            outreach = new
            {
                socialPostCount,
                avgEngagementRate,
                totalReach,
                totalDonationReferrals,
                totalEstimatedDonationValuePhp,
                ctaPostCount,
                ctaPostsWithReferrals,
                ctaReferralRate = ctaPostCount == 0 ? 0 : (double)ctaPostsWithReferrals / ctaPostCount,
                topCampaignByReferrals
            }
        });
    }

    [AllowAnonymous]
    [HttpGet("public-impact-series")]
    public async Task<IActionResult> GetPublicImpactSeries()
    {
        var monthlySupportTrendRaw = await context.Donations
            .AsNoTracking()
            .Where(d => d.DonationDate != null && d.DonationDate!.Length >= 7)
            .Select(d => new
            {
                Month = d.DonationDate!.Substring(0, 7),
                Total = (double)(d.Amount ?? d.EstimatedValue ?? 0m),
            })
            .GroupBy(x => x.Month)
            .Select(g => new
            {
                month = g.Key,
                total = g.Sum(x => x.Total),
            })
            .OrderByDescending(x => x.month)
            .Take(12)
            .ToListAsync();

        var monthlySupportTrend = monthlySupportTrendRaw
            .OrderBy(x => x.month)
            .ToList();

        var programAllocationMix = await context.DonationAllocations
            .AsNoTracking()
            .Where(a => a.ProgramArea != null)
            .GroupBy(a => a.ProgramArea!)
            .Select(g => new
            {
                name = g.Key,
                total = g.Sum(x => x.AmountAllocated ?? 0),
            })
            .OrderByDescending(x => x.total)
            .Take(8)
            .ToListAsync();

        var educationRecordCount = await context.EducationRecords.CountAsync();

        var latestEducationMonth = await context.EducationRecords
            .AsNoTracking()
            .Where(r => r.RecordDate != null && r.RecordDate!.Length >= 7)
            .Select(r => r.RecordDate!.Substring(0, 7))
            .OrderByDescending(m => m)
            .FirstOrDefaultAsync();

        double? latestAvgEducationProgress = null;
        if (!string.IsNullOrWhiteSpace(latestEducationMonth))
        {
            var monthEdu = context.EducationRecords
                .AsNoTracking()
                .Where(r => r.RecordDate != null && r.RecordDate!.StartsWith(latestEducationMonth)
                    && r.ProgressPercent != null);
            if (await monthEdu.AnyAsync())
                latestAvgEducationProgress = await monthEdu.AverageAsync(r => r.ProgressPercent!.Value);
        }

        return Ok(new
        {
            monthlySupportTrend,
            programAllocationMix,
            educationRecordCount,
            latestAvgEducationProgress,
            latestEducationMonth,
        });
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("admin-proof")]
    public async Task<IActionResult> GetAdminProof()
    {
        var check = new
        {
            generatedAtUtc = DateTime.UtcNow,
            donations = await context.Donations.CountAsync(),
            supporters = await context.Supporters.CountAsync(),
            residents = await context.Residents.CountAsync(),
            safehouses = await context.Safehouses.CountAsync(),
            socialPosts = await context.SocialMediaPosts.CountAsync()
        };

        return Ok(new
        {
            message = "Admin access verified. Protected dashboard endpoint reached.",
            check
        });
    }
}
