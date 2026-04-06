namespace HirayaHaven.Api.Models;

public class RolePermission
{
    public int PermissionId { get; set; }
    public string? Role { get; set; }
    public string? Resource { get; set; }
    public string? Action { get; set; }
    public bool? IsAllowed { get; set; }
    public string? ScopeNote { get; set; }
}
