using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class AuditLogsController(HirayaContext db) : CrudControllerBase<AuditLog>(db)
{
    protected override DbSet<AuditLog> Entities => Db.AuditLogs;
}
