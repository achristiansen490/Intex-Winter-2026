namespace HirayaHaven.Api.Models;

public class Donation
{
    public int DonationId { get; set; }
    public int SupporterId { get; set; }
    public string? DonationType { get; set; }
    public string? DonationDate { get; set; }
    public bool? IsRecurring { get; set; }
    /// <summary>Shared id for all payments in the same recurring schedule (set when <see cref="IsRecurring"/> is true).</summary>
    public string? RecurringSeriesKey { get; set; }
    /// <summary>When set, future recurring charges are treated as cancelled for this series.</summary>
    public DateTime? RecurringCancelledAt { get; set; }
    public string? CampaignName { get; set; }
    public string? ChannelSource { get; set; }
    public string? CurrencyCode { get; set; }
    public decimal? Amount { get; set; }
    public decimal? EstimatedValue { get; set; }
    public string? ImpactUnit { get; set; }
    public string? Notes { get; set; }
    public int? ReferralPostId { get; set; }

    public Supporter? Supporter { get; set; }
    public SocialMediaPost? ReferralPost { get; set; }
    public ICollection<InKindDonationItem> InKindDonationItems { get; set; } = new List<InKindDonationItem>();
    public ICollection<DonationAllocation> DonationAllocations { get; set; } = new List<DonationAllocation>();
}
