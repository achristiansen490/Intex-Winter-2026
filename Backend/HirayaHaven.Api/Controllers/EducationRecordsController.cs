using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class EducationRecordsController(HirayaContext db) : CrudControllerBase<EducationRecord>(db)
{
    protected override DbSet<EducationRecord> Entities => Db.EducationRecords;
}
