using Microsoft.AspNetCore.Identity;

namespace HirayaHaven.Api.Models;

public class AppUser : IdentityUser<int>
{
    public string? UserType { get; set; }
    public int? StaffId { get; set; }
    public int? ResidentId { get; set; }
    public int? SupporterId { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsApproved { get; set; } = false;
    public int? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? LastLogin { get; set; }
    public string? MfaSecret { get; set; }
    public int? ResetInitiatedBy { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Staff? Staff { get; set; }
    public Resident? Resident { get; set; }
    public Supporter? Supporter { get; set; }
    public AppUser? ApprovedByUser { get; set; }
    public AppUser? CreatedByUser { get; set; }
    public AppUser? ResetInitiatedByUser { get; set; }
}
