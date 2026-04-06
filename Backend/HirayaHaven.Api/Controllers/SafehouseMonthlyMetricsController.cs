using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class SafehouseMonthlyMetricsController(HirayaContext db) : CrudControllerBase<SafehouseMonthlyMetric>(db)
{
    protected override DbSet<SafehouseMonthlyMetric> Entities => Db.SafehouseMonthlyMetrics;
}
