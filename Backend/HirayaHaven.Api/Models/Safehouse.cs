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
    public string? OpenDate { get; set; }
    public string? Status { get; set; }
    public int? CapacityGirls { get; set; }
    public int? CapacityStaff { get; set; }
    public int? CurrentOccupancy { get; set; }
    public string? Notes { get; set; }

    public ICollection<PartnerAssignment> PartnerAssignments { get; set; } = new List<PartnerAssignment>();
    public ICollection<Resident> Residents { get; set; } = new List<Resident>();
    public ICollection<DonationAllocation> DonationAllocations { get; set; } = new List<DonationAllocation>();
    public ICollection<IncidentReport> IncidentReports { get; set; } = new List<IncidentReport>();
    public ICollection<SafehouseMonthlyMetric> SafehouseMonthlyMetrics { get; set; } = new List<SafehouseMonthlyMetric>();
    public ICollection<Staff> StaffMembers { get; set; } = new List<Staff>();
}
