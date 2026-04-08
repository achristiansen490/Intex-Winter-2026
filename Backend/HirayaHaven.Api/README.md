# Hiraya Haven API

ASP.NET Core Web API backend for Hiraya Haven.

## Stack
- .NET 10 Web API
- EF Core + SQLite (current)
- Migration-ready for Azure SQL (next phase)

## Run
```bash
dotnet restore
dotnet run
```

Default URL from launch profile is shown in terminal.

## Current endpoints
- `GET /api/dashboard/overview`
- `GET /api/safehouses`
- `GET /api/safehouses/{id}`
- `GET /api/partners?activeOnly=true|false`
- `GET /api/partners/{id}`
- `GET /api/donations?take=100`
- `GET /api/donations/summary`
- `GET /api/socialmediaposts?take=100`

## Database
Current local connection uses:
- `Data Source=../../Data/hiraya.db`

Configured in:
- `appsettings.Development.json`
- `appsettings.json`

## EF migration commands
Install tool if needed:
```bash
dotnet tool install --global dotnet-ef
```

Create migration:
```bash
dotnet ef migrations add InitialCreate
```

Apply migration:
```bash
dotnet ef database update
```

Generate SQL script for deployment:
```bash
dotnet ef migrations script -o migrations.sql
```

## SQL Server (Azure) migration commands
SQL Server migrations are kept separate from SQLite migrations.

Create a SQL Server migration:
```bash
dotnet ef migrations add <Name> --context HirayaSqlServerContext --output-dir Migrations/SqlServer
```

Apply SQL Server migrations:
```bash
dotnet ef database update --context HirayaSqlServerContext
```

Generate SQL script:
```bash
dotnet ef migrations script --context HirayaSqlServerContext --output Migrations/SqlServer/InitialAzureSql.sql
```

## Azure transition notes
1. Add `Microsoft.EntityFrameworkCore.SqlServer` package.
2. Change provider in `Program.cs` to `UseSqlServer(...)` for production.
3. Keep local dev on SQLite and use env-specific config.
4. Apply migration script through Azure database tooling.
