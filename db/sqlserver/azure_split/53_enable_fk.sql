-- Final step: re-enable FK constraints (NOCHECK — skips re-validation of existing rows).
-- Some tables (audit_log, users) cross-reference AspNetUsers with CSV-based IDs that
-- won't match live Identity IDs, so WITH CHECK would always fail here.
-- WITH NOCHECK re-enables the constraint for all future inserts/updates without
-- re-scanning existing data.
-- Run this LAST, after all table scripts.

IF OBJECT_ID(N'dbo.organization', N'U') IS NOT NULL ALTER TABLE dbo.[organization] WITH NOCHECK CHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.program_areas', N'U') IS NOT NULL ALTER TABLE dbo.[program_areas] WITH NOCHECK CHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.roles_permissions', N'U') IS NOT NULL ALTER TABLE dbo.[roles_permissions] WITH NOCHECK CHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.safehouses', N'U') IS NOT NULL ALTER TABLE dbo.[safehouses] WITH NOCHECK CHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.staff', N'U') IS NOT NULL ALTER TABLE dbo.[staff] WITH NOCHECK CHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.partners', N'U') IS NOT NULL ALTER TABLE dbo.[partners] WITH NOCHECK CHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.supporters', N'U') IS NOT NULL ALTER TABLE dbo.[supporters] WITH NOCHECK CHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.social_media_posts', N'U') IS NOT NULL ALTER TABLE dbo.[social_media_posts] WITH NOCHECK CHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.partner_assignments', N'U') IS NOT NULL ALTER TABLE dbo.[partner_assignments] WITH NOCHECK CHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.residents', N'U') IS NOT NULL ALTER TABLE dbo.[residents] WITH NOCHECK CHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.users', N'U') IS NOT NULL ALTER TABLE dbo.[users] WITH NOCHECK CHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.audit_log', N'U') IS NOT NULL ALTER TABLE dbo.[audit_log] WITH NOCHECK CHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.donations', N'U') IS NOT NULL ALTER TABLE dbo.[donations] WITH NOCHECK CHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.in_kind_donation_items', N'U') IS NOT NULL ALTER TABLE dbo.[in_kind_donation_items] WITH NOCHECK CHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.donation_allocations', N'U') IS NOT NULL ALTER TABLE dbo.[donation_allocations] WITH NOCHECK CHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.process_recordings', N'U') IS NOT NULL ALTER TABLE dbo.[process_recordings] WITH NOCHECK CHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.home_visitations', N'U') IS NOT NULL ALTER TABLE dbo.[home_visitations] WITH NOCHECK CHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.education_records', N'U') IS NOT NULL ALTER TABLE dbo.[education_records] WITH NOCHECK CHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.health_wellbeing_records', N'U') IS NOT NULL ALTER TABLE dbo.[health_wellbeing_records] WITH NOCHECK CHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.intervention_plans', N'U') IS NOT NULL ALTER TABLE dbo.[intervention_plans] WITH NOCHECK CHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.incident_reports', N'U') IS NOT NULL ALTER TABLE dbo.[incident_reports] WITH NOCHECK CHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.safehouse_monthly_metrics', N'U') IS NOT NULL ALTER TABLE dbo.[safehouse_monthly_metrics] WITH NOCHECK CHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.public_impact_snapshots', N'U') IS NOT NULL ALTER TABLE dbo.[public_impact_snapshots] WITH NOCHECK CHECK CONSTRAINT ALL;
