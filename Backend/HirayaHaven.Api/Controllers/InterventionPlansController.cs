using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class InterventionPlansController(HirayaContext db) : CrudControllerBase<InterventionPlan>(db)
{
    protected override DbSet<InterventionPlan> Entities => Db.InterventionPlans;
}
