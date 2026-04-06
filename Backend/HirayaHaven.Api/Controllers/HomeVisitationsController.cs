using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class HomeVisitationsController(HirayaContext db) : CrudControllerBase<HomeVisitation>(db)
{
    protected override DbSet<HomeVisitation> Entities => Db.HomeVisitations;
}
