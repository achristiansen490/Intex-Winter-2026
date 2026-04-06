namespace HirayaHaven.Api.Models;

public class ProgramArea
{
    public int ProgramAreaId { get; set; }
    public string? AreaCode { get; set; }
    public string? AreaName { get; set; }
    public string? Description { get; set; }
    public string? AppliesTo { get; set; }
    public bool? IsActive { get; set; }
}
