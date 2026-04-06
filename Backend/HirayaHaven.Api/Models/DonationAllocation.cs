namespace HirayaHaven.Api.Models;

public class DonationAllocation
{
    public int AllocationId { get; set; }
    public int DonationId { get; set; }
    public int SafehouseId { get; set; }
    public string? ProgramArea { get; set; }
    public double? AmountAllocated { get; set; }
    public string? AllocationDate { get; set; }
    public string? AllocationNotes { get; set; }

    public Donation? Donation { get; set; }
    public Safehouse? Safehouse { get; set; }
}
