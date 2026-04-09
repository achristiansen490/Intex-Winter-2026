-- Step 44: load [home_visitations] part 8/8
SET XACT_ABORT ON;
BEGIN TRAN;
IF OBJECT_ID(N'dbo.home_visitations', N'U') IS NOT NULL
BEGIN
  IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID(N'dbo.home_visitations')) SET IDENTITY_INSERT dbo.home_visitations ON;
  INSERT INTO dbo.[home_visitations] ([visitation_id], [resident_id], [visit_date], [social_worker], [visit_type], [location_visited], [family_members_present], [purpose], [observations], [family_cooperation_level], [safety_concerns_noted], [follow_up_needed], [follow_up_notes], [visit_outcome]) VALUES
(1328, 60, N'2025-05-18', N'SW-02', N'Routine Follow-Up', N'School', N'Flores (Parent); Cruz (Sibling)', N'Visitation for routine follow-up', N'Visit observations recorded during routine follow-up.', N'Cooperative', 1, 0, NULL, N'Favorable'),
(1329, 60, N'2025-06-28', N'SW-10', N'Routine Follow-Up', N'Community Center', N'Cruz (Parent); Mendoza (Sibling)', N'Visitation for routine follow-up', N'Visit observations recorded during routine follow-up.', N'Cooperative', 0, 1, N'Follow-up scheduled', N'Needs Improvement'),
(1330, 60, N'2025-07-21', N'SW-13', N'Reintegration Assessment', N'Proposed Foster Home', N'Flores (Parent); Torres (Sibling)', N'Visitation for reintegration assessment', N'Visit observations recorded during reintegration assessment.', N'Cooperative', 0, 0, N'Follow-up scheduled', N'Favorable'),
(1331, 60, N'2025-07-27', N'SW-02', N'Initial Assessment', N'School', N'None', N'Visitation for initial assessment', N'Visit observations recorded during initial assessment.', N'Cooperative', 0, 0, NULL, N'Favorable'),
(1332, 60, N'2025-09-08', N'SW-18', N'Initial Assessment', N'Family Home', N'Cruz (Parent); Reyes (Sibling)', N'Visitation for initial assessment', N'Visit observations recorded during initial assessment.', N'Cooperative', 0, 1, NULL, N'Needs Improvement'),
(1333, 60, N'2025-10-04', N'SW-09', N'Reintegration Assessment', N'Proposed Foster Home', N'Cruz (Parent); Rivera (Sibling)', N'Visitation for reintegration assessment', N'Visit observations recorded during reintegration assessment.', N'Highly Cooperative', 0, 1, NULL, N'Needs Improvement'),
(1334, 60, N'2025-10-16', N'SW-10', N'Routine Follow-Up', N'Community Center', N'None', N'Visitation for routine follow-up', N'Visit observations recorded during routine follow-up.', N'Cooperative', 0, 1, N'Follow-up scheduled', N'Needs Improvement'),
(1335, 60, N'2025-10-17', N'SW-15', N'Routine Follow-Up', N'Family Home', N'Mendoza (Parent); Diaz (Sibling)', N'Visitation for routine follow-up', N'Visit observations recorded during routine follow-up.', N'Highly Cooperative', 0, 0, NULL, N'Inconclusive'),
(1336, 60, N'2025-11-09', N'SW-03', N'Reintegration Assessment', N'Family Home', N'Santos (Parent); Lopez (Sibling)', N'Visitation for reintegration assessment', N'Visit observations recorded during reintegration assessment.', N'Cooperative', 0, 1, N'Follow-up scheduled', N'Needs Improvement'),
(1337, 60, N'2025-11-25', N'SW-08', N'Routine Follow-Up', N'Family Home', N'Reyes (Parent); Flores (Sibling)', N'Visitation for routine follow-up', N'Visit observations recorded during routine follow-up.', N'Cooperative', 1, 0, N'Follow-up scheduled', N'Inconclusive');
  IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID(N'dbo.home_visitations')) SET IDENTITY_INSERT dbo.home_visitations OFF;
END
COMMIT;
