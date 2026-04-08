# Intex-Winter-2026

Hiraya Haven project repository for IS Jr Core.

## Project Structure
- `Frontend/INTEX II 3-10`: React + Vite frontend
- `Backend/HirayaHaven.Api`: ASP.NET Core Web API backend
- `Data`: source CSV files, ERD, and `hiraya.db` SQLite database
- `db/sqlite`: SQLite schema and data load scripts
- `ml-pipelines`: analysis notebooks for donor, operations, and outreach decisions

## Prerequisites
- Node.js 20+ and npm
- .NET SDK 10+
- Python 3.10+ (for the SQLite loader script)

## Local Setup

### 1. Clone and pull
```bash
git clone https://github.com/achristiansen490/Intex-Winter-2026.git
cd Intex-Winter-2026
git pull
```

### 2. Backend setup (`Backend/HirayaHaven.Api`)
The backend reads local dev values from `Backend/HirayaHaven.Api/.env`.

Test login used for demos:
- Username: `admin`
- Email: `admin@hirayahaven.org`
- Password: `TestPass!1234`

If you prefer user-secrets instead of `.env`:
```bash
cd Backend/HirayaHaven.Api
dotnet restore

dotnet user-secrets set "Jwt:Key" "replace-with-a-long-random-secret-at-least-32-chars"
dotnet user-secrets set "Seed:AdminPassword" "TestPass!1234"
dotnet user-secrets set "Seed:AdminEmail" "admin@hirayahaven.org"
```

Run the API:
```bash
cd Backend/HirayaHaven.Api
dotnet run
```

Expected local API URL:
- `http://127.0.0.1:5051` (or another local port if changed)

### 3. Build local SQLite data from CSVs (recommended)
Use the loader script so everyone gets the same reproducible local DB state.

```bash
python3 db/sqlite/load_csv_to_sqlite.py
```

This repopulates `Data/hiraya.db` from the CSV files in `Data/`.

### 4. Frontend setup (`Frontend/INTEX II 3-10`)
In a second terminal:

```bash
cd "Frontend/INTEX II 3-10"
npm install
VITE_API_BASE_URL=http://127.0.0.1:5051 npm run dev -- --host 127.0.0.1 --port 5176
```

Expected local frontend URL:
- `http://127.0.0.1:5176`

## Azure Prep (Simple Version)
You now have SQL Server migration files for Azure in:
- `Backend/HirayaHaven.Api/Migrations/SqlServer`

### 1. Set up the Azure database
Think of this as: “make an empty online SQL database first.”

1. Go to Azure Portal.
2. Create a **Resource Group** (any name).
3. Create an **Azure SQL Server** (this is the “machine” for your DB).
4. Create an **Azure SQL Database** (for example: `hiraya-haven`).
5. In the SQL Server networking settings:
   - allow your current IP
   - allow Azure services
6. Open your SQL Database page, copy the **ADO.NET connection string**.

### 2. Set up the backend for Azure SQL
Think of this as: “tell backend to use Azure SQL instead of local SQLite.”

1. In `Backend/HirayaHaven.Api/.env`, set:
```env
Database__Provider=sqlserver
ConnectionStrings__AzureSqlConnection=Server=tcp:<server>.database.windows.net,1433;Initial Catalog=<db>;Persist Security Info=False;User ID=<user>;Password=<password>;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
Cors__AllowedOrigins__0=https://<your-frontend-host>
```
2. Apply SQL Server migrations to Azure:
```bash
cd Backend/HirayaHaven.Api
dotnet ef database update --context HirayaSqlServerContext
```
3. Start backend and verify:
```bash
dotnet run
```

### 3. Set up the frontend for Azure backend
Think of this as: “point frontend API URL to your deployed backend URL.”

1. Build frontend with backend URL env var:
```bash
cd "Frontend/INTEX II 3-10"
npm install
VITE_API_BASE_URL=https://<your-backend-host> npm run build
```
2. Deploy `dist/` to your frontend host (Azure Static Web Apps or Azure App Service).
3. Confirm frontend can call backend endpoints (no CORS errors).

## Create Future Azure SQL Migrations
When your models change later:
```bash
cd Backend/HirayaHaven.Api
dotnet ef migrations add <MigrationName> --context HirayaSqlServerContext --output-dir Migrations/SqlServer
dotnet ef database update --context HirayaSqlServerContext
```

## Notes
- Backend uses SQLite at `Data/hiraya.db` for local development.
- Team workflow: prefer running `db/sqlite/load_csv_to_sqlite.py` after pulling instead of sharing DB snapshots.
- Current CORS allows localhost/127.0.0.1 HTTP dev origins.
- Frontend pages read from live backend API endpoints.

## API Routes
- `/api/residents`
- `/api/safehouses`
- `/api/supporters`
- `/api/partners`
- `/api/donations`
- `/api/donationallocations`
- `/api/inkinddonationitems`
- `/api/incidentreports`
- `/api/educationrecords`
- `/api/healthwellbeingrecords`
- `/api/homevisitations`
- `/api/processrecordings`
- `/api/safehousemonthlymetrics`
- `/api/publicimpactsnapshots`
- `/api/socialmediaposts`
- `/api/partnerassignments`
- `/api/interventionplans`
- `/api/organizations`
- `/api/programareas`
- `/api/staff`
- `/api/users`
- `/api/rolepermissions`
- `/api/auditlogs`
- `/api/dashboard` (custom; not CRUD base)
- `/api/dashboard/overview`
- `/api/dashboard/kpis`
- `/api/dashboard/admin-proof` (Admin only)
- `/api/auth/register`
- `/api/auth/login`
- `/api/auth/me`
