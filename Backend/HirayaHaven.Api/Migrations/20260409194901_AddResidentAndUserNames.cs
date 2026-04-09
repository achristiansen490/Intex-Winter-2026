using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HirayaHaven.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddResidentAndUserNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "resident_first_name",
                table: "residents",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "resident_last_name",
                table: "residents",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "first_name",
                table: "AspNetUsers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "last_name",
                table: "AspNetUsers",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "resident_first_name",
                table: "residents");

            migrationBuilder.DropColumn(
                name: "resident_last_name",
                table: "residents");

            migrationBuilder.DropColumn(
                name: "first_name",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "last_name",
                table: "AspNetUsers");
        }
    }
}
