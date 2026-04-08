using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using HirayaHaven.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

// Supporter data contains donor contact info — NOT public, requires auth
public class SupportersController(HirayaContext db, IPermissionService permissions, UserManager<AppUser> userManager)
    : CrudControllerBase<Supporter>(db, permissions, userManager)
{
    protected override DbSet<Supporter> Entities => Db.Supporters;
}
