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
    conn.execute("PRAGMA foreign_keys = ON;")
    schema_sql = schema_path.read_text(encoding="utf-8")
    conn.executescript(schema_sql)


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
    args = parser.parse_args()

    csv_dir: Path = args.csv_dir
    db_path: Path = args.db_path
    schema_path: Path = args.schema_path

    if not csv_dir.exists():
        raise SystemExit(f"CSV dir not found: {csv_dir}")
    if not schema_path.exists():
        raise SystemExit(f"Schema file not found: {schema_path}")

    if db_path.exists() and not args.overwrite:
        raise SystemExit(
            f"DB already exists at {db_path}. Re-run with --overwrite to recreate."
        )

    db_path.parent.mkdir(parents=True, exist_ok=True)

    # Column type map (must match db/sqlite/schema.sql)
    BOOL = "BOOL"
    INTEGER = "INTEGER"
    REAL = "REAL"
    TEXT = "TEXT"

    types: Dict[str, Dict[str, str]] = {
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

    load_order = [
        "safehouses",
        "partners",
        "supporters",
        "social_media_posts",
        "partner_assignments",
        "residents",
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

    csv_paths = {t: csv_dir / f"{t}.csv" for t in load_order}
    missing_csv = [str(p) for p in csv_paths.values() if not p.exists()]
    if missing_csv:
        raise SystemExit(f"Missing CSV files:\n- " + "\n- ".join(missing_csv))

    conn = sqlite3.connect(db_path)
    try:
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")

        if args.overwrite:
            _exec_schema(conn, schema_path)
        else:
            conn.execute("PRAGMA foreign_keys = ON;")

        conn.execute("BEGIN;")
        inserted_counts: Dict[str, int] = {}
        for table in load_order:
            inserted = _insert_table(conn, table, csv_paths[table], types[table])
            inserted_counts[table] = inserted
        conn.commit()

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

