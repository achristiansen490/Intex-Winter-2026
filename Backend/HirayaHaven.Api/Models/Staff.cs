namespace HirayaHaven.Api.Models;

public class Staff
{
    public int StaffId { get; set; }
    public string? StaffCode { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public int? Age { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Role { get; set; }
    public string? EmploymentType { get; set; }
    public string? Specialization { get; set; }
    public int? SafehouseId { get; set; }
    public string? EmploymentStatus { get; set; }
    public string? DateHired { get; set; }
    public string? DateEnded { get; set; }
    public string? CreatedAt { get; set; }
    public string? UpdatedAt { get; set; }

    public Safehouse? Safehouse { get; set; }
}
