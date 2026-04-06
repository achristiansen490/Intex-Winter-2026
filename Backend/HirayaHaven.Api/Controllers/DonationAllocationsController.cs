using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class DonationAllocationsController(HirayaContext db) : CrudControllerBase<DonationAllocation>(db)
{
    protected override DbSet<DonationAllocation> Entities => Db.DonationAllocations;
}
