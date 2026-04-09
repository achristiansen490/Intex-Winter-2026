-- Step 02: load [program_areas]
SET XACT_ABORT ON;
BEGIN TRAN;
IF OBJECT_ID(N'dbo.program_areas', N'U') IS NOT NULL
BEGIN
  IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID(N'dbo.program_areas')) EXEC('SET IDENTITY_INSERT dbo.program_areas ON');
  INSERT INTO dbo.[program_areas] ([program_area_id], [area_code], [area_name], [description], [applies_to], [is_active]) VALUES
(1, N'EDU', N'Education', N'Covers schooling, vocational training, enrollment support, and academic progress tracking for residents.', N'donations, intervention_plans', 1),
(2, N'OPS', N'Operations', N'General safehouse operations including staffing, utilities, and day-to-day management.', N'donations, partner_assignments', 1),
(3, N'OUT', N'Outreach', N'Community outreach, awareness campaigns, and external engagement activities.', N'donations, partner_assignments', 1),
(4, N'PHY', N'Physical Health', N'Medical checkups, dental care, nutrition, and physical wellbeing services for residents.', N'donations, intervention_plans', 1),
(5, N'SAF', N'Safety', N'Safety planning, risk assessment, and protective measures for residents.', N'donations, intervention_plans', 1),
(6, N'TRN', N'Transport', N'Transportation costs for residents, home visitations, court appearances, and medical appointments.', N'donations', 1),
(7, N'WEL', N'Wellbeing', N'Psychological counseling, therapeutic sessions, and emotional support services.', N'donations, intervention_plans', 1),
(8, N'MNT', N'Maintenance', N'Safehouse facility maintenance, repairs, and upkeep.', N'donations, partner_assignments', 1);
  IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID(N'dbo.program_areas')) EXEC('SET IDENTITY_INSERT dbo.program_areas OFF');
END
COMMIT;
