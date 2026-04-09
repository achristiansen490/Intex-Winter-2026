namespace HirayaHaven.Api.Models;

public sealed class OkrTargetUpsertRequest
{
    public string MetricKey { get; set; } = "";
    public int Year { get; set; }
    public int Quarter { get; set; }
    public double TargetValue { get; set; }
}
