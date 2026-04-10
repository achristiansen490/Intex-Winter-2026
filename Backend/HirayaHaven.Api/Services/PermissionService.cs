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
                var key =
                    $"{p.Role.Trim()}:{p.Resource.Trim()}:{NormalizeAction(p.Action ?? string.Empty)}"
                        .ToLowerInvariant();
                if (!dict.ContainsKey(key))
                    dict[key] = (true, p.ScopeNote);
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
            var key =
                $"{role.Trim()}:{resource.Trim()}:{NormalizeAction(act)}"
                    .ToLowerInvariant();
            if (cache.ContainsKey(key))
                return true;
        }

        return false;
    }

    public async Task<string?> GetScopeNoteAsync(string role, string resource, string action)
    {
        var cache = await GetCacheAsync();
        foreach (var act in ActionAliases(action))
        {
            var key =
                $"{role.Trim()}:{resource.Trim()}:{NormalizeAction(act)}"
                    .ToLowerInvariant();
            if (cache.TryGetValue(key, out var entry))
                return entry.scope;
        }

        return null;
    }

    /// <summary>
    /// Call this if permissions are updated at runtime (e.g., admin edits the table).
    /// </summary>
    public static void InvalidateCache() => _cache = null;

    public void InvalidatePermissionCache() => InvalidateCache();
}
