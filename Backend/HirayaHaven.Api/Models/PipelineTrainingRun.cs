namespace HirayaHaven.Api.Models;

public class PipelineTrainingRun
{
    public int RunId { get; set; }
    public string PipelineKey { get; set; } = "";
    public string TriggerType { get; set; } = "Manual";
    public string Status { get; set; } = "Running";
    public string? DetailMessage { get; set; }
    public string StartedUtc { get; set; } = "";
    public string? FinishedUtc { get; set; }
    public string? TriggeredByUserName { get; set; }
}
