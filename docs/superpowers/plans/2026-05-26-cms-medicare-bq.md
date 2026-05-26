# CMS Medicare BigQuery Project Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public dbt-bigquery project that quantifies the cost-vs-payment gap in CMS Medicare claims data, with a Looker Studio dashboard embedded into the portfolio site.

**Architecture:** dbt-bigquery on GCP, Kimball star schema (2 staging views → 1 intermediate view → 4 dim tables + 1 fact table → 5 analytics marts). GitHub Actions CI runs `dbt build` on every push. Looker Studio reads marts directly from BigQuery.

**Tech Stack:** dbt-core 1.10, dbt-bigquery 1.10, Python 3.11+ venv, BigQuery (sandbox tier), Looker Studio, GitHub Actions.

**Reference spec:** [`E:\PyProj\portfolio\docs\superpowers\specs\2026-05-26-cms-medicare-bq-design.md`](../specs/2026-05-26-cms-medicare-bq-design.md)

**Project root:** `E:\PyProj\cms-medicare-analytics` (separate from portfolio repo, per user preference for E: drive — see memory [storage-on-e-drive]).

**GCP project:** `cms-medicare-analytics` (project number `454482340363`).

**Verification model:** dbt has built-in testing — every task that adds a model also adds tests, and `dbt build` (which runs models + tests) is the primary verification. Each task ends with a `dbt build` (or scoped `dbt run --select` + `dbt test --select`) showing green output, plus a commit. The portfolio integration tasks at the end use the existing preview server (`mcp__Claude_Preview__preview_start` with `name: "portfolio-site"`).

---

## Task 1: Bootstrap repo + Python venv

**Files:**
- Create dir: `E:\PyProj\cms-medicare-analytics\`
- Create: `requirements.txt`
- Create: `.gitignore`

- [ ] **Step 1: Create the project directory and initialize git**

```powershell
New-Item -ItemType Directory -Path 'E:\PyProj\cms-medicare-analytics' | Out-Null
cd E:\PyProj\cms-medicare-analytics
git init -b main
```

- [ ] **Step 2: Write `requirements.txt`**

```
dbt-core==1.10.4
dbt-bigquery==1.10.1
```

- [ ] **Step 3: Write `.gitignore`**

```
# Python
.venv/
__pycache__/
*.pyc

# dbt
target/
dbt_packages/
logs/
.user.yml

# Secrets
*.json
!packages.lock.json

# OS / editor
.DS_Store
Thumbs.db
.vscode/
.idea/
*.swp

# Generated docs (we keep one screenshot in docs/, but not the full dbt-docs build)
manifest.json
catalog.json
```

- [ ] **Step 4: Create Python venv and install dbt**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
dbt --version
```

Expected: `dbt-core 1.10.4` and `dbt-bigquery 1.10.1` shown by `dbt --version`.

- [ ] **Step 5: Commit**

```
git add requirements.txt .gitignore
git commit -m "Bootstrap repo with dbt-core + dbt-bigquery"
```

---

## Task 2: GCP service account + dbt profile (user manual + automated)

**Files:**
- Create: `~/.dbt/cms-analytics-sa.json` (service account key — never committed)
- Create: `~/.dbt/profiles.yml` (or append `cms_medicare` profile if file exists)
- Create: `profiles.yml.example` (committed template)

- [ ] **Step 1: Create the BigQuery service account (USER MANUAL STEP)**

In a browser:
1. Open https://console.cloud.google.com/iam-admin/serviceaccounts?project=cms-medicare-analytics
2. Click **+ CREATE SERVICE ACCOUNT**
3. Name: `dbt-runner`, ID auto-fills to `dbt-runner`
4. Click **CREATE AND CONTINUE**
5. Grant these roles (one at a time):
   - **BigQuery User**
   - **BigQuery Data Editor**
   - **BigQuery Job User**
6. Click **CONTINUE** then **DONE**
7. Back on the service-accounts list, click the new `dbt-runner@cms-medicare-analytics.iam.gserviceaccount.com`
8. Click **KEYS** tab → **ADD KEY → Create new key → JSON → CREATE**
9. Save the downloaded file to `C:\Users\auglt\.dbt\cms-analytics-sa.json`

(Create the `.dbt` directory in PowerShell first if it doesn't exist: `New-Item -ItemType Directory -Force -Path C:\Users\auglt\.dbt`.)

- [ ] **Step 2: Write or append `profiles.yml`**

Open `C:\Users\auglt\.dbt\profiles.yml`. If the file does not exist, create it with the entire content below. If it exists, **append** just the `cms_medicare:` block.

```yaml
cms_medicare:
  target: dev
  outputs:
    dev:
      type: bigquery
      method: service-account
      keyfile: C:\Users\auglt\.dbt\cms-analytics-sa.json
      project: cms-medicare-analytics
      dataset: warehouse_dev
      location: US
      threads: 4
      timeout_seconds: 300
      priority: interactive
```

- [ ] **Step 3: Write `profiles.yml.example` in repo root**

```yaml
# Copy this into ~/.dbt/profiles.yml (Windows: C:\Users\<you>\.dbt\profiles.yml)
# and update keyfile/project to match your environment.

cms_medicare:
  target: dev
  outputs:
    dev:
      type: bigquery
      method: service-account
      keyfile: /path/to/cms-analytics-sa.json
      project: cms-medicare-analytics
      dataset: warehouse_dev
      location: US
      threads: 4
      timeout_seconds: 300
      priority: interactive
```

- [ ] **Step 4: Commit**

```
git add profiles.yml.example
git commit -m "Add profiles.yml.example template"
```

(`profiles.yml` and the JSON keyfile stay outside the repo — never committed.)

---

## Task 3: dbt project skeleton

**Files:**
- Create: `dbt_project.yml`
- Create: `packages.yml`

- [ ] **Step 1: Write `dbt_project.yml`**

```yaml
name: 'cms_medicare'
version: '1.0.0'
config-version: 2

profile: 'cms_medicare'

model-paths: ["models"]
analysis-paths: ["analyses"]
test-paths: ["tests"]
seed-paths: ["seeds"]
macro-paths: ["macros"]
snapshot-paths: ["snapshots"]

clean-targets:
  - "target"
  - "dbt_packages"

models:
  cms_medicare:
    staging:
      +materialized: view
      +schema: staging
    intermediate:
      +materialized: view
      +schema: intermediate
    marts:
      dimensions:
        +materialized: table
        +schema: dims
      facts:
        +materialized: table
        +schema: facts
      analytics:
        +materialized: table
        +schema: marts

seeds:
  cms_medicare:
    +schema: dims

vars:
  source_dataset: 'bigquery-public-data.cms_medicare'
  years: [2011, 2012, 2013, 2014, 2015]
```

The `+schema` directives produce datasets named `warehouse_dev_staging`, `warehouse_dev_intermediate`, etc. (dbt concatenates target-dataset + the model's schema.) That matches the spec's `warehouse_*` naming.

- [ ] **Step 2: Write `packages.yml`**

```yaml
packages:
  - package: dbt-labs/dbt_utils
    version: 1.3.0
```

- [ ] **Step 3: Install packages**

```powershell
cd E:\PyProj\cms-medicare-analytics
.\.venv\Scripts\Activate.ps1
dbt deps
```

Expected: `dbt_utils` package installed into `dbt_packages/`.

- [ ] **Step 4: Verify connection with `dbt debug`**

```powershell
dbt debug --profile cms_medicare --target dev
```

Expected output ends with `All checks passed!`.

If it fails with `permission denied`, the service account likely needs the BigQuery roles from Task 2 Step 1 — re-check those.

- [ ] **Step 5: Commit**

```
git add dbt_project.yml packages.yml
git commit -m "Add dbt project config + dbt_utils dependency"
```

---

## Task 4: Source declarations + freshness

**Files:**
- Create: `models/staging/_sources.yml`

- [ ] **Step 1: Write `models/staging/_sources.yml`**

```yaml
version: 2

sources:
  - name: cms_medicare
    description: "Public CMS Medicare provider charge data on BigQuery"
    database: bigquery-public-data
    schema: cms_medicare
    tables:
      - name: inpatient_charges_2011
        description: "Inpatient hospital charges, 2011"
      - name: inpatient_charges_2012
      - name: inpatient_charges_2013
      - name: inpatient_charges_2014
      - name: inpatient_charges_2015
      - name: outpatient_charges_2011
        description: "Outpatient hospital charges, 2011"
      - name: outpatient_charges_2012
      - name: outpatient_charges_2013
      - name: outpatient_charges_2014
      - name: outpatient_charges_2015
```

- [ ] **Step 2: Verify dbt parses the sources**

```powershell
dbt parse
```

Expected: no errors. Will print `Found 0 models, 10 sources, ...`.

- [ ] **Step 3: Commit**

```
git add models/staging/_sources.yml
git commit -m "Declare CMS Medicare source tables (10)"
```

---

## Task 5: Staging models (inpatient + outpatient)

**Files:**
- Create: `models/staging/stg_cms__inpatient_charges.sql`
- Create: `models/staging/stg_cms__outpatient_charges.sql`
- Create: `models/staging/_stg_models.yml`

**Note on schemas:** CMS public table columns to verify before this task — run this once to confirm:

```powershell
# In BigQuery web UI or via bq CLI, query INFORMATION_SCHEMA for one of the tables:
# SELECT column_name FROM `bigquery-public-data.cms_medicare.INFORMATION_SCHEMA.COLUMNS`
# WHERE table_name = 'inpatient_charges_2015';
```

The model code below uses CMS Medicare's documented column names. If schema differs, adjust column names accordingly and note the deviation in the commit message.

- [ ] **Step 1: Write `models/staging/stg_cms__inpatient_charges.sql`**

```sql
{{ config(materialized='view') }}

{% set years = var('years') %}

{% for year in years %}
SELECT
    provider_id,
    provider_name,
    provider_street_address                    AS provider_street,
    provider_city,
    provider_state,
    provider_zip_code                          AS provider_zip,
    hospital_referral_region_description       AS hospital_referral_region,
    drg_definition                             AS procedure_code_raw,
    'inpatient'                                AS setting,
    {{ year }}                                 AS year,
    total_discharges                           AS total_services,
    average_covered_charges                    AS avg_covered_charges,
    average_total_payments                     AS avg_total_payments,
    average_medicare_payments                  AS avg_medicare_payments
FROM {{ source('cms_medicare', 'inpatient_charges_' ~ year) }}
{% if not loop.last %}UNION ALL{% endif %}
{% endfor %}
```

- [ ] **Step 2: Write `models/staging/stg_cms__outpatient_charges.sql`**

```sql
{{ config(materialized='view') }}

{% set years = var('years') %}

{% for year in years %}
SELECT
    provider_id,
    provider_name,
    provider_street_address                    AS provider_street,
    provider_city,
    provider_state,
    provider_zip_code                          AS provider_zip,
    hospital_referral_region_description       AS hospital_referral_region,
    apc_definition                             AS procedure_code_raw,
    'outpatient'                               AS setting,
    {{ year }}                                 AS year,
    outpatient_services                        AS total_services,
    average_estimated_submitted_charges        AS avg_covered_charges,
    average_total_payments                     AS avg_total_payments,
    NULL                                       AS avg_medicare_payments
FROM {{ source('cms_medicare', 'outpatient_charges_' ~ year) }}
{% if not loop.last %}UNION ALL{% endif %}
{% endfor %}
```

(Outpatient table doesn't separate Medicare from total payments — we set `avg_medicare_payments` to NULL. Downstream consumers should use `avg_total_payments`. This is a real-world data nuance the case study can call out.)

- [ ] **Step 3: Write `models/staging/_stg_models.yml`**

```yaml
version: 2

models:
  - name: stg_cms__inpatient_charges
    description: "Unioned + normalized inpatient charge rows across years 2011-2015"
    columns:
      - name: provider_id
        tests:
          - not_null
      - name: procedure_code_raw
        tests:
          - not_null
      - name: setting
        tests:
          - not_null
          - accepted_values:
              values: ['inpatient']
      - name: year
        tests:
          - not_null
          - accepted_values:
              values: [2011, 2012, 2013, 2014, 2015]
      - name: avg_covered_charges
        tests:
          - not_null

  - name: stg_cms__outpatient_charges
    description: "Unioned + normalized outpatient charge rows across years 2011-2015"
    columns:
      - name: provider_id
        tests:
          - not_null
      - name: procedure_code_raw
        tests:
          - not_null
      - name: setting
        tests:
          - not_null
          - accepted_values:
              values: ['outpatient']
      - name: year
        tests:
          - not_null
          - accepted_values:
              values: [2011, 2012, 2013, 2014, 2015]
      - name: avg_covered_charges
        tests:
          - not_null
```

- [ ] **Step 4: Build + test staging**

```powershell
dbt build --select staging
```

Expected: 2 models materialize as views; all `not_null` and `accepted_values` tests pass.

If a column name doesn't exist (the source schema may have evolved slightly), `dbt build` will surface the error pointing at the bad column. Fix the SQL to match the actual schema and re-run.

- [ ] **Step 5: Spot-check row counts**

In BQ web UI:

```sql
SELECT setting, year, COUNT(*) AS rows
FROM `cms-medicare-analytics.warehouse_dev_staging.stg_cms__inpatient_charges`
GROUP BY 1, 2 ORDER BY 1, 2;

SELECT setting, year, COUNT(*) AS rows
FROM `cms-medicare-analytics.warehouse_dev_staging.stg_cms__outpatient_charges`
GROUP BY 1, 2 ORDER BY 1, 2;
```

Expected: ~3,000 inpatient rows per year (similar across years), ~3,000+ outpatient rows per year. Sanity-check totals — order of magnitude only.

- [ ] **Step 6: Commit**

```
git add models/staging/
git commit -m "Add staging models for inpatient + outpatient charges"
```

---

## Task 6: Seed file (state → region mapping)

**Files:**
- Create: `seeds/state_to_region.csv`
- Create: `seeds/_seeds.yml`

- [ ] **Step 1: Write `seeds/state_to_region.csv`**

```csv
state_code,state_name,census_region,census_division
AL,Alabama,South,East South Central
AK,Alaska,West,Pacific
AZ,Arizona,West,Mountain
AR,Arkansas,South,West South Central
CA,California,West,Pacific
CO,Colorado,West,Mountain
CT,Connecticut,Northeast,New England
DE,Delaware,South,South Atlantic
DC,District of Columbia,South,South Atlantic
FL,Florida,South,South Atlantic
GA,Georgia,South,South Atlantic
HI,Hawaii,West,Pacific
ID,Idaho,West,Mountain
IL,Illinois,Midwest,East North Central
IN,Indiana,Midwest,East North Central
IA,Iowa,Midwest,West North Central
KS,Kansas,Midwest,West North Central
KY,Kentucky,South,East South Central
LA,Louisiana,South,West South Central
ME,Maine,Northeast,New England
MD,Maryland,South,South Atlantic
MA,Massachusetts,Northeast,New England
MI,Michigan,Midwest,East North Central
MN,Minnesota,Midwest,West North Central
MS,Mississippi,South,East South Central
MO,Missouri,Midwest,West North Central
MT,Montana,West,Mountain
NE,Nebraska,Midwest,West North Central
NV,Nevada,West,Mountain
NH,New Hampshire,Northeast,New England
NJ,New Jersey,Northeast,Middle Atlantic
NM,New Mexico,West,Mountain
NY,New York,Northeast,Middle Atlantic
NC,North Carolina,South,South Atlantic
ND,North Dakota,Midwest,West North Central
OH,Ohio,Midwest,East North Central
OK,Oklahoma,South,West South Central
OR,Oregon,West,Pacific
PA,Pennsylvania,Northeast,Middle Atlantic
RI,Rhode Island,Northeast,New England
SC,South Carolina,South,South Atlantic
SD,South Dakota,Midwest,West North Central
TN,Tennessee,South,East South Central
TX,Texas,South,West South Central
UT,Utah,West,Mountain
VT,Vermont,Northeast,New England
VA,Virginia,South,South Atlantic
WA,Washington,West,Pacific
WV,West Virginia,South,South Atlantic
WI,Wisconsin,Midwest,East North Central
WY,Wyoming,West,Mountain
PR,Puerto Rico,Other,Territories
```

- [ ] **Step 2: Write `seeds/_seeds.yml`**

```yaml
version: 2

seeds:
  - name: state_to_region
    description: "US state codes mapped to Census Bureau region and division"
    columns:
      - name: state_code
        tests:
          - unique
          - not_null
      - name: state_name
        tests:
          - not_null
      - name: census_region
        tests:
          - not_null
```

- [ ] **Step 3: Seed it into BigQuery**

```powershell
dbt seed --select state_to_region
```

Expected: 1 seed loaded as a table in `warehouse_dev_dims`.

- [ ] **Step 4: Test the seed**

```powershell
dbt test --select state_to_region
```

Expected: 3 tests pass (unique + 2 not_null).

- [ ] **Step 5: Commit**

```
git add seeds/
git commit -m "Add state-to-region seed (52 rows including DC + PR)"
```

---

## Task 7: Macros

**Files:**
- Create: `macros/cost_payment_ratio.sql`
- Create: `macros/format_currency.sql`

- [ ] **Step 1: Write `macros/cost_payment_ratio.sql`**

```sql
{% macro cost_payment_ratio(charges, payments) %}
    SAFE_DIVIDE({{ charges }}, NULLIF({{ payments }}, 0))
{% endmacro %}
```

- [ ] **Step 2: Write `macros/format_currency.sql`**

```sql
{% macro format_currency(amount) %}
    CONCAT('$', FORMAT('%\'.0f', {{ amount }}))
{% endmacro %}
```

- [ ] **Step 3: Verify macros compile by recompiling staging (which references them implicitly via downstream models — but at this point no model uses them yet, so we just parse)**

```powershell
dbt parse
```

Expected: no errors.

- [ ] **Step 4: Commit**

```
git add macros/
git commit -m "Add cost_payment_ratio and format_currency macros"
```

---

## Task 8: Intermediate model

**Files:**
- Create: `models/intermediate/int_provider_procedure_unioned.sql`
- Create: `models/intermediate/_int_models.yml`

- [ ] **Step 1: Write `models/intermediate/int_provider_procedure_unioned.sql`**

```sql
{{ config(materialized='view') }}

WITH unioned AS (
    SELECT * FROM {{ ref('stg_cms__inpatient_charges') }}
    UNION ALL
    SELECT * FROM {{ ref('stg_cms__outpatient_charges') }}
),

parsed AS (
    SELECT
        provider_id,
        provider_name,
        provider_street,
        provider_city,
        provider_state,
        provider_zip,
        hospital_referral_region,

        -- procedure_code_raw is "<code> - <description>". Split into parts.
        TRIM(SPLIT(procedure_code_raw, ' - ')[SAFE_OFFSET(0)]) AS procedure_code,
        TRIM(
            ARRAY_TO_STRING(
                ARRAY(
                    SELECT x
                    FROM UNNEST(SPLIT(procedure_code_raw, ' - ')) AS x WITH OFFSET pos
                    WHERE pos > 0
                ),
                ' - '
            )
        )                                                       AS procedure_description,

        setting,
        year,
        total_services,
        avg_covered_charges,
        avg_total_payments,
        avg_medicare_payments
    FROM unioned
)

SELECT
    *,
    {{ cost_payment_ratio('avg_covered_charges', 'avg_total_payments') }} AS cost_payment_ratio
FROM parsed
```

- [ ] **Step 2: Write `models/intermediate/_int_models.yml`**

```yaml
version: 2

models:
  - name: int_provider_procedure_unioned
    description: "Inpatient + outpatient staging unioned and parsed; one row per (provider, procedure, setting, year)"
    columns:
      - name: provider_id
        tests:
          - not_null
      - name: procedure_code
        tests:
          - not_null
      - name: setting
        tests:
          - not_null
          - accepted_values:
              values: ['inpatient', 'outpatient']
      - name: year
        tests:
          - not_null
      - name: cost_payment_ratio
        description: "avg_covered_charges / avg_total_payments. NULL when total payments are zero."
```

- [ ] **Step 3: Build + test**

```powershell
dbt build --select int_provider_procedure_unioned
```

Expected: 1 model materializes as a view; all tests pass.

- [ ] **Step 4: Spot-check that the procedure parsing works**

```sql
SELECT procedure_code, procedure_description, COUNT(*) AS rows
FROM `cms-medicare-analytics.warehouse_dev_intermediate.int_provider_procedure_unioned`
GROUP BY 1, 2
ORDER BY rows DESC
LIMIT 5;
```

Expected: top rows show clean codes (e.g., `001`, `470`) and full descriptions. If codes still look like `001 - HEART TRANSPLANT`, the split logic needs fixing.

- [ ] **Step 5: Commit**

```
git add models/intermediate/
git commit -m "Add intermediate model unioning inpatient + outpatient with parsed procedure codes"
```

---

## Task 9: Dimensions

**Files:**
- Create: `models/marts/dimensions/dim_setting.sql`
- Create: `models/marts/dimensions/dim_geography.sql`
- Create: `models/marts/dimensions/dim_provider.sql`
- Create: `models/marts/dimensions/dim_procedure.sql`
- Create: `models/marts/_marts.yml`

- [ ] **Step 1: Write `models/marts/dimensions/dim_setting.sql`**

```sql
{{ config(materialized='table') }}

SELECT
    {{ dbt_utils.generate_surrogate_key(['setting_code']) }} AS setting_sk,
    setting_code,
    setting_name,
    description
FROM (
    SELECT 'inpatient'  AS setting_code, 'Inpatient'  AS setting_name, 'Admitted to the hospital'        AS description
    UNION ALL
    SELECT 'outpatient' AS setting_code, 'Outpatient' AS setting_name, 'Treated without overnight stay'  AS description
)
```

- [ ] **Step 2: Write `models/marts/dimensions/dim_geography.sql`**

```sql
{{ config(materialized='table') }}

SELECT
    {{ dbt_utils.generate_surrogate_key(['state_code']) }} AS geo_sk,
    state_code,
    state_name,
    census_region,
    census_division
FROM {{ ref('state_to_region') }}
```

- [ ] **Step 3: Write `models/marts/dimensions/dim_provider.sql`**

```sql
{{ config(materialized='table') }}

WITH providers AS (
    SELECT DISTINCT
        provider_id,
        provider_name,
        provider_street,
        provider_city,
        provider_state,
        provider_zip,
        hospital_referral_region
    FROM {{ ref('int_provider_procedure_unioned') }}
)

SELECT
    {{ dbt_utils.generate_surrogate_key(['provider_id']) }} AS provider_sk,
    provider_id,
    provider_name,
    provider_street,
    provider_city,
    provider_state,
    provider_zip,
    hospital_referral_region
FROM providers
```

- [ ] **Step 4: Write `models/marts/dimensions/dim_procedure.sql`**

```sql
{{ config(materialized='table') }}

WITH procedures AS (
    SELECT DISTINCT
        procedure_code,
        procedure_description,
        setting
    FROM {{ ref('int_provider_procedure_unioned') }}
)

SELECT
    {{ dbt_utils.generate_surrogate_key(['procedure_code', 'setting']) }} AS procedure_sk,
    procedure_code,
    procedure_description,
    setting
FROM procedures
```

(Composite surrogate key on `procedure_code + setting` because the same code might appear in both settings, though in practice inpatient uses DRG codes and outpatient uses APC codes — including setting makes the dim safe.)

- [ ] **Step 5: Write `models/marts/_marts.yml` (dim tests for now; fact + mart tests added in later tasks)**

```yaml
version: 2

models:
  - name: dim_setting
    description: "2-row dimension: inpatient vs outpatient"
    columns:
      - name: setting_sk
        tests: [unique, not_null]
      - name: setting_code
        tests: [unique, not_null]

  - name: dim_geography
    description: "US states and territories, mapped to Census region/division"
    columns:
      - name: geo_sk
        tests: [unique, not_null]
      - name: state_code
        tests: [unique, not_null]

  - name: dim_provider
    description: "Distinct providers across both inpatient and outpatient sources"
    columns:
      - name: provider_sk
        tests: [unique, not_null]
      - name: provider_id
        tests: [unique, not_null]

  - name: dim_procedure
    description: "Distinct procedures (DRG for inpatient, APC for outpatient)"
    columns:
      - name: procedure_sk
        tests: [unique, not_null]
      - name: procedure_code
        tests: [not_null]
      - name: setting
        tests:
          - not_null
          - accepted_values:
              values: ['inpatient', 'outpatient']
```

- [ ] **Step 6: Build + test all dims**

```powershell
dbt build --select dimensions
```

Expected: 4 models materialize as tables; ~10 tests pass.

- [ ] **Step 7: Sanity check row counts**

```sql
SELECT 'dim_setting' AS d, COUNT(*) AS n FROM `cms-medicare-analytics.warehouse_dev_dims.dim_setting`
UNION ALL
SELECT 'dim_geography', COUNT(*) FROM `cms-medicare-analytics.warehouse_dev_dims.dim_geography`
UNION ALL
SELECT 'dim_provider', COUNT(*) FROM `cms-medicare-analytics.warehouse_dev_dims.dim_provider`
UNION ALL
SELECT 'dim_procedure', COUNT(*) FROM `cms-medicare-analytics.warehouse_dev_dims.dim_procedure`;
```

Expected approx: setting=2, geography=52, provider=~3000, procedure=~700.

- [ ] **Step 8: Commit**

```
git add models/marts/
git commit -m "Add 4 dimension models with surrogate keys + uniqueness tests"
```

---

## Task 10: Fact table

**Files:**
- Modify: `models/marts/_marts.yml` (append fact entry)
- Create: `models/marts/facts/fact_provider_procedure_year.sql`

- [ ] **Step 1: Write `models/marts/facts/fact_provider_procedure_year.sql`**

```sql
{{ config(materialized='table') }}

WITH source AS (
    SELECT * FROM {{ ref('int_provider_procedure_unioned') }}
),

joined AS (
    SELECT
        {{ dbt_utils.generate_surrogate_key(['s.provider_id']) }}                       AS provider_sk,
        {{ dbt_utils.generate_surrogate_key(['s.procedure_code', 's.setting']) }}       AS procedure_sk,
        {{ dbt_utils.generate_surrogate_key(['s.provider_state']) }}                    AS geo_sk,
        {{ dbt_utils.generate_surrogate_key(['s.setting']) }}                           AS setting_sk,
        s.year,
        s.total_services,
        s.avg_covered_charges,
        s.avg_total_payments,
        s.avg_medicare_payments,
        s.cost_payment_ratio
    FROM source s
)

SELECT * FROM joined
```

(Surrogate-key generation matches the formulas used in the dims, so foreign keys line up by hash equality without explicit joins.)

- [ ] **Step 2: Append to `models/marts/_marts.yml`**

Add at the END of the existing `models:` list (don't replace the existing content):

```yaml
  - name: fact_provider_procedure_year
    description: "One row per (provider, procedure, setting, year). Foreign keys to all 4 dims."
    tests:
      - dbt_utils.unique_combination_of_columns:
          combination_of_columns: [provider_sk, procedure_sk, setting_sk, year]
    columns:
      - name: provider_sk
        tests:
          - not_null
          - relationships:
              to: ref('dim_provider')
              field: provider_sk
      - name: procedure_sk
        tests:
          - not_null
          - relationships:
              to: ref('dim_procedure')
              field: procedure_sk
      - name: geo_sk
        tests:
          - not_null
          - relationships:
              to: ref('dim_geography')
              field: geo_sk
      - name: setting_sk
        tests:
          - not_null
          - relationships:
              to: ref('dim_setting')
              field: setting_sk
      - name: year
        tests:
          - not_null
          - accepted_values:
              values: [2011, 2012, 2013, 2014, 2015]
      - name: avg_covered_charges
        tests:
          - not_null
```

- [ ] **Step 3: Build + test the fact**

```powershell
dbt build --select fact_provider_procedure_year+
```

(The `+` means "this model and downstream", which currently is just itself plus the test resources.)

Expected: fact materializes as a table, ~30,000 rows. All relationship + unique-combination tests pass. If any relationship test fails, it means a fact row has a surrogate key that doesn't exist in the corresponding dim — likely because the dim missed a row, or surrogate-key inputs don't match.

- [ ] **Step 4: Sanity-check fact**

```sql
SELECT
    COUNT(*) AS total_rows,
    COUNT(DISTINCT provider_sk) AS providers,
    COUNT(DISTINCT procedure_sk) AS procedures,
    MIN(year) AS earliest_year,
    MAX(year) AS latest_year,
    ROUND(AVG(cost_payment_ratio), 2) AS avg_ratio
FROM `cms-medicare-analytics.warehouse_dev_facts.fact_provider_procedure_year`;
```

Expected: ~30K rows, ~3K providers, ~700 procedures, years 2011-2015, avg ratio 3-4.

- [ ] **Step 5: Commit**

```
git add models/marts/facts/ models/marts/_marts.yml
git commit -m "Add fact_provider_procedure_year with referential integrity tests"
```

---

## Task 11: Singular tests

**Files:**
- Create: `tests/assert_no_negative_charges.sql`
- Create: `tests/assert_payment_ratio_positive.sql`

- [ ] **Step 1: Write `tests/assert_no_negative_charges.sql`**

```sql
-- Charges and payments should always be non-negative.
-- Returns rows that violate this — empty result = test pass.

SELECT
    provider_sk,
    procedure_sk,
    year,
    avg_covered_charges,
    avg_total_payments
FROM {{ ref('fact_provider_procedure_year') }}
WHERE avg_covered_charges < 0
   OR avg_total_payments < 0
```

- [ ] **Step 2: Write `tests/assert_payment_ratio_positive.sql`**

```sql
-- Cost-payment ratio should be non-negative wherever defined.
-- Returns rows that violate this — empty result = test pass.

SELECT
    provider_sk,
    procedure_sk,
    year,
    cost_payment_ratio
FROM {{ ref('fact_provider_procedure_year') }}
WHERE cost_payment_ratio < 0
```

- [ ] **Step 3: Run only the singular tests**

```powershell
dbt test --select test_type:singular
```

Expected: both tests PASS (returning 0 rows).

- [ ] **Step 4: Commit**

```
git add tests/
git commit -m "Add singular tests: no negative charges, positive payment ratio"
```

---

## Task 12: Analytics marts

**Files:**
- Modify: `models/marts/_marts.yml` (append 5 mart entries)
- Create: `models/marts/analytics/mart_national_ratio.sql`
- Create: `models/marts/analytics/mart_yearly_trend.sql`
- Create: `models/marts/analytics/mart_top_procedures.sql`
- Create: `models/marts/analytics/mart_state_ratio.sql`
- Create: `models/marts/analytics/mart_setting_comparison.sql`

- [ ] **Step 1: Write `models/marts/analytics/mart_national_ratio.sql`**

```sql
{{ config(materialized='table') }}

SELECT
    SUM(avg_covered_charges * total_services)    AS total_charges,
    SUM(avg_total_payments * total_services)     AS total_payments,
    {{ cost_payment_ratio(
        'SUM(avg_covered_charges * total_services)',
        'SUM(avg_total_payments * total_services)'
    ) }}                                          AS cost_payment_ratio,
    SUM(total_services)                          AS total_services
FROM {{ ref('fact_provider_procedure_year') }}
```

- [ ] **Step 2: Write `models/marts/analytics/mart_yearly_trend.sql`**

```sql
{{ config(materialized='table') }}

SELECT
    year,
    SUM(avg_covered_charges * total_services)    AS total_charges,
    SUM(avg_total_payments * total_services)     AS total_payments,
    {{ cost_payment_ratio(
        'SUM(avg_covered_charges * total_services)',
        'SUM(avg_total_payments * total_services)'
    ) }}                                          AS cost_payment_ratio,
    SUM(total_services)                          AS total_services
FROM {{ ref('fact_provider_procedure_year') }}
GROUP BY year
ORDER BY year
```

- [ ] **Step 3: Write `models/marts/analytics/mart_top_procedures.sql`**

```sql
{{ config(materialized='table') }}

WITH agg AS (
    SELECT
        p.procedure_code,
        p.procedure_description,
        p.setting,
        SUM(f.total_services)                                        AS total_services,
        SAFE_DIVIDE(SUM(f.avg_covered_charges * f.total_services),
                    SUM(f.total_services))                           AS avg_charges,
        SAFE_DIVIDE(SUM(f.avg_total_payments * f.total_services),
                    SUM(f.total_services))                           AS avg_payments,
        {{ cost_payment_ratio(
            'SUM(f.avg_covered_charges * f.total_services)',
            'SUM(f.avg_total_payments * f.total_services)'
        ) }}                                                          AS cost_payment_ratio
    FROM {{ ref('fact_provider_procedure_year') }} f
    JOIN {{ ref('dim_procedure') }} p USING (procedure_sk)
    WHERE f.total_services >= 100  -- ignore long-tail procedures with sparse data
    GROUP BY 1, 2, 3
),

ranked AS (
    SELECT
        *,
        ROW_NUMBER() OVER (PARTITION BY setting ORDER BY cost_payment_ratio DESC) AS rnk
    FROM agg
)

SELECT
    procedure_code,
    procedure_description,
    setting,
    total_services,
    avg_charges,
    avg_payments,
    cost_payment_ratio
FROM ranked
WHERE rnk <= 20
ORDER BY setting, rnk
```

- [ ] **Step 4: Write `models/marts/analytics/mart_state_ratio.sql`**

```sql
{{ config(materialized='table') }}

SELECT
    g.state_code                                                       AS provider_state,
    g.state_name,
    g.census_region,
    COUNT(DISTINCT f.provider_sk)                                      AS num_providers,
    SUM(f.total_services)                                              AS total_services,
    SAFE_DIVIDE(SUM(f.avg_covered_charges * f.total_services),
                SUM(f.total_services))                                 AS avg_charges,
    SAFE_DIVIDE(SUM(f.avg_total_payments * f.total_services),
                SUM(f.total_services))                                 AS avg_payments,
    {{ cost_payment_ratio(
        'SUM(f.avg_covered_charges * f.total_services)',
        'SUM(f.avg_total_payments * f.total_services)'
    ) }}                                                                AS cost_payment_ratio
FROM {{ ref('fact_provider_procedure_year') }} f
JOIN {{ ref('dim_geography') }} g USING (geo_sk)
GROUP BY 1, 2, 3
ORDER BY cost_payment_ratio DESC
```

- [ ] **Step 5: Write `models/marts/analytics/mart_setting_comparison.sql`**

```sql
{{ config(materialized='table') }}

SELECT
    s.setting_name                                                     AS setting,
    f.year,
    SUM(f.avg_covered_charges * f.total_services)                      AS total_charges,
    SUM(f.avg_total_payments * f.total_services)                       AS total_payments,
    {{ cost_payment_ratio(
        'SUM(f.avg_covered_charges * f.total_services)',
        'SUM(f.avg_total_payments * f.total_services)'
    ) }}                                                                AS cost_payment_ratio,
    SUM(f.total_services)                                              AS total_services
FROM {{ ref('fact_provider_procedure_year') }} f
JOIN {{ ref('dim_setting') }} s USING (setting_sk)
GROUP BY 1, 2
ORDER BY 1, 2
```

- [ ] **Step 6: Append mart docs to `models/marts/_marts.yml`**

Append at the end of the existing `models:` list:

```yaml
  - name: mart_national_ratio
    description: "Single-row mart: national cost-payment ratio rolled up across all years/providers/procedures"
    columns:
      - name: cost_payment_ratio
        tests:
          - not_null

  - name: mart_yearly_trend
    description: "One row per year (2011-2015); national cost-payment ratio trend"
    columns:
      - name: year
        tests: [unique, not_null]
      - name: cost_payment_ratio
        tests: [not_null]

  - name: mart_top_procedures
    description: "Top 20 procedures per setting by cost-payment gap, with min 100 services threshold"
    columns:
      - name: procedure_code
        tests: [not_null]
      - name: setting
        tests:
          - not_null
          - accepted_values:
              values: ['inpatient', 'outpatient']

  - name: mart_state_ratio
    description: "One row per state; cost-payment ratio rolled up"
    columns:
      - name: provider_state
        tests: [unique, not_null]

  - name: mart_setting_comparison
    description: "One row per (setting, year); inpatient vs outpatient over time"
    tests:
      - dbt_utils.unique_combination_of_columns:
          combination_of_columns: [setting, year]
```

- [ ] **Step 7: Build all 5 marts**

```powershell
dbt build --select analytics
```

Expected: 5 marts materialize as tables, all tests pass.

- [ ] **Step 8: Sanity check each mart**

```sql
-- national ratio: 1 row
SELECT * FROM `cms-medicare-analytics.warehouse_dev_marts.mart_national_ratio`;

-- yearly trend: 5 rows
SELECT * FROM `cms-medicare-analytics.warehouse_dev_marts.mart_yearly_trend` ORDER BY year;

-- top procedures: 40 rows (20 per setting)
SELECT setting, COUNT(*) FROM `cms-medicare-analytics.warehouse_dev_marts.mart_top_procedures` GROUP BY setting;

-- state ratio: ~50 rows
SELECT COUNT(*) FROM `cms-medicare-analytics.warehouse_dev_marts.mart_state_ratio`;

-- setting comparison: 10 rows (2 settings × 5 years)
SELECT COUNT(*) FROM `cms-medicare-analytics.warehouse_dev_marts.mart_setting_comparison`;
```

Expected: 1, 5, (inpatient=20, outpatient=20), ~50, 10.

- [ ] **Step 9: Commit**

```
git add models/marts/analytics/ models/marts/_marts.yml
git commit -m "Add 5 analytics marts feeding the Looker Studio dashboard"
```

---

## Task 13: Final dbt build + docs

**Files:**
- Create: `docs/lineage.png` (screenshot of dbt docs lineage graph)
- Create: `analyses/adhoc_provider_outliers.sql`

- [ ] **Step 1: Run a clean full build**

```powershell
dbt clean
dbt deps
dbt seed
dbt build
```

Expected: all 13 models (2 staging + 1 intermediate + 4 dims + 1 fact + 5 marts) + 1 seed build successfully; all tests pass.

- [ ] **Step 2: Generate dbt docs**

```powershell
dbt docs generate
dbt docs serve
```

`dbt docs serve` opens `http://localhost:8080` in a browser showing the docs. Navigate to the **lineage graph** (bottom-right circle icon). Take a screenshot capturing the full lineage from sources through marts.

Save the screenshot as `docs\lineage.png` in the repo.

Stop the docs server with Ctrl+C.

- [ ] **Step 3: Write `analyses/adhoc_provider_outliers.sql`** (ships in repo but NOT built into warehouse — `dbt compile --select adhoc_provider_outliers` produces a runnable query)

```sql
-- Ad-hoc query: top 10 provider × procedure combos by cost-payment ratio
-- (filtered to procedures with at least 500 cumulative services to avoid noise).
-- Useful for the case study's "outlier detection" sidebar.

SELECT
    p.provider_name,
    p.provider_state,
    pr.procedure_code,
    pr.procedure_description,
    pr.setting,
    SUM(f.total_services) AS total_services,
    SAFE_DIVIDE(SUM(f.avg_covered_charges * f.total_services),
                SUM(f.total_services)) AS avg_charges,
    SAFE_DIVIDE(SUM(f.avg_total_payments * f.total_services),
                SUM(f.total_services)) AS avg_payments,
    {{ cost_payment_ratio(
        'SUM(f.avg_covered_charges * f.total_services)',
        'SUM(f.avg_total_payments * f.total_services)'
    ) }} AS cost_payment_ratio
FROM {{ ref('fact_provider_procedure_year') }} f
JOIN {{ ref('dim_provider') }} p USING (provider_sk)
JOIN {{ ref('dim_procedure') }} pr USING (procedure_sk)
GROUP BY 1, 2, 3, 4, 5
HAVING total_services >= 500
ORDER BY cost_payment_ratio DESC
LIMIT 10
```

- [ ] **Step 4: Commit**

```
git add docs/lineage.png analyses/adhoc_provider_outliers.sql
git commit -m "Add dbt docs lineage screenshot + provider outliers analysis"
```

---

## Task 14: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# CMS Medicare Analytics

Cost-vs-payment ratio analysis on Medicare inpatient + outpatient charge data, 2011–2015. dbt-bigquery project with Kimball-style star schema feeding a public Looker Studio dashboard.

**Dashboard:** _to be added when published_
**Lineage:** see `docs/lineage.png`

## What this does

CMS publishes hospital-level Medicare claims with three key amounts per procedure:

- `average_covered_charges` — what the hospital *charges*
- `average_total_payments` — what is *actually paid* (Medicare + patient + secondary insurance)
- `average_medicare_payments` — the Medicare portion of that

This project models the gap: how much hospitals charge vs how much they actually get paid, sliced by procedure, geography, year, and inpatient-vs-outpatient setting.

## Stack

- [dbt-core](https://docs.getdbt.com/) 1.10 + [dbt-bigquery](https://docs.getdbt.com/docs/core/connect-data-platform/bigquery-setup) 1.10
- [BigQuery](https://cloud.google.com/bigquery) (sandbox tier)
- [Looker Studio](https://lookerstudio.google.com/) for the dashboard
- GitHub Actions for CI

## Model structure

```
sources (public CMS tables)
  ↓
staging (views: stg_cms__inpatient_charges, stg_cms__outpatient_charges)
  ↓
intermediate (view: int_provider_procedure_unioned)
  ↓
dimensions (tables: dim_provider, dim_procedure, dim_geography, dim_setting)
  ↓
fact (table: fact_provider_procedure_year)
  ↓
analytics marts (tables: mart_national_ratio, mart_yearly_trend,
                          mart_top_procedures, mart_state_ratio,
                          mart_setting_comparison)
```

13 models, 4 of them dims, surrogate keys via `dbt_utils.generate_surrogate_key`. Singular tests cover negative charges and ratio sanity.

## Running locally

```bash
# 1. Set up a Python venv and install dbt
python -m venv .venv
.venv\Scripts\Activate.ps1   # PowerShell on Windows
pip install -r requirements.txt

# 2. Configure your dbt profile (see profiles.yml.example)
#    Copy profiles.yml.example to ~/.dbt/profiles.yml and fill in keyfile path.

# 3. Build everything
dbt deps
dbt seed
dbt build
```

## CI

GitHub Actions runs `dbt build` on every push. The service account key is stored as the `GCP_SA_KEY` repo secret.

## License

MIT.
```

- [ ] **Step 2: Commit**

```
git add README.md
git commit -m "Add README"
```

---

## Task 15: GitHub Actions CI

**Files:**
- Create: `.github/workflows/dbt-build.yml`

- [ ] **Step 1: Write `.github/workflows/dbt-build.yml`**

```yaml
name: dbt build

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    env:
      DBT_PROFILES_DIR: ${{ github.workspace }}/.dbt

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: pip

      - name: Install dbt
        run: pip install -r requirements.txt

      - name: Write service account key from secret
        run: |
          mkdir -p .dbt
          echo "$GCP_SA_KEY" > .dbt/cms-analytics-sa.json
        env:
          GCP_SA_KEY: ${{ secrets.GCP_SA_KEY }}

      - name: Write profiles.yml
        run: |
          cat > .dbt/profiles.yml <<'EOF'
          cms_medicare:
            target: ci
            outputs:
              ci:
                type: bigquery
                method: service-account
                keyfile: ${{ github.workspace }}/.dbt/cms-analytics-sa.json
                project: cms-medicare-analytics
                dataset: warehouse_ci
                location: US
                threads: 4
                timeout_seconds: 300
                priority: interactive
          EOF

      - name: dbt deps
        run: dbt deps

      - name: dbt seed
        run: dbt seed --target ci

      - name: dbt build
        run: dbt build --target ci
```

- [ ] **Step 2: User MANUAL: add `GCP_SA_KEY` secret to the repo**

After pushing the repo (Task 16), open:

`https://github.com/awgdawg/cms-medicare-analytics/settings/secrets/actions`

Click **New repository secret**. Name: `GCP_SA_KEY`. Value: paste the **full contents** of `C:\Users\auglt\.dbt\cms-analytics-sa.json` (the JSON, not the file path).

(Document this in the README — see Task 14.)

- [ ] **Step 3: Commit**

```
git add .github/workflows/dbt-build.yml
git commit -m "Add GitHub Actions CI: dbt build on push"
```

---

## Task 16: Create GitHub remote + push

**Files:** none (GitHub config only)

- [ ] **Step 1: User MANUAL: create the GitHub repo**

Go to https://github.com/new:
- Repository name: `cms-medicare-analytics`
- Owner: `awgdawg`
- Visibility: **Public**
- DO NOT check "Add a README", ".gitignore", or "Add license" — we have them locally

Click **Create repository**.

- [ ] **Step 2: Add remote and push**

```powershell
cd E:\PyProj\cms-medicare-analytics
git remote add origin https://github.com/awgdawg/cms-medicare-analytics.git
git push -u origin main
```

- [ ] **Step 3: User MANUAL: add the `GCP_SA_KEY` secret**

(See Task 15 Step 2.)

- [ ] **Step 4: Trigger first CI run**

Push any small change to trigger CI. Easiest: amend the README:

```powershell
# Bump README
"`n`n<!-- ci kick -->`n" | Add-Content README.md
git add README.md
git commit -m "Trigger first CI run"
git push
```

Watch the run at `https://github.com/awgdawg/cms-medicare-analytics/actions`.

Expected: workflow passes (green check). If it fails on auth, re-check the `GCP_SA_KEY` secret was pasted correctly (full JSON, no truncation).

---

## Task 17: Looker Studio dashboard (USER MANUAL with detailed steps)

**Files:** none in repo — this task is performed in the Looker Studio web UI.

- [ ] **Step 1: Open Looker Studio + create a new report**

1. Open https://lookerstudio.google.com/
2. Click **+ Create → Report**
3. When prompted for a data source: **BigQuery** → authenticate if needed
4. Pick the **first** mart: project `cms-medicare-analytics`, dataset `warehouse_dev_marts`, table `mart_national_ratio` → **Add**
5. Report opens in editor

- [ ] **Step 2: Set up the layout — 4 rows**

In the editor, delete the default chart Looker added. Resize the report to standard 1200×800 if needed (Page → Report settings → Custom).

- [ ] **Step 3: Row 1 — National headline KPI**

1. Insert → **Scorecard**
2. Data source: `mart_national_ratio`
3. Metric: `cost_payment_ratio` (use the "Custom format" gear to add ×suffix or just leave the raw number)
4. Style: make the font huge — go to Style tab, label size 24px, number 96px, color `#f5a623` (amber from portfolio palette)
5. Caption text: "$ charged per $1 paid"
6. Position: top of page, full width

- [ ] **Step 4: Row 2 (left) — Yearly trend line chart**

1. Add data source: **+ Add data → BigQuery → mart_yearly_trend → Add**
2. Insert → **Time series chart** (or Line chart)
3. Data source: `mart_yearly_trend`
4. Dimension: `year`
5. Metric: `cost_payment_ratio`
6. Style: line color `#f5a623`, background `#161719`, grid color `#2a2b2e`

- [ ] **Step 5: Row 2 (right) — Inpatient vs Outpatient (bar / slope)**

1. Add data source: `mart_setting_comparison`
2. Insert → **Column chart** (grouped)
3. Dimension: `year`
4. Breakdown dimension: `setting`
5. Metric: `cost_payment_ratio`
6. Style: `inpatient`=amber `#f5a623`, `outpatient`=teal `#4ec9b0`

- [ ] **Step 6: Row 3 — Top 20 procedures by gap**

1. Add data source: `mart_top_procedures`
2. Insert → **Bar chart** (horizontal)
3. Dimension: `procedure_description`
4. Metric: `cost_payment_ratio`
5. Sort: cost_payment_ratio descending
6. Add a **Filter control** above the chart: dimension = `setting`, default value `inpatient` (so the user can toggle)
7. Style: amber bars

- [ ] **Step 7: Row 4 — State choropleth**

1. Add data source: `mart_state_ratio`
2. Insert → **Geo chart** (Filled map)
3. Geo dimension: `provider_state` → set the geo type to **USA → State** (Looker Studio recognizes state codes)
4. Metric: `cost_payment_ratio`
5. Style: color scale low → high (white → amber)

- [ ] **Step 8: Theme the report**

Page → Theme and layout → **Custom** → set background to `#0a0a0b`, primary color `#f5a623`, text light. Apply to all pages.

- [ ] **Step 9: Title the report**

At the top, add a Text element: `CMS Medicare · Cost-Payment Gap · 2011-2015`. Subtitle: `Hospital charges vs Medicare reimbursement, modeled with dbt`.

- [ ] **Step 10: Publish + share**

1. Click **Share** (top right)
2. Click **Manage access**
3. Change "Restricted" → **Anyone with the link** → **Viewer**
4. Save

Then **File → Embed report**. Copy the **iframe URL** (just the `src` attribute value). Save this somewhere — you'll paste it into the portfolio in Task 19.

- [ ] **Step 11: Take a screenshot of the finished dashboard**

Save as `dashboard-screenshot.png` somewhere local — useful for the case study page in Task 19.

(No commit yet — Looker Studio config lives in Google's cloud, not the repo. The repo just references the iframe URL.)

---

## Task 18: Update case study + portfolio integration (Part 1: case study page)

**Files (in `E:\PyProj\portfolio`, NOT in cms-medicare-analytics):**
- Modify: `projects/cms-medicare.html`

- [ ] **Step 1: Capture real outcome numbers from the dashboard**

From the Looker Studio dashboard, note down:
- National cost-payment ratio (e.g., `3.42×`)
- The procedure with the widest gap (procedure name + ratio)
- The state with the widest gap (state name + ratio)
- Number of providers in the dataset
- Number of services across all years

These plug into the case-study Outcome section.

- [ ] **Step 2: Replace `E:\PyProj\portfolio\projects\cms-medicare.html` entirely**

Use this template (substituting the `__REAL_NUMBER__` placeholders with values from Step 1):

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>CMS Medicare claims analytics — August Turner</title>
  <meta name="description" content="dbt-bigquery case study: modeled the cost-vs-payment gap on CMS Medicare claims, 2011-2015. Looker Studio dashboard embedded.">
  <meta property="og:type" content="website">
  <meta property="og:title" content="CMS Medicare claims analytics — August Turner">
  <meta property="og:description" content="dbt-bigquery case study: modeled the cost-vs-payment gap on CMS Medicare claims, 2011-2015.">
  <meta property="og:url" content="https://augustturner.dev/projects/cms-medicare.html">
  <meta property="og:image" content="https://augustturner.dev/assets/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="CMS Medicare claims analytics — August Turner">
  <meta name="twitter:description" content="dbt-bigquery case study: modeled the cost-vs-payment gap on CMS Medicare claims, 2011-2015.">
  <meta name="twitter:image" content="https://augustturner.dev/assets/og-image.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oxanium:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
  <link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <nav class="nav">
    <div class="container nav-inner">
      <a href="../" class="nav-brand">aug.turner</a>
      <a href="../#projects" class="nav-links" style="font-family:var(--font-mono);font-size:11px;color:var(--text-dim);letter-spacing:0.12em;text-transform:uppercase;">← back to portfolio</a>
    </div>
  </nav>

  <header class="cs-container cs-header">
    <div class="cs-crumb">// projects / case-study · 02</div>
    <h1 class="cs-title">CMS Medicare<br>claims analytics.</h1>
    <p class="cs-subtitle">A dbt-bigquery project modeling the gap between what providers charge for Medicare services and what Medicare actually pays them. Five years of public claims data, Kimball star schema, dashboard embedded below.</p>
    <div class="cs-meta">
      <div class="cs-meta-item"><div class="lbl">// dataset</div><div class="val">bigquery-public-data.cms_medicare</div></div>
      <div class="cs-meta-item"><div class="lbl">// type</div><div class="val"><span class="badge live">bigquery · live</span></div></div>
    </div>
  </header>

  <div class="cs-container cs-body">
    <aside class="cs-toc">
      <div class="toc-label">// contents</div>
      <ul>
        <li class="active"><a href="#problem">01 · Problem</a></li>
        <li><a href="#approach">02 · Approach</a></li>
        <li><a href="#outcome">03 · Outcome</a></li>
        <li><a href="#stack">04 · Stack</a></li>
        <li><a href="#links">05 · Links</a></li>
      </ul>
    </aside>

    <main id="main">
      <section id="problem" class="cs-section">
        <div class="cs-section-num">// 01 / problem</div>
        <h2>Hospital charges vs Medicare reimbursement.</h2>
        <p>Medicare publishes provider-level charge and payment data — but raw, in 10 separate yearly tables, with inconsistent column names between inpatient and outpatient settings. To analyze the <strong>cost-vs-payment gap</strong> — what hospitals bill compared to what's actually paid — you need to harmonize the schemas, parse procedure codes from natural-language strings, and join against a clean dimensional model.</p>
        <p>Without that scaffolding, every analytical question becomes a one-off SQL adventure.</p>
      </section>

      <section id="approach" class="cs-section">
        <div class="cs-section-num">// 02 / approach</div>
        <h2>dbt-bigquery, Kimball-style.</h2>
        <p>Built a <strong>13-model dbt project</strong> with the standard staging → intermediate → marts layering, plus a star schema (4 dimensions + 1 fact) under the marts layer. All transformations are SQL-only, materialized to BigQuery tables for fast dashboard reads.</p>
        <pre class="code-block"><span class="sql-comment">-- fact_provider_procedure_year.sql</span>
<span class="sql-comment">-- Generates surrogate keys matching the dim formulas — joins line up by hash equality.</span>
<span class="sql-keyword">SELECT</span>
  {{ dbt_utils.generate_surrogate_key(['s.provider_id']) }}                  <span class="sql-keyword">AS</span> provider_sk,
  {{ dbt_utils.generate_surrogate_key(['s.procedure_code', 's.setting']) }}  <span class="sql-keyword">AS</span> procedure_sk,
  {{ dbt_utils.generate_surrogate_key(['s.provider_state']) }}               <span class="sql-keyword">AS</span> geo_sk,
  s.year, s.total_services, s.avg_covered_charges, s.avg_total_payments,
  {{ <span class="sql-fn">cost_payment_ratio</span>('s.avg_covered_charges', 's.avg_total_payments') }} <span class="sql-keyword">AS</span> cost_payment_ratio
<span class="sql-keyword">FROM</span> {{ <span class="sql-fn">ref</span>('int_provider_procedure_unioned') }} s;</pre>
        <ul>
          <li>Sources: 10 public CMS Medicare tables (inpatient + outpatient × 5 years)</li>
          <li>Staging unions years and normalizes column names; intermediate parses the embedded procedure codes</li>
          <li>Tests: surrogate-key uniqueness, referential integrity to dims, no-negative-charges, ratio sanity</li>
          <li>CI: GitHub Actions runs <code class="mono">dbt build</code> on every push</li>
        </ul>
      </section>

      <section id="outcome" class="cs-section">
        <div class="cs-section-num">// 03 / outcome</div>
        <h2>The gap, quantified.</h2>
        <div class="outcome-grid">
          <div class="outcome"><div class="lbl">national ratio</div><div class="val">__NATIONAL_RATIO__</div></div>
          <div class="outcome"><div class="lbl">providers analyzed</div><div class="val">__PROVIDER_COUNT__</div></div>
          <div class="outcome"><div class="lbl">years of data</div><div class="val">5</div></div>
        </div>
        <p>Hospitals charge an average <strong>__NATIONAL_RATIO__ what Medicare pays</strong> — and that ratio varies dramatically by procedure (the highest-gap procedure runs around __TOP_PROCEDURE_RATIO__) and by state (__TOP_STATE_RATIO__ in __TOP_STATE_NAME__). The dashboard at the bottom of the portfolio homepage embeds the full Looker Studio report.</p>
        <p>The whole pipeline ships as a clean dbt project — lineage docs, tests, CI all in place. Code in the repo below.</p>
      </section>

      <section id="stack" class="cs-section">
        <div class="cs-section-num">// 04 / stack</div>
        <h2>Stack.</h2>
        <div class="pill-row">
          <span class="pill">dbt-core</span>
          <span class="pill">dbt-bigquery</span>
          <span class="pill">BigQuery</span>
          <span class="pill">Looker Studio</span>
          <span class="pill">Python</span>
          <span class="pill">GitHub Actions</span>
          <span class="pill">SQL</span>
        </div>
      </section>

      <section id="links" class="cs-section">
        <div class="cs-section-num">// 05 / links</div>
        <h2>References.</h2>
        <div class="link-row">
          <div class="link-card"><div class="lbl">// repo</div><div class="val"><a href="https://github.com/awgdawg/cms-medicare-analytics" target="_blank" rel="noopener" style="color:var(--accent)">↗ github.com/awgdawg/cms-medicare-analytics</a></div></div>
          <div class="link-card"><div class="lbl">// dashboard</div><div class="val"><a href="__LOOKER_STUDIO_PUBLIC_URL__" target="_blank" rel="noopener" style="color:var(--accent)">↗ open in Looker Studio</a></div></div>
        </div>
      </section>
    </main>
  </div>

  <footer class="footer">
    <div class="container footer-inner">
      <span>aug.turner / 2026 · KC, MO</span>
      <span>built with ♥ + SQL</span>
    </div>
  </footer>

  <script>
    const tocLinks = document.querySelectorAll('.cs-toc li');
    const sections = document.querySelectorAll('.cs-section[id]');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const id = e.target.id;
        tocLinks.forEach((li) => li.classList.toggle('active', li.querySelector('a').getAttribute('href') === '#' + id));
      });
    }, { rootMargin: '-30% 0px -65% 0px' });
    sections.forEach((s) => obs.observe(s));
  </script>
</body>
</html>
```

Substitute the `__PLACEHOLDER__` tokens with the real values captured in Step 1 (use Edit with replace_all=false for each, since the values are unique).

- [ ] **Step 3: Verify the page renders locally**

```powershell
# Start preview if not already running
# (preview_start with name "portfolio-site")
```

Then `mcp__Claude_Preview__preview_eval` with `window.location.href = '/projects/cms-medicare.html'; 'navigated'`, then `preview_screenshot`. Expected: full case-study layout with the 5 sections, the outcome cards showing real numbers, the SQL block rendering, and the badge showing `bigquery · live` (teal).

`preview_console_logs` — clean.

- [ ] **Step 4: Commit (in the PORTFOLIO repo)**

```powershell
cd E:\PyProj\portfolio
git add projects/cms-medicare.html
git commit -m "Rewrite CMS Medicare case study with real outcome numbers"
```

(Don't push yet — bundle with Task 19's changes.)

---

## Task 19: Portfolio integration (Part 2: homepage card + live iframe)

**Files (in `E:\PyProj\portfolio`):**
- Modify: `index.html` (project card badge + live iframe section)

- [ ] **Step 1: Update the CMS Medicare project card badge to "live"**

In `E:\PyProj\portfolio\index.html`, find:

```html
    <a class="proj" href="projects/cms-medicare.html">
      <div class="proj-top"><span>// bigquery</span><span class="badge planned">planned</span></div>
```

Change `badge planned">planned` to `badge live">live`:

```html
    <a class="proj" href="projects/cms-medicare.html">
      <div class="proj-top"><span>// bigquery</span><span class="badge live">live</span></div>
```

- [ ] **Step 2: Replace the BQ embed placeholder with the iframe**

Find this block:

```html
  <div class="bq-embed" id="bq-embed">
    <div class="bq-placeholder">
      <div class="bq-placeholder-title">[ Looker Studio embed pending ]</div>
      <div class="bq-placeholder-sub">— ships with the CMS Medicare project —</div>
    </div>
  </div>
```

Replace with:

```html
  <div class="bq-embed" id="bq-embed">
    <iframe src="__LOOKER_STUDIO_PUBLIC_EMBED_URL__"
            style="width:100%;height:100%;border:0;"
            loading="lazy"
            title="CMS Medicare cost-payment gap dashboard"
            allowfullscreen></iframe>
  </div>
```

Substitute `__LOOKER_STUDIO_PUBLIC_EMBED_URL__` with the iframe URL captured in Task 17 Step 10.

- [ ] **Step 3: Verify locally**

`preview_eval`:
```js
window.location.href = '/'; 'navigated'
```

Then `preview_screenshot`. Expected:
- The CMS Medicare card on the homepage now has a teal `live` badge
- The "Live BigQuery board" section shows the Looker Studio dashboard (not the placeholder)

`preview_console_logs` — should show no errors. Iframes from Looker Studio may log warnings about third-party cookies; those are expected and harmless.

- [ ] **Step 4: Commit + push**

```powershell
cd E:\PyProj\portfolio
git add index.html
git commit -m "Embed Looker Studio dashboard; flip CMS Medicare card to live"
git push
```

GitHub Pages will rebuild the live site in ~30s–2min. Verify at https://augustturner.dev/ that:
- The CMS Medicare card badge is teal
- The "// 05 / live" section loads the embedded dashboard
- `https://augustturner.dev/projects/cms-medicare.html` shows the new case study

---

## Task 20: Final verification

**Files:** none (validation only)

- [ ] **Step 1: Re-run Lighthouse on the live site**

Open https://pagespeed.web.dev/analysis?url=https://augustturner.dev — capture Mobile and Desktop scores.

The iframe addition (Looker Studio) might drop Performance by a few points because of the embedded third-party content. Acceptable target: Performance ≥ 85 mobile, ≥ 95 desktop. Accessibility should stay 100. If Performance drops below those, options:
- Add `loading="lazy"` (already in the iframe code above)
- Wrap the iframe in an "intersection observer reveal" so it only loads when scrolled into view (extension of `app.js`)

- [ ] **Step 2: Verify all spec-checklist items**

Tick through the verification checklist in `docs/superpowers/specs/2026-05-26-cms-medicare-bq-design.md` §7. Anything that fails, file a follow-up — don't try to fix at the end of an already-long plan.

- [ ] **Step 3: Capture a "shipped" screenshot**

For the portfolio summary / LinkedIn post: take a screenshot of the live BQ section of https://augustturner.dev (showing the dashboard embedded). This is great announcement material.

- [ ] **Step 4: Update memory (Claude memory, not the user's)**

After the project ships, the controller of this plan should update `C:\Users\auglt\.claude\projects\C--Users-auglt\memory\project_job_search.md` to note that the CMS Medicare project is shipped (so the next session knows to move on to the NYC Taxi or GitHub Archive projects).

---

## Self-Review

**1. Spec coverage:**

| Spec section | Task(s) implementing it |
|---|---|
| §1 Goal | Cumulative result of Tasks 1–20 |
| §2 Architecture & repo layout | Tasks 1, 3 |
| §2 Auth | Task 2 |
| §2 Materialization strategy | Task 3 (`dbt_project.yml` `+materialized` directives) |
| §3.1 Sources | Task 4 |
| §3.2 Staging | Task 5 |
| §3.3 Intermediate | Task 8 |
| §3.4 Dimensions | Task 9 |
| §3.5 Fact | Task 10 |
| §3.6 Macros | Task 7 |
| §3.7 Tests | Tasks 5, 9, 10, 11 (singular tests) |
| §4 Marts | Task 12 |
| §5 Dashboard | Task 17 |
| §6 Portfolio integration | Tasks 18, 19 |
| §7 Verification & launch | Task 20 + per-task `dbt build` validations |
| §8 Out of v1 scope | Not implemented, as expected |

No gaps.

**2. Placeholder scan:** All step bodies have complete code or commands. The "filled in after" templating in Task 18 uses `__PLACEHOLDER__` tokens — these are *intentional* and the step text describes the exact substitution. Not a plan-failure placeholder.

**3. Type / name consistency:**
- `provider_sk`, `procedure_sk`, `geo_sk`, `setting_sk` — used identically across dims and fact ✓
- `cost_payment_ratio` macro is referenced by name `cost_payment_ratio` in 6 places (int + fact + 4 marts) ✓
- `mart_*` table names match between Task 12 and Task 17 dashboard data sources ✓
- `warehouse_dev_*` dataset names appear consistent across Tasks 5, 9, 10, 12, and the sanity-check queries ✓
- GitHub repo name `awgdawg/cms-medicare-analytics` consistent across Tasks 14, 15, 16, 18 ✓

Plan ready for execution.
