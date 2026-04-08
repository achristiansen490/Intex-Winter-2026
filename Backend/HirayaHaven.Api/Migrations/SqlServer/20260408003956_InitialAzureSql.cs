using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HirayaHaven.Api.Migrations.SqlServer
{
    /// <inheritdoc />
    public partial class InitialAzureSql : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "organization",
                columns: table => new
                {
                    org_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    org_name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    legal_name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    org_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ein = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    country_of_registration = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    operations_country = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    address_line1 = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    address_line2 = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    city = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    state = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    zip_code = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    country = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    phone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    email = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    website = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    logo_url = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    mission_statement = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    founded_year = table.Column<int>(type: "int", nullable: true),
                    fiscal_year_start = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    fiscal_year_end = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    currency_primary = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    currency_reporting = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    updated_at = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organization", x => x.org_id);
                });

            migrationBuilder.CreateTable(
                name: "partners",
                columns: table => new
                {
                    partner_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    partner_name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    partner_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    role_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    contact_name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    email = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    phone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    region = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    status = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    start_date = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    end_date = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    notes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_partners", x => x.partner_id);
                });

            migrationBuilder.CreateTable(
                name: "program_areas",
                columns: table => new
                {
                    program_area_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    area_code = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    area_name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    applies_to = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    is_active = table.Column<bool>(type: "bit", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_program_areas", x => x.program_area_id);
                });

            migrationBuilder.CreateTable(
                name: "public_impact_snapshots",
                columns: table => new
                {
                    snapshot_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    snapshot_date = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    headline = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    summary_text = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    metric_payload_json = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    is_published = table.Column<bool>(type: "bit", nullable: true),
                    published_at = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_public_impact_snapshots", x => x.snapshot_id);
                });

            migrationBuilder.CreateTable(
                name: "roles_permissions",
                columns: table => new
                {
                    permission_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    role = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    resource = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    action = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    is_allowed = table.Column<bool>(type: "bit", nullable: true),
                    scope_note = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_roles_permissions", x => x.permission_id);
                });

            migrationBuilder.CreateTable(
                name: "safehouses",
                columns: table => new
                {
                    safehouse_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    safehouse_code = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    region = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    city = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    province = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    country = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    open_date = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    status = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    capacity_girls = table.Column<int>(type: "int", nullable: true),
                    capacity_staff = table.Column<int>(type: "int", nullable: true),
                    current_occupancy = table.Column<int>(type: "int", nullable: true),
                    notes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_safehouses", x => x.safehouse_id);
                });

            migrationBuilder.CreateTable(
                name: "social_media_posts",
                columns: table => new
                {
                    post_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    platform = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    platform_post_id = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    post_url = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    day_of_week = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    post_hour = table.Column<int>(type: "int", nullable: true),
                    post_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    media_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    caption = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    hashtags = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    num_hashtags = table.Column<int>(type: "int", nullable: true),
                    mentions_count = table.Column<int>(type: "int", nullable: true),
                    has_call_to_action = table.Column<bool>(type: "bit", nullable: true),
                    call_to_action_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    content_topic = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    sentiment_tone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    caption_length = table.Column<int>(type: "int", nullable: true),
                    features_resident_story = table.Column<bool>(type: "bit", nullable: true),
                    campaign_name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    is_boosted = table.Column<bool>(type: "bit", nullable: true),
                    boost_budget_php = table.Column<double>(type: "float", nullable: true),
                    impressions = table.Column<int>(type: "int", nullable: true),
                    reach = table.Column<int>(type: "int", nullable: true),
                    likes = table.Column<int>(type: "int", nullable: true),
                    comments = table.Column<int>(type: "int", nullable: true),
                    shares = table.Column<int>(type: "int", nullable: true),
                    saves = table.Column<int>(type: "int", nullable: true),
                    click_throughs = table.Column<int>(type: "int", nullable: true),
                    video_views = table.Column<int>(type: "int", nullable: true),
                    engagement_rate = table.Column<double>(type: "float", nullable: true),
                    profile_visits = table.Column<int>(type: "int", nullable: true),
                    donation_referrals = table.Column<int>(type: "int", nullable: true),
                    estimated_donation_value_php = table.Column<double>(type: "float", nullable: true),
                    follower_count_at_post = table.Column<int>(type: "int", nullable: true),
                    watch_time_seconds = table.Column<int>(type: "int", nullable: true),
                    avg_view_duration_seconds = table.Column<int>(type: "int", nullable: true),
                    subscriber_count_at_post = table.Column<int>(type: "int", nullable: true),
                    forwards = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_social_media_posts", x => x.post_id);
                });

            migrationBuilder.CreateTable(
                name: "supporters",
                columns: table => new
                {
                    supporter_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    supporter_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    display_name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    organization_name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    first_name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    last_name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    relationship_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    region = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    country = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    email = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    phone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    status = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    first_donation_date = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    acquisition_channel = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_supporters", x => x.supporter_id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoleId = table.Column<int>(type: "int", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "partner_assignments",
                columns: table => new
                {
                    assignment_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    partner_id = table.Column<int>(type: "int", nullable: false),
                    safehouse_id = table.Column<int>(type: "int", nullable: true),
                    program_area = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    assignment_start = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    assignment_end = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    responsibility_notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    is_primary = table.Column<bool>(type: "bit", nullable: true),
                    status = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_partner_assignments", x => x.assignment_id);
                    table.ForeignKey(
                        name: "FK_partner_assignments_partners_partner_id",
                        column: x => x.partner_id,
                        principalTable: "partners",
                        principalColumn: "partner_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_partner_assignments_safehouses_safehouse_id",
                        column: x => x.safehouse_id,
                        principalTable: "safehouses",
                        principalColumn: "safehouse_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "residents",
                columns: table => new
                {
                    resident_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    case_control_no = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    internal_code = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    safehouse_id = table.Column<int>(type: "int", nullable: true),
                    case_status = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    sex = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    date_of_birth = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    birth_status = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    place_of_birth = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    religion = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    case_category = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    sub_cat_orphaned = table.Column<bool>(type: "bit", nullable: true),
                    sub_cat_trafficked = table.Column<bool>(type: "bit", nullable: true),
                    sub_cat_child_labor = table.Column<bool>(type: "bit", nullable: true),
                    sub_cat_physical_abuse = table.Column<bool>(type: "bit", nullable: true),
                    sub_cat_sexual_abuse = table.Column<bool>(type: "bit", nullable: true),
                    sub_cat_osaec = table.Column<bool>(type: "bit", nullable: true),
                    sub_cat_cicl = table.Column<bool>(type: "bit", nullable: true),
                    sub_cat_at_risk = table.Column<bool>(type: "bit", nullable: true),
                    sub_cat_street_child = table.Column<bool>(type: "bit", nullable: true),
                    sub_cat_child_with_hiv = table.Column<bool>(type: "bit", nullable: true),
                    is_pwd = table.Column<bool>(type: "bit", nullable: true),
                    pwd_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    has_special_needs = table.Column<bool>(type: "bit", nullable: true),
                    special_needs_diagnosis = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    family_is_4ps = table.Column<bool>(type: "bit", nullable: true),
                    family_solo_parent = table.Column<bool>(type: "bit", nullable: true),
                    family_indigenous = table.Column<bool>(type: "bit", nullable: true),
                    family_parent_pwd = table.Column<bool>(type: "bit", nullable: true),
                    family_informal_settler = table.Column<bool>(type: "bit", nullable: true),
                    date_of_admission = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    age_upon_admission = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    present_age = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    length_of_stay = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    referral_source = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    referring_agency_person = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    date_colb_registered = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    date_colb_obtained = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    assigned_social_worker = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    initial_case_assessment = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    date_case_study_prepared = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    reintegration_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    reintegration_status = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    initial_risk_level = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    current_risk_level = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    date_enrolled = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    date_closed = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    notes_restricted = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_residents", x => x.resident_id);
                    table.ForeignKey(
                        name: "FK_residents_safehouses_safehouse_id",
                        column: x => x.safehouse_id,
                        principalTable: "safehouses",
                        principalColumn: "safehouse_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "safehouse_monthly_metrics",
                columns: table => new
                {
                    metric_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    safehouse_id = table.Column<int>(type: "int", nullable: false),
                    month_start = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    month_end = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    active_residents = table.Column<int>(type: "int", nullable: true),
                    avg_education_progress = table.Column<double>(type: "float", nullable: true),
                    avg_health_score = table.Column<double>(type: "float", nullable: true),
                    process_recording_count = table.Column<int>(type: "int", nullable: true),
                    home_visitation_count = table.Column<int>(type: "int", nullable: true),
                    incident_count = table.Column<int>(type: "int", nullable: true),
                    notes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_safehouse_monthly_metrics", x => x.metric_id);
                    table.ForeignKey(
                        name: "FK_safehouse_monthly_metrics_safehouses_safehouse_id",
                        column: x => x.safehouse_id,
                        principalTable: "safehouses",
                        principalColumn: "safehouse_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "staff",
                columns: table => new
                {
                    staff_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    staff_code = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    first_name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    last_name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    age = table.Column<int>(type: "int", nullable: true),
                    email = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    phone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    role = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    employment_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    specialization = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    safehouse_id = table.Column<int>(type: "int", nullable: true),
                    employment_status = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    date_hired = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    date_ended = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    updated_at = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_staff", x => x.staff_id);
                    table.ForeignKey(
                        name: "FK_staff_safehouses_safehouse_id",
                        column: x => x.safehouse_id,
                        principalTable: "safehouses",
                        principalColumn: "safehouse_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "donations",
                columns: table => new
                {
                    donation_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    supporter_id = table.Column<int>(type: "int", nullable: false),
                    donation_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    donation_date = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    is_recurring = table.Column<bool>(type: "bit", nullable: true),
                    campaign_name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    channel_source = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    currency_code = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    amount = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    estimated_value = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    impact_unit = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    referral_post_id = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_donations", x => x.donation_id);
                    table.ForeignKey(
                        name: "FK_donations_social_media_posts_referral_post_id",
                        column: x => x.referral_post_id,
                        principalTable: "social_media_posts",
                        principalColumn: "post_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_donations_supporters_supporter_id",
                        column: x => x.supporter_id,
                        principalTable: "supporters",
                        principalColumn: "supporter_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "education_records",
                columns: table => new
                {
                    education_record_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    resident_id = table.Column<int>(type: "int", nullable: false),
                    record_date = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    education_level = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    school_name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    enrollment_status = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    attendance_rate = table.Column<double>(type: "float", nullable: true),
                    progress_percent = table.Column<double>(type: "float", nullable: true),
                    completion_status = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    notes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_education_records", x => x.education_record_id);
                    table.ForeignKey(
                        name: "FK_education_records_residents_resident_id",
                        column: x => x.resident_id,
                        principalTable: "residents",
                        principalColumn: "resident_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "health_wellbeing_records",
                columns: table => new
                {
                    health_record_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    resident_id = table.Column<int>(type: "int", nullable: false),
                    record_date = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    general_health_score = table.Column<double>(type: "float", nullable: true),
                    nutrition_score = table.Column<double>(type: "float", nullable: true),
                    sleep_quality_score = table.Column<double>(type: "float", nullable: true),
                    energy_level_score = table.Column<double>(type: "float", nullable: true),
                    height_cm = table.Column<double>(type: "float", nullable: true),
                    weight_kg = table.Column<double>(type: "float", nullable: true),
                    bmi = table.Column<double>(type: "float", nullable: true),
                    medical_checkup_done = table.Column<bool>(type: "bit", nullable: true),
                    dental_checkup_done = table.Column<bool>(type: "bit", nullable: true),
                    psychological_checkup_done = table.Column<bool>(type: "bit", nullable: true),
                    notes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_health_wellbeing_records", x => x.health_record_id);
                    table.ForeignKey(
                        name: "FK_health_wellbeing_records_residents_resident_id",
                        column: x => x.resident_id,
                        principalTable: "residents",
                        principalColumn: "resident_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "home_visitations",
                columns: table => new
                {
                    visitation_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    resident_id = table.Column<int>(type: "int", nullable: false),
                    visit_date = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    social_worker = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    visit_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    location_visited = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    family_members_present = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    purpose = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    observations = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    family_cooperation_level = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    safety_concerns_noted = table.Column<bool>(type: "bit", nullable: true),
                    follow_up_needed = table.Column<bool>(type: "bit", nullable: true),
                    follow_up_notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    visit_outcome = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_home_visitations", x => x.visitation_id);
                    table.ForeignKey(
                        name: "FK_home_visitations_residents_resident_id",
                        column: x => x.resident_id,
                        principalTable: "residents",
                        principalColumn: "resident_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "incident_reports",
                columns: table => new
                {
                    incident_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    resident_id = table.Column<int>(type: "int", nullable: false),
                    safehouse_id = table.Column<int>(type: "int", nullable: false),
                    incident_date = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    incident_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    severity = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    response_taken = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    resolved = table.Column<bool>(type: "bit", nullable: true),
                    resolution_date = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    reported_by = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    follow_up_required = table.Column<bool>(type: "bit", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_incident_reports", x => x.incident_id);
                    table.ForeignKey(
                        name: "FK_incident_reports_residents_resident_id",
                        column: x => x.resident_id,
                        principalTable: "residents",
                        principalColumn: "resident_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_incident_reports_safehouses_safehouse_id",
                        column: x => x.safehouse_id,
                        principalTable: "safehouses",
                        principalColumn: "safehouse_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "intervention_plans",
                columns: table => new
                {
                    plan_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    resident_id = table.Column<int>(type: "int", nullable: false),
                    plan_category = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    plan_description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    services_provided = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    target_value = table.Column<double>(type: "float", nullable: true),
                    target_date = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    status = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    case_conference_date = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    created_at = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    updated_at = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_intervention_plans", x => x.plan_id);
                    table.ForeignKey(
                        name: "FK_intervention_plans_residents_resident_id",
                        column: x => x.resident_id,
                        principalTable: "residents",
                        principalColumn: "resident_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "process_recordings",
                columns: table => new
                {
                    recording_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    resident_id = table.Column<int>(type: "int", nullable: false),
                    session_date = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    social_worker = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    session_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    session_duration_minutes = table.Column<int>(type: "int", nullable: true),
                    emotional_state_observed = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    emotional_state_end = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    session_narrative = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    interventions_applied = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    follow_up_actions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    progress_noted = table.Column<bool>(type: "bit", nullable: true),
                    concerns_flagged = table.Column<bool>(type: "bit", nullable: true),
                    referral_made = table.Column<bool>(type: "bit", nullable: true),
                    notes_restricted = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_process_recordings", x => x.recording_id);
                    table.ForeignKey(
                        name: "FK_process_recordings_residents_resident_id",
                        column: x => x.resident_id,
                        principalTable: "residents",
                        principalColumn: "resident_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    StaffId = table.Column<int>(type: "int", nullable: true),
                    ResidentId = table.Column<int>(type: "int", nullable: true),
                    SupporterId = table.Column<int>(type: "int", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsApproved = table.Column<bool>(type: "bit", nullable: false),
                    ApprovedBy = table.Column<int>(type: "int", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastLogin = table.Column<DateTime>(type: "datetime2", nullable: true),
                    MfaSecret = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ResetInitiatedBy = table.Column<int>(type: "int", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SecurityStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "bit", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "bit", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "bit", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUsers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUsers_AspNetUsers_ApprovedBy",
                        column: x => x.ApprovedBy,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AspNetUsers_AspNetUsers_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AspNetUsers_AspNetUsers_ResetInitiatedBy",
                        column: x => x.ResetInitiatedBy,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AspNetUsers_residents_ResidentId",
                        column: x => x.ResidentId,
                        principalTable: "residents",
                        principalColumn: "resident_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AspNetUsers_staff_StaffId",
                        column: x => x.StaffId,
                        principalTable: "staff",
                        principalColumn: "staff_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AspNetUsers_supporters_SupporterId",
                        column: x => x.SupporterId,
                        principalTable: "supporters",
                        principalColumn: "supporter_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "donation_allocations",
                columns: table => new
                {
                    allocation_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    donation_id = table.Column<int>(type: "int", nullable: false),
                    safehouse_id = table.Column<int>(type: "int", nullable: false),
                    program_area = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    amount_allocated = table.Column<double>(type: "float", nullable: true),
                    allocation_date = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    allocation_notes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_donation_allocations", x => x.allocation_id);
                    table.ForeignKey(
                        name: "FK_donation_allocations_donations_donation_id",
                        column: x => x.donation_id,
                        principalTable: "donations",
                        principalColumn: "donation_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_donation_allocations_safehouses_safehouse_id",
                        column: x => x.safehouse_id,
                        principalTable: "safehouses",
                        principalColumn: "safehouse_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "in_kind_donation_items",
                columns: table => new
                {
                    item_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    donation_id = table.Column<int>(type: "int", nullable: false),
                    item_name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    item_category = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    quantity = table.Column<int>(type: "int", nullable: true),
                    unit_of_measure = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    estimated_unit_value = table.Column<double>(type: "float", nullable: true),
                    intended_use = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    received_condition = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_in_kind_donation_items", x => x.item_id);
                    table.ForeignKey(
                        name: "FK_in_kind_donation_items_donations_donation_id",
                        column: x => x.donation_id,
                        principalTable: "donations",
                        principalColumn: "donation_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUserClaims_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderKey = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_AspNetUserLogins_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "int", nullable: false),
                    RoleId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "int", nullable: false),
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_AspNetUserTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "audit_log",
                columns: table => new
                {
                    audit_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    user_id = table.Column<int>(type: "int", nullable: false),
                    action = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    resource = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    record_id = table.Column<int>(type: "int", nullable: true),
                    old_value = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    new_value = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    requires_approval = table.Column<bool>(type: "bit", nullable: true),
                    approval_status = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    approved_by = table.Column<int>(type: "int", nullable: true),
                    approved_at = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ip_address = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    timestamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    notes = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_log", x => x.audit_id);
                    table.ForeignKey(
                        name: "FK_audit_log_AspNetUsers_approved_by",
                        column: x => x.approved_by,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_audit_log_AspNetUsers_user_id",
                        column: x => x.user_id,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AspNetRoleClaims_RoleId",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "AspNetRoles",
                column: "NormalizedName",
                unique: true,
                filter: "[NormalizedName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_ApprovedBy",
                table: "AspNetUsers",
                column: "ApprovedBy");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_CreatedBy",
                table: "AspNetUsers",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_ResetInitiatedBy",
                table: "AspNetUsers",
                column: "ResetInitiatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_ResidentId",
                table: "AspNetUsers",
                column: "ResidentId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_StaffId",
                table: "AspNetUsers",
                column: "StaffId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_SupporterId",
                table: "AspNetUsers",
                column: "SupporterId");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "AspNetUsers",
                column: "NormalizedUserName",
                unique: true,
                filter: "[NormalizedUserName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_audit_log_approved_by",
                table: "audit_log",
                column: "approved_by");

            migrationBuilder.CreateIndex(
                name: "IX_audit_log_user_id",
                table: "audit_log",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_donation_allocations_donation_id",
                table: "donation_allocations",
                column: "donation_id");

            migrationBuilder.CreateIndex(
                name: "IX_donation_allocations_safehouse_id",
                table: "donation_allocations",
                column: "safehouse_id");

            migrationBuilder.CreateIndex(
                name: "IX_donations_referral_post_id",
                table: "donations",
                column: "referral_post_id");

            migrationBuilder.CreateIndex(
                name: "IX_donations_supporter_id",
                table: "donations",
                column: "supporter_id");

            migrationBuilder.CreateIndex(
                name: "IX_education_records_resident_id",
                table: "education_records",
                column: "resident_id");

            migrationBuilder.CreateIndex(
                name: "IX_health_wellbeing_records_resident_id",
                table: "health_wellbeing_records",
                column: "resident_id");

            migrationBuilder.CreateIndex(
                name: "IX_home_visitations_resident_id",
                table: "home_visitations",
                column: "resident_id");

            migrationBuilder.CreateIndex(
                name: "IX_in_kind_donation_items_donation_id",
                table: "in_kind_donation_items",
                column: "donation_id");

            migrationBuilder.CreateIndex(
                name: "IX_incident_reports_resident_id",
                table: "incident_reports",
                column: "resident_id");

            migrationBuilder.CreateIndex(
                name: "IX_incident_reports_safehouse_id",
                table: "incident_reports",
                column: "safehouse_id");

            migrationBuilder.CreateIndex(
                name: "IX_intervention_plans_resident_id",
                table: "intervention_plans",
                column: "resident_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_assignments_partner_id",
                table: "partner_assignments",
                column: "partner_id");

            migrationBuilder.CreateIndex(
                name: "IX_partner_assignments_safehouse_id",
                table: "partner_assignments",
                column: "safehouse_id");

            migrationBuilder.CreateIndex(
                name: "IX_process_recordings_resident_id",
                table: "process_recordings",
                column: "resident_id");

            migrationBuilder.CreateIndex(
                name: "IX_residents_safehouse_id",
                table: "residents",
                column: "safehouse_id");

            migrationBuilder.CreateIndex(
                name: "IX_safehouse_monthly_metrics_safehouse_id",
                table: "safehouse_monthly_metrics",
                column: "safehouse_id");

            migrationBuilder.CreateIndex(
                name: "IX_staff_safehouse_id",
                table: "staff",
                column: "safehouse_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AspNetRoleClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens");

            migrationBuilder.DropTable(
                name: "audit_log");

            migrationBuilder.DropTable(
                name: "donation_allocations");

            migrationBuilder.DropTable(
                name: "education_records");

            migrationBuilder.DropTable(
                name: "health_wellbeing_records");

            migrationBuilder.DropTable(
                name: "home_visitations");

            migrationBuilder.DropTable(
                name: "in_kind_donation_items");

            migrationBuilder.DropTable(
                name: "incident_reports");

            migrationBuilder.DropTable(
                name: "intervention_plans");

            migrationBuilder.DropTable(
                name: "organization");

            migrationBuilder.DropTable(
                name: "partner_assignments");

            migrationBuilder.DropTable(
                name: "process_recordings");

            migrationBuilder.DropTable(
                name: "program_areas");

            migrationBuilder.DropTable(
                name: "public_impact_snapshots");

            migrationBuilder.DropTable(
                name: "roles_permissions");

            migrationBuilder.DropTable(
                name: "safehouse_monthly_metrics");

            migrationBuilder.DropTable(
                name: "AspNetRoles");

            migrationBuilder.DropTable(
                name: "AspNetUsers");

            migrationBuilder.DropTable(
                name: "donations");

            migrationBuilder.DropTable(
                name: "partners");

            migrationBuilder.DropTable(
                name: "residents");

            migrationBuilder.DropTable(
                name: "staff");

            migrationBuilder.DropTable(
                name: "social_media_posts");

            migrationBuilder.DropTable(
                name: "supporters");

            migrationBuilder.DropTable(
                name: "safehouses");
        }
    }
}
