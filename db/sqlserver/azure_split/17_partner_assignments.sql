-- Step 17: load [partner_assignments]
SET XACT_ABORT ON;
BEGIN TRAN;
IF OBJECT_ID(N'dbo.partner_assignments', N'U') IS NOT NULL
BEGIN
  IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID(N'dbo.partner_assignments')) EXEC('SET IDENTITY_INSERT dbo.partner_assignments ON');
  INSERT INTO dbo.[partner_assignments] ([assignment_id], [partner_id], [safehouse_id], [program_area], [assignment_start], [assignment_end], [responsibility_notes], [is_primary], [status]) VALUES
(1, 1, 8, N'Operations', N'2022-01-01', NULL, N'SafehouseOps support for safehouse operations', 1, N'Active'),
(2, 1, 9, N'Operations', N'2022-01-01', NULL, N'SafehouseOps support for safehouse operations', 0, N'Active'),
(3, 2, 4, N'Wellbeing', N'2022-01-21', NULL, N'Evaluation support for safehouse operations', 1, N'Active'),
(4, 3, 9, N'Education', N'2022-02-10', NULL, N'Education support for safehouse operations', 1, N'Active'),
(5, 3, 6, N'Education', N'2022-02-10', NULL, N'Education support for safehouse operations', 0, N'Active'),
(6, 4, 8, N'Transport', N'2022-03-02', NULL, N'Logistics support for safehouse operations', 1, N'Active'),
(7, 5, 2, N'Operations', N'2022-03-22', NULL, N'SafehouseOps support for safehouse operations', 1, N'Active'),
(8, 6, NULL, N'Maintenance', N'2022-04-11', NULL, N'Maintenance support for safehouse operations', 1, N'Active'),
(9, 7, 8, N'Operations', N'2022-05-01', NULL, N'FindSafehouse support for safehouse operations', 1, N'Active'),
(10, 7, NULL, N'Operations', N'2022-05-01', NULL, N'FindSafehouse support for safehouse operations', 0, N'Active'),
(11, 8, NULL, N'Transport', N'2022-05-21', NULL, N'Logistics support for safehouse operations', 1, N'Active'),
(12, 9, 6, N'Operations', N'2022-06-10', NULL, N'SafehouseOps support for safehouse operations', 1, N'Active'),
(13, 9, 3, N'Operations', N'2022-06-10', NULL, N'SafehouseOps support for safehouse operations', 0, N'Active'),
(14, 10, NULL, N'Transport', N'2022-06-30', NULL, N'Logistics support for safehouse operations', 1, N'Active'),
(15, 11, 3, N'Operations', N'2022-07-20', NULL, N'SafehouseOps support for safehouse operations', 1, N'Active'),
(16, 11, 8, N'Operations', N'2022-07-20', NULL, N'SafehouseOps support for safehouse operations', 0, N'Active'),
(17, 12, 8, N'Operations', N'2022-08-09', NULL, N'SafehouseOps support for safehouse operations', 1, N'Active'),
(18, 13, 1, N'Wellbeing', N'2022-08-29', NULL, N'Evaluation support for safehouse operations', 1, N'Active'),
(19, 14, 2, N'Education', N'2022-09-18', NULL, N'Education support for safehouse operations', 1, N'Active'),
(20, 14, 7, N'Education', N'2022-09-18', NULL, N'Education support for safehouse operations', 0, N'Active'),
(21, 15, NULL, N'Transport', N'2022-10-08', NULL, N'Transport support for safehouse operations', 1, N'Active'),
(22, 15, 2, N'Transport', N'2022-10-08', NULL, N'Transport support for safehouse operations', 0, N'Active'),
(23, 16, 4, N'Operations', N'2022-10-28', NULL, N'SafehouseOps support for safehouse operations', 1, N'Active'),
(24, 16, 7, N'Operations', N'2022-10-28', NULL, N'SafehouseOps support for safehouse operations', 0, N'Active'),
(25, 17, NULL, N'Transport', N'2022-11-17', NULL, N'Logistics support for safehouse operations', 1, N'Active'),
(26, 17, 1, N'Transport', N'2022-11-17', NULL, N'Logistics support for safehouse operations', 0, N'Active'),
(27, 17, 9, N'Transport', N'2022-11-17', NULL, N'Logistics support for safehouse operations', 0, N'Active'),
(28, 18, 2, N'Education', N'2022-12-07', NULL, N'Education support for safehouse operations', 1, N'Active'),
(29, 18, 3, N'Education', N'2022-12-07', NULL, N'Education support for safehouse operations', 0, N'Active'),
(30, 19, 7, N'Maintenance', N'2022-12-27', NULL, N'Maintenance support for safehouse operations', 1, N'Active'),
(31, 20, 4, N'Education', N'2023-01-16', NULL, N'Education support for safehouse operations', 1, N'Active'),
(32, 20, 5, N'Education', N'2023-01-16', NULL, N'Education support for safehouse operations', 0, N'Active'),
(33, 21, NULL, N'Operations', N'2023-02-05', NULL, N'SafehouseOps support for safehouse operations', 1, N'Active'),
(34, 22, 4, N'Wellbeing', N'2023-02-25', NULL, N'Evaluation support for safehouse operations', 1, N'Active'),
(35, 22, 7, N'Wellbeing', N'2023-02-25', NULL, N'Evaluation support for safehouse operations', 0, N'Active'),
(36, 23, NULL, N'Maintenance', N'2023-03-17', NULL, N'Maintenance support for safehouse operations', 1, N'Active'),
(37, 24, 3, N'Maintenance', N'2023-04-06', NULL, N'Maintenance support for safehouse operations', 1, N'Active'),
(38, 25, 5, N'Maintenance', N'2023-04-26', NULL, N'Maintenance support for safehouse operations', 1, N'Active'),
(39, 25, 8, N'Maintenance', N'2023-04-26', NULL, N'Maintenance support for safehouse operations', 0, N'Active'),
(40, 26, 9, N'Operations', N'2023-05-16', NULL, N'SafehouseOps support for safehouse operations', 1, N'Active'),
(41, 26, 8, N'Operations', N'2023-05-16', NULL, N'SafehouseOps support for safehouse operations', 0, N'Active'),
(42, 26, 4, N'Operations', N'2023-05-16', NULL, N'SafehouseOps support for safehouse operations', 0, N'Active'),
(43, 27, 5, N'Wellbeing', N'2023-06-05', NULL, N'Evaluation support for safehouse operations', 1, N'Active'),
(44, 28, NULL, N'Education', N'2023-06-25', N'2025-12-31', N'Education support for safehouse operations', 1, N'Ended'),
(45, 29, 1, N'Education', N'2023-07-15', N'2025-12-31', N'Education support for safehouse operations', 1, N'Ended'),
(46, 29, 3, N'Education', N'2023-07-15', N'2025-12-31', N'Education support for safehouse operations', 0, N'Ended'),
(47, 30, NULL, N'Transport', N'2023-08-04', N'2025-12-31', N'Logistics support for safehouse operations', 1, N'Ended'),
(48, 30, 8, N'Transport', N'2023-08-04', N'2025-12-31', N'Logistics support for safehouse operations', 0, N'Ended');
  IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID(N'dbo.partner_assignments')) EXEC('SET IDENTITY_INSERT dbo.partner_assignments OFF');
END
COMMIT;
