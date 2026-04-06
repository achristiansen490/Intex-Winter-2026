namespace HirayaHaven.Api.Models;

public class Safehouse
{
    public int SafehouseId { get; set; }
    public string? SafehouseCode { get; set; }
    public string? Name { get; set; }
    public string? Region { get; set; }
    public string? City { get; set; }
    public string? Province { get; set; }
    public string? Country { get; set; }
    public string? Status { get; set; }
    public int? CapacityGirls { get; set; }
    public int? CurrentOccupancy { get; set; }

    public ICollection<PartnerAssignment> PartnerAssignments { get; set; } = new List<PartnerAssignment>();
}
