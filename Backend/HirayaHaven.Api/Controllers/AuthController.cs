using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace HirayaHaven.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    UserManager<AppUser> userManager,
    SignInManager<AppUser> signInManager,
    IConfiguration configuration,
    HirayaContext db) : ControllerBase
{
    // Valid roles for self-registration
    private static readonly HashSet<string> SelfRegisterRoles = new(StringComparer.OrdinalIgnoreCase)
        { "Donor", "FieldWorker" };

    // Roles that only Admin can create
    private static readonly HashSet<string> AdminCreatedRoles = new(StringComparer.OrdinalIgnoreCase)
        { "Admin", "Supervisor", "CaseManager", "SocialWorker" };

    // Roles that Admin or Supervisor can create
    private static readonly HashSet<string> SupervisorCreatableRoles = new(StringComparer.OrdinalIgnoreCase)
        { "Resident" };

    private static readonly HashSet<string> AllRoles = new(StringComparer.OrdinalIgnoreCase)
        { "Admin", "Supervisor", "CaseManager", "SocialWorker", "FieldWorker", "Resident", "Donor" };

    /// <summary>
    /// Public self-registration. Only Donor and FieldWorker can self-register.
    /// Donors are approved instantly. FieldWorkers require admin approval.
    /// </summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var role = request.Role ?? "Donor";

        if (!SelfRegisterRoles.Contains(role))
            return BadRequest(new { message = $"Role '{role}' cannot self-register. Contact an administrator." });

        var user = new AppUser
        {
            UserName = request.Username,
            Email = request.Email,
            UserType = role == "Donor" ? "Donor" : "Staff",
            IsActive = true,
            IsApproved = role == "Donor" // Donors approved instantly; FieldWorkers need admin approval
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        await userManager.AddToRoleAsync(user, role);

        var message = role == "Donor"
            ? "Registration successful."
            : "Registration successful. Your account requires admin approval before you can log in.";

        return Ok(new { message });
    }

    /// <summary>
    /// Admin/Supervisor creates accounts for internal staff or residents.
    /// </summary>
    [Authorize(Roles = "Admin,Supervisor")]
    [HttpPost("create-user")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        if (!AllRoles.Contains(request.Role))
            return BadRequest(new { message = $"Invalid role: {request.Role}" });

        var creatorId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var isAdmin = User.IsInRole("Admin");
        var isSupervisor = User.IsInRole("Supervisor");

        // Supervisors can only create Resident accounts
        if (isSupervisor && !isAdmin && !SupervisorCreatableRoles.Contains(request.Role))
            return Forbid();

        // Only Admin can create Admin/Supervisor/CaseManager/SocialWorker
        if (AdminCreatedRoles.Contains(request.Role) && !isAdmin)
            return Forbid();

        var userType = request.Role switch
        {
            "Donor" => "Donor",
            "Resident" => "Resident",
            _ => "Staff"
        };

        var user = new AppUser
        {
            UserName = request.Username,
            Email = request.Email,
            UserType = userType,
            StaffId = request.StaffId,
            ResidentId = request.ResidentId,
            SupporterId = request.SupporterId,
            IsActive = true,
            IsApproved = true, // Admin/Supervisor-created accounts are pre-approved
            CreatedBy = int.TryParse(creatorId, out var cid) ? cid : null,
            EmailConfirmed = true
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        await userManager.AddToRoleAsync(user, request.Role);

        return Ok(new { message = $"User created with role {request.Role}.", userId = user.Id });
    }

    /// <summary>
    /// Admin approves a pending account (e.g., FieldWorker self-registration).
    /// </summary>
    [Authorize(Roles = "Admin")]
    [HttpPost("approve/{userId:int}")]
    public async Task<IActionResult> ApproveUser([FromRoute] int userId)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null) return NotFound(new { message = "User not found." });

        if (user.IsApproved)
            return BadRequest(new { message = "User is already approved." });

        var approverId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        user.IsApproved = true;
        user.ApprovedBy = int.TryParse(approverId, out var aid) ? aid : null;
        user.ApprovedAt = DateTime.UtcNow;

        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        return Ok(new { message = "User approved successfully." });
    }

    /// <summary>
    /// Admin rejects / deactivates a pending account.
    /// </summary>
    [Authorize(Roles = "Admin")]
    [HttpPost("reject/{userId:int}")]
    public async Task<IActionResult> RejectUser([FromRoute] int userId)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null) return NotFound(new { message = "User not found." });

        user.IsActive = false;
        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        return Ok(new { message = "User rejected and deactivated." });
    }

    /// <summary>
    /// Admin lists all pending (unapproved) accounts.
    /// </summary>
    [Authorize(Roles = "Admin")]
    [HttpGet("pending")]
    public async Task<IActionResult> GetPendingUsers(CancellationToken ct)
    {
        var pending = await db.Users
            .AsNoTracking()
            .Where(u => u.IsActive && !u.IsApproved)
            .Select(u => new { u.Id, u.UserName, u.Email, u.UserType, u.CreatedAt })
            .ToListAsync(ct);

        return Ok(pending);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();

        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null)
            return Unauthorized(new { message = "Invalid credentials." });

        if (!user.IsActive)
            return Unauthorized(new { message = "Account has been deactivated." });

        if (!user.IsApproved)
            return Unauthorized(new { message = "Account is pending approval." });

        var result = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);

        if (result.IsLockedOut)
        {
            await LogAuthEventAsync(user.Id, "FAILED_LOGIN", ip, "Account locked out");
            return StatusCode(423, new { message = "Account is locked. Try again later." });
        }

        if (!result.Succeeded)
        {
            await LogAuthEventAsync(user.Id, "FAILED_LOGIN", ip);
            return Unauthorized(new { message = "Invalid credentials." });
        }

        user.LastLogin = DateTime.UtcNow;
        await userManager.UpdateAsync(user);

        await LogAuthEventAsync(user.Id, "LOGIN", ip);

        var roles = await userManager.GetRolesAsync(user);
        var token = GenerateJwt(user, roles);

        return Ok(new { token, roles });
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        if (int.TryParse(userId, out var uid))
            await LogAuthEventAsync(uid, "LOGOUT", ip);

        return Ok(new { message = "Logged out." });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await userManager.FindByIdAsync(userId!);
        if (user is null) return NotFound();

        var roles = await userManager.GetRolesAsync(user);
        return Ok(new
        {
            user.Id,
            user.UserName,
            user.Email,
            user.UserType,
            user.StaffId,
            user.ResidentId,
            user.SupporterId,
            user.IsActive,
            user.IsApproved,
            user.LastLogin,
            roles
        });
    }

    private async Task LogAuthEventAsync(int userId, string action, string? ipAddress, string? notes = null)
    {
        db.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            Action = action,
            Resource = "auth",
            IpAddress = ipAddress,
            Timestamp = DateTime.UtcNow.ToString("o"),
            Notes = notes
        });
        // Use base SaveChanges to avoid double-auditing
        await db.SaveChangesAsync();
    }

    private string GenerateJwt(AppUser user, IList<string> roles)
    {
        var jwtSection = configuration.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSection["Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email!),
            new(ClaimTypes.Name, user.UserName!),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        // Include scoping IDs in the token for frontend use
        if (user.StaffId.HasValue)
            claims.Add(new Claim("staffId", user.StaffId.Value.ToString()));
        if (user.ResidentId.HasValue)
            claims.Add(new Claim("residentId", user.ResidentId.Value.ToString()));
        if (user.SupporterId.HasValue)
            claims.Add(new Claim("supporterId", user.SupporterId.Value.ToString()));

        var token = new JwtSecurityToken(
            issuer: jwtSection["Issuer"],
            audience: jwtSection["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(double.Parse(jwtSection["ExpiryHours"] ?? "8")),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}


public record RegisterRequest(string Username, string Email, string Password, string? Role = "Donor");
public record CreateUserRequest(string Username, string Email, string Password, string Role,
    int? StaffId = null, int? ResidentId = null, int? SupporterId = null);
public record LoginRequest(string Email, string Password);
