using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HirayaHaven.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDonationRecurringSeriesFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "recurring_cancelled_at",
                table: "donations",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "recurring_series_key",
                table: "donations",
                type: "TEXT",
                maxLength: 64,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "recurring_cancelled_at",
                table: "donations");

            migrationBuilder.DropColumn(
                name: "recurring_series_key",
                table: "donations");
        }
    }
}
