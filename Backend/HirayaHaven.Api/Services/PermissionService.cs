using HirayaHaven.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Services;

public class PermissionService(HirayaContext db) : IPermissionService
{
    // Cache permissions in memory after first load (they don't change at runtime)
    private static Dictionary<string, (bool allowed, string? scope)>? _cache;
    private static readonly SemaphoreSlim _lock = new(1, 1);

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

            _cache = perms.ToDictionary(
                p => $"{p.Role}:{p.Resource}:{p.Action}".ToLowerInvariant(),
                p => (p.IsAllowed ?? false, p.ScopeNote));

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
        var r = role.Trim().ToLowerInvariant();
        var res = resource.Trim().ToLowerInvariant();
        foreach (var alias in ActionAliases(action))
        {
            var key = $"{r}:{res}:{alias}";
            if (cache.ContainsKey(key)) return true;
        }
        return false;
    }

    public async Task<string?> GetScopeNoteAsync(string role, string resource, string action)
    {
        var cache = await GetCacheAsync();
        var r = role.Trim().ToLowerInvariant();
        var res = resource.Trim().ToLowerInvariant();
        foreach (var alias in ActionAliases(action))
        {
            var key = $"{r}:{res}:{alias}";
            if (cache.TryGetValue(key, out var entry)) return entry.scope;
        }
        return null;
    }

    /// <summary>
    /// Call this if permissions are updated at runtime (e.g., admin edits the table).
    /// </summary>
    public static void InvalidateCache() => _cache = null;
}
