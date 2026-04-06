namespace HirayaHaven.Api.Models;

public class Supporter
{
    public int SupporterId { get; set; }
    public string? SupporterType { get; set; }
    public string? DisplayName { get; set; }
    public string? Region { get; set; }
    public string? Country { get; set; }
    public string? Status { get; set; }

    public ICollection<Donation> Donations { get; set; } = new List<Donation>();
}
