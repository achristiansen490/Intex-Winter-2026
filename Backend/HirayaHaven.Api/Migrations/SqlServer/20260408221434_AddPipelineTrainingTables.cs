using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HirayaHaven.Api.Migrations.SqlServer
{
    /// <inheritdoc />
    public partial class AddPipelineTrainingTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "pipeline_schedule_settings",
                columns: table => new
                {
                    settings_id = table.Column<int>(type: "int", nullable: false),
                    enabled = table.Column<bool>(type: "bit", nullable: false),
                    hour_utc = table.Column<int>(type: "int", nullable: false),
                    minute_utc = table.Column<int>(type: "int", nullable: false),
                    last_scheduled_run_date = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pipeline_schedule_settings", x => x.settings_id);
                });

            migrationBuilder.CreateTable(
                name: "pipeline_training_runs",
                columns: table => new
                {
                    run_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    pipeline_key = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    trigger_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    detail_message = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    started_utc = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    finished_utc = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    triggered_by_user_name = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pipeline_training_runs", x => x.run_id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "pipeline_schedule_settings");

            migrationBuilder.DropTable(
                name: "pipeline_training_runs");
        }
    }
}
