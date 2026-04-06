using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class ProcessRecordingsController(HirayaContext db) : CrudControllerBase<ProcessRecording>(db)
{
    protected override DbSet<ProcessRecording> Entities => Db.ProcessRecordings;
}
