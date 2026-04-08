namespace HirayaHaven.Api.Services;

public interface IPipelineTrainingService
{
    /// <summary>Creates run rows and processes the batch asynchronously (webhook or informational completion).</summary>
    Task<IReadOnlyList<int>> StartTrainingAsync(
        IReadOnlyList<string> pipelineKeys,
        string triggerType,
        string? triggeredByUserName,
        CancellationToken ct);
}
