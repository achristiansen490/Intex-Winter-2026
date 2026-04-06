namespace HirayaHaven.Api.Models;

public class AuditLog
{
    public int AuditId { get; set; }
    public int UserId { get; set; }
    public string? Action { get; set; }
    public string? Resource { get; set; }
    public int? RecordId { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public bool? RequiresApproval { get; set; }
    public string? ApprovalStatus { get; set; }
    public int? ApprovedBy { get; set; }
    public string? ApprovedAt { get; set; }
    public string? IpAddress { get; set; }
    public string? Timestamp { get; set; }
    public string? Notes { get; set; }

    public User? User { get; set; }
    public User? ApprovedByUser { get; set; }
}
