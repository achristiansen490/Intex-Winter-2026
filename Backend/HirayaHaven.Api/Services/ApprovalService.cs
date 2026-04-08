using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Services;

public class ApprovalService(HirayaContext db) : IApprovalService
{
    /// <summary>
    /// Map of resource → fields that require approval when changed.
    /// Based on Section 5 of the authorization doc.
    /// </summary>
    private static readonly Dictionary<string, HashSet<string>> SensitiveFields = new(StringComparer.OrdinalIgnoreCase)
    {
        ["residents"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "CurrentRiskLevel",
            "CaseStatus",
            "ReintegrationStatus",
            "DateClosed"
        },
        ["intervention_plans"] = new(StringComparer.OrdinalIgnoreCase)
        {
            "Status"
        }
    };

    public bool RequiresApproval(string resource, string fieldName)
    {
        return SensitiveFields.TryGetValue(resource, out var fields) && fields.Contains(fieldName);
    }

    public async Task<AuditLog> QueueForApprovalAsync(int userId, string resource, int recordId,
        string fieldName, string? oldValue, string? newValue, string? ipAddress)
    {
        var entry = new AuditLog
        {
            UserId = userId,
            Action = "UPDATE",
            Resource = resource,
            RecordId = recordId,
            OldValue = $"{{\"{fieldName}\": \"{oldValue}\"}}",
            NewValue = $"{{\"{fieldName}\": \"{newValue}\"}}",
            RequiresApproval = true,
            ApprovalStatus = "Pending",
            IpAddress = ipAddress,
            Timestamp = DateTime.UtcNow.ToString("o"),
            Notes = $"Pending approval: {fieldName} change from '{oldValue}' to '{newValue}'"
        };

        db.AuditLogs.Add(entry);
        await db.SaveChangesAsync();

        return entry;
    }

    public async Task<bool> ApproveAsync(int auditId, int approverId)
    {
        var entry = await db.AuditLogs.FindAsync(auditId);
        if (entry is null || entry.ApprovalStatus != "Pending") return false;

        entry.ApprovalStatus = "Approved";
        entry.ApprovedBy = approverId;
        entry.ApprovedAt = DateTime.UtcNow.ToString("o");

        // Apply the change to the actual record
        var applied = await ApplyChangeAsync(entry);
        if (!applied) return false;

        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RejectAsync(int auditId, int approverId)
    {
        var entry = await db.AuditLogs.FindAsync(auditId);
        if (entry is null || entry.ApprovalStatus != "Pending") return false;

        entry.ApprovalStatus = "Rejected";
        entry.ApprovedBy = approverId;
        entry.ApprovedAt = DateTime.UtcNow.ToString("o");
        entry.Notes += " | Rejected";

        await db.SaveChangesAsync();
        return true;
    }

    private async Task<bool> ApplyChangeAsync(AuditLog entry)
    {
        if (entry.Resource is null || entry.RecordId is null || entry.NewValue is null)
            return false;

        // Parse the field name and new value from JSON
        // Format: {"FieldName": "value"}
        var newValueJson = System.Text.Json.JsonDocument.Parse(entry.NewValue);
        var prop = newValueJson.RootElement.EnumerateObject().FirstOrDefault();
        var fieldName = prop.Name;
        var newValue = prop.Value.GetString();

        switch (entry.Resource.ToLowerInvariant())
        {
            case "residents":
                var resident = await db.Residents.FindAsync(entry.RecordId.Value);
                if (resident is null) return false;
                var resProp = typeof(Resident).GetProperty(fieldName);
                if (resProp is null) return false;
                resProp.SetValue(resident, newValue);
                break;

            case "intervention_plans":
                var plan = await db.InterventionPlans.FindAsync(entry.RecordId.Value);
                if (plan is null) return false;
                var planProp = typeof(InterventionPlan).GetProperty(fieldName);
                if (planProp is null) return false;
                planProp.SetValue(plan, newValue);
                break;

            default:
                return false;
        }

        return true;
    }
}
