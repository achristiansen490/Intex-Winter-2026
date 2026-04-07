# Intex-Winter-2026

Hiraya Haven project repository for IS Jr Core.

## Project Structure
- `Frontend/INTEX II 3-10`: React + Vite frontend
- `Backend/HirayaHaven.Api`: ASP.NET Core Web API backend
- `Data`: source CSV files, ERD, and `hiraya.db` SQLite database
- `db/sqlite`: SQLite schema and data load scripts

## Quick Start

### Frontend
```bash
cd Frontend/INTEX\ II\ 3-10
npm install
npm run dev
```

### Backend
```bash
cd Backend/HirayaHaven.Api
dotnet restore
dotnet run
```

## Notes
- Backend currently uses SQLite (`Data/hiraya.db`) for local development.
- Database migration and Azure SQL transition work will be built on top of this scaffold.

## api routes
Here is a full list of all the api routes

/api/residents
/api/safehouses
/api/supporters
/api/partners
/api/donations
/api/donationallocations
/api/inkinddonationitems
/api/incidentreports
/api/educationrecords
/api/healthwellbeingrecords
/api/homevisitations
/api/processrecordings
/api/safehousemonthlymetrics
/api/publicimpactsnapshots
/api/socialmediaposts
/api/partnerassignments
/api/interventionplans
/api/organizations
/api/programareas
/api/staff
/api/users
/api/rolepermissions
/api/auditlogs
/api/dashboard (custom — not CRUD base)
/api/auth/register	
/api/auth/login	
/api/auth/me	

CORS is already configured to allow localhost:5173 and localhost:4173 (Vite dev and preview ports), so your React frontend can call it directly during development.