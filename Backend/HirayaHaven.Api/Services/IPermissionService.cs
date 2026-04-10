namespace HirayaHaven.Api.Services;

public interface IPermissionService
{
    Task<bool> CanAsync(string role, string resource, string action);
    Task<string?> GetScopeNoteAsync(string role, string resource, string action);

    /// <summary>Drop the in-memory permission cache (e.g. after <c>roles_permissions</c> rows change).</summary>
    void InvalidatePermissionCache();
}
