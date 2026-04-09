namespace HirayaHaven.Api.Models;

public class OkrTarget
{
    public int TargetId { get; set; }

    /// <summary>Stable key for OKR metric, e.g. "education.attendance".</summary>
    public string MetricKey { get; set; } = "";

    /// <summary>Calendar year, e.g. 2026.</summary>
    public int Year { get; set; }

    /// <summary>Calendar quarter (1-4).</summary>
    public int Quarter { get; set; }

    /// <summary>Target value for the metric for that period (e.g. 0.90 for 90%).</summary>
    public double TargetValue { get; set; }

    public string? Notes { get; set; }
}

