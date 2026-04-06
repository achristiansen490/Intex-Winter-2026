namespace HirayaHaven.Api.Models;

public class PartnerAssignment
{
    public int AssignmentId { get; set; }
    public int PartnerId { get; set; }
    public int? SafehouseId { get; set; }
    public string? ProgramArea { get; set; }
    public string? AssignmentStart { get; set; }
    public string? AssignmentEnd { get; set; }
    public string? ResponsibilityNotes { get; set; }
    public bool? IsPrimary { get; set; }
    public string? Status { get; set; }

    public Partner? Partner { get; set; }
    public Safehouse? Safehouse { get; set; }
}
