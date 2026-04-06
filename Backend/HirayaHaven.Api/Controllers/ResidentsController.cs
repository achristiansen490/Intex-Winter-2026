using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class ResidentsController(HirayaContext db) : CrudControllerBase<Resident>(db)
{
    protected override DbSet<Resident> Entities => Db.Residents;
}
