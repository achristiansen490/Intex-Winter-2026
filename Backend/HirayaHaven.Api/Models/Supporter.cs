namespace HirayaHaven.Api.Models;

public class Supporter
{
    public int SupporterId { get; set; }
    public string? SupporterType { get; set; }
    public string? DisplayName { get; set; }
    public string? OrganizationName { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? RelationshipType { get; set; }
    public string? Region { get; set; }
    public string? Country { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Status { get; set; }
    public string? CreatedAt { get; set; }
    public string? FirstDonationDate { get; set; }
    public string? AcquisitionChannel { get; set; }

    public ICollection<Donation> Donations { get; set; } = new List<Donation>();
}
