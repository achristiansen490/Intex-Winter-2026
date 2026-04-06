using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class StaffController(HirayaContext db) : CrudControllerBase<Staff>(db)
{
    protected override DbSet<Staff> Entities => Db.Staff;
}
