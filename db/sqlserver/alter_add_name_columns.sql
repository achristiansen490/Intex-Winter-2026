-- Azure SQL patch: add name columns to residents and users tables.
-- Run this ONCE against the Azure SQL database before running the full sync script.
-- Safe to run on a live database (columns are nullable, no data is dropped).

-- Add name columns to residents
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.residents') AND name = 'resident_first_name'
)
    ALTER TABLE dbo.residents ADD resident_first_name NVARCHAR(MAX) NULL;

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.residents') AND name = 'resident_last_name'
)
    ALTER TABLE dbo.residents ADD resident_last_name NVARCHAR(MAX) NULL;

-- Add name columns to AspNetUsers (ASP.NET Identity table for AppUser)
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.AspNetUsers') AND name = 'first_name'
)
    ALTER TABLE dbo.AspNetUsers ADD first_name NVARCHAR(MAX) NULL;

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.AspNetUsers') AND name = 'last_name'
)
    ALTER TABLE dbo.AspNetUsers ADD last_name NVARCHAR(MAX) NULL;

PRINT 'Schema patch applied successfully.';
