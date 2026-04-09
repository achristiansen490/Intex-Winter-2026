using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HirayaHaven.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPipelineTraining : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "pipeline_schedule_settings",
                columns: table => new
                {
                    settings_id = table.Column<int>(type: "INTEGER", nullable: false),
                    enabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    hour_utc = table.Column<int>(type: "INTEGER", nullable: false),
                    minute_utc = table.Column<int>(type: "INTEGER", nullable: false),
                    last_scheduled_run_date = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pipeline_schedule_settings", x => x.settings_id);
                });

            migrationBuilder.CreateTable(
                name: "pipeline_training_runs",
                columns: table => new
                {
                    run_id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    pipeline_key = table.Column<string>(type: "TEXT", nullable: false),
                    trigger_type = table.Column<string>(type: "TEXT", nullable: false),
                    status = table.Column<string>(type: "TEXT", nullable: false),
                    detail_message = table.Column<string>(type: "TEXT", nullable: true),
                    started_utc = table.Column<string>(type: "TEXT", nullable: false),
                    finished_utc = table.Column<string>(type: "TEXT", nullable: true),
                    triggered_by_user_name = table.Column<string>(type: "TEXT", nullable: true)
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
