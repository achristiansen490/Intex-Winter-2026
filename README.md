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

### 3. Frontend setup (`Frontend/INTEX II 3-10`)
In a second terminal:

```bash
cd "Frontend/INTEX II 3-10"
npm install
VITE_API_BASE_URL=http://127.0.0.1:5051 npm run dev -- --host 127.0.0.1 --port 5176
```

Expected local frontend URL:
- `http://127.0.0.1:5176`

## Notes
- Backend uses SQLite at `Data/hiraya.db` for local development.
- Current CORS allows localhost/127.0.0.1 HTTP dev origins.
- Current frontend build is mostly UI and does not yet call backend APIs directly.

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
