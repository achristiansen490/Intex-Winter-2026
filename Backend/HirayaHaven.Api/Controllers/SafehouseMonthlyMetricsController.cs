using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using HirayaHaven.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class SafehouseMonthlyMetricsController(HirayaContext db, IPermissionService permissions, UserManager<AppUser> userManager)
    : CrudControllerBase<SafehouseMonthlyMetric>(db, permissions, userManager)
{
    protected override DbSet<SafehouseMonthlyMetric> Entities => Db.SafehouseMonthlyMetrics;
}
