namespace HirayaHaven.Api.Services;

public static class PipelineDefinitions
{
    public sealed record Entry(string Id, string Title, string Description, string NotebookFile, string InsightsPath);

    public static IReadOnlyList<Entry> All { get; } =
    [
        new("donations-monthly", "Donations — monthly totals", "Monthly donation value and counts from operational data.", "campaign-effectiveness.ipynb", "api/insights/donations/monthly"),
        new("donations-by-campaign", "Donations — by campaign", "Campaign rollups (labeled campaigns only; uncategorized gifts excluded here but included in monthly totals).", "campaign-effectiveness.ipynb", "api/insights/donations/by-campaign"),
        new("bridge-monthly", "Outreach → money (bridge)", "Monthly bridge metrics between outreach and monetary outcomes.", "outreach-money-outcomes-bridge.ipynb", "api/insights/bridge/monthly"),
        new("donors-upgrade-candidates", "Donor upgrade candidates", "Heuristic ranking of supporters for upgrade outreach.", "donor-upgrade-potential.ipynb", "api/insights/donors/upgrade-candidates"),
        new("posts-donation-linkage", "Post → donation linkage", "Social post groups correlated with donation activity.", "post-to-donation-linkage.ipynb", "api/insights/posts/donation-linkage/by-group"),
        new("social-engagement-vanity", "Engagement vs vanity", "Segment mix of engagement vs donation-referral behavior on posts.", "engagement-vs-vanity.ipynb", "api/insights/social/engagement-vs-vanity"),
        new("social-posting-windows", "Social — when to post", "Hour-of-day and day-of-week rollups: engagement, clicks, referrals, and estimated gift value (associational).", "social-posting-strategy.ipynb", "api/insights/social/posting-windows"),
        new("social-content-drivers", "Social — what to post", "Topic, format, media type, and CTA grouped by donation referrals and estimated value.", "social-content-drivers.ipynb", "api/insights/social/content-drivers"),
        new("outreach-social-referral-okr", "OKR — social posts that drive referrals", "Quarterly share of posts with at least one donation referral (outreach effectiveness).", "social-referral-conversion-okr.ipynb", "api/okrs/outreach/social/referral-conversion/quarterly"),
        new("outreach-social-ctr-okr", "OKR — social click-through rate", "Quarterly aggregate click-through rate (clicks ÷ impressions) across posts.", "social-click-through-okr.ipynb", "api/okrs/outreach/social/click-through/quarterly"),
        new("safehouses-strain", "Safehouse strain snapshot", "Latest-month strain indicators and simple incident heuristic per safehouse.", "safehouse-strain-forecast.ipynb", "api/insights/safehouses/strain/latest"),
        new("interventions-by-category", "Interventions by category", "Counts of intervention plans grouped by category.", "intervention-effectiveness.ipynb", "api/insights/interventions/by-category"),
        new("residents-risk-flags", "Resident risk flags", "Operational risk scoring from incidents, sessions, and visits.", "resident-risk-flag.ipynb", "api/insights/residents/risk-flags"),
        new("residents-reintegration-readiness", "Reintegration readiness", "Readiness heuristic from progress, health, and stability signals.", "reintegration-readiness.ipynb", "api/insights/residents/reintegration-readiness"),
    ];

    public static Entry? Find(string id) =>
        All.FirstOrDefault(e => string.Equals(e.Id, id, StringComparison.OrdinalIgnoreCase));

    public static bool IsValidId(string id) => Find(id) != null;
}
