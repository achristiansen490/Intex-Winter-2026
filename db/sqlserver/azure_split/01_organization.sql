-- Step 01: load [organization]
SET XACT_ABORT ON;
BEGIN TRAN;
IF OBJECT_ID(N'dbo.organization', N'U') IS NOT NULL
BEGIN
  IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID(N'dbo.organization')) EXEC('SET IDENTITY_INSERT dbo.organization ON');
  INSERT INTO dbo.[organization] ([org_id], [org_name], [legal_name], [org_type], [ein], [country_of_registration], [operations_country], [address_line1], [address_line2], [city], [state], [zip_code], [country], [phone], [email], [website], [logo_url], [mission_statement], [founded_year], [fiscal_year_start], [fiscal_year_end], [currency_primary], [currency_reporting], [created_at], [updated_at]) VALUES
(1, N'Lighthouse Sanctuary', N'Lighthouse Sanctuary Inc.', N'501(c)(3) Nonprofit', N'XX-XXXXXXX', N'United States', N'Philippines', NULL, NULL, NULL, NULL, NULL, N'United States', NULL, N'info@lighthouseph.org', N'https://lighthouse.ph', NULL, N'To provide safe homes and rehabilitation services for girls who are survivors of sexual abuse and sex trafficking in the Philippines.', 2022, N'01-01', N'12-31', N'PHP', N'USD', N'2022-01-01 00:00:00', N'2026-04-06 00:00:00');
  IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID(N'dbo.organization')) EXEC('SET IDENTITY_INSERT dbo.organization OFF');
END
COMMIT;
