# Plan: Integrating ML pipelines into the Hiraya Haven site

This document maps each `ml-pipelines/*.ipynb` artifact to concrete surfaces in the **React/Vite frontend** (`Frontend/INTEX II 3-10`) and the **ASP.NET Core API** (`Backend/HirayaHaven.Api`), and proposes a phased rollout so as many insights as possible become **live on the site** without compromising privacy, security, or maintainability.

## Current architecture (baseline)

| Layer | Role today |
| --- | --- |
| **SQLite** `Data/hiraya.db` | Single analytical + app database path used by notebooks and (via EF Core) the API. |
| **Notebooks** | Train/evaluate models offline; produce metrics, plots, and (optionally) exported artifacts. |
| **API** | JWT auth, CRUD controllers, `GET /api/Dashboard/overview` with aggregate counts and a “top post” snapshot. |
| **Frontend** | React/Vite app with React Router routes in `src/App.tsx` and page components under `src/pages/`. Auth is provided by `src/context/AuthContext.tsx` and route protection by `src/components/ProtectedRoute.tsx`. Primary portals are `DonorPortal`, `StaffPortal`, `ResidentPortal`, and `AdminPortal`. |

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
| **campaign-effectiveness** | Fundraising / leadership | **High** — campaign lift & seasonality | Donation/month series + campaign aggregates; optional “above baseline” coefficients from batch runs | **DonorPortal → “Active Campaigns”** (currently shows impact snapshots; extend) + **StaffPortal/AdminPortal → “Reports”** (currently mapped to dashboard placeholder) |
| **donor-upgrade-potential** | Development | **Medium** — donor segments / “next gift” band | `supporter_id`, `score_band`, `next_value_estimate`, `computed_at` (staff/admin only) | **StaffPortal → “Donors”** exists (currently lists supporters via `/api/supporters`), add scoring columns + filters |
| **engagement-vs-vanity** | Comms | **High** — segment mix (engagement vs donation lift) | Aggregate segment counts/trends; optional post scoring for internal review | Best home: **AdminPortal → “Reports”** or a new “Social” section; **no dedicated comms page exists yet** |
| **intervention-effectiveness** | Programs | **Medium** — directional associations only | Aggregate by safehouse/month; internal research flags; avoid causal language | Best home: **StaffPortal/AdminPortal → “Reports”** (needs a real reports view) |
| **outreach-money-outcomes-bridge** | Leadership | **High** — monthly bridge dashboard | Materialized monthly `bridge` rows (outreach ↔ donations ↔ outcomes) | **AdminPortal/StaffPortal → “Reports”** (placeholder today). Donor-safe rollups can also appear in **DonorPortal → “My Impact”** |
| **post-to-donation-linkage** | Comms + fundraising | **High** — which content correlates with referrals | Aggregates by topic/platform + optional internal “top posts by referral propensity” | **AdminPortal** is best for internal post ranking; donor-safe aggregates could go in **DonorPortal → “My Impact”** |
| **reintegration-readiness** | Case management | **Low/Medium (internal)** — sensitive | `resident_id` + probability + `model_version` (strict RBAC) | **StaffPortal → “Caseload/Residents”** exists (currently a residents table via `/api/residents`); integrate as an additional staff-only score column + drill-down |
| **resident-risk-flag** | Clinical / safety | **Medium (internal)** — next-month risk | `resident_id` + month + `risk_score` + top drivers | Same as above: **StaffPortal → “Caseload/Residents”** table + alerts panel (new UI needed) |
| **safehouse-strain-forecast** | Operations | **High** — capacity / strain | `safehouse_id` + month + `forecast_incidents` + `stress_index` | **AdminPortal → “Safehouses”** exists (table view); add an **Operations/Forecast** report view or safehouse drill-down (new UI needed) |

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

1. **Centralize API client**: pages currently call `fetch()` inline; consider `src/api/client.ts` to standardize base URL, auth headers, and error handling.
2. **Reports views**: `StaffPortal` and `AdminPortal` have a “Reports” nav item, but it currently renders the dashboard. Implement an actual reports page/section to host aggregate pipeline outputs.
3. **Caseload enhancements**: `StaffPortal` already renders `Residents` for “Caseload/My Residents/Residents”. Add ML score columns + sorting + drill-down (role-gated).
4. **Donor enhancements**: `DonorPortal` already has “My Impact / Donation History / Active Campaigns”. Extend “Active Campaigns” with campaign effectiveness aggregates and “My Impact” with donor-safe bridge metrics.
5. **Auth/RBAC**: already present via `AuthContext` + `ProtectedRoute`; ensure ML score endpoints are staff/admin-only.

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

---

## What “pages” exist today vs what’s missing (for pipelines)

### Existing frontend routes/pages (in `src/App.tsx` and `src/pages/`)

- **Public**:
  - `/` → `src/pages/LandingPage.tsx`
  - `/privacy` → `src/pages/PrivacyPolicyPage.tsx`
  - `/login` → `src/pages/LoginPage.tsx`
  - `/register` → `src/pages/RegisterPage.tsx`
  - `/pending-approval` → `src/pages/PendingApprovalPage.tsx`
  - `/forbidden` → `src/pages/ForbiddenPage.tsx`
  - `*` → `src/pages/NotFoundPage.tsx`
- **Protected portals**:
  - `/donor` → `src/pages/DonorPortal.tsx`
  - `/staff` → `src/pages/StaffPortal.tsx`
  - `/resident` → `src/pages/ResidentPortal.tsx`
  - `/admin` → `src/pages/AdminPortal.tsx`

### Missing pages / sections implied by the pipelines

You now have portal pages and a sidebar nav, but these **pipeline-specific sections are still missing or placeholders**:

- **Reports content**: `StaffPortal` and `AdminPortal` both have “Reports”, but it currently renders the dashboard rather than pipeline reports/analytics.
- **Comms/Social analytics view**: no dedicated staff/admin section for `engagement-vs-vanity` + `post-to-donation-linkage` ranking/segmentation (you do have the underlying posts endpoints via `/api/socialmediaposts`).
- **Operations forecast drill-down**: safehouses table exists (`AdminPortal → Safehouses`), but there is no safehouse forecast/strain visualization yet.
- **Caseload ML overlays**: residents tables exist, but risk/readiness scores, explanations, and alerting UI do not.

On the backend, there is currently **no** `InsightsController` (and no `/api/insights/*` route); only `DashboardController` and CRUD controllers exist, so any pipeline-specific aggregate endpoints still need to be added.
