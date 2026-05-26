# CMS Medicare BigQuery Project — Design Spec

**Author:** August Turner
**Date:** 2026-05-26
**Status:** Approved, ready for implementation planning
**Project repo (to be created):** `awgdawg/cms-medicare-analytics`
**GCP project:** `cms-medicare-analytics` (project number `454482340363`)

## 1. Goal

Build a public BigQuery analytics project that quantifies the gap between what providers *charge* for Medicare services and what Medicare *actually pays them*, modeled and dashboarded for portfolio use. Audience: hiring managers and recruiters evaluating August for Analytics Engineer / Healthcare BI roles.

**Story it tells:** "I can take a real public dataset, model it the way a payer-side analytics team would, and ship the dashboard people actually look at." The cost-vs-payment angle is the hook — directly relevant to claims, reimbursement, and provider-economics work that healthcare analytics teams care about.

**Success looks like:**
- A dbt project published on GitHub with green CI, viewable lineage docs, and tests passing
- A public Looker Studio dashboard embedded into the portfolio's homepage "Live BigQuery board" section
- The placeholder `projects/cms-medicare.html` rewritten as a real case study with measured numbers from the analysis

## 2. Architecture

**Stack:**
- **dbt-core + dbt-bigquery** in a Python venv at `E:\PyProj\cms-medicare-analytics\.venv\`
- **BigQuery sandbox** in GCP project `cms-medicare-analytics` for storage + compute
- **Looker Studio** (free) for the dashboard
- **GitHub Actions** for `dbt build` validation on every push to `main`

**Authentication:** Service account JSON key for dbt-bigquery, stored locally at `~/.dbt/cms-analytics-sa.json` (git-ignored), referenced by `~/.dbt/profiles.yml`. The GitHub Actions workflow uses the same key, stored as a repo secret (`GCP_SA_KEY`).

**Materialization strategy:**
- `staging`, `intermediate` → **views** (always fresh, no storage cost)
- `marts/dimensions`, `marts/facts`, `marts/analytics` → **tables** (faster dashboard reads, BQ storage cost negligible at this scale — ~30K total fact rows)

**Repo layout:**

```
cms-medicare-analytics/
├── README.md                          # project overview + lineage screenshot
├── dbt_project.yml                    # project config
├── profiles.yml.example               # template (real lives in ~/.dbt/profiles.yml)
├── packages.yml                       # dbt_utils for surrogate_keys etc.
├── requirements.txt                   # dbt-core + dbt-bigquery pins
├── .gitignore                         # excludes .venv, target/, dbt_packages/, *.json keys
├── .github/workflows/dbt-build.yml    # CI: dbt deps + dbt build + dbt test on push
├── models/
│   ├── staging/                       # 1:1 with source tables, views
│   │   ├── _sources.yml
│   │   ├── _stg_models.yml
│   │   ├── stg_cms__inpatient_charges.sql
│   │   └── stg_cms__outpatient_charges.sql
│   ├── intermediate/                  # union inpatient + outpatient
│   │   ├── _int_models.yml
│   │   └── int_provider_procedure_unioned.sql
│   └── marts/
│       ├── _marts.yml
│       ├── dimensions/                # dim_provider, dim_procedure, dim_geography, dim_setting
│       ├── facts/                     # fact_provider_procedure_year
│       └── analytics/                 # 5 final marts that drive the dashboard
├── seeds/
│   └── state_to_region.csv            # state → census region/division mapping
├── macros/
│   ├── cost_payment_ratio.sql
│   └── format_currency.sql
├── tests/
│   ├── assert_no_negative_charges.sql
│   └── assert_payment_ratio_positive.sql
├── analyses/
│   └── adhoc_provider_outliers.sql    # not built into warehouse; just docs/exploration
└── docs/
    └── lineage.png                    # exported dbt docs lineage screenshot
```

## 3. Data Model

### 3.1 Sources

`bigquery-public-data.cms_medicare`:
- `inpatient_charges_2011` through `inpatient_charges_2015` (5 tables)
- `outpatient_charges_2011` through `outpatient_charges_2015` (5 tables)

Source grain: one row per `(provider_id, procedure_code)` per year per setting.

### 3.2 Staging models (views)

| Model | Source | Output grain | Notes |
|-------|--------|--------------|-------|
| `stg_cms__inpatient_charges` | 5 inpatient yearly tables | `(provider_id, drg_definition, year)` | Union all years; add `year`, normalize column names |
| `stg_cms__outpatient_charges` | 5 outpatient yearly tables | `(provider_id, apc_definition, year)` | Union all years; same normalization |

### 3.3 Intermediate model (view)

`int_provider_procedure_unioned` — unions both staging models into one shape:

```
provider_id, provider_name, provider_street, provider_city, provider_state,
provider_zip, hospital_referral_region,
procedure_code, procedure_description, setting ('inpatient'|'outpatient'),
year, total_services,
avg_covered_charges, avg_total_payments, avg_medicare_payments
```

### 3.4 Dimensions (tables in dataset `warehouse_dims`)

- **`dim_provider`** — surrogate key `provider_sk`, natural `provider_id`, name, street, city, state, zip, hospital_referral_region. ~3,000 rows.
- **`dim_procedure`** — surrogate key `procedure_sk`, natural `procedure_code`, description, setting. ~600 inpatient DRGs + ~30 outpatient APCs.
- **`dim_geography`** — surrogate key `geo_sk`, state code (PK), state_name, census_region, census_division. ~50 rows. Sourced from `seeds/state_to_region.csv`.
- **`dim_setting`** — surrogate key `setting_sk`, setting_code, setting_name, description. 2 rows.

Surrogate keys generated via `dbt_utils.generate_surrogate_key()`.

### 3.5 Fact (table in dataset `warehouse_facts`)

`fact_provider_procedure_year`:
- **Grain:** `(provider_sk, procedure_sk, setting_sk, year)`
- **Foreign keys:** `provider_sk`, `procedure_sk`, `geo_sk` (via provider state), `setting_sk`
- **Measures:** `total_services`, `avg_covered_charges`, `avg_total_payments`, `avg_medicare_payments`, `cost_payment_ratio` (precomputed via macro)
- ~30,000 rows total across both settings × 5 years

### 3.6 Macros

- **`cost_payment_ratio(charges, payments)`** → `SAFE_DIVIDE(charges, NULLIF(payments, 0))`. Reused in fact + marts to keep the formula in one place.
- **`format_currency(amount)`** → `CONCAT('$', FORMAT('%\\'.0f', amount))` — display helper for `analyses/`.

### 3.7 Tests

| Layer | Tests |
|-------|-------|
| Staging | `not_null` on `provider_id`, `procedure_code`, `year`. `accepted_values` on `year` (2011–2015), `setting` ('inpatient' \| 'outpatient'). |
| Dimensions | `unique` + `not_null` on surrogate and natural keys. |
| Fact | `unique` on composite grain (provider_sk, procedure_sk, setting_sk, year). `relationships` to all 4 dims. `not_null` on measures. |
| Singular | `assert_no_negative_charges.sql` (no negative charges/payments in fact). `assert_payment_ratio_positive.sql` (no negative cost_payment_ratio). |

## 4. Analytical Marts (tables in `warehouse_marts`)

Each mart is shaped to feed exactly one dashboard view — narrow tables, no further aggregation needed in Looker Studio.

| Mart | Grain | Columns | Feeds |
|------|-------|---------|-------|
| `mart_national_ratio` | 1 row | `total_charges, total_payments, cost_payment_ratio, total_services` | National headline KPI |
| `mart_yearly_trend` | 1 row per year (5) | `year, total_charges, total_payments, cost_payment_ratio, total_services` | Yearly trend line chart |
| `mart_top_procedures` | 1 row per (procedure, setting) × top 20 | `procedure_code, procedure_description, setting, total_services, avg_charges, avg_payments, cost_payment_ratio` | Top-procedures bar chart |
| `mart_state_ratio` | 1 row per state (~50) | `provider_state, state_name, census_region, num_providers, total_services, avg_charges, avg_payments, cost_payment_ratio` | State choropleth |
| `mart_setting_comparison` | 1 row per (setting × year) = 10 | `setting, year, total_charges, total_payments, cost_payment_ratio, total_services` | Inpatient-vs-outpatient slope chart |

## 5. Dashboard (Looker Studio)

### 5.1 Layout

```
COST-PAYMENT GAP · CMS MEDICARE 2011-2015
┌─────────────────────────────────────────────────────────────┐
│ NATIONAL COST-PAYMENT RATIO                                 │
│   3.4×   ($ charged per $1 actually paid)                   │ ← mart_national_ratio
├──────────────────────────────┬──────────────────────────────┤
│ Trend over 5 years (line)    │ Inpatient vs outpatient (bar)│
│   mart_yearly_trend          │   mart_setting_comparison    │
├─────────────────────────────────────────────────────────────┤
│ Top 20 procedures by cost-payment gap (horizontal bars)     │
│   mart_top_procedures (filter chip: inpatient/outpatient)   │
├─────────────────────────────────────────────────────────────┤
│ State-level cost-payment ratio (US choropleth)              │
│   mart_state_ratio                                          │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Data sources

One BigQuery connector per mart (4 connectors — `mart_top_procedures` and `mart_setting_comparison` are separate sources for filter independence). Direct connection (no extracts) so the dashboard always reflects the latest `dbt build`.

### 5.3 Sharing

Public ("Anyone with link can view"). After publishing, grab the embed iframe URL for portfolio integration.

### 5.4 Styling

Override Looker Studio defaults to match portfolio palette where possible:
- Background: `#0a0a0b` (charcoal)
- Accent: `#f5a623` (amber) for headline KPI, primary chart series
- Secondary: `#4ec9b0` (teal) for comparison series
- Font: IBM Plex Sans (Looker Studio ships with this)

## 6. Portfolio Integration

Three edits to `awgdawg/portfolio` when the BQ project ships:

1. **Homepage project card** (`index.html` `#projects` section): change CMS Medicare card's badge from `planned` to `live`.
2. **Homepage "Live BigQuery board" section** (`index.html` `#live` section): replace the `.bq-placeholder` div with an iframe pointing to the Looker Studio embed URL.
3. **Project case-study page** (`projects/cms-medicare.html`): replace the placeholder with a real case study using the same template as `snowflake-migration.html`:
   - **Problem** — payers, providers, and policymakers need to quantify the gap between billed charges and actual reimbursement.
   - **Approach** — dbt-bigquery, Kimball star schema, GitHub Actions CI. Include a snippet showing `fact_provider_procedure_year.sql` or the `cost_payment_ratio` macro.
   - **Outcome** — 3–5 real numbers from the analysis (national ratio, top procedure gap, state spread, etc.). *Filled in after the dashboard is built.*
   - **Stack** — dbt, BigQuery, Looker Studio, Python, GitHub Actions.
   - **Links** — GitHub repo, live Looker Studio dashboard URL, dbt docs (hosted on GH Pages at `awgdawg.github.io/cms-medicare-analytics` if we enable Pages for the docs build).

## 7. Verification & Launch Checklist

### Local dbt
- [ ] `pip install -r requirements.txt` succeeds in fresh venv at `E:\PyProj\cms-medicare-analytics\.venv\`
- [ ] `dbt deps` resolves `dbt_utils`
- [ ] `dbt parse` succeeds
- [ ] `dbt seed` loads `state_to_region.csv`
- [ ] `dbt build` runs end-to-end with 0 failures (compiles, tests pass, materializes)
- [ ] `dbt docs generate` produces a docs site

### BigQuery state
- [ ] Datasets exist in `cms-medicare-analytics`: `warehouse_staging`, `warehouse_intermediate`, `warehouse_dims`, `warehouse_facts`, `warehouse_marts`
- [ ] `fact_provider_procedure_year` row count = sum of source-table rows across both settings × 5 years
- [ ] `mart_national_ratio` returns exactly 1 row with a sensible ratio (expect ~3–4×)
- [ ] `mart_state_ratio` has ~50 rows with no NULL `state_name`

### GitHub Actions
- [ ] `dbt-build.yml` workflow runs on push and passes
- [ ] BQ service account key correctly configured in repo secrets as `GCP_SA_KEY`
- [ ] Optional: deploy `dbt docs` to GH Pages

### Looker Studio
- [ ] All 5 charts render with non-zero data
- [ ] Public sharing enabled, embed URL obtained
- [ ] Dashboard colors match portfolio palette as closely as Looker Studio allows
- [ ] Mobile preview check (Looker Studio toggle)

### Portfolio
- [ ] `index.html` CMS Medicare project card badge → `live`
- [ ] `index.html` live BQ section shows the iframe (not the placeholder)
- [ ] `projects/cms-medicare.html` rewritten as a real case study with the 5 sections
- [ ] All Lighthouse scores still ≥ desktop 99 / mobile 93 after the iframe addition

## 8. Out of v1 Scope

Deferred — not blockers for launch:

- Provider-level outlier detection page (possible v2)
- BQ ML forecasting on the trend (NYC Taxi project is a better fit for that)
- Snapshotting / slowly-changing dimensions (data is annual, no need)
- Custom dimension for hospital_referral_region
- Looker Studio dashboard alerts / scheduled emails
