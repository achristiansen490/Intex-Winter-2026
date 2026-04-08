using System.Security.Claims;
using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using HirayaHaven.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class AuditLogsController(
    HirayaContext db,
    IPermissionService permissions,
    UserManager<AppUser> userManager,
    IApprovalService approvalService)
    : CrudControllerBase<AuditLog>(db, permissions, userManager)
{
    protected override DbSet<AuditLog> Entities => Db.AuditLogs;

    /// <summary>
    /// List all pending approval requests.
    /// </summary>
    [Authorize(Roles = "Admin,Supervisor")]
    [HttpGet("pending")]
    public async Task<IActionResult> GetPending(CancellationToken ct)
    {
        var pending = await Db.AuditLogs
            .AsNoTracking()
            .Where(a => a.RequiresApproval == true && a.ApprovalStatus == "Pending")
            .OrderByDescending(a => a.Timestamp)
            .ToListAsync(ct);

        return Ok(pending);
    }

    /// <summary>
    /// Approve a pending change. Supervisors can approve most changes; Admin required for case closure.
    /// </summary>
    [Authorize(Roles = "Admin,Supervisor")]
    [HttpPost("{id:int}/approve")]
    public async Task<IActionResult> Approve([FromRoute] int id)
    {
        var entry = await Db.AuditLogs.FindAsync(id);
        if (entry is null) return NotFound();

        // Case closure requires Admin only
        if (entry.NewValue?.Contains("DateClosed", StringComparison.OrdinalIgnoreCase) == true
            && !User.IsInRole("Admin"))
            return Forbid();

        var approverId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await approvalService.ApproveAsync(id, approverId);

        return result ? Ok(new { message = "Change approved and applied." }) : BadRequest(new { message = "Could not approve." });
    }

    /// <summary>
    /// Reject a pending change.
    /// </summary>
    [Authorize(Roles = "Admin,Supervisor")]
    [HttpPost("{id:int}/reject")]
    public async Task<IActionResult> Reject([FromRoute] int id)
    {
        var approverId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await approvalService.RejectAsync(id, approverId);

        return result ? Ok(new { message = "Change rejected." }) : BadRequest(new { message = "Could not reject." });
    }

    // Audit logs are immutable — block create, update, delete
    [HttpPost]
    public override Task<IActionResult> Create([FromBody] AuditLog entity, CancellationToken ct)
        => Task.FromResult<IActionResult>(Forbid());

    [HttpPut("{id:int}")]
    public override Task<IActionResult> Update([FromRoute] int id, [FromBody] AuditLog entity, CancellationToken ct)
        => Task.FromResult<IActionResult>(Forbid());

    [HttpDelete("{id:int}")]
    public override Task<IActionResult> Delete([FromRoute] int id, CancellationToken ct)
        => Task.FromResult<IActionResult>(Forbid());
}
