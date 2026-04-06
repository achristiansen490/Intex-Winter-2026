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
