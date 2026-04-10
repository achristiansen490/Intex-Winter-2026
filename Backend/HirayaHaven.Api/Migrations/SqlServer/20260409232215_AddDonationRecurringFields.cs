using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HirayaHaven.Api.Migrations.SqlServer
{
    /// <inheritdoc />
    public partial class AddDonationRecurringFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF COL_LENGTH('dbo.donations', 'recurring_series_key') IS NULL
                BEGIN
                    ALTER TABLE dbo.donations ADD recurring_series_key nvarchar(64) NULL;
                END
                """);

            migrationBuilder.Sql(
                """
                IF COL_LENGTH('dbo.donations', 'recurring_cancelled_at') IS NULL
                BEGIN
                    ALTER TABLE dbo.donations ADD recurring_cancelled_at datetime2 NULL;
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                IF COL_LENGTH('dbo.donations', 'recurring_cancelled_at') IS NOT NULL
                BEGIN
                    ALTER TABLE dbo.donations DROP COLUMN recurring_cancelled_at;
                END
                """);

            migrationBuilder.Sql(
                """
                IF COL_LENGTH('dbo.donations', 'recurring_series_key') IS NOT NULL
                BEGIN
                    ALTER TABLE dbo.donations DROP COLUMN recurring_series_key;
                END
                """);
        }
    }
}
