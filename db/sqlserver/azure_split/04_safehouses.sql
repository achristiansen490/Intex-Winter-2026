-- Step 04: load [safehouses]
SET XACT_ABORT ON;
BEGIN TRAN;
IF OBJECT_ID(N'dbo.safehouses', N'U') IS NOT NULL
BEGIN
  IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID(N'dbo.safehouses')) SET IDENTITY_INSERT dbo.safehouses ON;
  INSERT INTO dbo.[safehouses] ([safehouse_id], [safehouse_code], [name], [region], [city], [province], [country], [open_date], [status], [capacity_girls], [capacity_staff], [current_occupancy], [notes]) VALUES
(1, N'SH01', N'Lighthouse Safehouse 1', N'Luzon', N'Quezon City', N'Metro Manila', N'Philippines', N'2022-01-01', N'Active', 8, 4, 8, NULL),
(2, N'SH02', N'Lighthouse Safehouse 2', N'Visayas', N'Cebu City', N'Cebu', N'Philippines', N'2022-02-15', N'Active', 10, 5, 8, NULL),
(3, N'SH03', N'Lighthouse Safehouse 3', N'Mindanao', N'Davao City', N'Davao del Sur', N'Philippines', N'2022-04-01', N'Active', 9, 4, 9, NULL),
(4, N'SH04', N'Lighthouse Safehouse 4', N'Visayas', N'Iloilo City', N'Iloilo', N'Philippines', N'2022-05-16', N'Active', 12, 4, 12, NULL),
(5, N'SH05', N'Lighthouse Safehouse 5', N'Luzon', N'Baguio City', N'Benguet', N'Philippines', N'2022-06-30', N'Active', 11, 4, 9, NULL),
(6, N'SH06', N'Lighthouse Safehouse 6', N'Mindanao', N'Cagayan de Oro', N'Misamis Oriental', N'Philippines', N'2022-08-14', N'Active', 8, 5, 6, NULL),
(7, N'SH07', N'Lighthouse Safehouse 7', N'Visayas', N'Bacolod', N'Negros Occidental', N'Philippines', N'2022-09-28', N'Active', 12, 4, 12, NULL),
(8, N'SH08', N'Lighthouse Safehouse 8', N'Visayas', N'Tacloban', N'Leyte', N'Philippines', N'2022-11-12', N'Active', 9, 7, 7, NULL),
(9, N'SH09', N'Lighthouse Safehouse 9', N'Mindanao', N'General Santos', N'South Cotabato', N'Philippines', N'2022-12-27', N'Active', 6, 3, 6, NULL),
(10, N'SH10', N'Lighthouse Safehouse 10', N'Luzon', N'Manila', N'Metro Manila', N'Philippines', N'2023-01-15', N'Active', 10, 4, 9, NULL);
  IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID(N'dbo.safehouses')) SET IDENTITY_INSERT dbo.safehouses OFF;
END
COMMIT;
