namespace HirayaHaven.Api.Services;

public interface IPermissionService
{
    Task<bool> CanAsync(string role, string resource, string action);
    Task<string?> GetScopeNoteAsync(string role, string resource, string action);
}
