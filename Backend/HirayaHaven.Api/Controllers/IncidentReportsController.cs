using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class IncidentReportsController(HirayaContext db) : CrudControllerBase<IncidentReport>(db)
{
    protected override DbSet<IncidentReport> Entities => Db.IncidentReports;
}
