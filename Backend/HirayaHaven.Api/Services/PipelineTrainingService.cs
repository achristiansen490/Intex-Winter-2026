using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Services;

public class PipelineTrainingService(
    IServiceScopeFactory scopeFactory,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    ILogger<PipelineTrainingService> logger) : IPipelineTrainingService
{
    private static readonly SemaphoreSlim BatchGate = new(1, 1);

    public async Task<IReadOnlyList<int>> StartTrainingAsync(
        IReadOnlyList<string> pipelineKeys,
        string triggerType,
        string? triggeredByUserName,
        CancellationToken ct)
    {
        if (pipelineKeys.Count == 0)
            return [];

        var started = DateTime.UtcNow.ToString("O");
        List<int> runIds;
        await using (var scope = scopeFactory.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<HirayaContext>();
            var tracked = new List<PipelineTrainingRun>();
            foreach (var key in pipelineKeys)
            {
                var run = new PipelineTrainingRun
                {
                    PipelineKey = key,
                    TriggerType = triggerType,
                    Status = "Running",
                    StartedUtc = started,
                    TriggeredByUserName = triggeredByUserName
                };
                db.PipelineTrainingRuns.Add(run);
                tracked.Add(run);
            }

            await db.SaveChangesAsync(ct);
            runIds = tracked.Select(r => r.RunId).ToList();
        }

        _ = ProcessBatchAsync(runIds, pipelineKeys.ToList(), triggerType, CancellationToken.None);
        return runIds;
    }

    private async Task ProcessBatchAsync(
        IReadOnlyList<int> runIds,
        IReadOnlyList<string> pipelineKeys,
        string triggerType,
        CancellationToken ct)
    {
        await BatchGate.WaitAsync(ct);
        try
        {
            var webhookUrl = configuration["PipelineTraining:WebhookUrl"]?.Trim();
            var webhookSecret = configuration["PipelineTraining:WebhookSecret"]?.Trim();

            string detail;
            string status;

            if (string.IsNullOrEmpty(webhookUrl))
            {
                status = "Completed";
                detail =
                    "No PipelineTraining:WebhookUrl is configured. Site insights already reflect current database data on each API request. " +
                    "Point WebhookUrl at an Azure Function or container job to run offline Python training and persist scores.";
            }
            else
            {
                try
                {
                    var client = httpClientFactory.CreateClient("PipelineTraining");
                    using var request = new HttpRequestMessage(HttpMethod.Post, webhookUrl);
                    if (!string.IsNullOrEmpty(webhookSecret))
                        request.Headers.TryAddWithoutValidation("X-Pipeline-Secret", webhookSecret);
                    var payload = new
                    {
                        trigger = triggerType,
                        pipelines = pipelineKeys,
                        runIds
                    };
                    request.Content = new StringContent(
                        JsonSerializer.Serialize(payload),
                        Encoding.UTF8,
                        "application/json");
                    request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

                    var response = await client.SendAsync(request, ct);
                    if (response.IsSuccessStatusCode)
                    {
                        status = "Completed";
                        detail = $"Webhook returned {(int)response.StatusCode} {response.ReasonPhrase}.";
                    }
                    else
                    {
                        status = "Failed";
                        var body = await response.Content.ReadAsStringAsync(ct);
                        detail = $"Webhook failed: {(int)response.StatusCode} {response.ReasonPhrase}. {Truncate(body, 500)}";
                    }
                }
                catch (Exception ex)
                {
                    status = "Failed";
                    detail = $"Webhook error: {ex.Message}";
                    logger.LogWarning(ex, "Pipeline training webhook failed");
                }
            }

            var finished = DateTime.UtcNow.ToString("O");
            await using var scope = scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<HirayaContext>();
            var runs = await db.PipelineTrainingRuns
                .Where(r => runIds.Contains(r.RunId))
                .ToListAsync(ct);
            foreach (var run in runs)
            {
                run.Status = status;
                run.DetailMessage = detail;
                run.FinishedUtc = finished;
            }

            await db.SaveChangesAsync(ct);
        }
        finally
        {
            BatchGate.Release();
        }
    }

    private static string Truncate(string s, int max)
    {
        if (string.IsNullOrEmpty(s) || s.Length <= max) return s;
        return s[..max] + "…";
    }
}
