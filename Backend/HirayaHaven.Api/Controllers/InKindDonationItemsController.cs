using HirayaHaven.Api.Data;
using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Controllers;

public class InKindDonationItemsController(HirayaContext db) : CrudControllerBase<InKindDonationItem>(db)
{
    protected override DbSet<InKindDonationItem> Entities => Db.InKindDonationItems;
}
