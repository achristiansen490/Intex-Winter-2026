"""
One-off helper: prepend explanatory comment blocks to ml-pipelines/*.ipynb code cells.
Run from repo root:  python ml-pipelines/tools/annotate_notebooks.py
Idempotent: skips cells that already start with the NOTEBOOK_COMMENT_MARKER.
"""

from __future__ import annotations

import json
from pathlib import Path

NOTEBOOK_COMMENT_MARKER = "# Notebook code cell overview — see inline comments below.\n"

ROOT = Path(__file__).resolve().parents[2]
ML = ROOT / "ml-pipelines"


def hdr(title: str, *bullets: str) -> str:
    lines = [
        "# " + "=" * 76,
        f"# {title}",
        "# " + "=" * 76,
        NOTEBOOK_COMMENT_MARKER.rstrip("\n"),
        "#",
    ]
    for b in bullets:
        for part in b.split("\n"):
            lines.append("# " + part)
    lines.append("#")
    return "\n".join(lines) + "\n"


def cell_source_to_str(source) -> str:
    if isinstance(source, str):
        return source
    return "".join(source)


def str_to_cell_source(s: str):
    # Keep valid ipynb list-of-strings format (one string per line is common)
    if "\n" not in s and not s.endswith("\n"):
        return s
    lines = s.splitlines(keepends=True)
    return lines if lines else [s]


def prepend_to_notebook(rel_path: str, mapping: dict[int, str]) -> None:
    path = ML / rel_path
    nb = json.loads(path.read_text(encoding="utf-8"))
    changed = False
    for idx, prefix in mapping.items():
        cell = nb["cells"][idx]
        if cell["cell_type"] != "code":
            raise ValueError(f"{rel_path} cell {idx} is not code")
        cur = cell_source_to_str(cell["source"])
        if NOTEBOOK_COMMENT_MARKER.strip() in cur[:500]:
            continue
        cell["source"] = str_to_cell_source(prefix + cur)
        changed = True
    if changed:
        path.write_text(json.dumps(nb, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        print("updated:", rel_path)
    else:
        print("skip (already annotated):", rel_path)


def main() -> None:
    # --- campaign-effectiveness.ipynb ---
    prepend_to_notebook(
        "campaign-effectiveness.ipynb",
        {
            2: hdr(
                "Campaign effectiveness — Part 1: Load donations and plot monthly totals",
                "Connects to SQLite (hiraya.db) and reads the donations fact table.",
                "Parses donation_date, builds value_php from amount with fallback to estimated_value.",
                "Aggregates to calendar month: total PHP raised and count of donations.",
                "The line chart is exploratory (EDA): shows seasonality and campaign mix over time.",
                "Downstream cells reuse `donations` and `monthly`; run this cell before modeling.",
            ),
            3: hdr(
                "Campaign effectiveness — Part 2: Explanatory regression (donation size)",
                "Goal: describe association between campaign/channel/month and gift size — not causal inference.",
                "Ridge regression on one-hot encoded categories + scaled is_recurring reduces overfitting vs OLS.",
                "Out-of-time split: train on earlier months, test on later months — reduces optimistic leakage",
                "  that random train_test_split would cause when the same donors repeat across months.",
                "Coefficients on campaign_name_* are directional; interpretation depends on encoding baseline.",
            ),
            4: hdr(
                "Campaign effectiveness — Part 3: Predictive forecast for next month's total giving",
                "Uses only past monthly totals (lag1, lag2) to predict next month — a simple autoregressive baseline.",
                "Chronological split inside `train` (first 75% rows) keeps past-to-future ordering.",
                "Compare MAE here to business needs; this can feed a leadership dashboard (Phase 1 integration).",
            ),
        },
    )

    # --- caseyEDA.ipynb ---
    prepend_to_notebook(
        "caseyEDA.ipynb",
        {
            2: hdr(
                "EDA — Load hiraya.db and build enriched DataFrames for exploration",
                "Opens SQLite and reads core dimension/fact tables used across ML pipelines.",
                "Joins donations to supporters and optional referral posts for channel analysis.",
                "Joins resident events (visits, education, health, incidents) to geography/case context.",
                "The `dfs` dict is the main entry point for univariate profiling in later cells.",
            ),
            4: hdr(
                "EDA helper — univariate() profiles one or all columns",
                "Computes type-specific summary stats (numeric vs categorical) and missingness.",
                "Queues matplotlib/seaborn plots: histogram+KDE for numeric, bar charts for categories.",
                "Returns a summary DataFrame you can filter or export; designed for interactive notebook use.",
            ),
            7: hdr(
                "EDA — Run univariate summaries across all enriched tables",
                "Loops every DataFrame in `dfs` and calls univariate() to scan distributions.",
                "Expect this to be slow on large CSV-backed DBs; tighten the loop if needed.",
            ),
            9: hdr(
                "Placeholder cell — replace with your own EDA snippets",
                "Kept minimal; safe to delete or overwrite when exploring specific hypotheses.",
            ),
        },
    )

    # --- donor-upgrade-potential.ipynb ---
    prepend_to_notebook(
        "donor-upgrade-potential.ipynb",
        {
            2: hdr(
                "Donor upgrade — Predict next gift size from current gift history",
                "Rows are donations in time order; target `next_value_php` is the following gift for that supporter.",
                "Features include current value, donation index (sequence), days since previous gift, recurring flag.",
                "Categoricals (donation_type, channel) are dummy-encoded; drop_first avoids full rank collinearity.",
                "GroupShuffleSplit by supporter_id ensures the same donor is not in train AND test — critical",
                "  because otherwise the model memorizes donor-specific patterns and metrics look too good.",
                "RandomForest gives nonlinear effects + default feature importance for ranking drivers.",
            ),
        },
    )

    # --- engagement-vs-vanity.ipynb ---
    prepend_to_notebook(
        "engagement-vs-vanity.ipynb",
        {
            2: hdr(
                "Engagement vs vanity — Define engagement and donation outcomes per post",
                "Builds engagement_score from likes+comments+shares; donation_referrals from platform fields.",
                "High/high thresholds use 75th percentile — a simple way to define 'top quartile' segments.",
                "np.select labels posts as both_high, engagement_only, donation_only, or neither for EDA.",
            ),
            3: hdr(
                "Segment summary tables and bar chart",
                "Counts posts by segment × platform × post_type to see where 'vanity' vs 'impact' posts cluster.",
            ),
            4: hdr(
                "Predictive model — high_donation from post attributes (in-sample split)",
                "Logistic regression with one-hot + scaling; stratified split keeps class balance.",
                "ROC-AUC / average precision summarize ranking quality for referral probability.",
                "Later cell repeats evaluation with out-of-time split — prefer that for deployment thinking.",
            ),
            7: hdr(
                "Out-of-time evaluation — train on older posts, test on newer",
                "Mimics real deployment: future posts are not available when training past models.",
                "Compare metrics to cell 4; large gaps suggest temporal drift or leakage in random split.",
            ),
        },
    )

    # --- intervention-effectiveness.ipynb ---
    prepend_to_notebook(
        "intervention-effectiveness.ipynb",
        {
            2: hdr(
                "Intervention effectiveness — Baseline: education progress vs plan categories",
                "Merges education + health resident-month panels with STATIC plan counts per resident.",
                "  (Counts all plans ever — can leak future information into early months; add-on cell fixes this.)",
                "Target progress_next is next month's mean education progress_percent within resident.",
                "RandomForest + time-based train/test split (by calendar month) evaluates forecasting sanity.",
                "Feature importances are associative; plans are not randomly assigned — causal claims need design.",
            ),
            5: hdr(
                "Add-on — Cumulative plan counts by month (leakage-reduced plan features)",
                "Uses plan created_at (or case_conference_date) to place plans in the month they started.",
                "Builds resident×month counts, then cumsum within resident so features only use past/current plans.",
                "Drops static plans_cat_* from `model` before join — same column names would collide in pandas.merge.",
                "Re-fit RF; compare MAE to baseline to see how much 'when' the plan appeared matters.",
            ),
        },
    )

    # --- outreach-money-outcomes-bridge.ipynb ---
    prepend_to_notebook(
        "outreach-money-outcomes-bridge.ipynb",
        {
            2: hdr(
                "Outreach–money–outcomes bridge — Monthly aggregates across three domains",
                "Social posts → outreach metrics (volume, impressions, referrals).",
                "Donations → PHP totals per month.",
                "Safehouse monthly metrics + public impact snapshots → operational and outcome proxies.",
                "Outer merges build a wide monthly table for correlation / regression (next cells).",
            ),
            3: hdr(
                "Correlation heatmap across monthly metrics",
                "Visualizes linear association — not causation. Good for hypothesis generation for leadership.",
            ),
            4: hdr(
                "Predict next month's donation total from lags (outreach + past giving)",
                "Ridge on scaled features; chronological 75/25 split within the modeling frame.",
                "This pattern maps directly to a live 'bridge' API endpoint (see SITE_INTEGRATION_PLAN.md).",
            ),
        },
    )

    # --- post-to-donation-linkage.ipynb ---
    prepend_to_notebook(
        "post-to-donation-linkage.ipynb",
        {
            3: hdr(
                "Post → donation linkage — Load posts and define referral outcomes",
                "Binary target will_refer_donation from donation_referrals > 0.",
                "estimated_donation_value_php supports a secondary regression target (rough business value).",
            ),
            4: hdr(
                "EDA — Platform distribution and referral count histogram",
                "Sanity-check class imbalance and which platforms drive volume.",
            ),
            6: hdr(
                "Classification — Predict referral from content + performance features",
                "Includes engagement variables (likes, reach, …); strong performance may reflect leakage if",
                "  measured after posting — compare to content-only out-of-time eval in cell 11.",
                "Stratified split keeps positive rate stable in train/test for ROC/AP.",
            ),
            7: hdr(
                "Regression — Estimated PHP from features",
                "Treat estimated_donation_value_php as a noisy label; MAE is for relative model comparison only.",
            ),
            11: hdr(
                "Out-of-time + content-only vs full performance features",
                "Trains on older posts; tests on newer — better mimic of deployment.",
                "Two feature sets isolate whether captions/topics alone explain referrals vs needing reach/engagement.",
            ),
        },
    )

    # --- reintegration-readiness.ipynb ---
    prepend_to_notebook(
        "reintegration-readiness.ipynb",
        {
            3: hdr(
                "Reintegration readiness — Load tables and define completion target",
                "Binary target_completed when reintegration_status == 'Completed' (adjust if business rules change).",
                "Sensitive: resident-level outcomes; keep scores staff-only in production.",
            ),
            4: hdr(
                "Feature engineering — Resident-level aggregates from visits, plans, edu, health, incidents",
                "Sums and means summarize trajectory; last_* proxies 'most recent' progress/health when available.",
                "Missing numeric aggregates are median-filled to keep a simple modeling matrix.",
            ),
            5: hdr(
                "Model — Logistic regression with grouped categorical + scaled numeric features",
                "Random stratified split is convenient but can leak across time; see leakage-reduced cell 8.",
                "ROC-AUC / AP summarize discrimination; class_weight='balanced' helps rare positive class.",
            ),
            8: hdr(
                "Leakage-reduced evaluation — Snapshot date and out-of-time split",
                "Uses date_closed or last activity to define what data could have been known at prediction time.",
                "Filters visits/edu/health/incidents to on-or-before snapshot for each resident.",
                "Retrains the same pipeline on train mask only; tests on later snapshot_dates.",
            ),
        },
    )

    # --- resident-risk-flag.ipynb ---
    prepend_to_notebook(
        "resident-risk-flag.ipynb",
        {
            3: hdr(
                "Resident risk flag — Build resident×month spine from multiple event sources",
                "Every table contributes resident_id + month keys; union+dedupe defines panel rows.",
                "Merges static resident attributes (case status, risk levels) for later modeling.",
            ),
            4: hdr(
                "Aggregate incidents, sessions, visits, education, health to resident-month features",
                "Counts fill to zero where no events; continuous scores stay NaN until filled in modeling step.",
                "Lags same-month signals within resident; target is next month's incident presence.",
            ),
            5: hdr(
                "EDA — Positive rate for 'incident next month' over time",
                "Checks label drift and whether risk is stable across months before trusting metrics.",
            ),
            7: hdr(
                "Model — Logistic regression with chronological holdout by month index",
                "Rows sorted by time; last 25% of months held out. Safer than mixing future months into train.",
                "Outputs ROC-AP-F1 at 0.5 threshold; threshold can be tuned for recall vs precision.",
            ),
            8: hdr(
                "Explanatory coefficients — standardized log-odds",
                "Bar plot highlights direction of association with next-month incidents; still not causal.",
            ),
        },
    )

    # --- safehouse-strain-forecast.ipynb ---
    prepend_to_notebook(
        "safehouse-strain-forecast.ipynb",
        {
            3: hdr(
                "Safehouse strain — Load monthly metrics, incidents, residents, safehouses",
                "Validates DB paths; suppresses noisy sklearn warnings for cleaner notebook output.",
            ),
            4: hdr(
                "Data quality — Compare incident_counts in monthly metrics vs raw incident_reports",
                "Plots sample safehouses for visual sanity; merges resident counts per safehouse.",
            ),
            6: hdr(
                "Feature engineering — Lags, deltas, within-month z-scores, stress_index",
                "Per-safehouse time series: shift(1)/shift(2) inject past strain; shift(-1) defines next-month target.",
                "stress_index_z combines standardized incident pressure minus education/health z-scores (exploratory).",
                "model_df drops rows without lag1 or undefined next month — aligns supervised rows.",
            ),
            8: hdr(
                "Predictive models — Ridge vs RandomForest for next-month incident count",
                "Train on earlier months, test on later — operational forecasting use case for staffing.",
                "RF feature importances show which operational signals dominate (interpret cautiously).",
            ),
            9: hdr(
                "Explanatory logistic — high_incident from wellness + workload proxies",
                "Separate from forecasting: classifies whether incidents cross a threshold this month.",
                "Coefficients on standardized features are directional associations.",
            ),
            11: hdr(
                "Report metrics — Regression errors and classification accuracy/AUC",
                "Consolidated printout for notebooks; same functions could log to MLflow in larger projects.",
            ),
        },
    )

    print("Done. Re-run notebooks top-to-bottom to refresh outputs.")


if __name__ == "__main__":
    main()
