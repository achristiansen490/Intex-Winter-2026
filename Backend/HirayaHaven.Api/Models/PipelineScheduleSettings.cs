namespace HirayaHaven.Api.Models;

/// <summary>Singleton row (SettingsId = 1) for daily UTC training trigger.</summary>
public class PipelineScheduleSettings
{
    public int SettingsId { get; set; }
    public bool Enabled { get; set; }
    public int HourUtc { get; set; }
    public int MinuteUtc { get; set; }
    public string? LastScheduledRunDate { get; set; }
}
