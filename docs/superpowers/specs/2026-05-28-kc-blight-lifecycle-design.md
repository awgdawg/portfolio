# KC Blight Lifecycle — Design Spec

**Author:** August Turner
**Date:** 2026-05-28
**Status:** Approved, ready for implementation planning
**Project repo (to be created):** `awgdawg/kc-blight-analytics` at `E:\PyProj\kc-blight-analytics`
**GCP project:** reuse `cms-medicare-analytics` (project number `454482340363`) — new datasets prefixed `kc_blight_*`, same `dbt-runner` service account

## 1. Goal

Build a public BigQuery analytics project that traces the **lifecycle of property blight in Kansas City** over ~15 years — from a property's first code violation, through repeat violations, to a "dangerous building" designation and demolition candidacy — and surfaces *where* blight concentrates (by city council district) and *how fast* the city responds. Modeled and dashboarded for portfolio use. Audience: hiring managers and recruiters evaluating August for Analytics Engineer / BI roles.

**Story it tells:** "From broken window to wrecking ball." A property's decline is a *pipeline*, and this project models that pipeline explicitly (accumulating-snapshot fact) on top of a real, messy, multi-source civic dataset. It demonstrates (a) building an ingestion/EL layer, not just transforming data that's already in the warehouse; (b) reconciling two violation datasets with different schemas into one clean history; and (c) an advanced Kimball pattern (accumulating snapshot) alongside a classic transaction-grain fact.

**Why this differs from the CMS project (deliberately):**
- The data is **not** already in BigQuery — it lives in the KCMO Socrata open-data portal, so this project adds a **Python extract-load layer** (the "EL" in ELT).
- A **scheduled refresh** (cron'd GitHub Action) keeps the two live datasets current.
- It introduces the **accumulating-snapshot** fact pattern, new to the portfolio.
- Local-Kansas-City subject matter — a deliberate "I care about my city" signal for KC-area employers.

**Success looks like:**
- A dbt project published on GitHub with green CI, viewable lineage docs, and tests passing
- A working scheduled GitHub Action that refreshes the live source tables in BigQuery
- A public Looker Studio dashboard embedded into the portfolio's homepage "Live BigQuery board" section (second live board, alongside CMS)
- A new `projects/kc-blight.html` case study with measured numbers from the analysis

## 2. Architecture

```
Socrata API ──[Python EL script]──► BigQuery raw tables ──[dbt]──► dims + facts + marts ──► Looker Studio ──► portfolio
   (3 datasets)   ingest/extract_load.py   kc_blight_raw.*        staging→intermediate→marts    dashboard      case study
```

**Stack:**
- **Python 3.10** EL script (`sodapy` + `google-cloud-bigquery`) in a venv at `E:\PyProj\kc-blight-analytics\.venv\`
- **dbt-core + dbt-bigquery** (same pins as CMS) for transformation
- **BigQuery** in GCP project `cms-medicare-analytics` for storage + compute
- **Looker Studio** (free) for the dashboard
- **GitHub Actions** for (a) `dbt build` validation on push, and (b) a **scheduled** source-refresh job

**Authentication:**
- dbt + EL both use the existing `dbt-runner` service account JSON key at `~/.dbt/cms-analytics-sa.json` (git-ignored), referenced by `~/.dbt/profiles.yml`.
- GitHub Actions uses the same key as repo secret `GCP_SA_KEY`.
- Socrata app token (free, raises rate limits) in env var `SOCRATA_APP_TOKEN` locally (git-ignored) and as repo secret for the scheduled job. The API works without a token but with stricter throttling.

**Materialization strategy:**
- `staging`, `intermediate` → **views** (always fresh, no storage cost)
- `marts/dimensions`, `marts/facts`, `marts/analytics` → **tables** (faster dashboard reads; BQ storage negligible — low-millions of rows)

**BigQuery datasets** (dbt `dataset` per target + `+schema` per layer, mirroring CMS):
- `kc_blight_raw` — **fixed**, written by the Python EL script; read by dbt as sources (shared across all targets)
- **dev** target → `kc_blight_dev_staging`, `_intermediate`, `_dims`, `_facts`, `_marts` — local experimentation
- **ci** target → `kc_blight_ci_*` — PR/push validation builds
- **prod** target → `kc_blight_prod_*` — **what the Looker dashboard reads**; built by the scheduled refresh job (and reproducible locally with `--target prod`)

This three-target setup (dev / ci / prod) is a small step up from CMS's two and a deliberate teaching point: the dashboard reads a stable `prod` namespace that the scheduled job keeps fresh, while local edits and CI never disturb it.

**Repo layout:**

```
kc-blight-analytics/
├── README.md                          # overview + lineage screenshot + refresh instructions
├── dbt_project.yml
├── profiles.yml.example
├── packages.yml                       # dbt_utils
├── requirements.txt                   # dbt-core, dbt-bigquery, sodapy, google-cloud-bigquery, pandas
├── .gitignore                         # .venv, target/, dbt_packages/, *.json keys, .env
├── .pre-commit-config.yaml            # gitleaks (from commit #1)
├── ingest/
│   ├── extract_load.py                # Socrata → kc_blight_raw loader (paginated, idempotent)
│   ├── datasets.yml                   # config: socrata id, target table, mode (full/frozen) per source
│   └── README.md                      # how to run a manual refresh
├── .github/workflows/
│   ├── dbt-build.yml                  # CI: dbt deps + build + test on push
│   └── refresh-sources.yml            # scheduled (cron) EL refresh of live datasets + dbt build
├── models/
│   ├── staging/
│   │   ├── _sources.yml               # kc_blight_raw.{npd_violations, historical_violations, dangerous_buildings}
│   │   ├── _stg_models.yml
│   │   ├── stg_violations__current.sql
│   │   ├── stg_violations__historical.sql
│   │   └── stg_dangerous_buildings.sql
│   ├── intermediate/
│   │   ├── _int_models.yml
│   │   ├── int_violations_unioned.sql
│   │   ├── int_property_rollup.sql
│   │   └── int_dangerous_building_by_pin.sql
│   └── marts/
│       ├── _marts.yml
│       ├── dimensions/                # dim_property, dim_council_district, dim_violation_type, dim_date
│       ├── facts/                     # fact_violation, fact_property_lifecycle
│       └── analytics/                 # 6 marts that drive the dashboard
├── macros/
│   ├── days_between.sql               # SAFE date-diff helper (NULL-safe)
│   └── extract_lat_lng.sql            # pull lat/lng out of Socrata point/location columns
├── tests/
│   ├── assert_resolved_after_found.sql
│   ├── assert_no_negative_days_open.sql
│   └── assert_dangerous_after_first_violation.sql
├── analyses/
│   └── adhoc_repeat_offenders.sql
└── docs/
    └── lineage.png
```

## 3. Ingestion (EL) Layer

### 3.1 Sources (KCMO Socrata)

| Socrata ID | Dataset | Rows | Coverage | Refresh mode |
|------------|---------|------|----------|--------------|
| `vq3e-m9ge` | EG NPD Violations (current, EnerGov) | ~175K | ~mid-2021 → present | **full** (re-pulled on schedule) |
| `nhtf-e75a` | Property Violations [Historical] | ~800K | Dec 2009 → Dec 2021 | **frozen** (load once; never changes) |
| `ax3m-jhxx` | Dangerous Buildings List | few thousand | updated daily | **full** (re-pulled on schedule) |

### 3.2 `extract_load.py`

- Reads `ingest/datasets.yml` (socrata id, destination table, refresh mode).
- For each dataset: pages through the Socrata API (`$limit`/`$offset`, page size 50,000) using `sodapy`, accumulates rows, loads to `kc_blight_raw.<table>` via `google-cloud-bigquery` with `WRITE_TRUNCATE` (idempotent full replace) and `autodetect=True` (raw layer keeps everything as strings/native types; dbt staging does the typing).
- Frozen datasets are skipped on scheduled runs (a `--include-frozen` flag forces the one-time historical load).
- Logs row counts per table; exits non-zero on a count of 0 (guards against silent API failures).

### 3.3 Scheduling (`refresh-sources.yml`)

- Trigger: `schedule: cron` weekly (Mondays 09:00 UTC) + `workflow_dispatch` (manual button).
- Steps: checkout → setup Python 3.11 → `pip install -r requirements.txt` → run `extract_load.py` (live datasets only, refreshing `kc_blight_raw`) → `dbt build --target prod` (rebuilds `kc_blight_prod_*`, which the dashboard reads).
- Secrets: `GCP_SA_KEY`, `SOCRATA_APP_TOKEN`.
- Rationale for weekly: NPD violations + dangerous buildings move slowly; weekly is plenty and stays well within free Action minutes.

## 4. Data Model

### 4.1 Staging models (views) — schema reconciliation happens here

| Model | Source | Output grain | Key reconciliation work |
|-------|--------|--------------|--------------------------|
| `stg_violations__current` | `kc_blight_raw.npd_violations` | one row per violation | `pin`→STRING(trim); `date_found`, `date_to_comply`, `date_resolved` as DATE; `source_system='energov'`; extract lat/lng from `incident_location` point |
| `stg_violations__historical` | `kc_blight_raw.historical_violations` | one row per violation | `pin`(number)→STRING; `violation_entry_date`→`date_found`; `case_closed`→`date_resolved`; `date_to_comply`=NULL (absent); `source_system='historical'`; `latitude`/`longitude` already present |
| `stg_dangerous_buildings` | `kc_blight_raw.dangerous_buildings` | one row per PIN | `pin`→STRING(trim); `case_opened`→DATE; normalize `statusofcase`; extract lat/lng from `case_location` point |

**Common violation shape** emitted by both staging violation models:
```
violation_id, case_number, pin, source_system,
street_address, full_address, zip_code, council_district, neighborhood, latitude, longitude,
chapter, ordinance, violation_code, violation_description,
date_found, date_to_comply, date_resolved, status_raw, is_resolved
```
Notes:
- `pin` is the universal join key (all three datasets carry the KIVA PIN). Cast to a trimmed STRING everywhere; rows with NULL/blank PIN are routed to a NULL-PIN bucket and **excluded from the property-lifecycle fact** (they can't be tied to a property) but **kept in the transaction fact** for accurate volume/trend counts.
- `is_resolved` = `date_resolved IS NOT NULL` (current) or `status` in resolved set (historical).
- `council_district` normalized to STRING district id across all three (current uses computed-region number, historical a number, dangerous a text field).

### 4.2 Intermediate models (views)

- **`int_violations_unioned`** — `UNION ALL` of the two staging violation models into the common shape. Adds `days_open = days_between(date_found, COALESCE(date_resolved, CURRENT_DATE))`. **Grain: one row per violation. This is the single source of truth for "a violation."**
- **`int_property_rollup`** — aggregate `int_violations_unioned` to **one row per PIN**: `first_violation_date`, `last_violation_date`, `total_violations`, `distinct_violation_types`, `resolved_violations`, `avg_days_open`, plus the property's geography (most-recent address/district/neighborhood/lat-lng via `ROW_NUMBER()` tiebreaker, same trick as CMS `dim_provider`). Feeds the snapshot fact + `dim_property`.
- **`int_dangerous_building_by_pin`** — one row per PIN from `stg_dangerous_buildings` (defensive de-dupe via `ROW_NUMBER()` though PIN is documented unique): `dangerous_building_date` (= `case_opened`), `dangerous_status`, `is_demolition_status` (TRUE when `statusofcase` indicates demolition candidacy/completion — exact string set confirmed during build).

### 4.3 Dimensions (tables in `*_dims`)

- **`dim_property`** — SK `property_sk` (hash of `pin`), natural `pin`, street, full address, zip, council_district, neighborhood, latitude, longitude. One row per PIN seen across violations **or** dangerous buildings. ~tens of thousands of rows.
- **`dim_council_district`** — SK `council_district_sk`, district id, district label. ~6–7 rows. (Small static dim; can be a seed if labels need enrichment.)
- **`dim_violation_type`** — SK `violation_type_sk`, natural key (reconciled `ordinance`/`violation_code`), `chapter`, `description`. Reconciles the two sources' differing type vocabularies onto one key.
- **`dim_date`** — SK `date_sk`, `date_day`, `year`, `quarter`, `month`, `month_name`. Built via `dbt_utils.date_spine` over 2009-01-01 → today. Enables clean trend slicing.

Surrogate keys via `dbt_utils.generate_surrogate_key()` — **fact and dim hash the identical columns** so joins align (lesson carried from CMS).

### 4.4 Facts (tables in `*_facts`)

**`fact_violation`** — *transaction grain*
- **Grain:** one row per violation (`violation_id` + `source_system`)
- **FKs:** `property_sk`, `violation_type_sk`, `council_district_sk`, `date_sk` (on `date_found`)
- **Measures / degenerate:** `days_open`, `is_resolved`, `source_system`
- Powers volume + 15-year trend + resolution-time analysis. ~975K rows.

**`fact_property_lifecycle`** — *accumulating snapshot*
- **Grain:** one row per property (`property_sk` / PIN)
- **From:** `int_property_rollup` LEFT JOIN `int_dangerous_building_by_pin` on PIN
- **Milestone dates / counters:** `first_violation_date`, `last_violation_date`, `total_violations`, `distinct_violation_types`, `resolved_violations`, `avg_days_open`, `ever_dangerous_building` (BOOL), `dangerous_building_date`, `is_demolition_status` (BOOL), `days_first_violation_to_dangerous`, `current_stage` (enum: `single_violation` / `repeat_violations` / `dangerous_building` / `demolition`)
- Powers the funnel + hotspots. ~tens of thousands of rows.

### 4.5 Macros

- **`days_between(start_date, end_date)`** → NULL-safe `DATE_DIFF` wrapper (returns NULL if either side is NULL; never negative-by-surprise).
- **`extract_lat_lng(point_column)`** → pulls latitude/longitude out of Socrata `point`/`location` struct columns into two numeric columns.

### 4.6 Tests (target ~50+)

| Layer | Tests |
|-------|-------|
| Staging | `not_null` on `violation_id`, `date_found`; `accepted_values` on `source_system` (`energov`\|`historical`); `not_null` on `pin` for dangerous buildings |
| Dimensions | `unique` + `not_null` on every SK and natural key |
| `fact_violation` | `unique` on (`violation_id`,`source_system`); `relationships` to all 4 dims; `not_null` on `date_sk` |
| `fact_property_lifecycle` | `unique` + `not_null` on `property_sk`; `relationships` to `dim_property`, `dim_council_district`; `accepted_values` on `current_stage` |
| Singular | `assert_resolved_after_found` (no `date_resolved < date_found`); `assert_no_negative_days_open`; `assert_dangerous_after_first_violation` (no `dangerous_building_date < first_violation_date`) |

## 5. Analytical Marts (tables in `*_marts`)

Each mart feeds exactly one dashboard view — narrow, no further aggregation in Looker.

| Mart | Grain | Key columns | Feeds |
|------|-------|-------------|-------|
| `mart_blight_funnel` | 1 row per stage (4) | `stage, stage_order, property_count, pct_of_violation_properties` | Funnel chart + headline conversion KPIs |
| `mart_violations_trend` | 1 row per (year, source_system) | `year, source_system, total_violations, resolved_violations, median_days_open` | 15-year trend line |
| `mart_council_district` | 1 row per district (~7) | `council_district, total_violations, distinct_properties, dangerous_building_count, pct_escalated_to_dangerous, median_days_to_resolve` | Hero map + district comparison bars |
| `mart_resolution_time` | 1 row per (year, council_district) | `year, council_district, median_days_to_resolve, avg_days_to_resolve` | Response-time-over-time chart |
| `mart_top_violation_types` | 1 row per type × top 20 | `violation_type, chapter, description, violation_count, pct_of_total, avg_days_open` | Top-violation-types bar |
| `mart_blight_hotspots` | 1 row per top repeat-offender PIN (top ~200) | `pin, street_address, council_district, neighborhood, latitude, longitude, total_violations, ever_dangerous_building, current_stage` | Hotspot map + drill-down table |

**Headline numbers** (exact values filled in after build): national/citywide funnel conversion (% of violation-properties that ever became dangerous buildings), median days-to-resolve and its spread across council districts, the 15-year violation-volume trend direction, and the share of violations attributable to the top repeat-offender properties.

## 6. Dashboard (Looker Studio)

### 6.1 Layout
```
KANSAS CITY BLIGHT LIFECYCLE · 2009–2025
┌─────────────────────────────────────────────────────────────┐
│ KPI row: total properties · % escalated to dangerous ·       │
│          median days-to-resolve · total violations          │ ← mart_blight_funnel + _council_district
├──────────────────────────────┬──────────────────────────────┤
│ Blight funnel (4-stage)      │ 15-year violations trend     │
│   mart_blight_funnel         │   mart_violations_trend      │
├─────────────────────────────────────────────────────────────┤
│ KC map shaded by council district (escalation % / days)     │
│   mart_council_district  +  mart_blight_hotspots (points)   │
├──────────────────────────────┬──────────────────────────────┤
│ Top 20 violation types (bar) │ Resolution time by district  │
│   mart_top_violation_types   │   mart_resolution_time       │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Data sources
One BigQuery connector per mart, pointed at the **`kc_blight_prod_marts`** dataset (direct connection, no extracts) so the board reflects the latest scheduled refresh.

### 6.3 Sharing
Public ("Anyone with link can view"); grab the embed iframe URL for the portfolio.

### 6.4 Styling (match portfolio palette)
- Background `#0a0a0b` (charcoal); accent `#f5a623` (amber) for primary series/KPIs; secondary `#4ec9b0` (teal); font IBM Plex Sans.

## 7. Portfolio Integration

Edits to `awgdawg/portfolio` when the project ships:
1. **Homepage project card** (`index.html` `#projects`): add/flip a KC Blight card to `live`.
2. **Homepage "Live BigQuery board" section**: this becomes a *second* live board — either a tabbed switch between CMS and KC Blight, or a stacked second iframe (decide during build; tabbed preferred to avoid a very tall page).
3. **Case study page** `projects/kc-blight.html` (same template as `cms-medicare.html`):
   - **Problem** — cities need to see blight as a pipeline, not isolated complaints; where does it concentrate and how fast is it addressed?
   - **Approach** — Socrata EL → BigQuery → dbt (schema-reconciling union + accumulating-snapshot fact) → Looker, with a scheduled refresh. Include a snippet (the union model or the lifecycle fact).
   - **Outcome** — 3–5 real numbers (filled in after build).
   - **Stack** — Python, Socrata API, dbt, BigQuery, Looker Studio, GitHub Actions.
   - **Links** — repo, live dashboard, dbt docs.

## 8. Verification & Launch Checklist

### Ingestion
- [ ] `extract_load.py --include-frozen` loads all 3 tables to `kc_blight_raw` with non-zero row counts matching Socrata (~175K / ~800K / few-thousand)
- [ ] Re-running the script is idempotent (WRITE_TRUNCATE; no duplication)

### Local dbt
- [ ] Fresh venv `pip install -r requirements.txt` succeeds; `dbt deps` resolves `dbt_utils`
- [ ] `dbt parse` + `dbt build` run end-to-end with 0 failures
- [ ] `fact_violation` row count ≈ sum of the two source violation tables
- [ ] `fact_property_lifecycle` is unique on `property_sk`; `current_stage` only holds the 4 allowed values
- [ ] `dbt docs generate` produces a lineage site

### GitHub Actions
- [ ] `dbt-build.yml` passes on push (`--target ci`); `GCP_SA_KEY` secret configured
- [ ] `refresh-sources.yml` runs via `workflow_dispatch` successfully (EL + `--target prod`); `SOCRATA_APP_TOKEN` secret configured; scheduled cron registered
- [ ] `kc_blight_prod_*` datasets populated; Looker connectors point at `kc_blight_prod_marts`

### Looker Studio
- [ ] All charts render with non-zero data; funnel stages descend monotonically
- [ ] Public sharing enabled, embed URL obtained; colors match palette; mobile preview ok

### Portfolio
- [ ] KC Blight project card → `live`; live-board section shows the new dashboard (tabbed with CMS)
- [ ] `projects/kc-blight.html` written with the 5 sections + real numbers
- [ ] Lighthouse scores hold (≥ desktop 99 / mobile 93) after the second iframe

### Security
- [ ] `.gitignore` excludes keys/.env from commit #1; gitleaks pre-commit installed; no token or key in history

## 9. Out of v1 Scope

- 311-complaint → violation linkage (a different story; the "complaint-to-fix" angle)
- Crime correlation / "broken windows" overlay (analytically fraught; possible v2)
- Demographic/equity joins (COVID-by-zip, census) — possible v2 enrichment
- BQ ML forecasting of future blight (NYC Taxi / GitHub Archive are better fits)
- Slowly-changing dimensions for property attributes (most-recent snapshot is sufficient)
- Address-level fuzzy matching beyond PIN (PIN is a reliable shared key; fuzzy address matching is out)
