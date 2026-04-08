using System.Security.Claims;
using HirayaHaven.Api.Data;
using HirayaHaven.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

[ApiController]
[Route("api/admin/pipelines")]
[Authorize(Roles = "Admin")]
public class AdminPipelinesController(
    HirayaContext db,
    IPipelineTrainingService pipelineTraining) : ControllerBase
{
    public sealed record ScheduleDto(bool Enabled, int HourUtc, int MinuteUtc);
    public sealed record TrainingRunDto(string? PipelineId);

    [HttpGet("registry")]
    public IActionResult GetRegistry()
    {
        var items = PipelineDefinitions.All.Select(e =>
        {
            var sampleUrl = "/" + e.InsightsPath;
            if (e.Id == "donations-by-campaign")
                sampleUrl += "?take=12";
            else if (e.Id.StartsWith("residents-", StringComparison.Ordinal))
                sampleUrl += "?take=40";
            return new
            {
                id = e.Id,
                title = e.Title,
                description = e.Description,
                notebookFile = e.NotebookFile,
                insightsPath = e.InsightsPath,
                sampleUrl
            };
        });
        return Ok(items);
    }

    [HttpGet("runs")]
    public async Task<IActionResult> GetRuns([FromQuery] int take = 80, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 200);
        var runs = await db.PipelineTrainingRuns.AsNoTracking()
            .OrderByDescending(r => r.RunId)
            .Take(take)
            .Select(r => new
            {
                r.RunId,
                r.PipelineKey,
                r.TriggerType,
                r.Status,
                r.DetailMessage,
                r.StartedUtc,
                r.FinishedUtc,
                r.TriggeredByUserName
            })
            .ToListAsync(ct);
        return Ok(runs);
    }

    [HttpGet("schedule")]
    public async Task<IActionResult> GetSchedule(CancellationToken ct)
    {
        var row = await db.PipelineScheduleSettings.AsNoTracking()
            .FirstOrDefaultAsync(s => s.SettingsId == 1, ct);
        if (row == null)
            return Ok(new ScheduleDto(false, 2, 0));
        return Ok(new ScheduleDto(row.Enabled, row.HourUtc, row.MinuteUtc));
    }

    [HttpPut("schedule")]
    public async Task<IActionResult> PutSchedule([FromBody] ScheduleDto dto, CancellationToken ct)
    {
        dto = dto with
        {
            HourUtc = Math.Clamp(dto.HourUtc, 0, 23),
            MinuteUtc = Math.Clamp(dto.MinuteUtc, 0, 59)
        };
        var row = await db.PipelineScheduleSettings.FirstOrDefaultAsync(s => s.SettingsId == 1, ct);
        if (row == null)
        {
            row = new Models.PipelineScheduleSettings
            {
                SettingsId = 1,
                Enabled = dto.Enabled,
                HourUtc = dto.HourUtc,
                MinuteUtc = dto.MinuteUtc
            };
            db.PipelineScheduleSettings.Add(row);
        }
        else
        {
            row.Enabled = dto.Enabled;
            row.HourUtc = dto.HourUtc;
            row.MinuteUtc = dto.MinuteUtc;
        }

        await db.SaveChangesAsync(ct);
        return Ok(new ScheduleDto(row.Enabled, row.HourUtc, row.MinuteUtc));
    }

    [HttpPost("training/run")]
    public async Task<IActionResult> PostTrainingRun([FromBody] TrainingRunDto? body, CancellationToken ct)
    {
        var pipelineId = body?.PipelineId?.Trim();
        List<string> keys;
        if (string.IsNullOrEmpty(pipelineId))
            keys = PipelineDefinitions.All.Select(e => e.Id).ToList();
        else if (PipelineDefinitions.IsValidId(pipelineId))
            keys = [pipelineId];
        else
            return BadRequest(new { message = "Unknown pipeline id." });

        var userName = User.FindFirstValue(ClaimTypes.Name);
        var runIds = await pipelineTraining.StartTrainingAsync(keys, "Manual", userName, ct);
        return Accepted(new { runIds, pipelineKeys = keys });
    }
}
