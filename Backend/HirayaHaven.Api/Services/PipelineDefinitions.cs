namespace HirayaHaven.Api.Services;

public static class PipelineDefinitions
{
    public sealed record Entry(string Id, string Title, string Description, string NotebookFile, string InsightsPath);

    public static IReadOnlyList<Entry> All { get; } =
    [
        new("donations-monthly", "Donations — monthly totals", "Monthly donation value and counts from operational data.", "campaign-effectiveness.ipynb", "api/insights/donations/monthly"),
        new("donations-by-campaign", "Donations — by campaign", "Campaign rollups for bar charts and effectiveness views.", "campaign-effectiveness.ipynb", "api/insights/donations/by-campaign"),
        new("bridge-monthly", "Outreach → money (bridge)", "Monthly bridge metrics between outreach and monetary outcomes.", "outreach-money-outcomes-bridge.ipynb", "api/insights/bridge/monthly"),
        new("donors-upgrade-candidates", "Donor upgrade candidates", "Heuristic ranking of supporters for upgrade outreach.", "donor-upgrade-potential.ipynb", "api/insights/donors/upgrade-candidates"),
        new("posts-donation-linkage", "Post → donation linkage", "Social post groups correlated with donation activity.", "post-to-donation-linkage.ipynb", "api/insights/posts/donation-linkage/by-group"),
        new("social-engagement-vanity", "Engagement vs vanity", "Segment mix of engagement vs donation-referral behavior on posts.", "engagement-vs-vanity.ipynb", "api/insights/social/engagement-vs-vanity"),
        new("safehouses-strain", "Safehouse strain snapshot", "Latest-month strain indicators and simple incident heuristic per safehouse.", "safehouse-strain-forecast.ipynb", "api/insights/safehouses/strain/latest"),
        new("interventions-by-category", "Interventions by category", "Counts of intervention plans grouped by category.", "intervention-effectiveness.ipynb", "api/insights/interventions/by-category"),
        new("residents-risk-flags", "Resident risk flags", "Operational risk scoring from incidents, sessions, and visits.", "resident-risk-flag.ipynb", "api/insights/residents/risk-flags"),
        new("residents-reintegration-readiness", "Reintegration readiness", "Readiness heuristic from progress, health, and stability signals.", "reintegration-readiness.ipynb", "api/insights/residents/reintegration-readiness"),
    ];

    public static Entry? Find(string id) =>
        All.FirstOrDefault(e => string.Equals(e.Id, id, StringComparison.OrdinalIgnoreCase));

    public static bool IsValidId(string id) => Find(id) != null;
}
