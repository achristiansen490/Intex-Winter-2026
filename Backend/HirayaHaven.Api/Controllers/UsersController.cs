using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class UsersController(HirayaContext db) : CrudControllerBase<AppUser>(db)
{
    protected override DbSet<AppUser> Entities => Db.Users;
}
