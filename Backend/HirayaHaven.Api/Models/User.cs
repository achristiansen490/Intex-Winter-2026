namespace HirayaHaven.Api.Models;

public class User
{
    public int UserId { get; set; }
    public string? UserType { get; set; }
    public int? StaffId { get; set; }
    public int? ResidentId { get; set; }
    public int? SupporterId { get; set; }
    public string? Username { get; set; }
    public string? Email { get; set; }
    public string? PasswordHash { get; set; }
    public string? Role { get; set; }
    public bool? IsActive { get; set; }
    public bool? IsApproved { get; set; }
    public int? ApprovedBy { get; set; }
    public string? ApprovedAt { get; set; }
    public string? LastLogin { get; set; }
    public int? FailedLoginAttempts { get; set; }
    public string? LockedUntil { get; set; }
    public bool? MfaEnabled { get; set; }
    public string? MfaSecret { get; set; }
    public string? PasswordResetToken { get; set; }
    public string? PasswordResetExpires { get; set; }
    public int? ResetInitiatedBy { get; set; }
    public int? CreatedBy { get; set; }
    public string? CreatedAt { get; set; }
    public string? UpdatedAt { get; set; }

    public Staff? Staff { get; set; }
    public Resident? Resident { get; set; }
    public Supporter? Supporter { get; set; }
    public User? ApprovedByUser { get; set; }
    public User? CreatedByUser { get; set; }
    public User? ResetInitiatedByUser { get; set; }
}
