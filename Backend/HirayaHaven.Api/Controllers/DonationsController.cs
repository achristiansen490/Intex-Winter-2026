using System.Globalization;
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

    [HttpGet]
    public override async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var role = await GetUserRoleAsync();
        if (role is null) return Forbid();
        if (!await Permissions.CanAsync(role, ResourceName, "Read")) return Forbid();

        var user = await GetCurrentUserAsync();
        if (user is null) return Forbid();

        if (role == "Donor")
            user = await EnsureDonorSupporterLinkedAsync(user, ct);

        var query = Entities.AsNoTracking();
        query = await ApplyScopingAsync(query, user, role);

        var list = await query.ToListAsync(ct);
        foreach (var item in list) RedactForRole(item, role);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public override async Task<IActionResult> GetById([FromRoute] int id, CancellationToken ct)
    {
        var role = await GetUserRoleAsync();
        if (role is null) return Forbid();
        if (!await Permissions.CanAsync(role, ResourceName, "Read")) return Forbid();

        var user = await GetCurrentUserAsync();
        if (user is null) return Forbid();

        if (role == "Donor")
            user = await EnsureDonorSupporterLinkedAsync(user, ct);

        var query = Entities.AsQueryable();
        query = await ApplyScopingAsync(query, user, role);

        var pkName = Db.Model.FindEntityType(typeof(Donation))!.FindPrimaryKey()!.Properties[0].Name;
        var entity = await query.FirstOrDefaultAsync(e => EF.Property<int>(e, pkName) == id, ct);
        if (entity is null) return NotFound();

        RedactForRole(entity, role);
        return Ok(entity);
    }

    /// <summary>
    /// Distinct campaign and channel values from existing data (donations and social posts) for donor forms.
    /// </summary>
    [HttpGet("form-options")]
    public async Task<IActionResult> GetFormOptions(CancellationToken ct)
    {
        var role = await GetUserRoleAsync();
        if (role is null) return Forbid();
        if (!await Permissions.CanAsync(role, ResourceName, "Read")) return Forbid();

        var campaignsFromDonations = await Db.Donations.AsNoTracking()
            .Where(d => d.CampaignName != null && d.CampaignName.Trim() != "")
            .Select(d => d.CampaignName!.Trim())
            .ToListAsync(ct);

        var campaignsFromPosts = await Db.SocialMediaPosts.AsNoTracking()
            .Where(p => p.CampaignName != null && p.CampaignName.Trim() != "")
            .Select(p => p.CampaignName!.Trim())
            .ToListAsync(ct);

        var campaigns = campaignsFromDonations
            .Concat(campaignsFromPosts)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(x => x, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var channelRows = await Db.Donations.AsNoTracking()
            .Where(d => d.ChannelSource != null && d.ChannelSource.Trim() != "")
            .Select(d => d.ChannelSource!.Trim())
            .ToListAsync(ct);

        var channels = channelRows
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(x => x, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return Ok(new { campaigns, channels });
    }

    [HttpPost]
    public override async Task<IActionResult> Create([FromBody] Donation entity, CancellationToken ct)
    {
        var role = await GetUserRoleAsync();
        if (role is null) return Forbid();
        if (!await Permissions.CanAsync(role, ResourceName, "Create")) return Forbid();

        if (role == "Donor")
        {
            var user = await GetCurrentUserAsync();
            if (user is null) return Forbid();
            user = await EnsureDonorSupporterLinkedAsync(user, ct);
            entity.SupporterId = user.SupporterId!.Value;
        }

        if (entity.IsRecurring == true && string.IsNullOrWhiteSpace(entity.RecurringSeriesKey))
            entity.RecurringSeriesKey = Guid.NewGuid().ToString("N");

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
            user = await EnsureDonorSupporterLinkedAsync(user, ct);
            q = q.Where(d => d.SupporterId == user.SupporterId!.Value);
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

    /// <summary>
    /// Donor: aggregated recurring schedules (grouped by recurring series key, or one row per legacy recurring donation).
    /// </summary>
    [HttpGet("recurring-series")]
    public async Task<IActionResult> GetRecurringSeries(CancellationToken ct)
    {
        var role = await GetUserRoleAsync();
        if (role is null) return Forbid();
        if (role != "Donor") return Forbid();
        if (!await Permissions.CanAsync(role, ResourceName, "Read")) return Forbid();

        var user = await GetCurrentUserAsync();
        if (user is null) return Forbid();
        user = await EnsureDonorSupporterLinkedAsync(user, ct);

        var rows = await Db.Donations.AsNoTracking()
            .Where(d => d.SupporterId == user.SupporterId!.Value && d.IsRecurring == true)
            .ToListAsync(ct);

        if (rows.Count == 0) return Ok(Array.Empty<object>());

        var grouped = rows.GroupBy(d =>
            !string.IsNullOrWhiteSpace(d.RecurringSeriesKey)
                ? d.RecurringSeriesKey!
                : $"legacy:{d.DonationId}");

        var list = new List<RecurringSeriesVm>();
        foreach (var g in grouped)
        {
            var items = g.ToList();
            var ordered = items
                .OrderBy(x => ParseDonationDate(x.DonationDate) ?? DateTime.MaxValue)
                .ToList();
            var firstDonation = ordered[0];
            var dateVals = ordered
                .Select(x => ParseDonationDate(x.DonationDate))
                .Where(x => x.HasValue)
                .Select(x => x!.Value)
                .ToList();
            DateTime? started = dateVals.Count > 0 ? dateVals.Min() : null;

            DateTime? cancelledAt = items.Any(x => x.RecurringCancelledAt.HasValue)
                ? items.Max(x => x.RecurringCancelledAt!.Value)
                : null;

            var donationCount = items.Count;
            var totalAmount = items.Sum(x => x.Amount ?? 0m);
            var currency = items.Select(x => x.CurrencyCode).FirstOrDefault(x => !string.IsNullOrWhiteSpace(x)) ?? "PHP";

            string? seriesKey = g.Key.StartsWith("legacy:", StringComparison.Ordinal) ? null : g.Key;
            int? legacyId = g.Key.StartsWith("legacy:", StringComparison.Ordinal)
                ? int.Parse(g.Key.AsSpan("legacy:".Length), CultureInfo.InvariantCulture)
                : null;

            var frequency = ParseFrequencyFromNotes(firstDonation.Notes) ?? "—";

            list.Add(new RecurringSeriesVm
            {
                recurringSeriesKey = seriesKey,
                legacyDonationId = legacyId,
                startedAt = started,
                donationCount = donationCount,
                totalAmount = totalAmount,
                currencyCode = currency,
                campaignName = firstDonation.CampaignName,
                channelSource = firstDonation.ChannelSource,
                frequency = frequency,
                cancelledAt = cancelledAt
            });
        }

        return Ok(list.OrderBy(r => r.startedAt ?? DateTime.MaxValue).ToList());
    }

    private sealed class RecurringSeriesVm
    {
        public string? recurringSeriesKey { get; set; }
        public int? legacyDonationId { get; set; }
        public DateTime? startedAt { get; set; }
        public int donationCount { get; set; }
        public decimal totalAmount { get; set; }
        public string currencyCode { get; set; } = "PHP";
        public string? campaignName { get; set; }
        public string? channelSource { get; set; }
        public string frequency { get; set; } = "—";
        public DateTime? cancelledAt { get; set; }
    }

    public sealed record CancelRecurringBody(string? RecurringSeriesKey, int? LegacyDonationId);

    /// <summary>
    /// Donor: cancel a recurring schedule (does not use generic Update permission).
    /// </summary>
    [HttpPost("recurring/cancel")]
    public async Task<IActionResult> CancelRecurring([FromBody] CancelRecurringBody body, CancellationToken ct)
    {
        var role = await GetUserRoleAsync();
        if (role is null) return Forbid();
        if (role != "Donor") return Forbid();

        var user = await GetCurrentUserAsync();
        if (user is null) return Forbid();
        user = await EnsureDonorSupporterLinkedAsync(user, ct);

        List<Donation> toUpdate;
        if (!string.IsNullOrWhiteSpace(body.RecurringSeriesKey))
        {
            toUpdate = await Db.Donations
                .Where(d => d.SupporterId == user.SupporterId!.Value
                    && d.RecurringSeriesKey == body.RecurringSeriesKey
                    && d.IsRecurring == true)
                .ToListAsync(ct);
        }
        else if (body.LegacyDonationId is int lid)
        {
            toUpdate = await Db.Donations
                .Where(d => d.DonationId == lid
                    && d.SupporterId == user.SupporterId!.Value
                    && d.IsRecurring == true
                    && string.IsNullOrWhiteSpace(d.RecurringSeriesKey))
                .ToListAsync(ct);
        }
        else
            return BadRequest(new { message = "Provide recurringSeriesKey or legacyDonationId." });

        if (toUpdate.Count == 0) return NotFound();

        var now = DateTime.UtcNow;
        foreach (var d in toUpdate)
            d.RecurringCancelledAt = now;
        await Db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static DateTime? ParseDonationDate(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return null;
        if (DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dt))
            return dt;
        if (DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.None, out dt))
            return dt;
        return null;
    }

    private static string? ParseFrequencyFromNotes(string? notes)
    {
        if (string.IsNullOrEmpty(notes)) return null;
        foreach (var line in notes.Split('\n'))
        {
            var t = line.Trim();
            if (t.StartsWith("Recurring frequency:", StringComparison.OrdinalIgnoreCase))
                return t["Recurring frequency:".Length..].Trim();
        }
        return null;
    }
}
