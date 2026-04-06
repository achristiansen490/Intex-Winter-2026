using HirayaHaven.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HirayaHaven.Api.Data;

public class HirayaContext(DbContextOptions<HirayaContext> options) : DbContext(options)
{
    public DbSet<Safehouse> Safehouses => Set<Safehouse>();
    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<PartnerAssignment> PartnerAssignments => Set<PartnerAssignment>();
    public DbSet<Supporter> Supporters => Set<Supporter>();
    public DbSet<Donation> Donations => Set<Donation>();
    public DbSet<SocialMediaPost> SocialMediaPosts => Set<SocialMediaPost>();
    public DbSet<Resident> Residents => Set<Resident>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Safehouse>(entity =>
        {
            entity.ToTable("safehouses");
            entity.HasKey(e => e.SafehouseId);
            entity.Property(e => e.SafehouseId).HasColumnName("safehouse_id");
            entity.Property(e => e.SafehouseCode).HasColumnName("safehouse_code");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Region).HasColumnName("region");
            entity.Property(e => e.City).HasColumnName("city");
            entity.Property(e => e.Province).HasColumnName("province");
            entity.Property(e => e.Country).HasColumnName("country");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.CapacityGirls).HasColumnName("capacity_girls");
            entity.Property(e => e.CurrentOccupancy).HasColumnName("current_occupancy");
        });

        modelBuilder.Entity<Partner>(entity =>
        {
            entity.ToTable("partners");
            entity.HasKey(e => e.PartnerId);
            entity.Property(e => e.PartnerId).HasColumnName("partner_id");
            entity.Property(e => e.PartnerName).HasColumnName("partner_name");
            entity.Property(e => e.PartnerType).HasColumnName("partner_type");
            entity.Property(e => e.RoleType).HasColumnName("role_type");
            entity.Property(e => e.ContactName).HasColumnName("contact_name");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.Phone).HasColumnName("phone");
            entity.Property(e => e.Region).HasColumnName("region");
            entity.Property(e => e.Status).HasColumnName("status");
        });

        modelBuilder.Entity<PartnerAssignment>(entity =>
        {
            entity.ToTable("partner_assignments");
            entity.HasKey(e => e.AssignmentId);
            entity.Property(e => e.AssignmentId).HasColumnName("assignment_id");
            entity.Property(e => e.PartnerId).HasColumnName("partner_id");
            entity.Property(e => e.SafehouseId).HasColumnName("safehouse_id");
            entity.Property(e => e.ProgramArea).HasColumnName("program_area");
            entity.Property(e => e.AssignmentStart).HasColumnName("assignment_start");
            entity.Property(e => e.AssignmentEnd).HasColumnName("assignment_end");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.IsPrimary).HasColumnName("is_primary");

            entity.HasOne(e => e.Partner)
                .WithMany(p => p.PartnerAssignments)
                .HasForeignKey(e => e.PartnerId);

            entity.HasOne(e => e.Safehouse)
                .WithMany(s => s.PartnerAssignments)
                .HasForeignKey(e => e.SafehouseId);
        });

        modelBuilder.Entity<Supporter>(entity =>
        {
            entity.ToTable("supporters");
            entity.HasKey(e => e.SupporterId);
            entity.Property(e => e.SupporterId).HasColumnName("supporter_id");
            entity.Property(e => e.SupporterType).HasColumnName("supporter_type");
            entity.Property(e => e.DisplayName).HasColumnName("display_name");
            entity.Property(e => e.Region).HasColumnName("region");
            entity.Property(e => e.Country).HasColumnName("country");
            entity.Property(e => e.Status).HasColumnName("status");
        });

        modelBuilder.Entity<Donation>(entity =>
        {
            entity.ToTable("donations");
            entity.HasKey(e => e.DonationId);
            entity.Property(e => e.DonationId).HasColumnName("donation_id");
            entity.Property(e => e.SupporterId).HasColumnName("supporter_id");
            entity.Property(e => e.DonationType).HasColumnName("donation_type");
            entity.Property(e => e.DonationDate).HasColumnName("donation_date");
            entity.Property(e => e.IsRecurring).HasColumnName("is_recurring");
            entity.Property(e => e.CampaignName).HasColumnName("campaign_name");
            entity.Property(e => e.ChannelSource).HasColumnName("channel_source");
            entity.Property(e => e.CurrencyCode).HasColumnName("currency_code");
            entity.Property(e => e.Amount).HasColumnName("amount");
            entity.Property(e => e.EstimatedValue).HasColumnName("estimated_value");
            entity.Property(e => e.ImpactUnit).HasColumnName("impact_unit");
            entity.Property(e => e.ReferralPostId).HasColumnName("referral_post_id");

            entity.HasOne(e => e.Supporter)
                .WithMany(s => s.Donations)
                .HasForeignKey(e => e.SupporterId);

            entity.HasOne(e => e.ReferralPost)
                .WithMany(p => p.ReferralDonations)
                .HasForeignKey(e => e.ReferralPostId);
        });

        modelBuilder.Entity<SocialMediaPost>(entity =>
        {
            entity.ToTable("social_media_posts");
            entity.HasKey(e => e.PostId);
            entity.Property(e => e.PostId).HasColumnName("post_id");
            entity.Property(e => e.Platform).HasColumnName("platform");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.PostType).HasColumnName("post_type");
            entity.Property(e => e.ContentTopic).HasColumnName("content_topic");
            entity.Property(e => e.CampaignName).HasColumnName("campaign_name");
            entity.Property(e => e.Impressions).HasColumnName("impressions");
            entity.Property(e => e.Reach).HasColumnName("reach");
            entity.Property(e => e.Likes).HasColumnName("likes");
            entity.Property(e => e.Comments).HasColumnName("comments");
            entity.Property(e => e.Shares).HasColumnName("shares");
            entity.Property(e => e.EngagementRate).HasColumnName("engagement_rate");
            entity.Property(e => e.DonationReferrals).HasColumnName("donation_referrals");
            entity.Property(e => e.EstimatedDonationValuePhp).HasColumnName("estimated_donation_value_php");
        });

        modelBuilder.Entity<Resident>(entity =>
        {
            entity.ToTable("residents");
            entity.HasKey(e => e.ResidentId);
            entity.Property(e => e.ResidentId).HasColumnName("resident_id");
            entity.Property(e => e.SafehouseId).HasColumnName("safehouse_id");
            entity.Property(e => e.CaseStatus).HasColumnName("case_status");
        });
    }
}
