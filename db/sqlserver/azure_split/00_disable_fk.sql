-- Step 00: disable FK constraints before loading
-- Run this FIRST, before any table scripts.

IF OBJECT_ID(N'dbo.organization', N'U') IS NOT NULL ALTER TABLE dbo.[organization] NOCHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.program_areas', N'U') IS NOT NULL ALTER TABLE dbo.[program_areas] NOCHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.roles_permissions', N'U') IS NOT NULL ALTER TABLE dbo.[roles_permissions] NOCHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.safehouses', N'U') IS NOT NULL ALTER TABLE dbo.[safehouses] NOCHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.staff', N'U') IS NOT NULL ALTER TABLE dbo.[staff] NOCHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.partners', N'U') IS NOT NULL ALTER TABLE dbo.[partners] NOCHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.supporters', N'U') IS NOT NULL ALTER TABLE dbo.[supporters] NOCHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.social_media_posts', N'U') IS NOT NULL ALTER TABLE dbo.[social_media_posts] NOCHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.partner_assignments', N'U') IS NOT NULL ALTER TABLE dbo.[partner_assignments] NOCHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.residents', N'U') IS NOT NULL ALTER TABLE dbo.[residents] NOCHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.users', N'U') IS NOT NULL ALTER TABLE dbo.[users] NOCHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.audit_log', N'U') IS NOT NULL ALTER TABLE dbo.[audit_log] NOCHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.donations', N'U') IS NOT NULL ALTER TABLE dbo.[donations] NOCHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.in_kind_donation_items', N'U') IS NOT NULL ALTER TABLE dbo.[in_kind_donation_items] NOCHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.donation_allocations', N'U') IS NOT NULL ALTER TABLE dbo.[donation_allocations] NOCHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.process_recordings', N'U') IS NOT NULL ALTER TABLE dbo.[process_recordings] NOCHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.home_visitations', N'U') IS NOT NULL ALTER TABLE dbo.[home_visitations] NOCHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.education_records', N'U') IS NOT NULL ALTER TABLE dbo.[education_records] NOCHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.health_wellbeing_records', N'U') IS NOT NULL ALTER TABLE dbo.[health_wellbeing_records] NOCHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.intervention_plans', N'U') IS NOT NULL ALTER TABLE dbo.[intervention_plans] NOCHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.incident_reports', N'U') IS NOT NULL ALTER TABLE dbo.[incident_reports] NOCHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.safehouse_monthly_metrics', N'U') IS NOT NULL ALTER TABLE dbo.[safehouse_monthly_metrics] NOCHECK CONSTRAINT ALL;
IF OBJECT_ID(N'dbo.public_impact_snapshots', N'U') IS NOT NULL ALTER TABLE dbo.[public_impact_snapshots] NOCHECK CONSTRAINT ALL;

-- Delete existing rows (children first)
IF OBJECT_ID(N'dbo.public_impact_snapshots', N'U') IS NOT NULL DELETE FROM dbo.[public_impact_snapshots];
IF OBJECT_ID(N'dbo.safehouse_monthly_metrics', N'U') IS NOT NULL DELETE FROM dbo.[safehouse_monthly_metrics];
IF OBJECT_ID(N'dbo.incident_reports', N'U') IS NOT NULL DELETE FROM dbo.[incident_reports];
IF OBJECT_ID(N'dbo.intervention_plans', N'U') IS NOT NULL DELETE FROM dbo.[intervention_plans];
IF OBJECT_ID(N'dbo.health_wellbeing_records', N'U') IS NOT NULL DELETE FROM dbo.[health_wellbeing_records];
IF OBJECT_ID(N'dbo.education_records', N'U') IS NOT NULL DELETE FROM dbo.[education_records];
IF OBJECT_ID(N'dbo.home_visitations', N'U') IS NOT NULL DELETE FROM dbo.[home_visitations];
IF OBJECT_ID(N'dbo.process_recordings', N'U') IS NOT NULL DELETE FROM dbo.[process_recordings];
IF OBJECT_ID(N'dbo.donation_allocations', N'U') IS NOT NULL DELETE FROM dbo.[donation_allocations];
IF OBJECT_ID(N'dbo.in_kind_donation_items', N'U') IS NOT NULL DELETE FROM dbo.[in_kind_donation_items];
IF OBJECT_ID(N'dbo.donations', N'U') IS NOT NULL DELETE FROM dbo.[donations];
IF OBJECT_ID(N'dbo.audit_log', N'U') IS NOT NULL DELETE FROM dbo.[audit_log];
IF OBJECT_ID(N'dbo.users', N'U') IS NOT NULL DELETE FROM dbo.[users];
IF OBJECT_ID(N'dbo.residents', N'U') IS NOT NULL DELETE FROM dbo.[residents];
IF OBJECT_ID(N'dbo.partner_assignments', N'U') IS NOT NULL DELETE FROM dbo.[partner_assignments];
IF OBJECT_ID(N'dbo.social_media_posts', N'U') IS NOT NULL DELETE FROM dbo.[social_media_posts];
IF OBJECT_ID(N'dbo.supporters', N'U') IS NOT NULL DELETE FROM dbo.[supporters];
IF OBJECT_ID(N'dbo.partners', N'U') IS NOT NULL DELETE FROM dbo.[partners];
IF OBJECT_ID(N'dbo.staff', N'U') IS NOT NULL DELETE FROM dbo.[staff];
IF OBJECT_ID(N'dbo.safehouses', N'U') IS NOT NULL DELETE FROM dbo.[safehouses];
IF OBJECT_ID(N'dbo.roles_permissions', N'U') IS NOT NULL DELETE FROM dbo.[roles_permissions];
IF OBJECT_ID(N'dbo.program_areas', N'U') IS NOT NULL DELETE FROM dbo.[program_areas];
IF OBJECT_ID(N'dbo.organization', N'U') IS NOT NULL DELETE FROM dbo.[organization];
