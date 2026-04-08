# Plan: Integrating ML pipelines into the Hiraya Haven site

This document maps each `ml-pipelines/*.ipynb` artifact to concrete surfaces in the **React/Vite frontend** (`Frontend/INTEX II 3-10`) and the **ASP.NET Core API** (`Backend/HirayaHaven.Api`), and proposes a phased rollout so as many insights as possible become **live on the site** without compromising privacy, security, or maintainability.

## Current architecture (baseline)

| Layer | Role today |
| --- | --- |
| **SQLite** `Data/hiraya.db` | Single analytical + app database path used by notebooks and (via EF Core) the API. |
| **Notebooks** | Train/evaluate models offline; produce metrics, plots, and (optionally) exported artifacts. |
| **API** | JWT auth, CRUD controllers, `GET /api/Dashboard/overview` with aggregate counts and a “top post” snapshot. |
| **Frontend** | Single-file `App.tsx`: **landing**, **donor** dashboard (static demo metrics/charts), **staff** dashboard (static activity/metrics). No ML calls yet. |

## Guiding principles

1. **Serve decisions, not raw models** — The site should show **scores, bands, trends, and explanations** appropriate to the audience (donor vs staff), not notebook code or PHI.
2. **Batch first, real-time later** — Most classroom-scale models are easiest to run as **scheduled jobs** that write **precomputed** rows (scores, forecasts, feature attributions) into SQL tables the API already reads.
3. **One schema for “ML outputs”** — Add small tables (or JSON columns) keyed by `resident_id`, `safehouse_id`, `supporter_id`, `month`, `post_id`, etc., with `computed_at`, `model_version`, and `notes` for auditability.
4. **Respect leakage lessons from notebooks** — Anything shown as “prediction” on staff views should use **time-safe** features (as in out-of-time / group splits); document that in API responses for internal consumers.
5. **Donor-safe aggregation** — Donor pages get **organization-level or campaign-level** rollups only; no resident identifiers.

---

## Pipeline → site mapping (what to surface where)

| Notebook | Primary audience | Best “active” integration | Suggested API / data shape | UI placement |
| --- | --- | --- | --- | --- |
| **campaign-effectiveness** | Fundraising / leadership | **High** — campaign lift & seasonality | Monthly series + optional coefficient summary per campaign (from batch job) | Donor: “Active Campaigns” / impact strip; Staff: “Reports” or donor module |
| **donor-upgrade-potential** | Development | **Medium** — donor segments / “next gift” band | `supporter_id`, `score_band`, `next_value_estimate`, `computed_at` (staff-only or anonymized aggregates for donors) | Staff: “Donors” tab with sortable score; Donor: optional “your giving journey” if non-PHI |
| **engagement-vs-vanity** | Comms | **High** — segment mix (engagement vs donation lift) | Aggregate segment counts + trend; optional post-level score for internal review | Staff: social/comms view; Landing: anonymized “impact of authentic engagement” callout |
| **intervention-effectiveness** | Programs | **Medium** — directional associations only | **No per-resident causal claims** in UI; safehouse/month aggregates or internal research flags | Staff: research / quality section, not resident-facing claims |
| **outreach-money-outcomes-bridge** | Leadership | **High** — monthly bridge dashboard | Materialized monthly `bridge` row: outreach ↔ donations ↔ outcomes | Staff “Reports”; Donor: high-level “collective outcomes” chart fed by API instead of hardcoded `barData` |
| **post-to-donation-linkage** | Comms + fundraising | **High** — which content types correlate with referrals | `post_id` + `referral_propensity` (internal) or aggregates by `content_topic` / platform | Replace static donor chart with API-driven aggregates |
| **reintegration-readiness** | Case management | **Low/Medium (internal)** — sensitive | Only with strict RBAC: `resident_id` + probability + `model_version`; never on public pages | Staff “Caseload” only; audit log on access |
| **resident-risk-flag** | Clinical / safety | **Medium (internal)** — next-month risk | `resident_id` + month + `risk_score` + top drivers (categorical) | Staff “Caseload” alert column; not donor-facing |
| **safehouse-strain-forecast** | Operations | **High** — capacity / strain | `safehouse_id` + month + `forecast_incidents` + `stress_index` | Staff “Dashboard” and per–safe-house drill-down |

**Non-pipeline notebooks:** `caseyEDA.ipynb` supports internal analysis only; `planning.ipynb` stays documentation unless you add a “Methodology” public page.

---

## Phased integration roadmap

### Phase 0 — Foundation (1–2 days)

- Add **ML output tables** to EF Core (e.g. `MlModelRun`, `MlResidentMonthScore`, `MlMonthlyBridge`, `MlSupporterScore`) or extend existing entities with nullable score fields + `LastScoredAt`.
- Add **`POST /api/ml/batch-result`** (admin/service auth) or a **console worker** in `Backend` that runs on a schedule and writes scores — avoid exposing raw training endpoints publicly.
- Frontend: introduce **`fetch` helpers** + **`VITE_API_BASE`** env; replace one static widget (e.g. donor “Collective outcomes” bars) with **`GET /api/Dashboard/...`** extended to return real series.

### Phase 1 — “Read-only insights” (high value, low risk)

- **Outreach / money / outcomes bridge** — Nightly job runs the notebook logic (or a `.py` extract) → populate `MlMonthlyBridge` → Staff + Donor charts read the same aggregates.
- **Campaign effectiveness** — Store monthly donation totals and top campaign names from DB; show MAE/insights as **static methodology text** + live numbers.
- **Engagement vs vanity** — API returns segment distribution for the last 90 days for staff; landing page gets a **single** aggregate sentence or chart.

### Phase 2 — Staff operational scores

- **Safehouse strain forecast** — Per safehouse next-month incident forecast + stress index on Staff Dashboard (with “as of” date).
- **Resident risk flag** — Caseload table column + color band; log access.
- **Post → donation linkage** — Internal post list sorted by model score; donor-facing only **topic/platform** aggregates.

### Phase 3 — Optional real-time scoring

- Only if needed: load **ONNX** or **pickled** sklearn pipelines in a small **Python sidecar** or **ML.NET** port — higher cost; defer until Phase 1–2 prove value.

---

## Technical options for running notebook logic in production

| Option | Pros | Cons |
| --- | --- | --- |
| **A. Scheduled `python` job** (recommended for class projects) | Keeps parity with notebooks; easy to export `train.py` from notebooks | Separate process, deploy story |
| **B. Reimplement metrics in C#** | Single runtime | Error-prone for sklearn pipelines |
| **C. Export ONNX + ML.NET / Python microservice** | Online scoring | Overkill for static dashboards |

**Recommendation:** **A** for batch scores + **EF Core** for storage; keep notebooks as **source of truth** for methodology.

---

## Frontend work breakdown

1. **Split `App.tsx`** into `pages/`, `components/`, and `api/client.ts` as the app grows.
2. **Donor dashboard** — Replace `barData` / `quarters` constants with props from `useEffect` + API; add loading/error states.
3. **Staff dashboard** — Add sub-routes or sidebar sections: “Operations (strain)”, “Caseload (risk)”, “Social (engagement)”.
4. **Auth** — Wire JWT login for staff routes before showing resident-level scores (already scaffolded in API).

---

## Security & compliance checklist

- [ ] No resident PII on donor or landing routes.
- [ ] Staff-only endpoints require `[Authorize(Roles = "Staff")]` (or equivalent).
- [ ] Log model version and computation time next to any score shown to staff.
- [ ] Disclaimers: “Statistical association, not clinical diagnosis” where relevant.

---

## Suggested next concrete steps (ordered)

1. Extend **`DashboardController`** (or add `InsightsController`) with `GET /api/insights/monthly-bridge` returning the merged monthly frame your `outreach-money-outcomes-bridge` notebook builds.
2. Point **donor “Collective outcomes”** at that endpoint.
3. Add a **`scripts/run_ml_batch.py`** that loads `hiraya.db`, runs the safe aggregate pipelines, and INSERTs into ML tables.
4. Iterate on **staff** widgets using the mapping table above.

This plan maximizes **visible value on the site** early (aggregates, charts, campaign story) while keeping **sensitive per-resident models** behind staff auth and batch jobs.
