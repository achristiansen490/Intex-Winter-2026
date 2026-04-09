# SQL Server Data Import (from SQLite)

This folder contains a helper to export your populated SQLite DB into a SQL Server-compatible `INSERT` script.

## 1) Generate import SQL from local SQLite

From repo root:

```bash
python3 db/sqlserver/export_sqlite_to_sqlserver_inserts.py \
  --sqlite-db Data/hiraya.db \
  --out db/sqlserver/hiraya_azure_import.sql
```

## 2) Run the generated SQL in Azure SQL

1. Open Azure Portal -> `hiraya-db` -> **Query editor**.
2. Paste/upload `db/sqlserver/hiraya_azure_import.sql`.
3. Run it once (it will clear and reload data in the known app tables).

## 3) Verify counts

```sql
SELECT COUNT(*) AS residents  FROM residents;
SELECT COUNT(*) AS donations  FROM donations;
SELECT COUNT(*) AS supporters FROM supporters;
SELECT COUNT(*) AS safehouses FROM safehouses;
```

## 4) Restart backend App Service

After import, restart `Hiraya-Backend` so API responses reflect current data immediately.
