import argparse
import sqlite3
from datetime import date, datetime
from pathlib import Path
from typing import Any, Iterable

# Parent-first load order (matches existing CSV/sqlite loader)
LOAD_ORDER = [
    "organization",
    "program_areas",
    "roles_permissions",
    "safehouses",
    "staff",
    "partners",
    "supporters",
    "social_media_posts",
    "partner_assignments",
    "residents",
    "users",
    "audit_log",
    "donations",
    "in_kind_donation_items",
    "donation_allocations",
    "process_recordings",
    "home_visitations",
    "education_records",
    "health_wellbeing_records",
    "intervention_plans",
    "incident_reports",
    "safehouse_monthly_metrics",
    "public_impact_snapshots",
]


def sql_server_literal(value: Any) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        # Keep numeric literals unquoted.
        return str(value)
    if isinstance(value, (datetime, date)):
        text = value.isoformat(sep=" ")
        return f"'{text}'"

    text = str(value)
    # Escape single quotes for SQL Server string literals.
    text = text.replace("'", "''")
    # Preserve unicode text with N''
    return f"N'{text}'"


def q_ident(name: str) -> str:
    return f"[{name.replace(']', ']]')}]"


def get_table_columns(conn: sqlite3.Connection, table: str) -> list[str]:
    rows = conn.execute(f'PRAGMA table_info("{table}")').fetchall()
    return [r[1] for r in rows]


def iter_rows(conn: sqlite3.Connection, table: str) -> Iterable[tuple[Any, ...]]:
    cur = conn.execute(f'SELECT * FROM "{table}"')
    for row in cur:
        yield row


def table_exists(conn: sqlite3.Connection, table: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?",
        (table,),
    ).fetchone()
    return row is not None


def write_table_inserts(
    out,
    conn: sqlite3.Connection,
    table: str,
    batch_size: int,
) -> int:
    cols = get_table_columns(conn, table)
    if not cols:
        return 0

    col_list = ", ".join(q_ident(c) for c in cols)
    row_count = 0

    out.write(f"\n-- {table}\n")

    out.write(
        f"IF OBJECT_ID(N'dbo.{table}', N'U') IS NOT NULL\nBEGIN\n"
        "  IF EXISTS (SELECT 1 FROM sys.identity_columns "
        f"WHERE object_id = OBJECT_ID(N'dbo.{table}')) "
        f"EXEC('SET IDENTITY_INSERT dbo.{table} ON');\n"
    )

    batch: list[str] = []
    for row in iter_rows(conn, table):
        values = ", ".join(sql_server_literal(v) for v in row)
        batch.append(f"({values})")
        row_count += 1

        if len(batch) >= batch_size:
            out.write(f"  INSERT INTO dbo.{q_ident(table)} ({col_list}) VALUES\n")
            out.write(",\n".join(batch))
            out.write(";\n")
            batch = []

    if batch:
        out.write(f"  INSERT INTO dbo.{q_ident(table)} ({col_list}) VALUES\n")
        out.write(",\n".join(batch))
        out.write(";\n")

    out.write(
        "  IF EXISTS (SELECT 1 FROM sys.identity_columns "
        f"WHERE object_id = OBJECT_ID(N'dbo.{table}')) "
        f"EXEC('SET IDENTITY_INSERT dbo.{table} OFF');\n"
    )
    out.write("END\n")

    return row_count


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export a populated SQLite DB into SQL Server INSERT script (Azure SQL-friendly)."
    )
    parser.add_argument("--sqlite-db", type=Path, required=True, help="Path to source SQLite DB")
    parser.add_argument("--out", type=Path, required=True, help="Output .sql file")
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Rows per INSERT statement (default: 500)",
    )
    args = parser.parse_args()

    if not args.sqlite_db.exists():
        raise SystemExit(f"SQLite DB not found: {args.sqlite_db}")

    args.out.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(args.sqlite_db))
    conn.row_factory = sqlite3.Row

    try:
        with args.out.open("w", encoding="utf-8") as out:
            out.write("SET XACT_ABORT ON;\n")
            out.write("BEGIN TRAN;\n")
            out.write("\n-- Temporarily disable FK checks while loading\n")
            for table in LOAD_ORDER:
                if table_exists(conn, table):
                    out.write(
                        f"IF OBJECT_ID(N'dbo.{table}', N'U') IS NOT NULL "
                        f"ALTER TABLE dbo.{q_ident(table)} NOCHECK CONSTRAINT ALL;\n"
                    )

            # Delete children first to avoid FK delete conflicts
            for table in reversed(LOAD_ORDER):
                if table_exists(conn, table):
                    out.write(
                        f"IF OBJECT_ID(N'dbo.{table}', N'U') IS NOT NULL "
                        f"DELETE FROM dbo.{q_ident(table)};\n"
                    )

            counts: dict[str, int] = {}
            for table in LOAD_ORDER:
                if not table_exists(conn, table):
                    continue
                counts[table] = write_table_inserts(out, conn, table, args.batch_size)

            out.write("\n-- Re-enable and validate FK constraints\n")
            for table in LOAD_ORDER:
                if table_exists(conn, table):
                    out.write(
                        f"IF OBJECT_ID(N'dbo.{table}', N'U') IS NOT NULL "
                        f"ALTER TABLE dbo.{q_ident(table)} WITH CHECK CHECK CONSTRAINT ALL;\n"
                    )
            out.write("COMMIT;\n")

        total = sum(counts.values())
        print(f"Wrote: {args.out}")
        print(f"Total rows scripted: {total}")
        for table in LOAD_ORDER:
            if table in counts:
                print(f"  {table}: {counts[table]}")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
