using HirayaHaven.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Services;

public class PermissionService(HirayaContext db) : IPermissionService
{
    // Cache permissions in memory after first load (they don't change at runtime)
    private static Dictionary<string, (bool allowed, string? scope)>? _cache;
    private static readonly SemaphoreSlim _lock = new(1, 1);

    private static string NormalizeAction(string action)
    {
        var a = action.Trim().ToLowerInvariant();
        return a switch
        {
            "view" => "read",
            "read" => "read",
            "edit" => "update",
            "update" => "update",
            "create" => "create",
            "add" => "create",
            "delete" => "delete",
            "remove" => "delete",
            _ => a
        };
    }

    private static string NormalizeResource(string resource)
    {
        return resource.Trim().ToLowerInvariant();
    }

    private static IEnumerable<string> ResourceAliases(string resource)
    {
        var r = NormalizeResource(resource);
        var aliases = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { r };

        // Common import/name variants across environments.
        switch (r)
        {
            case "residents":
                aliases.Add("resident");
                break;
            case "health_records":
                aliases.Add("healthrecord");
                aliases.Add("healthrecords");
                aliases.Add("health_wellbeing_records");
                aliases.Add("healthwellbeingrecord");
                aliases.Add("healthwellbeingrecords");
                break;
            case "education_records":
                aliases.Add("educationrecord");
                aliases.Add("educationrecords");
                break;
            case "process_recordings":
                aliases.Add("processrecording");
                aliases.Add("processrecordings");
                break;
            case "home_visitations":
                aliases.Add("homevisitation");
                aliases.Add("homevisitations");
                break;
            case "incident_reports":
                aliases.Add("incidentreport");
                aliases.Add("incidentreports");
                break;
            case "intervention_plans":
                aliases.Add("interventionplan");
                aliases.Add("interventionplans");
                break;
            case "safehouses":
                aliases.Add("safehouse");
                break;
            case "audit_log":
                aliases.Add("auditlog");
                break;
            case "donation_allocations":
                aliases.Add("donationallocation");
                aliases.Add("donationallocations");
                break;
        }

        // Also tolerate underscore/no-underscore variants.
        aliases.Add(r.Replace("_", string.Empty));
        return aliases;
    }

    private async Task<Dictionary<string, (bool allowed, string? scope)>> GetCacheAsync()
    {
        if (_cache is not null) return _cache;

        await _lock.WaitAsync();
        try
        {
            if (_cache is not null) return _cache;

            var perms = await db.RolePermissions
                .AsNoTracking()
                .Where(p => p.IsAllowed == true)
                .ToListAsync();

            // Avoid duplicate-key throws if imports differ only by whitespace/casing; trim for stable keys.
            var dict = new Dictionary<string, (bool allowed, string? scope)>(StringComparer.Ordinal);
            foreach (var p in perms)
            {
                if (string.IsNullOrWhiteSpace(p.Role) || string.IsNullOrWhiteSpace(p.Resource))
                    continue;
                var roleKey = p.Role.Trim().ToLowerInvariant();
                var actionKey = NormalizeAction(p.Action ?? string.Empty);
                foreach (var resourceKey in ResourceAliases(p.Resource))
                {
                    var key = $"{roleKey}:{resourceKey}:{actionKey}".ToLowerInvariant();
                    if (!dict.ContainsKey(key))
                        dict[key] = (true, p.ScopeNote);
                }
            }

            _cache = dict;
            return _cache;
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <summary>
    /// Maps API action names to keys that may exist in <c>roles_permissions</c>.
    /// Seeded data uses Read/Create/Update/Delete; CSV imports often use view/create/edit/delete.
    /// </summary>
    private static IEnumerable<string> ActionAliases(string action)
    {
        var a = action.Trim().ToLowerInvariant();
        return a switch
        {
            "read" => ["read", "view"],
            "update" => ["update", "edit"],
            "delete" => ["delete"],
            "create" => ["create"],
            _ => [a],
        };
    }

    public async Task<bool> CanAsync(string role, string resource, string action)
    {
        var cache = await GetCacheAsync();
        foreach (var act in ActionAliases(action))
        {
            foreach (var res in ResourceAliases(resource))
            {
                var key =
                    $"{role.Trim()}:{res}:{NormalizeAction(act)}"
                        .ToLowerInvariant();
                if (cache.ContainsKey(key))
                    return true;
            }
        }

        return false;
    }

    public async Task<string?> GetScopeNoteAsync(string role, string resource, string action)
    {
        var cache = await GetCacheAsync();
        foreach (var act in ActionAliases(action))
        {
            foreach (var res in ResourceAliases(resource))
            {
                var key =
                    $"{role.Trim()}:{res}:{NormalizeAction(act)}"
                        .ToLowerInvariant();
                if (cache.TryGetValue(key, out var entry))
                    return entry.scope;
            }
        }

        return null;
    }

    /// <summary>
    /// Call this if permissions are updated at runtime (e.g., admin edits the table).
    /// </summary>
    public static void InvalidateCache() => _cache = null;

    public void InvalidatePermissionCache() => InvalidateCache();
}
