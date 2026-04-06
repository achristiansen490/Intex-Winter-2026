using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class PartnerAssignmentsController(HirayaContext db) : CrudControllerBase<PartnerAssignment>(db)
{
    protected override DbSet<PartnerAssignment> Entities => Db.PartnerAssignments;
}
