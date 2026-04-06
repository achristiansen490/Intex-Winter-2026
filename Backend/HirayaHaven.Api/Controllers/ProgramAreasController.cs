using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class ProgramAreasController(HirayaContext db) : CrudControllerBase<ProgramArea>(db)
{
    protected override DbSet<ProgramArea> Entities => Db.ProgramAreas;
}
