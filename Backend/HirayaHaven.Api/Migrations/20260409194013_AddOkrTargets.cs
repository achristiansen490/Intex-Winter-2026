using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HirayaHaven.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddOkrTargets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "okr_targets",
                columns: table => new
                {
                    target_id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    metric_key = table.Column<string>(type: "TEXT", nullable: false),
                    year = table.Column<int>(type: "INTEGER", nullable: false),
                    quarter = table.Column<int>(type: "INTEGER", nullable: false),
                    target_value = table.Column<double>(type: "REAL", nullable: false),
                    notes = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_okr_targets", x => x.target_id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "okr_targets");
        }
    }
}
