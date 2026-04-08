using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Data;

// Separate context type so SQL Server migrations have their own snapshot/history metadata.
public class HirayaSqlServerContext(DbContextOptions<HirayaSqlServerContext> options) : HirayaContext(options)
{
}
