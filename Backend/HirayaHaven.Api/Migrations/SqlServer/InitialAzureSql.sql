IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
CREATE TABLE [AspNetRoles] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(256) NULL,
    [NormalizedName] nvarchar(256) NULL,
    [ConcurrencyStamp] nvarchar(max) NULL,
    CONSTRAINT [PK_AspNetRoles] PRIMARY KEY ([Id])
);

CREATE TABLE [organization] (
    [org_id] int NOT NULL IDENTITY,
    [org_name] nvarchar(max) NULL,
    [legal_name] nvarchar(max) NULL,
    [org_type] nvarchar(max) NULL,
    [ein] nvarchar(max) NULL,
    [country_of_registration] nvarchar(max) NULL,
    [operations_country] nvarchar(max) NULL,
    [address_line1] nvarchar(max) NULL,
    [address_line2] nvarchar(max) NULL,
    [city] nvarchar(max) NULL,
    [state] nvarchar(max) NULL,
    [zip_code] nvarchar(max) NULL,
    [country] nvarchar(max) NULL,
    [phone] nvarchar(max) NULL,
    [email] nvarchar(max) NULL,
    [website] nvarchar(max) NULL,
    [logo_url] nvarchar(max) NULL,
    [mission_statement] nvarchar(max) NULL,
    [founded_year] int NULL,
    [fiscal_year_start] nvarchar(max) NULL,
    [fiscal_year_end] nvarchar(max) NULL,
    [currency_primary] nvarchar(max) NULL,
    [currency_reporting] nvarchar(max) NULL,
    [created_at] nvarchar(max) NULL,
    [updated_at] nvarchar(max) NULL,
    CONSTRAINT [PK_organization] PRIMARY KEY ([org_id])
);

CREATE TABLE [partners] (
    [partner_id] int NOT NULL IDENTITY,
    [partner_name] nvarchar(max) NULL,
    [partner_type] nvarchar(max) NULL,
    [role_type] nvarchar(max) NULL,
    [contact_name] nvarchar(max) NULL,
    [email] nvarchar(max) NULL,
    [phone] nvarchar(max) NULL,
    [region] nvarchar(max) NULL,
    [status] nvarchar(max) NULL,
    [start_date] nvarchar(max) NULL,
    [end_date] nvarchar(max) NULL,
    [notes] nvarchar(max) NULL,
    CONSTRAINT [PK_partners] PRIMARY KEY ([partner_id])
);

CREATE TABLE [program_areas] (
    [program_area_id] int NOT NULL IDENTITY,
    [area_code] nvarchar(max) NULL,
    [area_name] nvarchar(max) NULL,
    [description] nvarchar(max) NULL,
    [applies_to] nvarchar(max) NULL,
    [is_active] bit NULL,
    CONSTRAINT [PK_program_areas] PRIMARY KEY ([program_area_id])
);

CREATE TABLE [public_impact_snapshots] (
    [snapshot_id] int NOT NULL IDENTITY,
    [snapshot_date] nvarchar(max) NULL,
    [headline] nvarchar(max) NULL,
    [summary_text] nvarchar(max) NULL,
    [metric_payload_json] nvarchar(max) NULL,
    [is_published] bit NULL,
    [published_at] nvarchar(max) NULL,
    CONSTRAINT [PK_public_impact_snapshots] PRIMARY KEY ([snapshot_id])
);

CREATE TABLE [roles_permissions] (
    [permission_id] int NOT NULL IDENTITY,
    [role] nvarchar(max) NULL,
    [resource] nvarchar(max) NULL,
    [action] nvarchar(max) NULL,
    [is_allowed] bit NULL,
    [scope_note] nvarchar(max) NULL,
    CONSTRAINT [PK_roles_permissions] PRIMARY KEY ([permission_id])
);

CREATE TABLE [safehouses] (
    [safehouse_id] int NOT NULL IDENTITY,
    [safehouse_code] nvarchar(max) NULL,
    [name] nvarchar(max) NULL,
    [region] nvarchar(max) NULL,
    [city] nvarchar(max) NULL,
    [province] nvarchar(max) NULL,
    [country] nvarchar(max) NULL,
    [open_date] nvarchar(max) NULL,
    [status] nvarchar(max) NULL,
    [capacity_girls] int NULL,
    [capacity_staff] int NULL,
    [current_occupancy] int NULL,
    [notes] nvarchar(max) NULL,
    CONSTRAINT [PK_safehouses] PRIMARY KEY ([safehouse_id])
);

CREATE TABLE [social_media_posts] (
    [post_id] int NOT NULL IDENTITY,
    [platform] nvarchar(max) NULL,
    [platform_post_id] nvarchar(max) NULL,
    [post_url] nvarchar(max) NULL,
    [created_at] nvarchar(max) NULL,
    [day_of_week] nvarchar(max) NULL,
    [post_hour] int NULL,
    [post_type] nvarchar(max) NULL,
    [media_type] nvarchar(max) NULL,
    [caption] nvarchar(max) NULL,
    [hashtags] nvarchar(max) NULL,
    [num_hashtags] int NULL,
    [mentions_count] int NULL,
    [has_call_to_action] bit NULL,
    [call_to_action_type] nvarchar(max) NULL,
    [content_topic] nvarchar(max) NULL,
    [sentiment_tone] nvarchar(max) NULL,
    [caption_length] int NULL,
    [features_resident_story] bit NULL,
    [campaign_name] nvarchar(max) NULL,
    [is_boosted] bit NULL,
    [boost_budget_php] float NULL,
    [impressions] int NULL,
    [reach] int NULL,
    [likes] int NULL,
    [comments] int NULL,
    [shares] int NULL,
    [saves] int NULL,
    [click_throughs] int NULL,
    [video_views] int NULL,
    [engagement_rate] float NULL,
    [profile_visits] int NULL,
    [donation_referrals] int NULL,
    [estimated_donation_value_php] float NULL,
    [follower_count_at_post] int NULL,
    [watch_time_seconds] int NULL,
    [avg_view_duration_seconds] int NULL,
    [subscriber_count_at_post] int NULL,
    [forwards] int NULL,
    CONSTRAINT [PK_social_media_posts] PRIMARY KEY ([post_id])
);

CREATE TABLE [supporters] (
    [supporter_id] int NOT NULL IDENTITY,
    [supporter_type] nvarchar(max) NULL,
    [display_name] nvarchar(max) NULL,
    [organization_name] nvarchar(max) NULL,
    [first_name] nvarchar(max) NULL,
    [last_name] nvarchar(max) NULL,
    [relationship_type] nvarchar(max) NULL,
    [region] nvarchar(max) NULL,
    [country] nvarchar(max) NULL,
    [email] nvarchar(max) NULL,
    [phone] nvarchar(max) NULL,
    [status] nvarchar(max) NULL,
    [created_at] nvarchar(max) NULL,
    [first_donation_date] nvarchar(max) NULL,
    [acquisition_channel] nvarchar(max) NULL,
    CONSTRAINT [PK_supporters] PRIMARY KEY ([supporter_id])
);

CREATE TABLE [AspNetRoleClaims] (
    [Id] int NOT NULL IDENTITY,
    [RoleId] int NOT NULL,
    [ClaimType] nvarchar(max) NULL,
    [ClaimValue] nvarchar(max) NULL,
    CONSTRAINT [PK_AspNetRoleClaims] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_AspNetRoleClaims_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [partner_assignments] (
    [assignment_id] int NOT NULL IDENTITY,
    [partner_id] int NOT NULL,
    [safehouse_id] int NULL,
    [program_area] nvarchar(max) NULL,
    [assignment_start] nvarchar(max) NULL,
    [assignment_end] nvarchar(max) NULL,
    [responsibility_notes] nvarchar(max) NULL,
    [is_primary] bit NULL,
    [status] nvarchar(max) NULL,
    CONSTRAINT [PK_partner_assignments] PRIMARY KEY ([assignment_id]),
    CONSTRAINT [FK_partner_assignments_partners_partner_id] FOREIGN KEY ([partner_id]) REFERENCES [partners] ([partner_id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_partner_assignments_safehouses_safehouse_id] FOREIGN KEY ([safehouse_id]) REFERENCES [safehouses] ([safehouse_id]) ON DELETE NO ACTION
);

CREATE TABLE [residents] (
    [resident_id] int NOT NULL IDENTITY,
    [case_control_no] nvarchar(max) NULL,
    [internal_code] nvarchar(max) NULL,
    [safehouse_id] int NULL,
    [case_status] nvarchar(max) NULL,
    [sex] nvarchar(max) NULL,
    [date_of_birth] nvarchar(max) NULL,
    [birth_status] nvarchar(max) NULL,
    [place_of_birth] nvarchar(max) NULL,
    [religion] nvarchar(max) NULL,
    [case_category] nvarchar(max) NULL,
    [sub_cat_orphaned] bit NULL,
    [sub_cat_trafficked] bit NULL,
    [sub_cat_child_labor] bit NULL,
    [sub_cat_physical_abuse] bit NULL,
    [sub_cat_sexual_abuse] bit NULL,
    [sub_cat_osaec] bit NULL,
    [sub_cat_cicl] bit NULL,
    [sub_cat_at_risk] bit NULL,
    [sub_cat_street_child] bit NULL,
    [sub_cat_child_with_hiv] bit NULL,
    [is_pwd] bit NULL,
    [pwd_type] nvarchar(max) NULL,
    [has_special_needs] bit NULL,
    [special_needs_diagnosis] nvarchar(max) NULL,
    [family_is_4ps] bit NULL,
    [family_solo_parent] bit NULL,
    [family_indigenous] bit NULL,
    [family_parent_pwd] bit NULL,
    [family_informal_settler] bit NULL,
    [date_of_admission] nvarchar(max) NULL,
    [age_upon_admission] nvarchar(max) NULL,
    [present_age] nvarchar(max) NULL,
    [length_of_stay] nvarchar(max) NULL,
    [referral_source] nvarchar(max) NULL,
    [referring_agency_person] nvarchar(max) NULL,
    [date_colb_registered] nvarchar(max) NULL,
    [date_colb_obtained] nvarchar(max) NULL,
    [assigned_social_worker] nvarchar(max) NULL,
    [initial_case_assessment] nvarchar(max) NULL,
    [date_case_study_prepared] nvarchar(max) NULL,
    [reintegration_type] nvarchar(max) NULL,
    [reintegration_status] nvarchar(max) NULL,
    [initial_risk_level] nvarchar(max) NULL,
    [current_risk_level] nvarchar(max) NULL,
    [date_enrolled] nvarchar(max) NULL,
    [date_closed] nvarchar(max) NULL,
    [created_at] nvarchar(max) NULL,
    [notes_restricted] nvarchar(max) NULL,
    CONSTRAINT [PK_residents] PRIMARY KEY ([resident_id]),
    CONSTRAINT [FK_residents_safehouses_safehouse_id] FOREIGN KEY ([safehouse_id]) REFERENCES [safehouses] ([safehouse_id]) ON DELETE NO ACTION
);

CREATE TABLE [safehouse_monthly_metrics] (
    [metric_id] int NOT NULL IDENTITY,
    [safehouse_id] int NOT NULL,
    [month_start] nvarchar(max) NULL,
    [month_end] nvarchar(max) NULL,
    [active_residents] int NULL,
    [avg_education_progress] float NULL,
    [avg_health_score] float NULL,
    [process_recording_count] int NULL,
    [home_visitation_count] int NULL,
    [incident_count] int NULL,
    [notes] nvarchar(max) NULL,
    CONSTRAINT [PK_safehouse_monthly_metrics] PRIMARY KEY ([metric_id]),
    CONSTRAINT [FK_safehouse_monthly_metrics_safehouses_safehouse_id] FOREIGN KEY ([safehouse_id]) REFERENCES [safehouses] ([safehouse_id]) ON DELETE NO ACTION
);

CREATE TABLE [staff] (
    [staff_id] int NOT NULL IDENTITY,
    [staff_code] nvarchar(max) NULL,
    [first_name] nvarchar(max) NULL,
    [last_name] nvarchar(max) NULL,
    [age] int NULL,
    [email] nvarchar(max) NULL,
    [phone] nvarchar(max) NULL,
    [role] nvarchar(max) NULL,
    [employment_type] nvarchar(max) NULL,
    [specialization] nvarchar(max) NULL,
    [safehouse_id] int NULL,
    [employment_status] nvarchar(max) NULL,
    [date_hired] nvarchar(max) NULL,
    [date_ended] nvarchar(max) NULL,
    [created_at] nvarchar(max) NULL,
    [updated_at] nvarchar(max) NULL,
    CONSTRAINT [PK_staff] PRIMARY KEY ([staff_id]),
    CONSTRAINT [FK_staff_safehouses_safehouse_id] FOREIGN KEY ([safehouse_id]) REFERENCES [safehouses] ([safehouse_id]) ON DELETE NO ACTION
);

CREATE TABLE [donations] (
    [donation_id] int NOT NULL IDENTITY,
    [supporter_id] int NOT NULL,
    [donation_type] nvarchar(max) NULL,
    [donation_date] nvarchar(max) NULL,
    [is_recurring] bit NULL,
    [campaign_name] nvarchar(max) NULL,
    [channel_source] nvarchar(max) NULL,
    [currency_code] nvarchar(max) NULL,
    [amount] decimal(18,2) NULL,
    [estimated_value] decimal(18,2) NULL,
    [impact_unit] nvarchar(max) NULL,
    [notes] nvarchar(max) NULL,
    [referral_post_id] int NULL,
    CONSTRAINT [PK_donations] PRIMARY KEY ([donation_id]),
    CONSTRAINT [FK_donations_social_media_posts_referral_post_id] FOREIGN KEY ([referral_post_id]) REFERENCES [social_media_posts] ([post_id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_donations_supporters_supporter_id] FOREIGN KEY ([supporter_id]) REFERENCES [supporters] ([supporter_id]) ON DELETE NO ACTION
);

CREATE TABLE [education_records] (
    [education_record_id] int NOT NULL IDENTITY,
    [resident_id] int NOT NULL,
    [record_date] nvarchar(max) NULL,
    [education_level] nvarchar(max) NULL,
    [school_name] nvarchar(max) NULL,
    [enrollment_status] nvarchar(max) NULL,
    [attendance_rate] float NULL,
    [progress_percent] float NULL,
    [completion_status] nvarchar(max) NULL,
    [notes] nvarchar(max) NULL,
    CONSTRAINT [PK_education_records] PRIMARY KEY ([education_record_id]),
    CONSTRAINT [FK_education_records_residents_resident_id] FOREIGN KEY ([resident_id]) REFERENCES [residents] ([resident_id]) ON DELETE NO ACTION
);

CREATE TABLE [health_wellbeing_records] (
    [health_record_id] int NOT NULL IDENTITY,
    [resident_id] int NOT NULL,
    [record_date] nvarchar(max) NULL,
    [general_health_score] float NULL,
    [nutrition_score] float NULL,
    [sleep_quality_score] float NULL,
    [energy_level_score] float NULL,
    [height_cm] float NULL,
    [weight_kg] float NULL,
    [bmi] float NULL,
    [medical_checkup_done] bit NULL,
    [dental_checkup_done] bit NULL,
    [psychological_checkup_done] bit NULL,
    [notes] nvarchar(max) NULL,
    CONSTRAINT [PK_health_wellbeing_records] PRIMARY KEY ([health_record_id]),
    CONSTRAINT [FK_health_wellbeing_records_residents_resident_id] FOREIGN KEY ([resident_id]) REFERENCES [residents] ([resident_id]) ON DELETE NO ACTION
);

CREATE TABLE [home_visitations] (
    [visitation_id] int NOT NULL IDENTITY,
    [resident_id] int NOT NULL,
    [visit_date] nvarchar(max) NULL,
    [social_worker] nvarchar(max) NULL,
    [visit_type] nvarchar(max) NULL,
    [location_visited] nvarchar(max) NULL,
    [family_members_present] nvarchar(max) NULL,
    [purpose] nvarchar(max) NULL,
    [observations] nvarchar(max) NULL,
    [family_cooperation_level] nvarchar(max) NULL,
    [safety_concerns_noted] bit NULL,
    [follow_up_needed] bit NULL,
    [follow_up_notes] nvarchar(max) NULL,
    [visit_outcome] nvarchar(max) NULL,
    CONSTRAINT [PK_home_visitations] PRIMARY KEY ([visitation_id]),
    CONSTRAINT [FK_home_visitations_residents_resident_id] FOREIGN KEY ([resident_id]) REFERENCES [residents] ([resident_id]) ON DELETE NO ACTION
);

CREATE TABLE [incident_reports] (
    [incident_id] int NOT NULL IDENTITY,
    [resident_id] int NOT NULL,
    [safehouse_id] int NOT NULL,
    [incident_date] nvarchar(max) NULL,
    [incident_type] nvarchar(max) NULL,
    [severity] nvarchar(max) NULL,
    [description] nvarchar(max) NULL,
    [response_taken] nvarchar(max) NULL,
    [resolved] bit NULL,
    [resolution_date] nvarchar(max) NULL,
    [reported_by] nvarchar(max) NULL,
    [follow_up_required] bit NULL,
    CONSTRAINT [PK_incident_reports] PRIMARY KEY ([incident_id]),
    CONSTRAINT [FK_incident_reports_residents_resident_id] FOREIGN KEY ([resident_id]) REFERENCES [residents] ([resident_id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_incident_reports_safehouses_safehouse_id] FOREIGN KEY ([safehouse_id]) REFERENCES [safehouses] ([safehouse_id]) ON DELETE NO ACTION
);

CREATE TABLE [intervention_plans] (
    [plan_id] int NOT NULL IDENTITY,
    [resident_id] int NOT NULL,
    [plan_category] nvarchar(max) NULL,
    [plan_description] nvarchar(max) NULL,
    [services_provided] nvarchar(max) NULL,
    [target_value] float NULL,
    [target_date] nvarchar(max) NULL,
    [status] nvarchar(max) NULL,
    [case_conference_date] nvarchar(max) NULL,
    [created_at] nvarchar(max) NULL,
    [updated_at] nvarchar(max) NULL,
    CONSTRAINT [PK_intervention_plans] PRIMARY KEY ([plan_id]),
    CONSTRAINT [FK_intervention_plans_residents_resident_id] FOREIGN KEY ([resident_id]) REFERENCES [residents] ([resident_id]) ON DELETE NO ACTION
);

CREATE TABLE [process_recordings] (
    [recording_id] int NOT NULL IDENTITY,
    [resident_id] int NOT NULL,
    [session_date] nvarchar(max) NULL,
    [social_worker] nvarchar(max) NULL,
    [session_type] nvarchar(max) NULL,
    [session_duration_minutes] int NULL,
    [emotional_state_observed] nvarchar(max) NULL,
    [emotional_state_end] nvarchar(max) NULL,
    [session_narrative] nvarchar(max) NULL,
    [interventions_applied] nvarchar(max) NULL,
    [follow_up_actions] nvarchar(max) NULL,
    [progress_noted] bit NULL,
    [concerns_flagged] bit NULL,
    [referral_made] bit NULL,
    [notes_restricted] nvarchar(max) NULL,
    CONSTRAINT [PK_process_recordings] PRIMARY KEY ([recording_id]),
    CONSTRAINT [FK_process_recordings_residents_resident_id] FOREIGN KEY ([resident_id]) REFERENCES [residents] ([resident_id]) ON DELETE NO ACTION
);

CREATE TABLE [AspNetUsers] (
    [Id] int NOT NULL IDENTITY,
    [UserType] nvarchar(max) NULL,
    [StaffId] int NULL,
    [ResidentId] int NULL,
    [SupporterId] int NULL,
    [IsActive] bit NOT NULL,
    [IsApproved] bit NOT NULL,
    [ApprovedBy] int NULL,
    [ApprovedAt] datetime2 NULL,
    [LastLogin] datetime2 NULL,
    [MfaSecret] nvarchar(max) NULL,
    [ResetInitiatedBy] int NULL,
    [CreatedBy] int NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NOT NULL,
    [UserName] nvarchar(256) NULL,
    [NormalizedUserName] nvarchar(256) NULL,
    [Email] nvarchar(256) NULL,
    [NormalizedEmail] nvarchar(256) NULL,
    [EmailConfirmed] bit NOT NULL,
    [PasswordHash] nvarchar(max) NULL,
    [SecurityStamp] nvarchar(max) NULL,
    [ConcurrencyStamp] nvarchar(max) NULL,
    [PhoneNumber] nvarchar(max) NULL,
    [PhoneNumberConfirmed] bit NOT NULL,
    [TwoFactorEnabled] bit NOT NULL,
    [LockoutEnd] datetimeoffset NULL,
    [LockoutEnabled] bit NOT NULL,
    [AccessFailedCount] int NOT NULL,
    CONSTRAINT [PK_AspNetUsers] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_AspNetUsers_AspNetUsers_ApprovedBy] FOREIGN KEY ([ApprovedBy]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_AspNetUsers_AspNetUsers_CreatedBy] FOREIGN KEY ([CreatedBy]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_AspNetUsers_AspNetUsers_ResetInitiatedBy] FOREIGN KEY ([ResetInitiatedBy]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_AspNetUsers_residents_ResidentId] FOREIGN KEY ([ResidentId]) REFERENCES [residents] ([resident_id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_AspNetUsers_staff_StaffId] FOREIGN KEY ([StaffId]) REFERENCES [staff] ([staff_id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_AspNetUsers_supporters_SupporterId] FOREIGN KEY ([SupporterId]) REFERENCES [supporters] ([supporter_id]) ON DELETE NO ACTION
);

CREATE TABLE [donation_allocations] (
    [allocation_id] int NOT NULL IDENTITY,
    [donation_id] int NOT NULL,
    [safehouse_id] int NOT NULL,
    [program_area] nvarchar(max) NULL,
    [amount_allocated] float NULL,
    [allocation_date] nvarchar(max) NULL,
    [allocation_notes] nvarchar(max) NULL,
    CONSTRAINT [PK_donation_allocations] PRIMARY KEY ([allocation_id]),
    CONSTRAINT [FK_donation_allocations_donations_donation_id] FOREIGN KEY ([donation_id]) REFERENCES [donations] ([donation_id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_donation_allocations_safehouses_safehouse_id] FOREIGN KEY ([safehouse_id]) REFERENCES [safehouses] ([safehouse_id]) ON DELETE NO ACTION
);

CREATE TABLE [in_kind_donation_items] (
    [item_id] int NOT NULL IDENTITY,
    [donation_id] int NOT NULL,
    [item_name] nvarchar(max) NULL,
    [item_category] nvarchar(max) NULL,
    [quantity] int NULL,
    [unit_of_measure] nvarchar(max) NULL,
    [estimated_unit_value] float NULL,
    [intended_use] nvarchar(max) NULL,
    [received_condition] nvarchar(max) NULL,
    CONSTRAINT [PK_in_kind_donation_items] PRIMARY KEY ([item_id]),
    CONSTRAINT [FK_in_kind_donation_items_donations_donation_id] FOREIGN KEY ([donation_id]) REFERENCES [donations] ([donation_id]) ON DELETE NO ACTION
);

CREATE TABLE [AspNetUserClaims] (
    [Id] int NOT NULL IDENTITY,
    [UserId] int NOT NULL,
    [ClaimType] nvarchar(max) NULL,
    [ClaimValue] nvarchar(max) NULL,
    CONSTRAINT [PK_AspNetUserClaims] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_AspNetUserClaims_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [AspNetUserLogins] (
    [LoginProvider] nvarchar(450) NOT NULL,
    [ProviderKey] nvarchar(450) NOT NULL,
    [ProviderDisplayName] nvarchar(max) NULL,
    [UserId] int NOT NULL,
    CONSTRAINT [PK_AspNetUserLogins] PRIMARY KEY ([LoginProvider], [ProviderKey]),
    CONSTRAINT [FK_AspNetUserLogins_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [AspNetUserRoles] (
    [UserId] int NOT NULL,
    [RoleId] int NOT NULL,
    CONSTRAINT [PK_AspNetUserRoles] PRIMARY KEY ([UserId], [RoleId]),
    CONSTRAINT [FK_AspNetUserRoles_AspNetRoles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [AspNetRoles] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_AspNetUserRoles_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [AspNetUserTokens] (
    [UserId] int NOT NULL,
    [LoginProvider] nvarchar(450) NOT NULL,
    [Name] nvarchar(450) NOT NULL,
    [Value] nvarchar(max) NULL,
    CONSTRAINT [PK_AspNetUserTokens] PRIMARY KEY ([UserId], [LoginProvider], [Name]),
    CONSTRAINT [FK_AspNetUserTokens_AspNetUsers_UserId] FOREIGN KEY ([UserId]) REFERENCES [AspNetUsers] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [audit_log] (
    [audit_id] int NOT NULL IDENTITY,
    [user_id] int NOT NULL,
    [action] nvarchar(max) NULL,
    [resource] nvarchar(max) NULL,
    [record_id] int NULL,
    [old_value] nvarchar(max) NULL,
    [new_value] nvarchar(max) NULL,
    [requires_approval] bit NULL,
    [approval_status] nvarchar(max) NULL,
    [approved_by] int NULL,
    [approved_at] nvarchar(max) NULL,
    [ip_address] nvarchar(max) NULL,
    [timestamp] nvarchar(max) NULL,
    [notes] nvarchar(max) NULL,
    CONSTRAINT [PK_audit_log] PRIMARY KEY ([audit_id]),
    CONSTRAINT [FK_audit_log_AspNetUsers_approved_by] FOREIGN KEY ([approved_by]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_audit_log_AspNetUsers_user_id] FOREIGN KEY ([user_id]) REFERENCES [AspNetUsers] ([Id]) ON DELETE NO ACTION
);

CREATE INDEX [IX_AspNetRoleClaims_RoleId] ON [AspNetRoleClaims] ([RoleId]);

CREATE UNIQUE INDEX [RoleNameIndex] ON [AspNetRoles] ([NormalizedName]) WHERE [NormalizedName] IS NOT NULL;

CREATE INDEX [IX_AspNetUserClaims_UserId] ON [AspNetUserClaims] ([UserId]);

CREATE INDEX [IX_AspNetUserLogins_UserId] ON [AspNetUserLogins] ([UserId]);

CREATE INDEX [IX_AspNetUserRoles_RoleId] ON [AspNetUserRoles] ([RoleId]);

CREATE INDEX [EmailIndex] ON [AspNetUsers] ([NormalizedEmail]);

CREATE INDEX [IX_AspNetUsers_ApprovedBy] ON [AspNetUsers] ([ApprovedBy]);

CREATE INDEX [IX_AspNetUsers_CreatedBy] ON [AspNetUsers] ([CreatedBy]);

CREATE INDEX [IX_AspNetUsers_ResetInitiatedBy] ON [AspNetUsers] ([ResetInitiatedBy]);

CREATE INDEX [IX_AspNetUsers_ResidentId] ON [AspNetUsers] ([ResidentId]);

CREATE INDEX [IX_AspNetUsers_StaffId] ON [AspNetUsers] ([StaffId]);

CREATE INDEX [IX_AspNetUsers_SupporterId] ON [AspNetUsers] ([SupporterId]);

CREATE UNIQUE INDEX [UserNameIndex] ON [AspNetUsers] ([NormalizedUserName]) WHERE [NormalizedUserName] IS NOT NULL;

CREATE INDEX [IX_audit_log_approved_by] ON [audit_log] ([approved_by]);

CREATE INDEX [IX_audit_log_user_id] ON [audit_log] ([user_id]);

CREATE INDEX [IX_donation_allocations_donation_id] ON [donation_allocations] ([donation_id]);

CREATE INDEX [IX_donation_allocations_safehouse_id] ON [donation_allocations] ([safehouse_id]);

CREATE INDEX [IX_donations_referral_post_id] ON [donations] ([referral_post_id]);

CREATE INDEX [IX_donations_supporter_id] ON [donations] ([supporter_id]);

CREATE INDEX [IX_education_records_resident_id] ON [education_records] ([resident_id]);

CREATE INDEX [IX_health_wellbeing_records_resident_id] ON [health_wellbeing_records] ([resident_id]);

CREATE INDEX [IX_home_visitations_resident_id] ON [home_visitations] ([resident_id]);

CREATE INDEX [IX_in_kind_donation_items_donation_id] ON [in_kind_donation_items] ([donation_id]);

CREATE INDEX [IX_incident_reports_resident_id] ON [incident_reports] ([resident_id]);

CREATE INDEX [IX_incident_reports_safehouse_id] ON [incident_reports] ([safehouse_id]);

CREATE INDEX [IX_intervention_plans_resident_id] ON [intervention_plans] ([resident_id]);

CREATE INDEX [IX_partner_assignments_partner_id] ON [partner_assignments] ([partner_id]);

CREATE INDEX [IX_partner_assignments_safehouse_id] ON [partner_assignments] ([safehouse_id]);

CREATE INDEX [IX_process_recordings_resident_id] ON [process_recordings] ([resident_id]);

CREATE INDEX [IX_residents_safehouse_id] ON [residents] ([safehouse_id]);

CREATE INDEX [IX_safehouse_monthly_metrics_safehouse_id] ON [safehouse_monthly_metrics] ([safehouse_id]);

CREATE INDEX [IX_staff_safehouse_id] ON [staff] ([safehouse_id]);

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260408003956_InitialAzureSql', N'10.0.1');

COMMIT;
GO

