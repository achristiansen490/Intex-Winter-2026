-- Step 05: load [staff]
SET XACT_ABORT ON;
BEGIN TRAN;
IF OBJECT_ID(N'dbo.staff', N'U') IS NOT NULL
BEGIN
  IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID(N'dbo.staff')) SET IDENTITY_INSERT dbo.staff ON;
  INSERT INTO dbo.[staff] ([staff_id], [staff_code], [first_name], [last_name], [age], [email], [phone], [role], [employment_type], [specialization], [safehouse_id], [employment_status], [date_hired], [date_ended], [created_at], [updated_at]) VALUES
(1, N'SW-01', N'Elena', N'Santos', 31, N'elena.santos@lighthouseph.org', N'+63 941 328 3286', N'Social Worker', N'Internal', N'Trafficking', 1, N'Active', N'2023-02-22', NULL, N'2023-02-22 00:00:00', N'2026-04-06 00:00:00'),
(2, N'SW-02', N'Fatima', N'Cruz', 41, N'fatima.cruz@lighthouseph.org', N'+63 964 132 1488', N'Social Worker', N'Internal', N'Physical Abuse', 2, N'Active', N'2018-04-08', NULL, N'2018-04-08 00:00:00', N'2026-04-06 00:00:00'),
(3, N'SW-03', N'Angela', N'Ramos', 23, N'angela.ramos@lighthouseph.org', N'+63 981 303 9928', N'Social Worker', N'Internal', N'Sexual Abuse', 3, N'Active', N'2021-04-15', NULL, N'2021-04-15 00:00:00', N'2026-04-06 00:00:00'),
(4, N'SW-04', N'Josephine', N'Gonzalez', 23, N'josephine.gonzalez@lighthouseph.org', N'+63 930 814 7924', N'Social Worker', N'Internal', N'Child Labor', 4, N'Active', N'2020-05-05', NULL, N'2020-05-05 00:00:00', N'2026-04-06 00:00:00'),
(5, N'SW-05', N'Sofia', N'Ramirez', 26, N'sofia.ramirez@lighthouseph.org', N'+63 921 489 2584', N'Social Worker', N'Internal', N'Neglect', 5, N'Active', N'2020-06-20', NULL, N'2020-06-20 00:00:00', N'2026-04-06 00:00:00'),
(6, N'SW-06', N'Teresa', N'Reyes', 37, N'teresa.reyes@lighthouseph.org', N'+63 978 227 7201', N'Social Worker', N'Internal', N'OSAEC', 6, N'Active', N'2018-09-10', NULL, N'2018-09-10 00:00:00', N'2026-04-06 00:00:00'),
(7, N'SW-07', N'Beatrice', N'Hernandez', 41, N'beatrice.hernandez@lighthouseph.org', N'+63 934 821 2139', N'Social Worker', N'Internal', N'At-Risk Youth', 7, N'Active', N'2018-11-08', NULL, N'2018-11-08 00:00:00', N'2026-04-06 00:00:00'),
(8, N'SW-08', N'Andrea', N'Cruz', 30, N'andrea.cruz@lighthouseph.org', N'+63 922 489 5554', N'Social Worker', N'Internal', N'Trauma-Informed Care', 8, N'Active', N'2021-11-27', NULL, N'2021-11-27 00:00:00', N'2026-04-06 00:00:00'),
(9, N'SW-09', N'Monica', N'Flores', 34, N'monica.flores@lighthouseph.org', N'+63 955 314 5374', N'Case Manager', N'Internal', N'Trafficking', 9, N'Active', N'2023-11-21', NULL, N'2023-11-21 00:00:00', N'2026-04-06 00:00:00'),
(10, N'SW-10', N'Rosa', N'Ramos', 43, N'rosa.ramos@lighthouseph.org', N'+63 931 646 5010', N'Case Manager', N'Internal', N'Sexual Abuse', 10, N'Active', N'2019-08-13', NULL, N'2019-08-13 00:00:00', N'2026-04-06 00:00:00'),
(11, N'SW-11', N'Teresa', N'Mendoza', 30, N'teresa.mendoza@lighthouseph.org', N'+63 997 432 1916', N'Case Manager', N'Internal', N'Neglect', 1, N'Active', N'2019-01-26', NULL, N'2019-01-26 00:00:00', N'2026-04-06 00:00:00'),
(12, N'SW-12', N'Patricia', N'Diaz', 31, N'patricia.diaz@lighthouseph.org', N'+63 918 316 6155', N'Case Manager', N'Internal', N'Physical Abuse', 2, N'Active', N'2019-11-16', NULL, N'2019-11-16 00:00:00', N'2026-04-06 00:00:00'),
(13, N'SW-13', N'Diana', N'Aquino', 27, N'diana.aquino@lighthouseph.org', N'+63 943 242 5040', N'Case Manager', N'Internal', N'At-Risk Youth', 3, N'Active', N'2023-09-18', NULL, N'2023-09-18 00:00:00', N'2026-04-06 00:00:00'),
(14, N'SW-14', N'Teresa', N'Castillo', 36, N'teresa.castillo@lighthouseph.org', N'+63 984 508 6930', N'Case Manager', N'Internal', N'OSAEC', 4, N'Active', N'2019-03-17', NULL, N'2019-03-17 00:00:00', N'2026-04-06 00:00:00'),
(15, N'SW-15', N'Cristina', N'Cruz', 24, N'cristina.cruz@lighthouseph.org', N'+63 924 256 3621', N'Supervisor', N'Internal', N'General Supervision', 1, N'Active', N'2023-07-20', NULL, N'2023-07-20 00:00:00', N'2026-04-06 00:00:00'),
(16, N'SW-16', N'Rosa', N'Diaz', 35, N'rosa.diaz@lighthouseph.org', N'+63 986 579 9669', N'Supervisor', N'Internal', N'General Supervision', 2, N'Active', N'2020-09-28', NULL, N'2020-09-28 00:00:00', N'2026-04-06 00:00:00'),
(17, N'SW-17', N'Maria', N'Garcia', 44, N'maria.garcia@lighthouseph.org', N'+63 978 868 5371', N'Field Worker', N'Contracted', N'Trauma-Informed Care', NULL, N'Active', N'2023-06-04', NULL, N'2023-06-04 00:00:00', N'2026-04-06 00:00:00'),
(18, N'SW-18', N'Andrea', N'Morales', 28, N'andrea.morales@lighthouseph.org', N'+63 968 103 5315', N'Field Worker', N'Contracted', N'Child Labor', NULL, N'Active', N'2022-03-17', NULL, N'2022-03-17 00:00:00', N'2026-04-06 00:00:00'),
(19, N'SW-19', N'Elena', N'Martinez', 43, N'elena.martinez@lighthouseph.org', N'+63 974 723 4258', N'Field Worker', N'Contracted', N'Neglect', NULL, N'Active', N'2019-06-25', NULL, N'2019-06-25 00:00:00', N'2026-04-06 00:00:00'),
(20, N'SW-20', N'Isabel', N'Mendoza', 39, N'isabel.mendoza@lighthouseph.org', N'+63 910 713 6310', N'Field Worker', N'Contracted', N'At-Risk Youth', NULL, N'Active', N'2021-01-04', NULL, N'2021-01-04 00:00:00', N'2026-04-06 00:00:00');
  IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID(N'dbo.staff')) SET IDENTITY_INSERT dbo.staff OFF;
END
COMMIT;
