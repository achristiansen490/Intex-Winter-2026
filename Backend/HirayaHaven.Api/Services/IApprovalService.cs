using HirayaHaven.Api.Models;

namespace HirayaHaven.Api.Services;

public interface IApprovalService
{
    /// <summary>
    /// Checks whether a field change on a resource requires approval.
    /// </summary>
    bool RequiresApproval(string resource, string fieldName);

    /// <summary>
    /// Queues a sensitive change for approval. Returns the audit log entry.
    /// </summary>
    Task<AuditLog> QueueForApprovalAsync(int userId, string resource, int recordId,
        string fieldName, string? oldValue, string? newValue, string? ipAddress);

    /// <summary>
    /// Approves a pending change and applies it to the actual record.
    /// </summary>
    Task<bool> ApproveAsync(int auditId, int approverId);

    /// <summary>
    /// Rejects a pending change without applying it.
    /// </summary>
    Task<bool> RejectAsync(int auditId, int approverId);
}
