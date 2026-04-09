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
        f"SET IDENTITY_INSERT dbo.{table} ON;\n"
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
        f"SET IDENTITY_INSERT dbo.{table} OFF;\n"
    )
    out.write("END\n")

    return row_count


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export a populated SQLite DB into SQL Server INSERT script (Azure SQL-friendly)."
    )
    parser.add_argument("--sqlite-db", type=Path, required=True, help="Path to source SQLite DB")
    parser.add_argument("--out", type=Path, required=True, help="Output .sql file (or directory when --split)")
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Rows per INSERT statement (default: 500)",
    )
    parser.add_argument(
        "--split",
        action="store_true",
        help="Write one .sql file per table into --out directory (Azure Query Editor friendly).",
    )
    args = parser.parse_args()

    if not args.sqlite_db.exists():
        raise SystemExit(f"SQLite DB not found: {args.sqlite_db}")

    conn = sqlite3.connect(str(args.sqlite_db))
    conn.row_factory = sqlite3.Row

    try:
        if args.split:
            _write_split(conn, args.out, args.batch_size)
        else:
            args.out.parent.mkdir(parents=True, exist_ok=True)
            _write_combined(conn, args.out, args.batch_size)
    finally:
        conn.close()


def _write_combined(conn: sqlite3.Connection, out_path: Path, batch_size: int) -> None:
    with out_path.open("w", encoding="utf-8") as out:
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
            counts[table] = write_table_inserts(out, conn, table, batch_size)

        out.write("\n-- Re-enable and validate FK constraints\n")
        for table in LOAD_ORDER:
            if table_exists(conn, table):
                out.write(
                    f"IF OBJECT_ID(N'dbo.{table}', N'U') IS NOT NULL "
                    f"ALTER TABLE dbo.{q_ident(table)} WITH CHECK CHECK CONSTRAINT ALL;\n"
                )
        out.write("COMMIT;\n")

    total = sum(counts.values())
    print(f"Wrote: {out_path}")
    print(f"Total rows scripted: {total}")
    for table in LOAD_ORDER:
        if table in counts:
            print(f"  {table}: {counts[table]}")


def _write_split(conn: sqlite3.Connection, out_dir: Path, batch_size: int) -> None:
    """One self-contained .sql file per table — each fits in Azure Query Editor."""
    out_dir.mkdir(parents=True, exist_ok=True)

    existing = [t for t in LOAD_ORDER if table_exists(conn, t)]

    # Step 00: disable FK constraints on all tables
    step00 = out_dir / "00_disable_fk.sql"
    with step00.open("w", encoding="utf-8") as f:
        f.write("-- Step 00: disable FK constraints before loading\n")
        f.write("-- Run this FIRST, before any table scripts.\n\n")
        for table in existing:
            f.write(
                f"IF OBJECT_ID(N'dbo.{table}', N'U') IS NOT NULL "
                f"ALTER TABLE dbo.{q_ident(table)} NOCHECK CONSTRAINT ALL;\n"
            )
        # Delete in reverse FK order so children go before parents
        f.write("\n-- Delete existing rows (children first)\n")
        for table in reversed(existing):
            f.write(
                f"IF OBJECT_ID(N'dbo.{table}', N'U') IS NOT NULL "
                f"DELETE FROM dbo.{q_ident(table)};\n"
            )
    print(f"Wrote: {step00}")

    # Steps 01..N: one file per table (split large tables into chunks)
    MAX_FILE_BYTES = 50_000  # ~50 KB — safe for Azure Query Editor

    file_idx = 1
    for table in existing:
        cols = get_table_columns(conn, table)
        col_list = ", ".join(q_ident(c) for c in cols)

        all_rows: list[str] = []
        for row in iter_rows(conn, table):
            values = ", ".join(sql_server_literal(v) for v in row)
            all_rows.append(f"({values})")

        if not all_rows:
            out_file = out_dir / f"{file_idx:02d}_{table}.sql"
            out_file.write_text(f"-- {table}: 0 rows\n", encoding="utf-8")
            print(f"  {out_file.name}: 0 rows")
            file_idx += 1
            continue

        # Split rows into chunks that keep each file under MAX_FILE_BYTES
        chunks: list[list[str]] = []
        current: list[str] = []
        current_size = 0
        for row_str in all_rows:
            row_size = len(row_str.encode("utf-8")) + 2
            if current and current_size + row_size > MAX_FILE_BYTES:
                chunks.append(current)
                current = []
                current_size = 0
            current.append(row_str)
            current_size += row_size
        if current:
            chunks.append(current)

        for part, chunk in enumerate(chunks, start=1):
            suffix = f"_part{part}" if len(chunks) > 1 else ""
            out_file = out_dir / f"{file_idx:02d}_{table}{suffix}.sql"
            with out_file.open("w", encoding="utf-8") as f:
                f.write(f"-- Step {file_idx:02d}: load [{table}]{' part ' + str(part) + '/' + str(len(chunks)) if len(chunks) > 1 else ''}\n")
                f.write("SET XACT_ABORT ON;\n")
                f.write("BEGIN TRAN;\n")
                f.write(
                    f"IF OBJECT_ID(N'dbo.{table}', N'U') IS NOT NULL\nBEGIN\n"
                    "  IF EXISTS (SELECT 1 FROM sys.identity_columns "
                    f"WHERE object_id = OBJECT_ID(N'dbo.{table}')) "
                    f"SET IDENTITY_INSERT dbo.{table} ON;\n"
                )
                # Write in sub-batches of batch_size rows
                for i in range(0, len(chunk), batch_size):
                    sub = chunk[i:i + batch_size]
                    f.write(f"  INSERT INTO dbo.{q_ident(table)} ({col_list}) VALUES\n")
                    f.write(",\n".join(sub))
                    f.write(";\n")
                f.write(
                    "  IF EXISTS (SELECT 1 FROM sys.identity_columns "
                    f"WHERE object_id = OBJECT_ID(N'dbo.{table}')) "
                    f"SET IDENTITY_INSERT dbo.{table} OFF;\n"
                    "END\n"
                )
                f.write("COMMIT;\n")
            print(f"  {out_file.name}: {len(chunk)} rows")
            file_idx += 1

    # Final step: re-enable and validate FK constraints
    step_final = out_dir / f"{file_idx:02d}_enable_fk.sql"
    with step_final.open("w", encoding="utf-8") as f:
        f.write("-- Final step: re-enable and validate FK constraints\n")
        f.write("-- Run this LAST, after all table scripts.\n\n")
        for table in existing:
            f.write(
                f"IF OBJECT_ID(N'dbo.{table}', N'U') IS NOT NULL "
                f"ALTER TABLE dbo.{q_ident(table)} WITH CHECK CHECK CONSTRAINT ALL;\n"
            )
    print(f"Wrote: {step_final}")
    print(f"\nRun files in numeric order in the Azure Query Editor.")


if __name__ == "__main__":
    main()
