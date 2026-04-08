using HirayaHaven.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Services;

public class PipelineScheduleHostedService(IServiceScopeFactory scopeFactory, ILogger<PipelineScheduleHostedService> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<HirayaContext>();
                var settings = await db.PipelineScheduleSettings.AsNoTracking()
                    .FirstOrDefaultAsync(s => s.SettingsId == 1, stoppingToken);
                if (settings is not { Enabled: true })
                {
                    await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
                    continue;
                }

                var now = DateTime.UtcNow;
                if (now.Hour != settings.HourUtc || now.Minute != settings.MinuteUtc)
                {
                    await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
                    continue;
                }

                var today = now.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
                if (string.Equals(settings.LastScheduledRunDate, today, StringComparison.Ordinal))
                {
                    await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
                    continue;
                }

                await using (var writeScope = scopeFactory.CreateAsyncScope())
                {
                    var dbWrite = writeScope.ServiceProvider.GetRequiredService<HirayaContext>();
                    var row = await dbWrite.PipelineScheduleSettings.FirstOrDefaultAsync(s => s.SettingsId == 1, stoppingToken);
                    if (row == null)
                    {
                        logger.LogWarning("pipeline_schedule_settings row missing; skipping scheduled training.");
                        continue;
                    }

                    row.LastScheduledRunDate = today;
                    await dbWrite.SaveChangesAsync(stoppingToken);

                    var training = writeScope.ServiceProvider.GetRequiredService<IPipelineTrainingService>();
                    var keys = PipelineDefinitions.All.Select(e => e.Id).ToList();
                    await training.StartTrainingAsync(keys, "Scheduled", null, stoppingToken);
                }

                logger.LogInformation("Scheduled pipeline training started for UTC {Date}", today);
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                logger.LogError(ex, "Pipeline schedule tick failed");
            }

            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }
}
