# SQLite (local dev) database

This folder contains a small loader that creates a SQLite database from the project CSVs in `Data/`.

## Create / recreate the DB (PowerShell)

From the repo root:

```powershell
python .\db\sqlite\load_csv_to_sqlite.py --csv-dir .\Data --db-path .\Data\hiraya.db --overwrite --verify
```

- `--overwrite`: drops & recreates all tables before loading
- `--verify`: prints table row counts and runs `PRAGMA foreign_key_check`

## What gets created

- `Data/hiraya.db`: SQLite database file
- Tables correspond 1:1 with the CSV filenames in `Data/`

## Quick sanity checks (optional)

If you have `sqlite3` installed:

```powershell
sqlite3 .\Data\hiraya.db ".tables"
sqlite3 .\Data\hiraya.db "SELECT COUNT(*) FROM donations;"
sqlite3 .\Data\hiraya.db "PRAGMA foreign_key_check;"
```

