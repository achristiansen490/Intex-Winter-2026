using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class RolePermissionsController(HirayaContext db) : CrudControllerBase<RolePermission>(db)
{
    protected override DbSet<RolePermission> Entities => Db.RolePermissions;
}
