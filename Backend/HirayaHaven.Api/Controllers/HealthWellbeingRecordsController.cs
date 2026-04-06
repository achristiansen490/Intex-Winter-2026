using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class HealthWellbeingRecordsController(HirayaContext db) : CrudControllerBase<HealthWellbeingRecord>(db)
{
    protected override DbSet<HealthWellbeingRecord> Entities => Db.HealthWellbeingRecords;
}
