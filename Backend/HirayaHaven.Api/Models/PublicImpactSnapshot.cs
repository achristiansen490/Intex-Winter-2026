namespace HirayaHaven.Api.Models;

public class PublicImpactSnapshot
{
    public int SnapshotId { get; set; }
    public string? SnapshotDate { get; set; }
    public string? Headline { get; set; }
    public string? SummaryText { get; set; }
    public string? MetricPayloadJson { get; set; }
    public bool? IsPublished { get; set; }
    public string? PublishedAt { get; set; }
}
