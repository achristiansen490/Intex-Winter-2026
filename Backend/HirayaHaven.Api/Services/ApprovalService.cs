using System.Text.Json;
using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Services;

public class ApprovalService(HirayaContext db) : IApprovalService
{
    private static readonly Dictionary<string, HashSet<string>> SensitiveFields =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["residents"] = new(StringComparer.OrdinalIgnoreCase)
                { "CurrentRiskLevel", "CaseStatus", "ReintegrationStatus", "DateClosed" },
            ["intervention_plans"] = new(StringComparer.OrdinalIgnoreCase)
                { "Status" },
        };

    public bool RequiresApproval(string resource, string fieldName)
        => SensitiveFields.TryGetValue(resource, out var fields) && fields.Contains(fieldName);

    public async Task<AuditLog> QueueForApprovalAsync(int userId, string resource, int recordId,
        string fieldName, string? oldValue, string? newValue, string? ipAddress)
    {
        // Bug fix: use JsonSerializer instead of string interpolation to avoid JSON injection
        var oldJson = JsonSerializer.Serialize(new Dictionary<string, string?> { [fieldName] = oldValue });
        var newJson = JsonSerializer.Serialize(new Dictionary<string, string?> { [fieldName] = newValue });

        var entry = new AuditLog
        {
            UserId = userId,
            Action = "UPDATE",
            Resource = resource,
            RecordId = recordId,
            OldValue = oldJson,
            NewValue = newJson,
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

        JsonDocument doc;
        try { doc = JsonDocument.Parse(entry.NewValue); }
        catch { return false; }

        var prop = doc.RootElement.EnumerateObject().FirstOrDefault();
        var fieldName = prop.Name;
        var newStringValue = prop.Value.GetString();

        switch (entry.Resource.ToLowerInvariant())
        {
            case "residents":
                var resident = await db.Residents.FindAsync(entry.RecordId.Value);
                if (resident is null) return false;
                if (!SetTypedProperty(resident, fieldName, newStringValue)) return false;
                break;

            case "intervention_plans":
                var plan = await db.InterventionPlans.FindAsync(entry.RecordId.Value);
                if (plan is null) return false;
                if (!SetTypedProperty(plan, fieldName, newStringValue)) return false;
                break;

            default:
                // Unknown resource — log warning but don't silently succeed
                Console.Error.WriteLine($"[ApprovalService] ApplyChangeAsync: unhandled resource '{entry.Resource}'");
                return false;
        }

        return true;
    }

    /// <summary>
    /// Sets a property on an object, converting the string value to the correct CLR type.
    /// All sensitive fields on Resident and InterventionPlan are string?, so this is safe,
    /// but the conversion guard is here for future-proofing.
    /// </summary>
    private static bool SetTypedProperty(object target, string propertyName, string? value)
    {
        var prop = target.GetType().GetProperty(propertyName);
        if (prop is null || !prop.CanWrite) return false;

        var targetType = Nullable.GetUnderlyingType(prop.PropertyType) ?? prop.PropertyType;

        try
        {
            object? converted = targetType switch
            {
                _ when targetType == typeof(string) => value,
                _ when targetType == typeof(bool) => bool.Parse(value!),
                _ when targetType == typeof(int) => int.Parse(value!),
                _ when targetType == typeof(decimal) => decimal.Parse(value!),
                _ when targetType == typeof(double) => double.Parse(value!),
                _ when targetType == typeof(DateTime) => DateTime.Parse(value!),
                _ => Convert.ChangeType(value, targetType)
            };

            // Handle nullable — if value is null and type is nullable, set null
            if (value is null && prop.PropertyType.IsGenericType &&
                prop.PropertyType.GetGenericTypeDefinition() == typeof(Nullable<>))
                converted = null;

            prop.SetValue(target, converted);
            return true;
        }
        catch
        {
            Console.Error.WriteLine($"[ApprovalService] Failed to convert '{value}' to {targetType.Name} for property '{propertyName}'");
            return false;
        }
    }
}
