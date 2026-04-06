namespace HirayaHaven.Api.Models;

public class SocialMediaPost
{
    public int PostId { get; set; }
    public string? Platform { get; set; }
    public string? CreatedAt { get; set; }
    public string? PostType { get; set; }
    public string? ContentTopic { get; set; }
    public string? CampaignName { get; set; }
    public int? Impressions { get; set; }
    public int? Reach { get; set; }
    public int? Likes { get; set; }
    public int? Comments { get; set; }
    public int? Shares { get; set; }
    public decimal? EngagementRate { get; set; }
    public int? DonationReferrals { get; set; }
    public decimal? EstimatedDonationValuePhp { get; set; }

    public ICollection<Donation> ReferralDonations { get; set; } = new List<Donation>();
}
