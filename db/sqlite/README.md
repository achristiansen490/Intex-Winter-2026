# SQLite (local dev) database

This folder contains a small loader that creates a SQLite database from the project CSVs in `Data/`.

## Create / recreate the DB (PowerShell)

From the repo root:

```powershell
python .\db\sqlite\load_csv_to_sqlite.py --csv-dir .\Data --db-path .\Data\hiraya.db --overwrite --verify
```

- `--overwrite`: drops & recreates all tables before loading
- `--verify`: prints table row counts and runs `PRAGMA foreign_key_check`
- `--dry-run`: lists every `*.csv` found and the table it maps to, then exits (no DB write)
- `--recursive`: include `*.csv` in subfolders of `--csv-dir` (default is top-level only)
- `--skip-missing-csv`: if a known table has no CSV file, load 0 rows for it instead of failing

The loader **scans** `Data/*.csv`, matches each file to a table by filename (e.g. `donations.csv` → `donations`), and errors if an unknown CSV appears or if a required CSV is missing (unless `--skip-missing-csv`).

## What gets created

- `Data/hiraya.db`: SQLite database file
- Tables correspond 1:1 with the CSV filenames in `Data/` (see `load_order` in `load_csv_to_sqlite.py`)

## Quick sanity checks (optional)

If you have `sqlite3` installed:

```powershell
sqlite3 .\Data\hiraya.db ".tables"
sqlite3 .\Data\hiraya.db "SELECT COUNT(*) FROM donations;"
sqlite3 .\Data\hiraya.db "PRAGMA foreign_key_check;"
```

