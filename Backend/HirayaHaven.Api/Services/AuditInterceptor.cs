using System.Security.Claims;
using System.Text.Json;
using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace HirayaHaven.Api.Services;

/// <summary>
/// Automatically logs INSERT, UPDATE, DELETE operations to the audit_log table.
/// Called from HirayaContext.SaveChangesAsync override.
/// </summary>
public static class AuditInterceptor
{
    // Entity types we don't audit (to avoid infinite loops and noise)
    private static readonly HashSet<Type> ExcludedTypes = [typeof(AuditLog), typeof(RolePermission)];

    public static List<AuditLog> GetAuditEntries(ChangeTracker changeTracker, int? userId, string? ipAddress)
    {
        var entries = new List<AuditLog>();
        var timestamp = DateTime.UtcNow.ToString("o");

        foreach (var entry in changeTracker.Entries()
            .Where(e => !ExcludedTypes.Contains(e.Entity.GetType())
                        && e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted))
        {
            var entityType = entry.Entity.GetType();
            var tableName = entry.Metadata.GetTableName() ?? entityType.Name;

            // Get the primary key value
            var pkProperty = entry.Metadata.FindPrimaryKey()?.Properties.FirstOrDefault();
            int? recordId = null;
            if (pkProperty is not null)
            {
                var pkValue = entry.Property(pkProperty.Name).CurrentValue;
                if (pkValue is int intPk) recordId = intPk;
            }

            var action = entry.State switch
            {
                EntityState.Added => "INSERT",
                EntityState.Modified => "UPDATE",
                EntityState.Deleted => "DELETE",
                _ => "UNKNOWN"
            };

            string? oldValue = null;
            string? newValue = null;

            if (entry.State == EntityState.Modified)
            {
                var changes = new Dictionary<string, object?>();
                var originals = new Dictionary<string, object?>();

                foreach (var prop in entry.Properties.Where(p => p.IsModified))
                {
                    originals[prop.Metadata.Name] = prop.OriginalValue;
                    changes[prop.Metadata.Name] = prop.CurrentValue;
                }

                if (changes.Count == 0) continue; // No actual changes

                oldValue = JsonSerializer.Serialize(originals);
                newValue = JsonSerializer.Serialize(changes);
            }
            else if (entry.State == EntityState.Deleted)
            {
                var values = new Dictionary<string, object?>();
                foreach (var prop in entry.Properties)
                    values[prop.Metadata.Name] = prop.OriginalValue;
                oldValue = JsonSerializer.Serialize(values);
            }
            else if (entry.State == EntityState.Added)
            {
                var values = new Dictionary<string, object?>();
                foreach (var prop in entry.Properties)
                    values[prop.Metadata.Name] = prop.CurrentValue;
                newValue = JsonSerializer.Serialize(values);
            }

            entries.Add(new AuditLog
            {
                UserId = userId ?? 0,
                Action = action,
                Resource = tableName,
                RecordId = recordId,
                OldValue = oldValue,
                NewValue = newValue,
                RequiresApproval = false,
                IpAddress = ipAddress,
                Timestamp = timestamp
            });
        }

        return entries;
    }
}
