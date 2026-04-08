import argparse
import csv
import sqlite3
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


def _parse_bool(raw: str) -> Optional[int]:
    v = raw.strip()
    if v == "":
        return None
    if v.lower() in {"true", "1", "t", "yes", "y"}:
        return 1
    if v.lower() in {"false", "0", "f", "no", "n"}:
        return 0
    raise ValueError(f"Unrecognized boolean value: {raw!r}")


def _parse_int(raw: str) -> Optional[int]:
    v = raw.strip()
    if v == "":
        return None
    # Some CSVs store integer IDs as "8.0"
    if v.endswith(".0"):
        v = v[:-2]
    return int(v)


def _parse_real(raw: str) -> Optional[float]:
    v = raw.strip()
    if v == "":
        return None
    return float(v)


def _parse_text(raw: str) -> Optional[str]:
    v = raw
    if v is None:
        return None
    v2 = v.strip()
    if v2 == "":
        return None
    return v


def _convert(raw: str, kind: str) -> Any:
    if kind == "BOOL":
        return _parse_bool(raw)
    if kind == "INTEGER":
        return _parse_int(raw)
    if kind == "REAL":
        return _parse_real(raw)
    if kind == "TEXT":
        return _parse_text(raw)
    raise ValueError(f"Unknown kind {kind!r}")


def _read_csv_rows(csv_path: Path) -> Tuple[List[str], Iterable[Dict[str, str]]]:
    f = csv_path.open("r", encoding="utf-8-sig", newline="")
    reader = csv.DictReader(f)
    if reader.fieldnames is None:
        f.close()
        raise ValueError(f"No headers found in {csv_path}")

    headers = list(reader.fieldnames)

    def row_iter() -> Iterable[Dict[str, str]]:
        try:
            for row in reader:
                yield row
        finally:
            f.close()

    return headers, row_iter()


def _exec_schema(conn: sqlite3.Connection, schema_path: Path) -> None:
    # schema.sql toggles foreign_keys OFF during DROP/CREATE, ON at end.
    schema_sql = schema_path.read_text(encoding="utf-8")
    conn.executescript(schema_sql)
    conn.execute("PRAGMA foreign_keys = ON;")


def _insert_table(
    conn: sqlite3.Connection,
    table: str,
    csv_path: Path,
    col_kinds: Dict[str, str],
) -> int:
    headers, rows = _read_csv_rows(csv_path)

    missing = [h for h in headers if h not in col_kinds]
    if missing:
        raise ValueError(
            f"{csv_path.name}: headers not present in type-map for {table}: {missing}"
        )

    ordered_cols = headers
    placeholders = ",".join(["?"] * len(ordered_cols))
    col_list = ",".join([f'"{c}"' for c in ordered_cols])
    sql = f'INSERT INTO "{table}" ({col_list}) VALUES ({placeholders})'

    converted_rows: List[Tuple[Any, ...]] = []
    for row in rows:
        converted: List[Any] = []
        for c in ordered_cols:
            raw = row.get(c, "")
            kind = col_kinds[c]
            try:
                converted.append(_convert(raw, kind))
            except Exception as e:
                raise ValueError(
                    f"Failed converting {table}.{c} value {raw!r} as {kind} "
                    f"(file {csv_path.name})"
                ) from e
        converted_rows.append(tuple(converted))

    if not converted_rows:
        return 0

    conn.executemany(sql, converted_rows)
    return len(converted_rows)


def _foreign_key_check(conn: sqlite3.Connection) -> List[Tuple[Any, ...]]:
    return list(conn.execute("PRAGMA foreign_key_check;").fetchall())


def _discover_csv_files(csv_dir: Path, *, recursive: bool) -> Dict[str, Path]:
    """Return mapping table_name -> path for each *.csv (table name = filename stem, lowercased)."""
    pattern = "**/*.csv" if recursive else "*.csv"
    by_table: Dict[str, Path] = {}
    for path in sorted(csv_dir.glob(pattern)):
        if not path.is_file():
            continue
        key = path.stem.lower()
        if key in by_table:
            raise SystemExit(
                f"Two CSV files map to the same table {key!r}:\n  {by_table[key]}\n  {path}"
            )
        by_table[key] = path
    return by_table


def main() -> None:
    parser = argparse.ArgumentParser(description="Load Intex2 CSVs into SQLite.")
    parser.add_argument("--csv-dir", required=True, type=Path)
    parser.add_argument("--db-path", required=True, type=Path)
    parser.add_argument(
        "--schema-path",
        default=Path(__file__).resolve().parent / "schema.sql",
        type=Path,
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Drop & recreate tables before loading.",
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Print row counts and run foreign key check.",
    )
    parser.add_argument(
        "--recursive",
        action="store_true",
        help="Also load *.csv files in subfolders of --csv-dir (default: only top-level).",
    )
    parser.add_argument(
        "--skip-missing-csv",
        action="store_true",
        help="If a table in the load order has no matching CSV, skip it (0 rows) instead of failing.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List discovered CSV files and planned load order, then exit without writing the DB.",
    )
    args = parser.parse_args()

    csv_dir: Path = args.csv_dir
    db_path: Path = args.db_path
    schema_path: Path = args.schema_path

    if not csv_dir.exists():
        raise SystemExit(f"CSV dir not found: {csv_dir}")
    if not schema_path.exists():
        raise SystemExit(f"Schema file not found: {schema_path}")

    discovered = _discover_csv_files(csv_dir, recursive=args.recursive)

    # Column type map (must match db/sqlite/schema.sql)
    BOOL = "BOOL"
    INTEGER = "INTEGER"
    REAL = "REAL"
    TEXT = "TEXT"

    types: Dict[str, Dict[str, str]] = {
        "organization": {
            "org_id": INTEGER,
            "org_name": TEXT,
            "legal_name": TEXT,
            "org_type": TEXT,
            "ein": TEXT,
            "country_of_registration": TEXT,
            "operations_country": TEXT,
            "address_line1": TEXT,
            "address_line2": TEXT,
            "city": TEXT,
            "state": TEXT,
            "zip_code": TEXT,
            "country": TEXT,
            "phone": TEXT,
            "email": TEXT,
            "website": TEXT,
            "logo_url": TEXT,
            "mission_statement": TEXT,
            "founded_year": INTEGER,
            "fiscal_year_start": TEXT,
            "fiscal_year_end": TEXT,
            "currency_primary": TEXT,
            "currency_reporting": TEXT,
            "created_at": TEXT,
            "updated_at": TEXT,
        },
        "program_areas": {
            "program_area_id": INTEGER,
            "area_code": TEXT,
            "area_name": TEXT,
            "description": TEXT,
            "applies_to": TEXT,
            "is_active": BOOL,
        },
        "roles_permissions": {
            "permission_id": INTEGER,
            "role": TEXT,
            "resource": TEXT,
            "action": TEXT,
            "is_allowed": BOOL,
            "scope_note": TEXT,
        },
        "safehouses": {
            "safehouse_id": INTEGER,
            "safehouse_code": TEXT,
            "name": TEXT,
            "region": TEXT,
            "city": TEXT,
            "province": TEXT,
            "country": TEXT,
            "open_date": TEXT,
            "status": TEXT,
            "capacity_girls": INTEGER,
            "capacity_staff": INTEGER,
            "current_occupancy": INTEGER,
            "notes": TEXT,
        },
        "staff": {
            "staff_id": INTEGER,
            "staff_code": TEXT,
            "first_name": TEXT,
            "last_name": TEXT,
            "age": INTEGER,
            "email": TEXT,
            "phone": TEXT,
            "role": TEXT,
            "employment_type": TEXT,
            "specialization": TEXT,
            "safehouse_id": INTEGER,
            "employment_status": TEXT,
            "date_hired": TEXT,
            "date_ended": TEXT,
            "created_at": TEXT,
            "updated_at": TEXT,
        },
        "partners": {
            "partner_id": INTEGER,
            "partner_name": TEXT,
            "partner_type": TEXT,
            "role_type": TEXT,
            "contact_name": TEXT,
            "email": TEXT,
            "phone": TEXT,
            "region": TEXT,
            "status": TEXT,
            "start_date": TEXT,
            "end_date": TEXT,
            "notes": TEXT,
        },
        "supporters": {
            "supporter_id": INTEGER,
            "supporter_type": TEXT,
            "display_name": TEXT,
            "organization_name": TEXT,
            "first_name": TEXT,
            "last_name": TEXT,
            "relationship_type": TEXT,
            "region": TEXT,
            "country": TEXT,
            "email": TEXT,
            "phone": TEXT,
            "status": TEXT,
            "created_at": TEXT,
            "first_donation_date": TEXT,
            "acquisition_channel": TEXT,
        },
        "social_media_posts": {
            "post_id": INTEGER,
            "platform": TEXT,
            "platform_post_id": TEXT,
            "post_url": TEXT,
            "created_at": TEXT,
            "day_of_week": TEXT,
            "post_hour": INTEGER,
            "post_type": TEXT,
            "media_type": TEXT,
            "caption": TEXT,
            "hashtags": TEXT,
            "num_hashtags": INTEGER,
            "mentions_count": INTEGER,
            "has_call_to_action": BOOL,
            "call_to_action_type": TEXT,
            "content_topic": TEXT,
            "sentiment_tone": TEXT,
            "caption_length": INTEGER,
            "features_resident_story": BOOL,
            "campaign_name": TEXT,
            "is_boosted": BOOL,
            "boost_budget_php": REAL,
            "impressions": INTEGER,
            "reach": INTEGER,
            "likes": INTEGER,
            "comments": INTEGER,
            "shares": INTEGER,
            "saves": INTEGER,
            "click_throughs": INTEGER,
            "video_views": INTEGER,
            "engagement_rate": REAL,
            "profile_visits": INTEGER,
            "donation_referrals": INTEGER,
            "estimated_donation_value_php": REAL,
            "follower_count_at_post": INTEGER,
            "watch_time_seconds": INTEGER,
            "avg_view_duration_seconds": INTEGER,
            "subscriber_count_at_post": INTEGER,
            "forwards": INTEGER,
        },
        "partner_assignments": {
            "assignment_id": INTEGER,
            "partner_id": INTEGER,
            "safehouse_id": INTEGER,
            "program_area": TEXT,
            "assignment_start": TEXT,
            "assignment_end": TEXT,
            "responsibility_notes": TEXT,
            "is_primary": BOOL,
            "status": TEXT,
        },
        "residents": {
            "resident_id": INTEGER,
            "case_control_no": TEXT,
            "internal_code": TEXT,
            "safehouse_id": INTEGER,
            "case_status": TEXT,
            "sex": TEXT,
            "date_of_birth": TEXT,
            "birth_status": TEXT,
            "place_of_birth": TEXT,
            "religion": TEXT,
            "case_category": TEXT,
            "sub_cat_orphaned": BOOL,
            "sub_cat_trafficked": BOOL,
            "sub_cat_child_labor": BOOL,
            "sub_cat_physical_abuse": BOOL,
            "sub_cat_sexual_abuse": BOOL,
            "sub_cat_osaec": BOOL,
            "sub_cat_cicl": BOOL,
            "sub_cat_at_risk": BOOL,
            "sub_cat_street_child": BOOL,
            "sub_cat_child_with_hiv": BOOL,
            "is_pwd": BOOL,
            "pwd_type": TEXT,
            "has_special_needs": BOOL,
            "special_needs_diagnosis": TEXT,
            "family_is_4ps": BOOL,
            "family_solo_parent": BOOL,
            "family_indigenous": BOOL,
            "family_parent_pwd": BOOL,
            "family_informal_settler": BOOL,
            "date_of_admission": TEXT,
            "age_upon_admission": TEXT,
            "present_age": TEXT,
            "length_of_stay": TEXT,
            "referral_source": TEXT,
            "referring_agency_person": TEXT,
            "date_colb_registered": TEXT,
            "date_colb_obtained": TEXT,
            "assigned_social_worker": TEXT,
            "initial_case_assessment": TEXT,
            "date_case_study_prepared": TEXT,
            "reintegration_type": TEXT,
            "reintegration_status": TEXT,
            "initial_risk_level": TEXT,
            "current_risk_level": TEXT,
            "date_enrolled": TEXT,
            "date_closed": TEXT,
            "created_at": TEXT,
            "notes_restricted": TEXT,
        },
        "users": {
            "user_id": INTEGER,
            "user_type": TEXT,
            "staff_id": INTEGER,
            "resident_id": INTEGER,
            "supporter_id": INTEGER,
            "username": TEXT,
            "email": TEXT,
            "password_hash": TEXT,
            "role": TEXT,
            "is_active": BOOL,
            "is_approved": BOOL,
            "approved_by": INTEGER,
            "approved_at": TEXT,
            "last_login": TEXT,
            "failed_login_attempts": INTEGER,
            "locked_until": TEXT,
            "mfa_enabled": BOOL,
            "mfa_secret": TEXT,
            "password_reset_token": TEXT,
            "password_reset_expires": TEXT,
            "reset_initiated_by": INTEGER,
            "created_by": INTEGER,
            "created_at": TEXT,
            "updated_at": TEXT,
        },
        "audit_log": {
            "audit_id": INTEGER,
            "user_id": INTEGER,
            "action": TEXT,
            "resource": TEXT,
            "record_id": INTEGER,
            "old_value": TEXT,
            "new_value": TEXT,
            "requires_approval": BOOL,
            "approval_status": TEXT,
            "approved_by": INTEGER,
            "approved_at": TEXT,
            "ip_address": TEXT,
            "timestamp": TEXT,
            "notes": TEXT,
        },
        "donations": {
            "donation_id": INTEGER,
            "supporter_id": INTEGER,
            "donation_type": TEXT,
            "donation_date": TEXT,
            "is_recurring": BOOL,
            "campaign_name": TEXT,
            "channel_source": TEXT,
            "currency_code": TEXT,
            "amount": REAL,
            "estimated_value": REAL,
            "impact_unit": TEXT,
            "notes": TEXT,
            "referral_post_id": INTEGER,
        },
        "in_kind_donation_items": {
            "item_id": INTEGER,
            "donation_id": INTEGER,
            "item_name": TEXT,
            "item_category": TEXT,
            "quantity": INTEGER,
            "unit_of_measure": TEXT,
            "estimated_unit_value": REAL,
            "intended_use": TEXT,
            "received_condition": TEXT,
        },
        "donation_allocations": {
            "allocation_id": INTEGER,
            "donation_id": INTEGER,
            "safehouse_id": INTEGER,
            "program_area": TEXT,
            "amount_allocated": REAL,
            "allocation_date": TEXT,
            "allocation_notes": TEXT,
        },
        "process_recordings": {
            "recording_id": INTEGER,
            "resident_id": INTEGER,
            "session_date": TEXT,
            "social_worker": TEXT,
            "session_type": TEXT,
            "session_duration_minutes": INTEGER,
            "emotional_state_observed": TEXT,
            "emotional_state_end": TEXT,
            "session_narrative": TEXT,
            "interventions_applied": TEXT,
            "follow_up_actions": TEXT,
            "progress_noted": BOOL,
            "concerns_flagged": BOOL,
            "referral_made": BOOL,
            "notes_restricted": TEXT,
        },
        "home_visitations": {
            "visitation_id": INTEGER,
            "resident_id": INTEGER,
            "visit_date": TEXT,
            "social_worker": TEXT,
            "visit_type": TEXT,
            "location_visited": TEXT,
            "family_members_present": TEXT,
            "purpose": TEXT,
            "observations": TEXT,
            "family_cooperation_level": TEXT,
            "safety_concerns_noted": BOOL,
            "follow_up_needed": BOOL,
            "follow_up_notes": TEXT,
            "visit_outcome": TEXT,
        },
        "education_records": {
            "education_record_id": INTEGER,
            "resident_id": INTEGER,
            "record_date": TEXT,
            "education_level": TEXT,
            "school_name": TEXT,
            "enrollment_status": TEXT,
            "attendance_rate": REAL,
            "progress_percent": REAL,
            "completion_status": TEXT,
            "notes": TEXT,
        },
        "health_wellbeing_records": {
            "health_record_id": INTEGER,
            "resident_id": INTEGER,
            "record_date": TEXT,
            "general_health_score": REAL,
            "nutrition_score": REAL,
            "sleep_quality_score": REAL,
            "energy_level_score": REAL,
            "height_cm": REAL,
            "weight_kg": REAL,
            "bmi": REAL,
            "medical_checkup_done": BOOL,
            "dental_checkup_done": BOOL,
            "psychological_checkup_done": BOOL,
            "notes": TEXT,
        },
        "intervention_plans": {
            "plan_id": INTEGER,
            "resident_id": INTEGER,
            "plan_category": TEXT,
            "plan_description": TEXT,
            "services_provided": TEXT,
            "target_value": REAL,
            "target_date": TEXT,
            "status": TEXT,
            "case_conference_date": TEXT,
            "created_at": TEXT,
            "updated_at": TEXT,
        },
        "incident_reports": {
            "incident_id": INTEGER,
            "resident_id": INTEGER,
            "safehouse_id": INTEGER,
            "incident_date": TEXT,
            "incident_type": TEXT,
            "severity": TEXT,
            "description": TEXT,
            "response_taken": TEXT,
            "resolved": BOOL,
            "resolution_date": TEXT,
            "reported_by": TEXT,
            "follow_up_required": BOOL,
        },
        "safehouse_monthly_metrics": {
            "metric_id": INTEGER,
            "safehouse_id": INTEGER,
            "month_start": TEXT,
            "month_end": TEXT,
            "active_residents": INTEGER,
            "avg_education_progress": REAL,
            "avg_health_score": REAL,
            "process_recording_count": INTEGER,
            "home_visitation_count": INTEGER,
            "incident_count": INTEGER,
            "notes": TEXT,
        },
        "public_impact_snapshots": {
            "snapshot_id": INTEGER,
            "snapshot_date": TEXT,
            "headline": TEXT,
            "summary_text": TEXT,
            "metric_payload_json": TEXT,
            "is_published": BOOL,
            "published_at": TEXT,
        },
    }

    # FK-safe insert order (parents before children). Must match tables in schema.sql / types.
    load_order = [
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

    known_tables = set(types.keys())
    if set(load_order) != known_tables:
        raise RuntimeError(
            "load_order and types keys are out of sync; fix load_csv_to_sqlite.py."
        )

    # Every *.csv in the directory must correspond to a known table (avoids silently ignoring new files).
    extra_csv = sorted(set(discovered) - known_tables)
    if extra_csv:
        raise SystemExit(
            "Unknown CSV file(s) (no column type map in this script). "
            "Add them to `types`, schema.sql, and load_order, or remove the file(s):\n- "
            + "\n- ".join(discovered[t].name for t in extra_csv)
        )

    csv_paths: Dict[str, Path] = {}
    missing_tables: List[str] = []
    for t in load_order:
        if t in discovered:
            csv_paths[t] = discovered[t]
        else:
            missing_tables.append(t)

    if missing_tables:
        if args.skip_missing_csv:
            print(
                "WARNING: Missing CSV for table(s) (loading 0 rows for each):\n- "
                + "\n- ".join(missing_tables)
            )
        else:
            hint = (
                f"{csv_dir / (missing_tables[0] + '.csv')!s} "
                f"(expected filename matches table name, e.g. donations.csv)"
            )
            raise SystemExit(
                "Missing CSV file(s) for required table(s):\n- "
                + "\n- ".join(missing_tables)
                + f"\n\nExpected paths look like: {hint}\n"
                "Or re-run with --skip-missing-csv to leave those tables empty."
            )

    if args.dry_run:
        print(f"CSV directory: {csv_dir.resolve()} ({len(discovered)} file(s) found)")
        for t in load_order:
            p = csv_paths.get(t)
            status = str(p.resolve()) if p else "(skipped — no CSV)"
            print(f"  {t}: {status}")
        print("\nDry run: no database written.")
        raise SystemExit(0)

    if db_path.exists() and not args.overwrite:
        raise SystemExit(
            f"DB already exists at {db_path}. Re-run with --overwrite to recreate."
        )

    db_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(db_path)
    try:
        conn.execute("PRAGMA foreign_keys = OFF;")
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")

        if args.overwrite:
            _exec_schema(conn, schema_path)
            conn.execute("PRAGMA foreign_keys = OFF;")
        else:
            conn.execute("PRAGMA foreign_keys = OFF;")

        conn.execute("BEGIN;")
        inserted_counts: Dict[str, int] = {}
        for table in load_order:
            path = csv_paths.get(table)
            if path is None:
                inserted_counts[table] = 0
                continue
            try:
                inserted = _insert_table(conn, table, path, types[table])
            except sqlite3.IntegrityError as e:
                raise SystemExit(
                    f"SQLite constraint failed while loading table {table!r} from {path}.\n{e}"
                ) from e
            inserted_counts[table] = inserted
        conn.commit()

        conn.execute("PRAGMA foreign_keys = ON;")

        if args.verify:
            for table in load_order:
                count = conn.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]
                print(f"{table}: {count}")
            fk_issues = _foreign_key_check(conn)
            if fk_issues:
                print("\nForeign key issues:")
                for issue in fk_issues[:25]:
                    print(issue)
                if len(fk_issues) > 25:
                    print(f"... and {len(fk_issues) - 25} more")
                raise SystemExit("Foreign key check failed.")
            print("\nForeign key check: OK")

        print(f"SQLite DB ready at: {db_path}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
