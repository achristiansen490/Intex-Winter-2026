using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class SupportersController(HirayaContext db) : CrudControllerBase<Supporter>(db)
{
    protected override DbSet<Supporter> Entities => Db.Supporters;
}
