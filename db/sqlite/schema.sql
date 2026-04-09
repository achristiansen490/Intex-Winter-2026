-- FK checks off for DROP/CREATE so mixed DBs (e.g. EF Identity + these tables) can reset cleanly.
PRAGMA foreign_keys = OFF;

-- NOTE:
-- - This schema is aligned to the *actual CSV headers* in Data/*.csv.
-- - SQLite types are intentionally simple for easy migration to PostgreSQL later.

DROP TABLE IF EXISTS organization;

DROP TABLE IF EXISTS program_areas;

DROP TABLE IF EXISTS roles_permissions;

DROP TABLE IF EXISTS donation_allocations;
DROP TABLE IF EXISTS in_kind_donation_items;
DROP TABLE IF EXISTS donations;

DROP TABLE IF EXISTS partner_assignments;
DROP TABLE IF EXISTS partners;
DROP TABLE IF EXISTS supporters;

DROP TABLE IF EXISTS process_recordings;
DROP TABLE IF EXISTS home_visitations;
DROP TABLE IF EXISTS education_records;
DROP TABLE IF EXISTS health_wellbeing_records;
DROP TABLE IF EXISTS intervention_plans;
DROP TABLE IF EXISTS incident_reports;
DROP TABLE IF EXISTS residents;

DROP TABLE IF EXISTS safehouse_monthly_metrics;
DROP TABLE IF EXISTS public_impact_snapshots;
DROP TABLE IF EXISTS social_media_posts;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS safehouses;

CREATE TABLE organization (
  org_id INTEGER PRIMARY KEY,
  org_name TEXT,
  legal_name TEXT,
  org_type TEXT,
  ein TEXT,
  country_of_registration TEXT,
  operations_country TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  mission_statement TEXT,
  founded_year INTEGER,
  fiscal_year_start TEXT,
  fiscal_year_end TEXT,
  currency_primary TEXT,
  currency_reporting TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE program_areas (
  program_area_id INTEGER PRIMARY KEY,
  area_code TEXT,
  area_name TEXT,
  description TEXT,
  applies_to TEXT,
  is_active INTEGER CHECK (is_active IN (0, 1))
);

CREATE TABLE roles_permissions (
  permission_id INTEGER PRIMARY KEY,
  role TEXT,
  resource TEXT,
  action TEXT,
  is_allowed INTEGER CHECK (is_allowed IN (0, 1)),
  scope_note TEXT
);

CREATE TABLE safehouses (
  safehouse_id INTEGER PRIMARY KEY,
  safehouse_code TEXT,
  name TEXT,
  region TEXT,
  city TEXT,
  province TEXT,
  country TEXT,
  open_date TEXT,
  status TEXT,
  capacity_girls INTEGER,
  capacity_staff INTEGER,
  current_occupancy INTEGER,
  notes TEXT
);

CREATE TABLE staff (
  staff_id INTEGER PRIMARY KEY,
  staff_code TEXT,
  first_name TEXT,
  last_name TEXT,
  age INTEGER,
  email TEXT,
  phone TEXT,
  role TEXT,
  employment_type TEXT,
  specialization TEXT,
  safehouse_id INTEGER,
  employment_status TEXT,
  date_hired TEXT,
  date_ended TEXT,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (safehouse_id) REFERENCES safehouses(safehouse_id)
);

CREATE TABLE partners (
  partner_id INTEGER PRIMARY KEY,
  partner_name TEXT,
  partner_type TEXT,
  role_type TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  region TEXT,
  status TEXT,
  start_date TEXT,
  end_date TEXT,
  notes TEXT
);

CREATE TABLE supporters (
  supporter_id INTEGER PRIMARY KEY,
  supporter_type TEXT,
  display_name TEXT,
  organization_name TEXT,
  first_name TEXT,
  last_name TEXT,
  relationship_type TEXT,
  region TEXT,
  country TEXT,
  email TEXT,
  phone TEXT,
  status TEXT,
  created_at TEXT,
  first_donation_date TEXT,
  acquisition_channel TEXT
);

CREATE TABLE social_media_posts (
  post_id INTEGER PRIMARY KEY,
  platform TEXT,
  platform_post_id TEXT,
  post_url TEXT,
  created_at TEXT,
  day_of_week TEXT,
  post_hour INTEGER,
  post_type TEXT,
  media_type TEXT,
  caption TEXT,
  hashtags TEXT,
  num_hashtags INTEGER,
  mentions_count INTEGER,
  has_call_to_action INTEGER CHECK (has_call_to_action IN (0, 1)),
  call_to_action_type TEXT,
  content_topic TEXT,
  sentiment_tone TEXT,
  caption_length INTEGER,
  features_resident_story INTEGER CHECK (features_resident_story IN (0, 1)),
  campaign_name TEXT,
  is_boosted INTEGER CHECK (is_boosted IN (0, 1)),
  boost_budget_php REAL,
  impressions INTEGER,
  reach INTEGER,
  likes INTEGER,
  comments INTEGER,
  shares INTEGER,
  saves INTEGER,
  click_throughs INTEGER,
  video_views INTEGER,
  engagement_rate REAL,
  profile_visits INTEGER,
  donation_referrals INTEGER,
  estimated_donation_value_php REAL,
  follower_count_at_post INTEGER,
  watch_time_seconds INTEGER,
  avg_view_duration_seconds INTEGER,
  subscriber_count_at_post INTEGER,
  forwards INTEGER
);

CREATE TABLE partner_assignments (
  assignment_id INTEGER PRIMARY KEY,
  partner_id INTEGER NOT NULL,
  safehouse_id INTEGER,
  program_area TEXT,
  assignment_start TEXT,
  assignment_end TEXT,
  responsibility_notes TEXT,
  is_primary INTEGER CHECK (is_primary IN (0, 1)),
  status TEXT,
  FOREIGN KEY (partner_id) REFERENCES partners(partner_id),
  FOREIGN KEY (safehouse_id) REFERENCES safehouses(safehouse_id)
);

CREATE TABLE donations (
  donation_id INTEGER PRIMARY KEY,
  supporter_id INTEGER NOT NULL,
  donation_type TEXT,
  donation_date TEXT,
  is_recurring INTEGER CHECK (is_recurring IN (0, 1)),
  campaign_name TEXT,
  channel_source TEXT,
  currency_code TEXT,
  amount REAL,
  estimated_value REAL,
  impact_unit TEXT,
  notes TEXT,
  referral_post_id INTEGER,
  FOREIGN KEY (supporter_id) REFERENCES supporters(supporter_id),
  FOREIGN KEY (referral_post_id) REFERENCES social_media_posts(post_id)
);

CREATE TABLE in_kind_donation_items (
  item_id INTEGER PRIMARY KEY,
  donation_id INTEGER NOT NULL,
  item_name TEXT,
  item_category TEXT,
  quantity INTEGER,
  unit_of_measure TEXT,
  estimated_unit_value REAL,
  intended_use TEXT,
  received_condition TEXT,
  FOREIGN KEY (donation_id) REFERENCES donations(donation_id)
);

CREATE TABLE donation_allocations (
  allocation_id INTEGER PRIMARY KEY,
  donation_id INTEGER NOT NULL,
  safehouse_id INTEGER NOT NULL,
  program_area TEXT,
  amount_allocated REAL,
  allocation_date TEXT,
  allocation_notes TEXT,
  FOREIGN KEY (donation_id) REFERENCES donations(donation_id),
  FOREIGN KEY (safehouse_id) REFERENCES safehouses(safehouse_id)
);

CREATE TABLE residents (
  resident_id INTEGER PRIMARY KEY,
  resident_first_name TEXT,
  resident_last_name TEXT,
  case_control_no TEXT,
  internal_code TEXT,
  safehouse_id INTEGER,
  case_status TEXT,
  sex TEXT,
  date_of_birth TEXT,
  birth_status TEXT,
  place_of_birth TEXT,
  religion TEXT,
  case_category TEXT,
  sub_cat_orphaned INTEGER CHECK (sub_cat_orphaned IN (0, 1)),
  sub_cat_trafficked INTEGER CHECK (sub_cat_trafficked IN (0, 1)),
  sub_cat_child_labor INTEGER CHECK (sub_cat_child_labor IN (0, 1)),
  sub_cat_physical_abuse INTEGER CHECK (sub_cat_physical_abuse IN (0, 1)),
  sub_cat_sexual_abuse INTEGER CHECK (sub_cat_sexual_abuse IN (0, 1)),
  sub_cat_osaec INTEGER CHECK (sub_cat_osaec IN (0, 1)),
  sub_cat_cicl INTEGER CHECK (sub_cat_cicl IN (0, 1)),
  sub_cat_at_risk INTEGER CHECK (sub_cat_at_risk IN (0, 1)),
  sub_cat_street_child INTEGER CHECK (sub_cat_street_child IN (0, 1)),
  sub_cat_child_with_hiv INTEGER CHECK (sub_cat_child_with_hiv IN (0, 1)),
  is_pwd INTEGER CHECK (is_pwd IN (0, 1)),
  pwd_type TEXT,
  has_special_needs INTEGER CHECK (has_special_needs IN (0, 1)),
  special_needs_diagnosis TEXT,
  family_is_4ps INTEGER CHECK (family_is_4ps IN (0, 1)),
  family_solo_parent INTEGER CHECK (family_solo_parent IN (0, 1)),
  family_indigenous INTEGER CHECK (family_indigenous IN (0, 1)),
  family_parent_pwd INTEGER CHECK (family_parent_pwd IN (0, 1)),
  family_informal_settler INTEGER CHECK (family_informal_settler IN (0, 1)),
  date_of_admission TEXT,
  age_upon_admission TEXT,
  present_age TEXT,
  length_of_stay TEXT,
  referral_source TEXT,
  referring_agency_person TEXT,
  date_colb_registered TEXT,
  date_colb_obtained TEXT,
  assigned_social_worker TEXT,
  initial_case_assessment TEXT,
  date_case_study_prepared TEXT,
  reintegration_type TEXT,
  reintegration_status TEXT,
  initial_risk_level TEXT,
  current_risk_level TEXT,
  date_enrolled TEXT,
  date_closed TEXT,
  created_at TEXT,
  notes_restricted TEXT,
  FOREIGN KEY (safehouse_id) REFERENCES safehouses(safehouse_id)
);

CREATE TABLE users (
  user_id INTEGER PRIMARY KEY,
  user_type TEXT,
  staff_id INTEGER,
  resident_id INTEGER,
  supporter_id INTEGER,
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  email TEXT,
  password_hash TEXT,
  role TEXT,
  is_active INTEGER CHECK (is_active IN (0, 1)),
  is_approved INTEGER CHECK (is_approved IN (0, 1)),
  approved_by INTEGER,
  approved_at TEXT,
  last_login TEXT,
  failed_login_attempts INTEGER,
  locked_until TEXT,
  mfa_enabled INTEGER CHECK (mfa_enabled IN (0, 1)),
  mfa_secret TEXT,
  password_reset_token TEXT,
  password_reset_expires TEXT,
  reset_initiated_by INTEGER,
  created_by INTEGER,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (staff_id) REFERENCES staff(staff_id),
  FOREIGN KEY (resident_id) REFERENCES residents(resident_id),
  FOREIGN KEY (supporter_id) REFERENCES supporters(supporter_id),
  FOREIGN KEY (approved_by) REFERENCES users(user_id),
  FOREIGN KEY (created_by) REFERENCES users(user_id),
  FOREIGN KEY (reset_initiated_by) REFERENCES users(user_id)
);

CREATE TABLE audit_log (
  audit_id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  action TEXT,
  resource TEXT,
  record_id INTEGER,
  old_value TEXT,
  new_value TEXT,
  requires_approval INTEGER CHECK (requires_approval IN (0, 1)),
  approval_status TEXT,
  approved_by INTEGER,
  approved_at TEXT,
  ip_address TEXT,
  timestamp TEXT,
  notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (approved_by) REFERENCES users(user_id)
);

CREATE TABLE process_recordings (
  recording_id INTEGER PRIMARY KEY,
  resident_id INTEGER NOT NULL,
  session_date TEXT,
  social_worker TEXT,
  session_type TEXT,
  session_duration_minutes INTEGER,
  emotional_state_observed TEXT,
  emotional_state_end TEXT,
  session_narrative TEXT,
  interventions_applied TEXT,
  follow_up_actions TEXT,
  progress_noted INTEGER CHECK (progress_noted IN (0, 1)),
  concerns_flagged INTEGER CHECK (concerns_flagged IN (0, 1)),
  referral_made INTEGER CHECK (referral_made IN (0, 1)),
  notes_restricted TEXT,
  FOREIGN KEY (resident_id) REFERENCES residents(resident_id)
);

CREATE TABLE home_visitations (
  visitation_id INTEGER PRIMARY KEY,
  resident_id INTEGER NOT NULL,
  visit_date TEXT,
  social_worker TEXT,
  visit_type TEXT,
  location_visited TEXT,
  family_members_present TEXT,
  purpose TEXT,
  observations TEXT,
  family_cooperation_level TEXT,
  safety_concerns_noted INTEGER CHECK (safety_concerns_noted IN (0, 1)),
  follow_up_needed INTEGER CHECK (follow_up_needed IN (0, 1)),
  follow_up_notes TEXT,
  visit_outcome TEXT,
  FOREIGN KEY (resident_id) REFERENCES residents(resident_id)
);

CREATE TABLE education_records (
  education_record_id INTEGER PRIMARY KEY,
  resident_id INTEGER NOT NULL,
  record_date TEXT,
  education_level TEXT,
  school_name TEXT,
  enrollment_status TEXT,
  attendance_rate REAL,
  progress_percent REAL,
  completion_status TEXT,
  notes TEXT,
  FOREIGN KEY (resident_id) REFERENCES residents(resident_id)
);

CREATE TABLE health_wellbeing_records (
  health_record_id INTEGER PRIMARY KEY,
  resident_id INTEGER NOT NULL,
  record_date TEXT,
  general_health_score REAL,
  nutrition_score REAL,
  sleep_quality_score REAL,
  energy_level_score REAL,
  height_cm REAL,
  weight_kg REAL,
  bmi REAL,
  medical_checkup_done INTEGER CHECK (medical_checkup_done IN (0, 1)),
  dental_checkup_done INTEGER CHECK (dental_checkup_done IN (0, 1)),
  psychological_checkup_done INTEGER CHECK (psychological_checkup_done IN (0, 1)),
  notes TEXT,
  FOREIGN KEY (resident_id) REFERENCES residents(resident_id)
);

CREATE TABLE intervention_plans (
  plan_id INTEGER PRIMARY KEY,
  resident_id INTEGER NOT NULL,
  plan_category TEXT,
  plan_description TEXT,
  services_provided TEXT,
  target_value REAL,
  target_date TEXT,
  status TEXT,
  case_conference_date TEXT,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (resident_id) REFERENCES residents(resident_id)
);

CREATE TABLE incident_reports (
  incident_id INTEGER PRIMARY KEY,
  resident_id INTEGER NOT NULL,
  safehouse_id INTEGER NOT NULL,
  incident_date TEXT,
  incident_type TEXT,
  severity TEXT,
  description TEXT,
  response_taken TEXT,
  resolved INTEGER CHECK (resolved IN (0, 1)),
  resolution_date TEXT,
  reported_by TEXT,
  follow_up_required INTEGER CHECK (follow_up_required IN (0, 1)),
  FOREIGN KEY (resident_id) REFERENCES residents(resident_id),
  FOREIGN KEY (safehouse_id) REFERENCES safehouses(safehouse_id)
);

CREATE TABLE safehouse_monthly_metrics (
  metric_id INTEGER PRIMARY KEY,
  safehouse_id INTEGER NOT NULL,
  month_start TEXT,
  month_end TEXT,
  active_residents INTEGER,
  avg_education_progress REAL,
  avg_health_score REAL,
  process_recording_count INTEGER,
  home_visitation_count INTEGER,
  incident_count INTEGER,
  notes TEXT,
  FOREIGN KEY (safehouse_id) REFERENCES safehouses(safehouse_id)
);

CREATE TABLE public_impact_snapshots (
  snapshot_id INTEGER PRIMARY KEY,
  snapshot_date TEXT,
  headline TEXT,
  summary_text TEXT,
  metric_payload_json TEXT,
  is_published INTEGER CHECK (is_published IN (0, 1)),
  published_at TEXT
);

PRAGMA foreign_keys = ON;
