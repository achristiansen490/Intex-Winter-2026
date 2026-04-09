-- Step 22: load [donations] part 2/2
SET XACT_ABORT ON;
BEGIN TRAN;
IF OBJECT_ID(N'dbo.donations', N'U') IS NOT NULL
BEGIN
  IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID(N'dbo.donations')) EXEC('SET IDENTITY_INSERT dbo.donations ON');
  INSERT INTO dbo.[donations] ([donation_id], [supporter_id], [donation_type], [donation_date], [is_recurring], [campaign_name], [channel_source], [currency_code], [amount], [estimated_value], [impact_unit], [notes], [referral_post_id]) VALUES
(391, 35, N'SocialMedia', N'2025-03-19', 0, NULL, N'SocialMedia', NULL, NULL, 2.5, N'campaigns', N'Monthly contribution', 374),
(392, 34, N'Time', N'2023-10-31', 1, NULL, N'PartnerReferral', NULL, NULL, 39.4, N'hours', N'Campaign support', NULL),
(393, 10, N'InKind', N'2023-12-13', 0, N'Year-End Hope', N'Event', NULL, NULL, 300.0, N'items', N'Event donation', NULL),
(394, 32, N'Monetary', N'2025-11-18', 0, NULL, N'Campaign', N'PHP', 1162.17, 1162.17, N'pesos', N'Event donation', NULL),
(395, 22, N'Monetary', N'2025-10-27', 0, NULL, N'SocialMedia', N'PHP', 1078.99, 1078.99, N'pesos', N'Monthly contribution', 83),
(396, 33, N'Time', N'2023-07-25', 0, N'Back to School', N'Direct', NULL, NULL, 39.15, N'hours', N'Community outreach support', NULL),
(397, 27, N'InKind', N'2023-10-11', 0, NULL, N'Event', NULL, NULL, 583.43, N'items', N'Community outreach support', NULL),
(398, 31, N'Monetary', N'2024-04-30', 1, N'Summer of Safety', N'Event', N'PHP', 280.87, 280.87, N'pesos', N'Monthly contribution', NULL),
(399, 3, N'Monetary', N'2024-09-23', 1, NULL, N'Campaign', N'PHP', 972.26, 972.26, N'pesos', N'Monthly contribution', NULL),
(400, 26, N'Monetary', N'2026-01-20', 1, NULL, N'Campaign', N'PHP', 379.25, 379.25, N'pesos', N'In support of safehouse operations', NULL),
(401, 46, N'SocialMedia', N'2024-08-26', 0, NULL, N'PartnerReferral', NULL, NULL, 3.63, N'campaigns', N'Monthly contribution', NULL),
(402, 35, N'InKind', N'2023-12-19', 0, N'Year-End Hope', N'SocialMedia', NULL, NULL, 382.94, N'items', N'Monthly contribution', 627),
(403, 31, N'Monetary', N'2025-07-04', 1, N'Back to School', N'Event', N'PHP', 291.03, 291.03, N'pesos', N'Recurring gift', NULL),
(404, 60, N'Monetary', N'2025-05-29', 1, N'Summer of Safety', N'Campaign', N'PHP', 835.01, 835.01, N'pesos', N'Recurring gift', NULL),
(405, 24, N'SocialMedia', N'2023-08-15', 1, NULL, N'Event', NULL, NULL, 7.09, N'campaigns', N'Campaign support', NULL),
(406, 21, N'Time', N'2024-11-06', 0, N'GivingTuesday', N'PartnerReferral', NULL, NULL, 20.59, N'hours', N'Event donation', NULL),
(407, 58, N'Monetary', N'2024-01-17', 0, NULL, N'Campaign', N'PHP', 250.0, 250.0, N'pesos', N'Monthly contribution', NULL),
(408, 57, N'Monetary', N'2023-12-05', 0, NULL, N'Campaign', N'PHP', 1194.06, 1194.06, N'pesos', N'Campaign support', NULL),
(409, 43, N'Monetary', N'2025-01-12', 0, NULL, N'SocialMedia', N'PHP', 697.94, 697.94, N'pesos', N'Monthly contribution', 709),
(410, 54, N'InKind', N'2023-08-18', 1, NULL, N'Campaign', NULL, NULL, 478.06, N'items', N'Campaign support', NULL),
(411, 49, N'SocialMedia', N'2023-12-01', 0, N'Year-End Hope', N'PartnerReferral', NULL, NULL, 4.61, N'campaigns', N'Campaign support', NULL),
(412, 38, N'Time', N'2026-01-12', 1, NULL, N'Event', NULL, NULL, 32.89, N'hours', N'Monthly contribution', NULL),
(413, 45, N'Monetary', N'2025-11-27', 1, N'Year-End Hope', N'Direct', N'PHP', 469.23, 469.23, N'pesos', N'In support of safehouse operations', NULL),
(414, 4, N'InKind', N'2024-10-14', 1, NULL, N'SocialMedia', NULL, NULL, 420.23, N'items', N'Community outreach support', 211),
(415, 26, N'SocialMedia', N'2026-01-13', 1, NULL, N'Campaign', NULL, NULL, 10.8, N'campaigns', N'Recurring gift', NULL),
(416, 20, N'Monetary', N'2023-02-03', 1, NULL, N'Campaign', N'PHP', 1121.08, 1121.08, N'pesos', N'Campaign support', NULL),
(417, 19, N'Monetary', N'2023-01-13', 0, NULL, N'Direct', N'PHP', 349.66, 349.66, N'pesos', N'Event donation', NULL),
(418, 54, N'Monetary', N'2025-03-08', 1, NULL, N'Campaign', N'PHP', 1924.57, 1924.57, N'pesos', N'Campaign support', NULL),
(419, 45, N'InKind', N'2024-10-29', 1, NULL, N'Campaign', NULL, NULL, 677.83, N'items', N'Recurring gift', NULL),
(420, 49, N'InKind', N'2025-12-09', 0, N'Year-End Hope', N'Event', NULL, NULL, 300.0, N'items', N'Monthly contribution', NULL);
  IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID(N'dbo.donations')) EXEC('SET IDENTITY_INSERT dbo.donations OFF');
END
COMMIT;
