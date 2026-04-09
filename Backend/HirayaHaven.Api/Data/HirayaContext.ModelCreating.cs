using HirayaHaven.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HirayaHaven.Api.Data;

public partial class HirayaContext
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.HasOne(e => e.Staff)
                .WithMany()
                .HasForeignKey(e => e.StaffId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Resident)
                .WithMany()
                .HasForeignKey(e => e.ResidentId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Supporter)
                .WithMany()
                .HasForeignKey(e => e.SupporterId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ApprovedByUser)
                .WithMany()
                .HasForeignKey(e => e.ApprovedBy)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.CreatedByUser)
                .WithMany()
                .HasForeignKey(e => e.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ResetInitiatedByUser)
                .WithMany()
                .HasForeignKey(e => e.ResetInitiatedBy)
                .OnDelete(DeleteBehavior.Restrict);

            entity.Property(e => e.FirstName).HasColumnName("first_name");
            entity.Property(e => e.LastName).HasColumnName("last_name");
        });

        modelBuilder.Entity<Organization>(entity =>
        {
            entity.ToTable("organization");
            entity.HasKey(e => e.OrgId);
            entity.Property(e => e.OrgId).HasColumnName("org_id").ValueGeneratedOnAdd();
            MapText(entity, e => e.OrgName, "org_name");
            MapText(entity, e => e.LegalName, "legal_name");
            MapText(entity, e => e.OrgType, "org_type");
            MapText(entity, e => e.Ein, "ein");
            MapText(entity, e => e.CountryOfRegistration, "country_of_registration");
            MapText(entity, e => e.OperationsCountry, "operations_country");
            MapText(entity, e => e.AddressLine1, "address_line1");
            MapText(entity, e => e.AddressLine2, "address_line2");
            MapText(entity, e => e.City, "city");
            MapText(entity, e => e.State, "state");
            MapText(entity, e => e.ZipCode, "zip_code");
            MapText(entity, e => e.Country, "country");
            MapText(entity, e => e.Phone, "phone");
            MapText(entity, e => e.Email, "email");
            MapText(entity, e => e.Website, "website");
            MapText(entity, e => e.LogoUrl, "logo_url");
            MapText(entity, e => e.MissionStatement, "mission_statement");
            entity.Property(e => e.FoundedYear).HasColumnName("founded_year");
            MapText(entity, e => e.FiscalYearStart, "fiscal_year_start");
            MapText(entity, e => e.FiscalYearEnd, "fiscal_year_end");
            MapText(entity, e => e.CurrencyPrimary, "currency_primary");
            MapText(entity, e => e.CurrencyReporting, "currency_reporting");
            MapText(entity, e => e.CreatedAt, "created_at");
            MapText(entity, e => e.UpdatedAt, "updated_at");
        });

        modelBuilder.Entity<ProgramArea>(entity =>
        {
            entity.ToTable("program_areas");
            entity.HasKey(e => e.ProgramAreaId);
            entity.Property(e => e.ProgramAreaId).HasColumnName("program_area_id").ValueGeneratedOnAdd();
            MapText(entity, e => e.AreaCode, "area_code");
            MapText(entity, e => e.AreaName, "area_name");
            MapText(entity, e => e.Description, "description");
            MapText(entity, e => e.AppliesTo, "applies_to");
            MapBool(entity, e => e.IsActive, "is_active");
        });

        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.ToTable("roles_permissions");
            entity.HasKey(e => e.PermissionId);
            entity.Property(e => e.PermissionId).HasColumnName("permission_id").ValueGeneratedOnAdd();
            MapText(entity, e => e.Role, "role");
            MapText(entity, e => e.Resource, "resource");
            MapText(entity, e => e.Action, "action");
            MapBool(entity, e => e.IsAllowed, "is_allowed");
            MapText(entity, e => e.ScopeNote, "scope_note");
        });

        modelBuilder.Entity<Safehouse>(entity =>
        {
            entity.ToTable("safehouses");
            entity.HasKey(e => e.SafehouseId);
            entity.Property(e => e.SafehouseId).HasColumnName("safehouse_id").ValueGeneratedOnAdd();
            MapText(entity, e => e.SafehouseCode, "safehouse_code");
            MapText(entity, e => e.Name, "name");
            MapText(entity, e => e.Region, "region");
            MapText(entity, e => e.City, "city");
            MapText(entity, e => e.Province, "province");
            MapText(entity, e => e.Country, "country");
            MapText(entity, e => e.OpenDate, "open_date");
            MapText(entity, e => e.Status, "status");
            entity.Property(e => e.CapacityGirls).HasColumnName("capacity_girls");
            entity.Property(e => e.CapacityStaff).HasColumnName("capacity_staff");
            entity.Property(e => e.CurrentOccupancy).HasColumnName("current_occupancy");
            MapText(entity, e => e.Notes, "notes");
        });

        modelBuilder.Entity<Staff>(entity =>
        {
            entity.ToTable("staff");
            entity.HasKey(e => e.StaffId);
            entity.Property(e => e.StaffId).HasColumnName("staff_id").ValueGeneratedOnAdd();
            MapText(entity, e => e.StaffCode, "staff_code");
            MapText(entity, e => e.FirstName, "first_name");
            MapText(entity, e => e.LastName, "last_name");
            entity.Property(e => e.Age).HasColumnName("age");
            MapText(entity, e => e.Email, "email");
            MapText(entity, e => e.Phone, "phone");
            MapText(entity, e => e.Role, "role");
            MapText(entity, e => e.EmploymentType, "employment_type");
            MapText(entity, e => e.Specialization, "specialization");
            entity.Property(e => e.SafehouseId).HasColumnName("safehouse_id");
            MapText(entity, e => e.EmploymentStatus, "employment_status");
            MapText(entity, e => e.DateHired, "date_hired");
            MapText(entity, e => e.DateEnded, "date_ended");
            MapText(entity, e => e.CreatedAt, "created_at");
            MapText(entity, e => e.UpdatedAt, "updated_at");

            entity.HasOne(e => e.Safehouse)
                .WithMany(s => s.StaffMembers)
                .HasForeignKey(e => e.SafehouseId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("audit_log");
            entity.HasKey(e => e.AuditId);
            entity.Property(e => e.AuditId).HasColumnName("audit_id").ValueGeneratedOnAdd();
            entity.Property(e => e.UserId).HasColumnName("user_id");
            MapText(entity, e => e.Action, "action");
            MapText(entity, e => e.Resource, "resource");
            entity.Property(e => e.RecordId).HasColumnName("record_id");
            MapText(entity, e => e.OldValue, "old_value");
            MapText(entity, e => e.NewValue, "new_value");
            MapBool(entity, e => e.RequiresApproval, "requires_approval");
            MapText(entity, e => e.ApprovalStatus, "approval_status");
            entity.Property(e => e.ApprovedBy).HasColumnName("approved_by");
            MapText(entity, e => e.ApprovedAt, "approved_at");
            MapText(entity, e => e.IpAddress, "ip_address");
            MapText(entity, e => e.Timestamp, "timestamp");
            MapText(entity, e => e.Notes, "notes");

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ApprovedByUser)
                .WithMany()
                .HasForeignKey(e => e.ApprovedBy)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Partner>(entity =>
        {
            entity.ToTable("partners");
            entity.HasKey(e => e.PartnerId);
            entity.Property(e => e.PartnerId).HasColumnName("partner_id").ValueGeneratedOnAdd();
            MapText(entity, e => e.PartnerName, "partner_name");
            MapText(entity, e => e.PartnerType, "partner_type");
            MapText(entity, e => e.RoleType, "role_type");
            MapText(entity, e => e.ContactName, "contact_name");
            MapText(entity, e => e.Email, "email");
            MapText(entity, e => e.Phone, "phone");
            MapText(entity, e => e.Region, "region");
            MapText(entity, e => e.Status, "status");
            MapText(entity, e => e.StartDate, "start_date");
            MapText(entity, e => e.EndDate, "end_date");
            MapText(entity, e => e.Notes, "notes");
        });

        modelBuilder.Entity<Supporter>(entity =>
        {
            entity.ToTable("supporters");
            entity.HasKey(e => e.SupporterId);
            entity.Property(e => e.SupporterId).HasColumnName("supporter_id").ValueGeneratedOnAdd();
            MapText(entity, e => e.SupporterType, "supporter_type");
            MapText(entity, e => e.DisplayName, "display_name");
            MapText(entity, e => e.OrganizationName, "organization_name");
            MapText(entity, e => e.FirstName, "first_name");
            MapText(entity, e => e.LastName, "last_name");
            MapText(entity, e => e.RelationshipType, "relationship_type");
            MapText(entity, e => e.Region, "region");
            MapText(entity, e => e.Country, "country");
            MapText(entity, e => e.Email, "email");
            MapText(entity, e => e.Phone, "phone");
            MapText(entity, e => e.Status, "status");
            MapText(entity, e => e.CreatedAt, "created_at");
            MapText(entity, e => e.FirstDonationDate, "first_donation_date");
            MapText(entity, e => e.AcquisitionChannel, "acquisition_channel");
        });

        modelBuilder.Entity<SocialMediaPost>(entity =>
        {
            entity.ToTable("social_media_posts");
            entity.HasKey(e => e.PostId);
            entity.Property(e => e.PostId).HasColumnName("post_id").ValueGeneratedOnAdd();
            MapText(entity, e => e.Platform, "platform");
            MapText(entity, e => e.PlatformPostId, "platform_post_id");
            MapText(entity, e => e.PostUrl, "post_url");
            MapText(entity, e => e.CreatedAt, "created_at");
            MapText(entity, e => e.DayOfWeek, "day_of_week");
            entity.Property(e => e.PostHour).HasColumnName("post_hour");
            MapText(entity, e => e.PostType, "post_type");
            MapText(entity, e => e.MediaType, "media_type");
            MapText(entity, e => e.Caption, "caption");
            MapText(entity, e => e.Hashtags, "hashtags");
            entity.Property(e => e.NumHashtags).HasColumnName("num_hashtags");
            entity.Property(e => e.MentionsCount).HasColumnName("mentions_count");
            MapBool(entity, e => e.HasCallToAction, "has_call_to_action");
            MapText(entity, e => e.CallToActionType, "call_to_action_type");
            MapText(entity, e => e.ContentTopic, "content_topic");
            MapText(entity, e => e.SentimentTone, "sentiment_tone");
            entity.Property(e => e.CaptionLength).HasColumnName("caption_length");
            MapBool(entity, e => e.FeaturesResidentStory, "features_resident_story");
            MapText(entity, e => e.CampaignName, "campaign_name");
            MapBool(entity, e => e.IsBoosted, "is_boosted");
            entity.Property(e => e.BoostBudgetPhp).HasColumnName("boost_budget_php");
            entity.Property(e => e.Impressions).HasColumnName("impressions");
            entity.Property(e => e.Reach).HasColumnName("reach");
            entity.Property(e => e.Likes).HasColumnName("likes");
            entity.Property(e => e.Comments).HasColumnName("comments");
            entity.Property(e => e.Shares).HasColumnName("shares");
            entity.Property(e => e.Saves).HasColumnName("saves");
            entity.Property(e => e.ClickThroughs).HasColumnName("click_throughs");
            entity.Property(e => e.VideoViews).HasColumnName("video_views");
            entity.Property(e => e.EngagementRate).HasColumnName("engagement_rate");
            entity.Property(e => e.ProfileVisits).HasColumnName("profile_visits");
            entity.Property(e => e.DonationReferrals).HasColumnName("donation_referrals");
            entity.Property(e => e.EstimatedDonationValuePhp).HasColumnName("estimated_donation_value_php");
            entity.Property(e => e.FollowerCountAtPost).HasColumnName("follower_count_at_post");
            entity.Property(e => e.WatchTimeSeconds).HasColumnName("watch_time_seconds");
            entity.Property(e => e.AvgViewDurationSeconds).HasColumnName("avg_view_duration_seconds");
            entity.Property(e => e.SubscriberCountAtPost).HasColumnName("subscriber_count_at_post");
            entity.Property(e => e.Forwards).HasColumnName("forwards");
        });

        modelBuilder.Entity<PartnerAssignment>(entity =>
        {
            entity.ToTable("partner_assignments");
            entity.HasKey(e => e.AssignmentId);
            entity.Property(e => e.AssignmentId).HasColumnName("assignment_id").ValueGeneratedOnAdd();
            entity.Property(e => e.PartnerId).HasColumnName("partner_id");
            entity.Property(e => e.SafehouseId).HasColumnName("safehouse_id");
            MapText(entity, e => e.ProgramArea, "program_area");
            MapText(entity, e => e.AssignmentStart, "assignment_start");
            MapText(entity, e => e.AssignmentEnd, "assignment_end");
            MapText(entity, e => e.ResponsibilityNotes, "responsibility_notes");
            MapBool(entity, e => e.IsPrimary, "is_primary");
            MapText(entity, e => e.Status, "status");

            entity.HasOne(e => e.Partner)
                .WithMany(p => p.PartnerAssignments)
                .HasForeignKey(e => e.PartnerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Safehouse)
                .WithMany(s => s.PartnerAssignments)
                .HasForeignKey(e => e.SafehouseId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Donation>(entity =>
        {
            entity.ToTable("donations");
            entity.HasKey(e => e.DonationId);
            entity.Property(e => e.DonationId).HasColumnName("donation_id").ValueGeneratedOnAdd();
            entity.Property(e => e.SupporterId).HasColumnName("supporter_id");
            MapText(entity, e => e.DonationType, "donation_type");
            MapText(entity, e => e.DonationDate, "donation_date");
            MapBool(entity, e => e.IsRecurring, "is_recurring");
            MapText(entity, e => e.CampaignName, "campaign_name");
            MapText(entity, e => e.ChannelSource, "channel_source");
            MapText(entity, e => e.CurrencyCode, "currency_code");
            entity.Property(e => e.Amount).HasColumnName("amount");
            entity.Property(e => e.EstimatedValue).HasColumnName("estimated_value");
            MapText(entity, e => e.ImpactUnit, "impact_unit");
            MapText(entity, e => e.Notes, "notes");
            entity.Property(e => e.ReferralPostId).HasColumnName("referral_post_id");

            entity.HasOne(e => e.Supporter)
                .WithMany(s => s.Donations)
                .HasForeignKey(e => e.SupporterId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ReferralPost)
                .WithMany(p => p.ReferralDonations)
                .HasForeignKey(e => e.ReferralPostId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<InKindDonationItem>(entity =>
        {
            entity.ToTable("in_kind_donation_items");
            entity.HasKey(e => e.ItemId);
            entity.Property(e => e.ItemId).HasColumnName("item_id").ValueGeneratedOnAdd();
            entity.Property(e => e.DonationId).HasColumnName("donation_id");
            MapText(entity, e => e.ItemName, "item_name");
            MapText(entity, e => e.ItemCategory, "item_category");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            MapText(entity, e => e.UnitOfMeasure, "unit_of_measure");
            entity.Property(e => e.EstimatedUnitValue).HasColumnName("estimated_unit_value");
            MapText(entity, e => e.IntendedUse, "intended_use");
            MapText(entity, e => e.ReceivedCondition, "received_condition");

            entity.HasOne(e => e.Donation)
                .WithMany(d => d.InKindDonationItems)
                .HasForeignKey(e => e.DonationId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<DonationAllocation>(entity =>
        {
            entity.ToTable("donation_allocations");
            entity.HasKey(e => e.AllocationId);
            entity.Property(e => e.AllocationId).HasColumnName("allocation_id").ValueGeneratedOnAdd();
            entity.Property(e => e.DonationId).HasColumnName("donation_id");
            entity.Property(e => e.SafehouseId).HasColumnName("safehouse_id");
            MapText(entity, e => e.ProgramArea, "program_area");
            entity.Property(e => e.AmountAllocated).HasColumnName("amount_allocated");
            MapText(entity, e => e.AllocationDate, "allocation_date");
            MapText(entity, e => e.AllocationNotes, "allocation_notes");

            entity.HasOne(e => e.Donation)
                .WithMany(d => d.DonationAllocations)
                .HasForeignKey(e => e.DonationId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Safehouse)
                .WithMany(s => s.DonationAllocations)
                .HasForeignKey(e => e.SafehouseId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Resident>(entity =>
        {
            entity.ToTable("residents");
            entity.HasKey(e => e.ResidentId);
            entity.Property(e => e.ResidentId).HasColumnName("resident_id").ValueGeneratedOnAdd();
            MapText(entity, e => e.ResidentFirstName, "resident_first_name");
            MapText(entity, e => e.ResidentLastName, "resident_last_name");
            MapText(entity, e => e.CaseControlNo, "case_control_no");
            MapText(entity, e => e.InternalCode, "internal_code");
            entity.Property(e => e.SafehouseId).HasColumnName("safehouse_id");
            MapText(entity, e => e.CaseStatus, "case_status");
            MapText(entity, e => e.Sex, "sex");
            MapText(entity, e => e.DateOfBirth, "date_of_birth");
            MapText(entity, e => e.BirthStatus, "birth_status");
            MapText(entity, e => e.PlaceOfBirth, "place_of_birth");
            MapText(entity, e => e.Religion, "religion");
            MapText(entity, e => e.CaseCategory, "case_category");
            MapBool(entity, e => e.SubCatOrphaned, "sub_cat_orphaned");
            MapBool(entity, e => e.SubCatTrafficked, "sub_cat_trafficked");
            MapBool(entity, e => e.SubCatChildLabor, "sub_cat_child_labor");
            MapBool(entity, e => e.SubCatPhysicalAbuse, "sub_cat_physical_abuse");
            MapBool(entity, e => e.SubCatSexualAbuse, "sub_cat_sexual_abuse");
            MapBool(entity, e => e.SubCatOsaec, "sub_cat_osaec");
            MapBool(entity, e => e.SubCatCicl, "sub_cat_cicl");
            MapBool(entity, e => e.SubCatAtRisk, "sub_cat_at_risk");
            MapBool(entity, e => e.SubCatStreetChild, "sub_cat_street_child");
            MapBool(entity, e => e.SubCatChildWithHiv, "sub_cat_child_with_hiv");
            MapBool(entity, e => e.IsPwd, "is_pwd");
            MapText(entity, e => e.PwdType, "pwd_type");
            MapBool(entity, e => e.HasSpecialNeeds, "has_special_needs");
            MapText(entity, e => e.SpecialNeedsDiagnosis, "special_needs_diagnosis");
            MapBool(entity, e => e.FamilyIs4ps, "family_is_4ps");
            MapBool(entity, e => e.FamilySoloParent, "family_solo_parent");
            MapBool(entity, e => e.FamilyIndigenous, "family_indigenous");
            MapBool(entity, e => e.FamilyParentPwd, "family_parent_pwd");
            MapBool(entity, e => e.FamilyInformalSettler, "family_informal_settler");
            MapText(entity, e => e.DateOfAdmission, "date_of_admission");
            MapText(entity, e => e.AgeUponAdmission, "age_upon_admission");
            MapText(entity, e => e.PresentAge, "present_age");
            MapText(entity, e => e.LengthOfStay, "length_of_stay");
            MapText(entity, e => e.ReferralSource, "referral_source");
            MapText(entity, e => e.ReferringAgencyPerson, "referring_agency_person");
            MapText(entity, e => e.DateColbRegistered, "date_colb_registered");
            MapText(entity, e => e.DateColbObtained, "date_colb_obtained");
            MapText(entity, e => e.AssignedSocialWorker, "assigned_social_worker");
            MapText(entity, e => e.InitialCaseAssessment, "initial_case_assessment");
            MapText(entity, e => e.DateCaseStudyPrepared, "date_case_study_prepared");
            MapText(entity, e => e.ReintegrationType, "reintegration_type");
            MapText(entity, e => e.ReintegrationStatus, "reintegration_status");
            MapText(entity, e => e.InitialRiskLevel, "initial_risk_level");
            MapText(entity, e => e.CurrentRiskLevel, "current_risk_level");
            MapText(entity, e => e.DateEnrolled, "date_enrolled");
            MapText(entity, e => e.DateClosed, "date_closed");
            MapText(entity, e => e.CreatedAt, "created_at");
            MapText(entity, e => e.NotesRestricted, "notes_restricted");

            entity.HasOne(e => e.Safehouse)
                .WithMany(s => s.Residents)
                .HasForeignKey(e => e.SafehouseId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ProcessRecording>(entity =>
        {
            entity.ToTable("process_recordings");
            entity.HasKey(e => e.RecordingId);
            entity.Property(e => e.RecordingId).HasColumnName("recording_id").ValueGeneratedOnAdd();
            entity.Property(e => e.ResidentId).HasColumnName("resident_id");
            MapText(entity, e => e.SessionDate, "session_date");
            MapText(entity, e => e.SocialWorker, "social_worker");
            MapText(entity, e => e.SessionType, "session_type");
            entity.Property(e => e.SessionDurationMinutes).HasColumnName("session_duration_minutes");
            MapText(entity, e => e.EmotionalStateObserved, "emotional_state_observed");
            MapText(entity, e => e.EmotionalStateEnd, "emotional_state_end");
            MapText(entity, e => e.SessionNarrative, "session_narrative");
            MapText(entity, e => e.InterventionsApplied, "interventions_applied");
            MapText(entity, e => e.FollowUpActions, "follow_up_actions");
            MapBool(entity, e => e.ProgressNoted, "progress_noted");
            MapBool(entity, e => e.ConcernsFlagged, "concerns_flagged");
            MapBool(entity, e => e.ReferralMade, "referral_made");
            MapText(entity, e => e.NotesRestricted, "notes_restricted");

            entity.HasOne(e => e.Resident)
                .WithMany(r => r.ProcessRecordings)
                .HasForeignKey(e => e.ResidentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<HomeVisitation>(entity =>
        {
            entity.ToTable("home_visitations");
            entity.HasKey(e => e.VisitationId);
            entity.Property(e => e.VisitationId).HasColumnName("visitation_id").ValueGeneratedOnAdd();
            entity.Property(e => e.ResidentId).HasColumnName("resident_id");
            MapText(entity, e => e.VisitDate, "visit_date");
            MapText(entity, e => e.SocialWorker, "social_worker");
            MapText(entity, e => e.VisitType, "visit_type");
            MapText(entity, e => e.LocationVisited, "location_visited");
            MapText(entity, e => e.FamilyMembersPresent, "family_members_present");
            MapText(entity, e => e.Purpose, "purpose");
            MapText(entity, e => e.Observations, "observations");
            MapText(entity, e => e.FamilyCooperationLevel, "family_cooperation_level");
            MapBool(entity, e => e.SafetyConcernsNoted, "safety_concerns_noted");
            MapBool(entity, e => e.FollowUpNeeded, "follow_up_needed");
            MapText(entity, e => e.FollowUpNotes, "follow_up_notes");
            MapText(entity, e => e.VisitOutcome, "visit_outcome");

            entity.HasOne(e => e.Resident)
                .WithMany(r => r.HomeVisitations)
                .HasForeignKey(e => e.ResidentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<EducationRecord>(entity =>
        {
            entity.ToTable("education_records");
            entity.HasKey(e => e.EducationRecordId);
            entity.Property(e => e.EducationRecordId).HasColumnName("education_record_id").ValueGeneratedOnAdd();
            entity.Property(e => e.ResidentId).HasColumnName("resident_id");
            MapText(entity, e => e.RecordDate, "record_date");
            MapText(entity, e => e.EducationLevel, "education_level");
            MapText(entity, e => e.SchoolName, "school_name");
            MapText(entity, e => e.EnrollmentStatus, "enrollment_status");
            entity.Property(e => e.AttendanceRate).HasColumnName("attendance_rate");
            entity.Property(e => e.ProgressPercent).HasColumnName("progress_percent");
            MapText(entity, e => e.CompletionStatus, "completion_status");
            MapText(entity, e => e.Notes, "notes");

            entity.HasOne(e => e.Resident)
                .WithMany(r => r.EducationRecords)
                .HasForeignKey(e => e.ResidentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<HealthWellbeingRecord>(entity =>
        {
            entity.ToTable("health_wellbeing_records");
            entity.HasKey(e => e.HealthRecordId);
            entity.Property(e => e.HealthRecordId).HasColumnName("health_record_id").ValueGeneratedOnAdd();
            entity.Property(e => e.ResidentId).HasColumnName("resident_id");
            MapText(entity, e => e.RecordDate, "record_date");
            entity.Property(e => e.GeneralHealthScore).HasColumnName("general_health_score");
            entity.Property(e => e.NutritionScore).HasColumnName("nutrition_score");
            entity.Property(e => e.SleepQualityScore).HasColumnName("sleep_quality_score");
            entity.Property(e => e.EnergyLevelScore).HasColumnName("energy_level_score");
            entity.Property(e => e.HeightCm).HasColumnName("height_cm");
            entity.Property(e => e.WeightKg).HasColumnName("weight_kg");
            entity.Property(e => e.Bmi).HasColumnName("bmi");
            MapBool(entity, e => e.MedicalCheckupDone, "medical_checkup_done");
            MapBool(entity, e => e.DentalCheckupDone, "dental_checkup_done");
            MapBool(entity, e => e.PsychologicalCheckupDone, "psychological_checkup_done");
            MapText(entity, e => e.Notes, "notes");

            entity.HasOne(e => e.Resident)
                .WithMany(r => r.HealthWellbeingRecords)
                .HasForeignKey(e => e.ResidentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<InterventionPlan>(entity =>
        {
            entity.ToTable("intervention_plans");
            entity.HasKey(e => e.PlanId);
            entity.Property(e => e.PlanId).HasColumnName("plan_id").ValueGeneratedOnAdd();
            entity.Property(e => e.ResidentId).HasColumnName("resident_id");
            MapText(entity, e => e.PlanCategory, "plan_category");
            MapText(entity, e => e.PlanDescription, "plan_description");
            MapText(entity, e => e.ServicesProvided, "services_provided");
            entity.Property(e => e.TargetValue).HasColumnName("target_value");
            MapText(entity, e => e.TargetDate, "target_date");
            MapText(entity, e => e.Status, "status");
            MapText(entity, e => e.CaseConferenceDate, "case_conference_date");
            MapText(entity, e => e.CreatedAt, "created_at");
            MapText(entity, e => e.UpdatedAt, "updated_at");

            entity.HasOne(e => e.Resident)
                .WithMany(r => r.InterventionPlans)
                .HasForeignKey(e => e.ResidentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<IncidentReport>(entity =>
        {
            entity.ToTable("incident_reports");
            entity.HasKey(e => e.IncidentId);
            entity.Property(e => e.IncidentId).HasColumnName("incident_id").ValueGeneratedOnAdd();
            entity.Property(e => e.ResidentId).HasColumnName("resident_id");
            entity.Property(e => e.SafehouseId).HasColumnName("safehouse_id");
            MapText(entity, e => e.IncidentDate, "incident_date");
            MapText(entity, e => e.IncidentType, "incident_type");
            MapText(entity, e => e.Severity, "severity");
            MapText(entity, e => e.Description, "description");
            MapText(entity, e => e.ResponseTaken, "response_taken");
            MapBool(entity, e => e.Resolved, "resolved");
            MapText(entity, e => e.ResolutionDate, "resolution_date");
            MapText(entity, e => e.ReportedBy, "reported_by");
            MapBool(entity, e => e.FollowUpRequired, "follow_up_required");

            entity.HasOne(e => e.Resident)
                .WithMany(r => r.IncidentReports)
                .HasForeignKey(e => e.ResidentId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Safehouse)
                .WithMany(s => s.IncidentReports)
                .HasForeignKey(e => e.SafehouseId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SafehouseMonthlyMetric>(entity =>
        {
            entity.ToTable("safehouse_monthly_metrics");
            entity.HasKey(e => e.MetricId);
            entity.Property(e => e.MetricId).HasColumnName("metric_id").ValueGeneratedOnAdd();
            entity.Property(e => e.SafehouseId).HasColumnName("safehouse_id");
            MapText(entity, e => e.MonthStart, "month_start");
            MapText(entity, e => e.MonthEnd, "month_end");
            entity.Property(e => e.ActiveResidents).HasColumnName("active_residents");
            entity.Property(e => e.AvgEducationProgress).HasColumnName("avg_education_progress");
            entity.Property(e => e.AvgHealthScore).HasColumnName("avg_health_score");
            entity.Property(e => e.ProcessRecordingCount).HasColumnName("process_recording_count");
            entity.Property(e => e.HomeVisitationCount).HasColumnName("home_visitation_count");
            entity.Property(e => e.IncidentCount).HasColumnName("incident_count");
            MapText(entity, e => e.Notes, "notes");

            entity.HasOne(e => e.Safehouse)
                .WithMany(s => s.SafehouseMonthlyMetrics)
                .HasForeignKey(e => e.SafehouseId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PublicImpactSnapshot>(entity =>
        {
            entity.ToTable("public_impact_snapshots");
            entity.HasKey(e => e.SnapshotId);
            entity.Property(e => e.SnapshotId).HasColumnName("snapshot_id").ValueGeneratedOnAdd();
            MapText(entity, e => e.SnapshotDate, "snapshot_date");
            MapText(entity, e => e.Headline, "headline");
            MapText(entity, e => e.SummaryText, "summary_text");
            MapText(entity, e => e.MetricPayloadJson, "metric_payload_json");
            MapBool(entity, e => e.IsPublished, "is_published");
            MapText(entity, e => e.PublishedAt, "published_at");
        });

        modelBuilder.Entity<OkrTarget>(entity =>
        {
            entity.ToTable("okr_targets");
            entity.HasKey(e => e.TargetId);
            entity.Property(e => e.TargetId).HasColumnName("target_id").ValueGeneratedOnAdd();
            MapText(entity, e => e.MetricKey, "metric_key");
            entity.Property(e => e.Year).HasColumnName("year");
            entity.Property(e => e.Quarter).HasColumnName("quarter");
            entity.Property(e => e.TargetValue).HasColumnName("target_value");
            MapText(entity, e => e.Notes, "notes");
        });

        modelBuilder.Entity<PipelineTrainingRun>(entity =>
        {
            entity.ToTable("pipeline_training_runs");
            entity.HasKey(e => e.RunId);
            entity.Property(e => e.RunId).HasColumnName("run_id").ValueGeneratedOnAdd();
            MapText(entity, e => e.PipelineKey, "pipeline_key");
            MapText(entity, e => e.TriggerType, "trigger_type");
            MapText(entity, e => e.Status, "status");
            MapText(entity, e => e.DetailMessage, "detail_message");
            MapText(entity, e => e.StartedUtc, "started_utc");
            MapText(entity, e => e.FinishedUtc, "finished_utc");
            MapText(entity, e => e.TriggeredByUserName, "triggered_by_user_name");
        });

        modelBuilder.Entity<PipelineScheduleSettings>(entity =>
        {
            entity.ToTable("pipeline_schedule_settings");
            entity.HasKey(e => e.SettingsId);
            entity.Property(e => e.SettingsId).HasColumnName("settings_id").ValueGeneratedNever();
            entity.Property(e => e.Enabled).HasColumnName("enabled");
            entity.Property(e => e.HourUtc).HasColumnName("hour_utc");
            entity.Property(e => e.MinuteUtc).HasColumnName("minute_utc");
            MapText(entity, e => e.LastScheduledRunDate, "last_scheduled_run_date");
        });
    }

    private static void MapText<T>(
        EntityTypeBuilder<T> entity,
        System.Linq.Expressions.Expression<System.Func<T, string?>> prop,
        string column) where T : class =>
        entity.Property(prop).HasColumnName(column);

    private static void MapBool<T>(
        EntityTypeBuilder<T> entity,
        System.Linq.Expressions.Expression<System.Func<T, bool?>> prop,
        string column) where T : class =>
        entity.Property(prop).HasColumnName(column);
}
