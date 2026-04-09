-- Step 06: load [partners]
SET XACT_ABORT ON;
BEGIN TRAN;
IF OBJECT_ID(N'dbo.partners', N'U') IS NOT NULL
BEGIN
  IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID(N'dbo.partners')) SET IDENTITY_INSERT dbo.partners ON;
  INSERT INTO dbo.[partners] ([partner_id], [partner_name], [partner_type], [role_type], [contact_name], [email], [phone], [region], [status], [start_date], [end_date], [notes]) VALUES
(1, N'Ana Reyes', N'Organization', N'SafehouseOps', N'Ana Reyes', N'ana-reyes@hopepartners.ph', N'+63 993 532 6574', N'Luzon', N'Active', N'2022-01-01', NULL, N'Primary contractor'),
(2, N'Maria Santos', N'Individual', N'Evaluation', N'Maria Santos', N'maria-santos@pldt.net.ph', N'+63 927 194 7224', N'Luzon', N'Active', N'2022-01-21', NULL, N'Primary contractor'),
(3, N'Elena Cruz', N'Individual', N'Education', N'Elena Cruz', N'elena-cruz@eastern.com.ph', N'+63 966 926 1711', N'Mindanao', N'Active', N'2022-02-10', NULL, N'Primary contractor'),
(4, N'Sofia Dizon', N'Organization', N'Logistics', N'Sofia Dizon', N'sofia-dizon@bayanihanfoundation.ph', N'+63 947 400 6925', N'Visayas', N'Active', N'2022-03-02', NULL, N'Primary contractor'),
(5, N'Grace Flores', N'Individual', N'SafehouseOps', N'Grace Flores', N'grace-flores@yahoo.com.ph', N'+63 991 333 5741', N'Visayas', N'Active', N'2022-03-22', NULL, N'Primary contractor'),
(6, N'Joy Garcia', N'Individual', N'Maintenance', N'Joy Garcia', N'joy-garcia@yahoo.com.ph', N'+63 995 384 8428', N'Mindanao', N'Active', N'2022-04-11', NULL, N'Primary contractor'),
(7, N'Lina Mendoza', N'Organization', N'FindSafehouse', N'Lina Mendoza', N'lina-mendoza@unityalliance.ph', N'+63 955 786 5374', N'Luzon', N'Active', N'2022-05-01', NULL, N'Primary contractor'),
(8, N'Noel Torres', N'Individual', N'Logistics', N'Noel Torres', N'noel-torres@yahoo.com.ph', N'+63 951 750 3803', N'Visayas', N'Active', N'2022-05-21', NULL, N'Primary contractor'),
(9, N'Mark Lopez', N'Individual', N'SafehouseOps', N'Mark Lopez', N'mark-lopez@smart.com.ph', N'+63 995 376 4598', N'Luzon', N'Active', N'2022-06-10', NULL, N'Primary contractor'),
(10, N'Ramon Bautista', N'Organization', N'Logistics', N'Ramon Bautista', N'ramon-bautista@hopepartners.ph', N'+63 915 924 6168', N'Mindanao', N'Active', N'2022-06-30', NULL, N'Primary contractor'),
(11, N'Paolo Navarro', N'Individual', N'SafehouseOps', N'Paolo Navarro', N'paolo-navarro@eastern.com.ph', N'+63 977 317 9179', N'Luzon', N'Active', N'2022-07-20', NULL, N'Secondary contractor'),
(12, N'Jessa Ramos', N'Individual', N'SafehouseOps', N'Jessa Ramos', N'jessa-ramos@smart.com.ph', N'+63 937 371 3287', N'Mindanao', N'Active', N'2022-08-09', NULL, N'Secondary contractor'),
(13, N'Mica Castillo', N'Organization', N'Evaluation', N'Mica Castillo', N'mica-castillo@faithgroup.ph', N'+63 949 508 6930', N'Visayas', N'Active', N'2022-08-29', NULL, N'Secondary contractor'),
(14, N'Leah Gomez', N'Individual', N'Education', N'Leah Gomez', N'leah-gomez@eastern.com.ph', N'+63 928 193 1771', N'Mindanao', N'Active', N'2022-09-18', NULL, N'Secondary contractor'),
(15, N'Ruth Naval', N'Individual', N'Transport', N'Ruth Naval', N'ruth-naval@globe.com.ph', N'+63 992 532 2040', N'Luzon', N'Active', N'2022-10-08', NULL, N'Secondary contractor'),
(16, N'Ivan Pascual', N'Organization', N'SafehouseOps', N'Ivan Pascual', N'ivan-pascual@kapatiranalliance.ph', N'+63 947 981 1188', N'Visayas', N'Active', N'2022-10-28', NULL, N'Secondary contractor'),
(17, N'Aiko Rivera', N'Individual', N'Logistics', N'Aiko Rivera', N'aiko-rivera@eastern.com.ph', N'+63 967 887 6573', N'Luzon', N'Active', N'2022-11-17', NULL, N'Secondary contractor'),
(18, N'Mara Salazar', N'Individual', N'Education', N'Mara Salazar', N'mara-salazar@smart.com.ph', N'+63 905 839 5315', N'Luzon', N'Active', N'2022-12-07', NULL, N'Secondary contractor'),
(19, N'Paula Tan', N'Organization', N'Maintenance', N'Paula Tan', N'paula-tan@brightalliance.ph', N'+63 998 619 4258', N'Mindanao', N'Active', N'2022-12-27', NULL, N'Secondary contractor'),
(20, N'Chris Uy', N'Individual', N'Education', N'Chris Uy', N'chris-uy@eastern.com.ph', N'+63 939 100 6310', N'Mindanao', N'Active', N'2023-01-16', NULL, N'Secondary contractor'),
(21, N'Ben Diaz', N'Individual', N'SafehouseOps', N'Ben Diaz', N'ben-diaz@pldt.net.ph', N'+63 976 345 1949', N'Luzon', N'Active', N'2023-02-05', NULL, N'Secondary contractor'),
(22, N'Kai Javier', N'Organization', N'Evaluation', N'Kai Javier', N'kai-javier@brightfoundation.ph', N'+63 928 935 2133', N'Visayas', N'Active', N'2023-02-25', NULL, N'Secondary contractor'),
(23, N'Tess Lim', N'Individual', N'Maintenance', N'Tess Lim', N'tess-lim@globe.com.ph', N'+63 936 775 8787', N'Visayas', N'Active', N'2023-03-17', NULL, N'Secondary contractor'),
(24, N'Nina Vega', N'Individual', N'Maintenance', N'Nina Vega', N'nina-vega@eastern.com.ph', N'+63 951 533 4470', N'Luzon', N'Active', N'2023-04-06', NULL, N'Secondary contractor'),
(25, N'Rico Ramos', N'Organization', N'Maintenance', N'Rico Ramos', N'rico-ramos@globalalliance.ph', N'+63 996 787 7118', N'Mindanao', N'Active', N'2023-04-26', NULL, N'Secondary contractor'),
(26, N'Maya Serrano', N'Individual', N'SafehouseOps', N'Maya Serrano', N'maya-serrano@yahoo.com.ph', N'+63 965 330 2049', N'Visayas', N'Active', N'2023-05-16', NULL, N'Secondary contractor'),
(27, N'Ivy Valdez', N'Individual', N'Evaluation', N'Ivy Valdez', N'ivy-valdez@globe.com.ph', N'+63 949 325 1117', N'Visayas', N'Active', N'2023-06-05', NULL, N'Secondary contractor'),
(28, N'Paul Yap', N'Organization', N'Education', N'Paul Yap', N'paul-yap@globalfoundation.ph', N'+63 915 980 6413', N'Visayas', N'Inactive', N'2023-06-25', N'2025-12-31', N'Secondary contractor'),
(29, N'June Cortez', N'Individual', N'Education', N'June Cortez', N'june-cortez@smart.com.ph', N'+63 955 652 3167', N'Luzon', N'Inactive', N'2023-07-15', N'2025-12-31', N'Secondary contractor'),
(30, N'Lara Soriano', N'Individual', N'Logistics', N'Lara Soriano', N'lara-soriano@eastern.com.ph', N'+63 921 348 8749', N'Mindanao', N'Inactive', N'2023-08-04', N'2025-12-31', N'Secondary contractor');
  IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID(N'dbo.partners')) SET IDENTITY_INSERT dbo.partners OFF;
END
COMMIT;
