# KC Blight Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public BigQuery + dbt analytics project tracing the 15-year lifecycle of Kansas City property blight (violation → repeat → dangerous building → demolition), fed by a Python extract-load layer from the KCMO Socrata portal, dashboarded in Looker Studio, and surfaced on the portfolio.

**Architecture:** A Python EL script pulls three KCMO Socrata datasets into a fixed `kc_blight_raw` BigQuery dataset. dbt transforms them through staging → intermediate → marts, producing a Kimball star with a transaction-grain `fact_violation` and an accumulating-snapshot `fact_property_lifecycle`. GitHub Actions runs `dbt build` on push (`ci` target) and a scheduled refresh (`prod` target, which the dashboard reads). Looker Studio embeds into a new tabbed live section on the portfolio.

**Tech Stack:** Python 3.10, sodapy, google-cloud-bigquery, dbt-core 1.10.4, dbt-bigquery 1.10.1, dbt_utils, BigQuery, Looker Studio, GitHub Actions, gitleaks.

**Reference spec:** `docs/superpowers/specs/2026-05-28-kc-blight-lifecycle-design.md`

**Conventions for every dbt task below:**
- "Build" = `dbt build --select <model> --target dev` (compiles, materializes, runs that model's tests).
- Commit after each green task. Use the project repo `E:\PyProj\kc-blight-analytics` for all dbt/EL commits; portfolio tasks (24–26) commit in `E:\PyProj\portfolio`.
- Run all `dbt`/`python` commands from the activated venv at `E:\PyProj\kc-blight-analytics\.venv`.

---

## Task 1: Bootstrap project repo

**Files:**
- Create: `E:\PyProj\kc-blight-analytics\.gitignore`
- Create: `E:\PyProj\kc-blight-analytics\requirements.txt`
- Create: `E:\PyProj\kc-blight-analytics\.pre-commit-config.yaml`
- Create: `E:\PyProj\kc-blight-analytics\README.md`

- [ ] **Step 1: Create the directory and venv**

```powershell
py -3.10 -m venv E:\PyProj\kc-blight-analytics\.venv
E:\PyProj\kc-blight-analytics\.venv\Scripts\Activate.ps1
```

- [ ] **Step 2: Write `requirements.txt`**

```
dbt-core==1.10.4
dbt-bigquery==1.10.1
sodapy==2.2.0
google-cloud-bigquery==3.25.0
PyYAML==6.0.2
```

- [ ] **Step 3: Write `.gitignore`**

```
# Secrets — NEVER commit
.env
.env.*
*.pem
*.key
*.p12
*.json

# dbt
target/
dbt_packages/
logs/

# Python
.venv/
__pycache__/
*.pyc

# OS / editor
.DS_Store
Thumbs.db
.vscode/
.idea/
```

- [ ] **Step 4: Write `.pre-commit-config.yaml`**

```yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
        name: gitleaks (scan for secrets)
```

- [ ] **Step 5: Write `README.md` (stub — finalized in Task 19)**

```markdown
# KC Blight Lifecycle Analytics

Tracing 15 years of Kansas City property blight — from first code violation
to dangerous-building designation and demolition — with a Python extract-load
layer, dbt on BigQuery, and Looker Studio.

See `docs/` for lineage and the linked case study at https://augustturner.dev.

## Status
Work in progress — see the implementation plan.
```

- [ ] **Step 6: Install deps and init git**

```powershell
pip install -r requirements.txt
git -C E:\PyProj\kc-blight-analytics init
```

- [ ] **Step 7: Commit**

```powershell
git -C E:\PyProj\kc-blight-analytics add .gitignore requirements.txt .pre-commit-config.yaml README.md
git -C E:\PyProj\kc-blight-analytics commit -m "Bootstrap repo: gitignore, requirements, gitleaks, README"
```

---

## Task 2: dbt project skeleton + profile

**Files:**
- Create: `E:\PyProj\kc-blight-analytics\dbt_project.yml`
- Create: `E:\PyProj\kc-blight-analytics\packages.yml`
- Create: `E:\PyProj\kc-blight-analytics\profiles.yml.example`
- Modify: `C:\Users\auglt\.dbt\profiles.yml` (add `kc_blight` profile — NOT in repo)

- [ ] **Step 1: Write `dbt_project.yml`**

```yaml
name: 'kc_blight'
version: '1.0.0'
config-version: 2

profile: 'kc_blight'

model-paths: ["models"]
analysis-paths: ["analyses"]
test-paths: ["tests"]
seed-paths: ["seeds"]
macro-paths: ["macros"]

clean-targets:
  - "target"
  - "dbt_packages"

models:
  kc_blight:
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

vars:
  raw_dataset: 'kc_blight_raw'
```

- [ ] **Step 2: Write `packages.yml`**

```yaml
packages:
  - package: dbt-labs/dbt_utils
    version: 1.3.0
```

- [ ] **Step 3: Write `profiles.yml.example`**

```yaml
kc_blight:
  target: dev
  outputs:
    dev:
      type: bigquery
      method: service-account
      project: cms-medicare-analytics
      dataset: kc_blight_dev
      keyfile: C:\Users\auglt\.dbt\cms-analytics-sa.json
      location: US
      threads: 4
    ci:
      type: bigquery
      method: service-account-json
      project: cms-medicare-analytics
      dataset: kc_blight_ci
      keyfile_json: "{{ env_var('GCP_SA_KEY') }}"
      location: US
      threads: 4
    prod:
      type: bigquery
      method: service-account-json
      project: cms-medicare-analytics
      dataset: kc_blight_prod
      keyfile_json: "{{ env_var('GCP_SA_KEY') }}"
      location: US
      threads: 4
```

- [ ] **Step 4: Add the `kc_blight` profile to the real `C:\Users\auglt\.dbt\profiles.yml`**

Append the exact block from Step 3 to the existing `profiles.yml` (which already holds `cms_medicare`). Keep the real `keyfile` path. For local `--target prod` runs, set the env var first: `$env:GCP_SA_KEY = Get-Content C:\Users\auglt\.dbt\cms-analytics-sa.json -Raw`.

- [ ] **Step 5: Install dbt packages and verify connection**

```powershell
cd E:\PyProj\kc-blight-analytics
dbt deps
dbt debug --target dev
```
Expected: `dbt deps` installs dbt_utils; `dbt debug` ends with "All checks passed!".

- [ ] **Step 6: Commit**

```powershell
git -C E:\PyProj\kc-blight-analytics add dbt_project.yml packages.yml profiles.yml.example package-lock.yml
git -C E:\PyProj\kc-blight-analytics commit -m "dbt skeleton: project config, dbt_utils, profile template"
```

---

## Task 3: Ingestion config + extract-load script

**Files:**
- Create: `E:\PyProj\kc-blight-analytics\ingest\datasets.yml`
- Create: `E:\PyProj\kc-blight-analytics\ingest\extract_load.py`
- Create: `E:\PyProj\kc-blight-analytics\ingest\README.md`

- [ ] **Step 1: Write `ingest/datasets.yml`**

```yaml
datasets:
  - id: nhtf-e75a
    table: historical_violations
    mode: frozen
  - id: vq3e-m9ge
    table: npd_violations
    mode: live
  - id: ax3m-jhxx
    table: dangerous_buildings
    mode: live
```

- [ ] **Step 2: Write `ingest/extract_load.py`**

```python
"""Extract KCMO Socrata datasets and load them into BigQuery (kc_blight_raw).

Auth: uses GCP_SA_KEY (JSON string env var) if set, else the service-account
keyfile at ~/.dbt/cms-analytics-sa.json. Socrata app token via SOCRATA_APP_TOKEN
(optional, raises rate limits).

Usage:
    python ingest/extract_load.py                 # live datasets only
    python ingest/extract_load.py --include-frozen  # one-time historical load too
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path

import yaml
from google.cloud import bigquery
from google.oauth2 import service_account
from sodapy import Socrata

DOMAIN = "data.kcmo.org"
RAW_DATASET = "kc_blight_raw"
PAGE_SIZE = 50000


def sanitize_key(key: str) -> str:
    """Make a Socrata field name safe as a BigQuery column name.

    ':@computed_region_9t2m_phkm' -> 'computed_region_9t2m_phkm'
    """
    k = re.sub(r"[^0-9a-zA-Z_]", "_", key).strip("_").lower()
    if k and k[0].isdigit():
        k = "_" + k
    return k


def clean_record(record: dict) -> dict:
    """Sanitize keys and JSON-encode nested values (Socrata point/location)."""
    cleaned = {}
    for key, value in record.items():
        k = sanitize_key(key)
        cleaned[k] = json.dumps(value) if isinstance(value, (dict, list)) else value
    return cleaned


def get_bq_client(project: str) -> bigquery.Client:
    key_json = os.environ.get("GCP_SA_KEY")
    if key_json:
        info = json.loads(key_json)
        creds = service_account.Credentials.from_service_account_info(info)
    else:
        key_path = Path.home() / ".dbt" / "cms-analytics-sa.json"
        creds = service_account.Credentials.from_service_account_file(str(key_path))
    return bigquery.Client(project=project, credentials=creds)


def load_dataset(socrata: Socrata, bq: bigquery.Client, project: str, cfg: dict) -> int:
    table_id = f"{project}.{RAW_DATASET}.{cfg['table']}"
    offset = 0
    total = 0
    schema = None  # established from the first page, reused for appends
    while True:
        rows = socrata.get(cfg["id"], limit=PAGE_SIZE, offset=offset)
        if not rows:
            break
        cleaned = [clean_record(r) for r in rows]
        if schema is None:
            job_config = bigquery.LoadJobConfig(
                autodetect=True,
                write_disposition="WRITE_TRUNCATE",
                source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
            )
            bq.load_table_from_json(cleaned, table_id, job_config=job_config).result()
            schema = bq.get_table(table_id).schema
        else:
            job_config = bigquery.LoadJobConfig(
                schema=schema,
                write_disposition="WRITE_APPEND",
                source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
            )
            bq.load_table_from_json(cleaned, table_id, job_config=job_config).result()
        total += len(cleaned)
        offset += PAGE_SIZE
        print(f"  {cfg['table']}: {total} rows loaded...")
        if len(rows) < PAGE_SIZE:
            break
    if total == 0:
        print(f"ERROR: {cfg['table']} loaded 0 rows", file=sys.stderr)
        sys.exit(1)
    print(f"DONE {cfg['table']}: {total} rows")
    return total


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--include-frozen", action="store_true",
                        help="also (re)load datasets marked frozen")
    parser.add_argument("--project", default="cms-medicare-analytics")
    args = parser.parse_args()

    cfg_path = Path(__file__).parent / "datasets.yml"
    datasets = yaml.safe_load(cfg_path.read_text())["datasets"]

    socrata = Socrata(DOMAIN, os.environ.get("SOCRATA_APP_TOKEN"), timeout=120)
    bq = get_bq_client(args.project)
    bq.create_dataset(f"{args.project}.{RAW_DATASET}", exists_ok=True)

    for cfg in datasets:
        if cfg.get("mode") == "frozen" and not args.include_frozen:
            print(f"SKIP frozen {cfg['table']} (use --include-frozen to load)")
            continue
        print(f"Loading {cfg['table']} from {cfg['id']}...")
        load_dataset(socrata, bq, args.project, cfg)


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Write `ingest/README.md`**

```markdown
# Ingestion (EL)

Pulls KCMO Socrata datasets into BigQuery `kc_blight_raw`.

## One-time full load (includes the frozen historical table)
```
python ingest/extract_load.py --include-frozen
```

## Routine refresh (live datasets only; what the scheduled Action runs)
```
python ingest/extract_load.py
```

Auth: set `GCP_SA_KEY` (service-account JSON string) or rely on
`~/.dbt/cms-analytics-sa.json`. Optional `SOCRATA_APP_TOKEN` raises rate limits.
```

- [ ] **Step 4: Commit**

```powershell
git -C E:\PyProj\kc-blight-analytics add ingest/
git -C E:\PyProj\kc-blight-analytics commit -m "Add Socrata extract-load script + dataset config"
```

---

## Task 4: Run the one-time full load + inspect raw schema

**Files:** none (data + verification)

- [ ] **Step 1: Run the full load (this populates all 3 raw tables)**

```powershell
python ingest/extract_load.py --include-frozen
```
Expected: three "DONE" lines with row counts roughly `historical_violations: ~800000`, `npd_violations: ~175000`, `dangerous_buildings: few thousand`. (Historical takes the longest — ~16 pages.)

- [ ] **Step 2: Inspect the actual loaded columns for each table**

```powershell
dbt show --inline "select column_name, data_type from `cms-medicare-analytics`.kc_blight_raw.INFORMATION_SCHEMA.COLUMNS where table_name='npd_violations' order by ordinal_position" --target dev --limit 60
dbt show --inline "select column_name, data_type from `cms-medicare-analytics`.kc_blight_raw.INFORMATION_SCHEMA.COLUMNS where table_name='historical_violations' order by ordinal_position" --target dev --limit 60
dbt show --inline "select column_name, data_type from `cms-medicare-analytics`.kc_blight_raw.INFORMATION_SCHEMA.COLUMNS where table_name='dangerous_buildings' order by ordinal_position" --target dev --limit 60
```
Expected (key columns to confirm exist — the staging models in Tasks 7–9 depend on these names):
- `npd_violations`: `violationid, casenumber, case_status, street_address, postalcode, chapter, ordinance, description, ord_text, vio_status, date_found, date_to_comply, date_resolved, full_address, pin, incident_location, computed_region_9t2m_phkm`
- `historical_violations`: `id, case_id, status, case_opened, case_closed, violation_code, violation_description, ordinance, chapter, violation_entry_date, address, zip_code, latitude, longitude, pin, council_district, neighborhood`
- `dangerous_buildings`: `casenumber, address, zip_code, case_opened, statusofcase, pin, council_district, location, case_location, neighborhood`

- [ ] **Step 3: Confirm the council-district mapping for NPD**

```powershell
dbt show --inline "select computed_region_9t2m_phkm as cd, count(*) n from `cms-medicare-analytics`.kc_blight_raw.npd_violations group by 1 order by 2 desc" --target dev --limit 20
```
Expected: a small set of district-like values (e.g., 1–6). **If the values do not look like council districts (1–6), instead inspect `computed_region_qizh_zmq5` and use whichever column holds district numbers in `stg_violations__current` (Task 7).** Note the confirmed column name for Task 7.

- [ ] **Step 4: No commit** (data load only). Record any column-name discrepancies from Steps 2–3 to apply in Tasks 7–9.

---

## Task 5: Source declarations

**Files:**
- Create: `E:\PyProj\kc-blight-analytics\models\staging\_sources.yml`

- [ ] **Step 1: Write `_sources.yml`**

```yaml
version: 2

sources:
  - name: kc_blight_raw
    database: cms-medicare-analytics
    schema: kc_blight_raw
    tables:
      - name: npd_violations
      - name: historical_violations
      - name: dangerous_buildings
```

- [ ] **Step 2: Verify dbt resolves the sources**

```powershell
dbt parse --target dev
```
Expected: "Performance info" / no errors; sources resolve.

- [ ] **Step 3: Commit**

```powershell
git -C E:\PyProj\kc-blight-analytics add models/staging/_sources.yml
git -C E:\PyProj\kc-blight-analytics commit -m "Declare kc_blight_raw sources"
```

---

## Task 6: Macros

**Files:**
- Create: `E:\PyProj\kc-blight-analytics\macros\days_between.sql`
- Create: `E:\PyProj\kc-blight-analytics\macros\point_coord.sql`

- [ ] **Step 1: Write `macros/days_between.sql`**

```sql
{% macro days_between(start_date, end_date) %}
    CASE
        WHEN {{ start_date }} IS NULL OR {{ end_date }} IS NULL THEN NULL
        ELSE DATE_DIFF({{ end_date }}, {{ start_date }}, DAY)
    END
{% endmacro %}
```

- [ ] **Step 2: Write `macros/point_coord.sql`**

```sql
{# Extract a coordinate from a Socrata point/location column stored as a JSON
   string: {"type":"Point","coordinates":[lng, lat]}. index 0 = lng, 1 = lat. #}
{% macro point_coord(point_col, index) %}
    SAFE_CAST(JSON_EXTRACT_SCALAR({{ point_col }}, '$.coordinates[{{ index }}]') AS FLOAT64)
{% endmacro %}
```

- [ ] **Step 3: Verify they compile**

```powershell
dbt parse --target dev
```
Expected: no errors.

- [ ] **Step 4: Commit**

```powershell
git -C E:\PyProj\kc-blight-analytics add macros/
git -C E:\PyProj\kc-blight-analytics commit -m "Add days_between + point_coord macros"
```

---

## Task 7: Staging — current violations

**Files:**
- Create: `E:\PyProj\kc-blight-analytics\models\staging\stg_violations__current.sql`

(Column order MUST match `stg_violations__historical` in Task 8 — they get `UNION ALL`'d.)

- [ ] **Step 1: Write `stg_violations__current.sql`**

```sql
{{ config(materialized='view') }}

SELECT
    CAST(violationid AS STRING)                          AS violation_id,
    CAST(casenumber AS STRING)                           AS case_number,
    TRIM(CAST(pin AS STRING))                            AS pin,
    'energov'                                            AS source_system,
    street_address                                       AS street_address,
    full_address                                         AS full_address,
    CAST(postalcode AS STRING)                           AS zip_code,
    TRIM(CAST(computed_region_9t2m_phkm AS STRING))      AS council_district,
    CAST(NULL AS STRING)                                 AS neighborhood,
    {{ point_coord('incident_location', 1) }}           AS latitude,
    {{ point_coord('incident_location', 0) }}           AS longitude,
    CAST(chapter AS STRING)                              AS chapter,
    CAST(ordinance AS STRING)                            AS ordinance,
    CAST(ordinance AS STRING)                            AS violation_code,
    COALESCE(description, ord_text)                      AS violation_description,
    SAFE_CAST(date_found AS DATE)                        AS date_found,
    SAFE_CAST(date_to_comply AS DATE)                    AS date_to_comply,
    SAFE_CAST(date_resolved AS DATE)                     AS date_resolved,
    COALESCE(vio_status, case_status)                    AS status_raw,
    (SAFE_CAST(date_resolved AS DATE) IS NOT NULL)       AS is_resolved
FROM {{ source('kc_blight_raw', 'npd_violations') }}
WHERE violationid IS NOT NULL
```
(If Task 4 Step 3 found district numbers live in a different column, replace `computed_region_9t2m_phkm` accordingly.)

- [ ] **Step 2: Build it**

```powershell
dbt build --select stg_violations__current --target dev
```
Expected: PASS, 1 view created.

- [ ] **Step 3: Sanity-check the output**

```powershell
dbt show --inline "select source_system, count(*) n, count(distinct pin) pins, min(date_found) mn, max(date_found) mx from {{ ref('stg_violations__current') }} group by 1" --target dev
```
Expected: ~175K rows, `source_system='energov'`, dates roughly 2021→2025.

- [ ] **Step 4: Commit**

```powershell
git -C E:\PyProj\kc-blight-analytics add models/staging/stg_violations__current.sql
git -C E:\PyProj\kc-blight-analytics commit -m "Add stg_violations__current"
```

---

## Task 8: Staging — historical violations

**Files:**
- Create: `E:\PyProj\kc-blight-analytics\models\staging\stg_violations__historical.sql`

- [ ] **Step 1: Write `stg_violations__historical.sql`** (identical column order to Task 7)

```sql
{{ config(materialized='view') }}

SELECT
    CAST(id AS STRING)                                   AS violation_id,
    CAST(case_id AS STRING)                              AS case_number,
    TRIM(CAST(pin AS STRING))                            AS pin,
    'historical'                                         AS source_system,
    address                                              AS street_address,
    address                                              AS full_address,
    CAST(zip_code AS STRING)                             AS zip_code,
    TRIM(CAST(council_district AS STRING))               AS council_district,
    neighborhood                                         AS neighborhood,
    SAFE_CAST(latitude AS FLOAT64)                       AS latitude,
    SAFE_CAST(longitude AS FLOAT64)                      AS longitude,
    CAST(chapter AS STRING)                              AS chapter,
    CAST(ordinance AS STRING)                            AS ordinance,
    CAST(violation_code AS STRING)                       AS violation_code,
    violation_description                                AS violation_description,
    SAFE_CAST(COALESCE(violation_entry_date, case_opened) AS DATE) AS date_found,
    CAST(NULL AS DATE)                                   AS date_to_comply,
    SAFE_CAST(case_closed AS DATE)                       AS date_resolved,
    status                                               AS status_raw,
    (SAFE_CAST(case_closed AS DATE) IS NOT NULL OR LOWER(status) = 'closed') AS is_resolved
FROM {{ source('kc_blight_raw', 'historical_violations') }}
WHERE id IS NOT NULL
```

- [ ] **Step 2: Build it**

```powershell
dbt build --select stg_violations__historical --target dev
```
Expected: PASS, 1 view created.

- [ ] **Step 3: Sanity-check**

```powershell
dbt show --inline "select source_system, count(*) n, count(distinct pin) pins, min(date_found) mn, max(date_found) mx from {{ ref('stg_violations__historical') }} group by 1" --target dev
```
Expected: ~800K rows, dates roughly 2009→2021.

- [ ] **Step 4: Commit**

```powershell
git -C E:\PyProj\kc-blight-analytics add models/staging/stg_violations__historical.sql
git -C E:\PyProj\kc-blight-analytics commit -m "Add stg_violations__historical"
```

---

## Task 9: Staging — dangerous buildings + staging tests

**Files:**
- Create: `E:\PyProj\kc-blight-analytics\models\staging\stg_dangerous_buildings.sql`
- Create: `E:\PyProj\kc-blight-analytics\models\staging\_stg_models.yml`

- [ ] **Step 1: Write `stg_dangerous_buildings.sql`** (deduped to one row per PIN)

```sql
{{ config(materialized='view') }}

WITH ranked AS (
    SELECT
        TRIM(CAST(pin AS STRING))                       AS pin,
        CAST(casenumber AS STRING)                      AS case_number,
        address                                         AS street_address,
        location                                        AS full_address,
        CAST(zip_code AS STRING)                        AS zip_code,
        TRIM(CAST(council_district AS STRING))          AS council_district,
        neighborhood                                    AS neighborhood,
        {{ point_coord('case_location', 1) }}           AS latitude,
        {{ point_coord('case_location', 0) }}           AS longitude,
        SAFE_CAST(case_opened AS DATE)                  AS case_opened,
        statusofcase                                    AS status_of_case,
        ROW_NUMBER() OVER (
            PARTITION BY TRIM(CAST(pin AS STRING))
            ORDER BY SAFE_CAST(case_opened AS DATE) DESC
        )                                               AS rn
    FROM {{ source('kc_blight_raw', 'dangerous_buildings') }}
    WHERE pin IS NOT NULL AND TRIM(CAST(pin AS STRING)) != ''
)
SELECT
    pin, case_number, street_address, full_address, zip_code,
    council_district, neighborhood, latitude, longitude,
    case_opened, status_of_case,
    (LOWER(status_of_case) LIKE '%demolition%'
     OR LOWER(status_of_case) LIKE '%demolish%')        AS is_demolition_status
FROM ranked
WHERE rn = 1
```

- [ ] **Step 2: Write `_stg_models.yml`** (tests for all three staging models)

```yaml
version: 2

models:
  - name: stg_violations__current
    columns:
      - name: violation_id
        tests: [not_null]
      - name: source_system
        tests:
          - accepted_values:
              values: ['energov']

  - name: stg_violations__historical
    columns:
      - name: violation_id
        tests: [not_null]
      - name: source_system
        tests:
          - accepted_values:
              values: ['historical']

  - name: stg_dangerous_buildings
    columns:
      - name: pin
        tests: [not_null, unique]
```

- [ ] **Step 3: Build all staging models + tests**

```powershell
dbt build --select staging --target dev
```
Expected: 3 views, all tests PASS. (If `stg_dangerous_buildings.pin` uniqueness fails, the ROW_NUMBER dedupe needs a stricter tiebreaker — add `, case_number` to the ORDER BY.)

- [ ] **Step 4: Commit**

```powershell
git -C E:\PyProj\kc-blight-analytics add models/staging/stg_dangerous_buildings.sql models/staging/_stg_models.yml
git -C E:\PyProj\kc-blight-analytics commit -m "Add stg_dangerous_buildings + staging tests"
```

---

## Task 10: Intermediate — unioned violations

**Files:**
- Create: `E:\PyProj\kc-blight-analytics\models\intermediate\int_violations_unioned.sql`

- [ ] **Step 1: Write `int_violations_unioned.sql`**

```sql
{{ config(materialized='view') }}

WITH unioned AS (
    SELECT * FROM {{ ref('stg_violations__current') }}
    UNION ALL
    SELECT * FROM {{ ref('stg_violations__historical') }}
)
SELECT
    *,
    {{ days_between('date_found', 'COALESCE(date_resolved, CURRENT_DATE())') }} AS days_open
FROM unioned
```

- [ ] **Step 2: Build it**

```powershell
dbt build --select int_violations_unioned --target dev
```
Expected: PASS. If it errors on UNION column mismatch, align column order/types between the two staging models.

- [ ] **Step 3: Sanity-check the combined history**

```powershell
dbt show --inline "select source_system, count(*) n, min(date_found) mn, max(date_found) mx from {{ ref('int_violations_unioned') }} group by 1" --target dev
```
Expected: two rows (energov + historical) summing to ~975K, spanning 2009→2025.

- [ ] **Step 4: Commit**

```powershell
git -C E:\PyProj\kc-blight-analytics add models/intermediate/int_violations_unioned.sql
git -C E:\PyProj\kc-blight-analytics commit -m "Add int_violations_unioned (15-year history)"
```

---

## Task 11: Intermediate — property rollup + dangerous-by-pin

**Files:**
- Create: `E:\PyProj\kc-blight-analytics\models\intermediate\int_property_rollup.sql`
- Create: `E:\PyProj\kc-blight-analytics\models\intermediate\int_dangerous_building_by_pin.sql`

- [ ] **Step 1: Write `int_property_rollup.sql`**

```sql
{{ config(materialized='view') }}

WITH base AS (
    SELECT * FROM {{ ref('int_violations_unioned') }}
    WHERE pin IS NOT NULL AND pin != ''
),

attrs AS (
    SELECT
        pin, street_address, full_address, zip_code, council_district,
        latitude, longitude,
        ROW_NUMBER() OVER (PARTITION BY pin ORDER BY date_found DESC) AS rn
    FROM base
),

recent AS (
    SELECT pin, street_address, full_address, zip_code, council_district, latitude, longitude
    FROM attrs WHERE rn = 1
),

agg AS (
    SELECT
        pin,
        MIN(date_found)               AS first_violation_date,
        MAX(date_found)               AS last_violation_date,
        COUNT(*)                      AS total_violations,
        COUNT(DISTINCT violation_code) AS distinct_violation_types,
        COUNTIF(is_resolved)          AS resolved_violations,
        AVG(days_open)                AS avg_days_open,
        MAX(neighborhood)             AS neighborhood
    FROM base
    GROUP BY pin
)

SELECT
    a.pin,
    a.first_violation_date,
    a.last_violation_date,
    a.total_violations,
    a.distinct_violation_types,
    a.resolved_violations,
    a.avg_days_open,
    r.street_address, r.full_address, r.zip_code, r.council_district,
    a.neighborhood, r.latitude, r.longitude
FROM agg a
JOIN recent r USING (pin)
```

- [ ] **Step 2: Write `int_dangerous_building_by_pin.sql`**

```sql
{{ config(materialized='view') }}

SELECT
    pin,
    case_opened AS dangerous_building_date,
    status_of_case,
    is_demolition_status
FROM {{ ref('stg_dangerous_buildings') }}
```

- [ ] **Step 3: Build both**

```powershell
dbt build --select int_property_rollup int_dangerous_building_by_pin --target dev
```
Expected: PASS.

- [ ] **Step 4: Sanity-check one-row-per-pin**

```powershell
dbt show --inline "select count(*) rows, count(distinct pin) pins from {{ ref('int_property_rollup') }}" --target dev
```
Expected: `rows == pins`.

- [ ] **Step 5: Commit**

```powershell
git -C E:\PyProj\kc-blight-analytics add models/intermediate/int_property_rollup.sql models/intermediate/int_dangerous_building_by_pin.sql
git -C E:\PyProj\kc-blight-analytics commit -m "Add property rollup + dangerous-building-by-pin intermediates"
```

---

## Task 12: Dimensions — date + council district

**Files:**
- Create: `E:\PyProj\kc-blight-analytics\models\marts\dimensions\dim_date.sql`
- Create: `E:\PyProj\kc-blight-analytics\models\marts\dimensions\dim_council_district.sql`

- [ ] **Step 1: Write `dim_date.sql`**

```sql
{{ config(materialized='table') }}

WITH days AS (
    {{ dbt_utils.date_spine(
        datepart="day",
        start_date="cast('2009-01-01' as date)",
        end_date="date_add(current_date(), interval 1 day)"
    ) }}
)

SELECT
    {{ dbt_utils.generate_surrogate_key(['date_day']) }} AS date_sk,
    date_day,
    EXTRACT(YEAR    FROM date_day) AS year,
    EXTRACT(QUARTER FROM date_day) AS quarter,
    EXTRACT(MONTH   FROM date_day) AS month,
    FORMAT_DATE('%B', date_day)    AS month_name
FROM days
```

- [ ] **Step 2: Write `dim_council_district.sql`** (includes an `UNKNOWN` member so fact FKs always resolve)

```sql
{{ config(materialized='table') }}

WITH districts AS (
    SELECT DISTINCT council_district
    FROM {{ ref('int_violations_unioned') }}
    WHERE council_district IS NOT NULL AND council_district != ''

    UNION DISTINCT
    SELECT 'UNKNOWN'
)

SELECT
    {{ dbt_utils.generate_surrogate_key(['council_district']) }} AS council_district_sk,
    council_district,
    CASE WHEN council_district = 'UNKNOWN'
         THEN 'Unknown'
         ELSE CONCAT('District ', council_district) END AS district_label
FROM districts
```

- [ ] **Step 3: Build both**

```powershell
dbt build --select dim_date dim_council_district --target dev
```
Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git -C E:\PyProj\kc-blight-analytics add models/marts/dimensions/dim_date.sql models/marts/dimensions/dim_council_district.sql
git -C E:\PyProj\kc-blight-analytics commit -m "Add dim_date + dim_council_district"
```

---

## Task 13: Dimensions — property + violation type

**Files:**
- Create: `E:\PyProj\kc-blight-analytics\models\marts\dimensions\dim_property.sql`
- Create: `E:\PyProj\kc-blight-analytics\models\marts\dimensions\dim_violation_type.sql`

- [ ] **Step 1: Write `dim_property.sql`** (all PINs from violations + dangerous buildings, plus an `UNKNOWN` member)

```sql
{{ config(materialized='table') }}

WITH props AS (
    SELECT pin, street_address, full_address, zip_code, council_district,
           neighborhood, latitude, longitude
    FROM {{ ref('int_property_rollup') }}

    UNION DISTINCT

    SELECT d.pin, d.street_address, d.full_address, d.zip_code, d.council_district,
           d.neighborhood, d.latitude, d.longitude
    FROM {{ ref('stg_dangerous_buildings') }} d
    LEFT JOIN {{ ref('int_property_rollup') }} p USING (pin)
    WHERE p.pin IS NULL

    UNION DISTINCT

    SELECT 'UNKNOWN', NULL, NULL, NULL, 'UNKNOWN', NULL, NULL, NULL
)

SELECT
    {{ dbt_utils.generate_surrogate_key(['pin']) }} AS property_sk,
    pin, street_address, full_address, zip_code, council_district,
    neighborhood, latitude, longitude
FROM props
```

- [ ] **Step 2: Write `dim_violation_type.sql`** (one row per code + `UNKNOWN`)

```sql
{{ config(materialized='table') }}

WITH types AS (
    SELECT DISTINCT violation_code, chapter, violation_description
    FROM {{ ref('int_violations_unioned') }}
    WHERE violation_code IS NOT NULL
),

ranked AS (
    SELECT
        violation_code, chapter, violation_description,
        ROW_NUMBER() OVER (PARTITION BY violation_code ORDER BY violation_description) AS rn
    FROM types
),

picked AS (
    SELECT violation_code, chapter, violation_description
    FROM ranked WHERE rn = 1

    UNION ALL
    SELECT 'UNKNOWN', NULL, 'Unknown / uncoded'
)

SELECT
    {{ dbt_utils.generate_surrogate_key(['violation_code']) }} AS violation_type_sk,
    violation_code, chapter, violation_description
FROM picked
```

- [ ] **Step 3: Build both**

```powershell
dbt build --select dim_property dim_violation_type --target dev
```
Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git -C E:\PyProj\kc-blight-analytics add models/marts/dimensions/dim_property.sql models/marts/dimensions/dim_violation_type.sql
git -C E:\PyProj\kc-blight-analytics commit -m "Add dim_property + dim_violation_type"
```

---

## Task 14: Fact — violation (transaction grain) + tests

**Files:**
- Create: `E:\PyProj\kc-blight-analytics\models\marts\facts\fact_violation.sql`
- Create: `E:\PyProj\kc-blight-analytics\models\marts\_marts.yml` (started here; dims + lifecycle + marts tests appended in later tasks)

- [ ] **Step 1: Write `fact_violation.sql`** (FKs use `COALESCE(..., 'UNKNOWN')` so every key resolves; requires a non-null `date_found`)

```sql
{{ config(materialized='table') }}

WITH v AS (
    SELECT * FROM {{ ref('int_violations_unioned') }}
    WHERE date_found IS NOT NULL
)

SELECT
    {{ dbt_utils.generate_surrogate_key(['v.violation_id', 'v.source_system']) }}        AS violation_pk,
    {{ dbt_utils.generate_surrogate_key(["COALESCE(NULLIF(v.pin, ''), 'UNKNOWN')"]) }}    AS property_sk,
    {{ dbt_utils.generate_surrogate_key(["COALESCE(v.violation_code, 'UNKNOWN')"]) }}     AS violation_type_sk,
    {{ dbt_utils.generate_surrogate_key(["COALESCE(NULLIF(v.council_district, ''), 'UNKNOWN')"]) }} AS council_district_sk,
    {{ dbt_utils.generate_surrogate_key(['v.date_found']) }}                              AS date_sk,
    v.violation_id,
    v.source_system,
    v.date_found,
    v.date_resolved,
    v.days_open,
    v.is_resolved
FROM v
```

- [ ] **Step 2: Write `models/marts/_marts.yml`** (fact_violation tests now; more appended later)

```yaml
version: 2

models:
  - name: dim_property
    columns:
      - name: property_sk
        tests: [unique, not_null]
  - name: dim_council_district
    columns:
      - name: council_district_sk
        tests: [unique, not_null]
  - name: dim_violation_type
    columns:
      - name: violation_type_sk
        tests: [unique, not_null]
  - name: dim_date
    columns:
      - name: date_sk
        tests: [unique, not_null]

  - name: fact_violation
    columns:
      - name: violation_pk
        tests: [unique, not_null]
      - name: property_sk
        tests:
          - not_null
          - relationships:
              to: ref('dim_property')
              field: property_sk
      - name: violation_type_sk
        tests:
          - relationships:
              to: ref('dim_violation_type')
              field: violation_type_sk
      - name: council_district_sk
        tests:
          - relationships:
              to: ref('dim_council_district')
              field: council_district_sk
      - name: date_sk
        tests:
          - not_null
          - relationships:
              to: ref('dim_date')
              field: date_sk
```

- [ ] **Step 3: Build fact + run its tests**

```powershell
dbt build --select dim_property dim_council_district dim_violation_type dim_date fact_violation --target dev
```
Expected: PASS including all relationships/unique tests. (If `violation_pk` uniqueness fails, the source has duplicate `violation_id` within a system — add a row-number dedupe in `int_violations_unioned`.)

- [ ] **Step 4: Commit**

```powershell
git -C E:\PyProj\kc-blight-analytics add models/marts/facts/fact_violation.sql models/marts/_marts.yml
git -C E:\PyProj\kc-blight-analytics commit -m "Add fact_violation + dim/fact tests"
```

---

## Task 15: Fact — property lifecycle (accumulating snapshot) + tests

**Files:**
- Create: `E:\PyProj\kc-blight-analytics\models\marts\facts\fact_property_lifecycle.sql`
- Modify: `E:\PyProj\kc-blight-analytics\models\marts\_marts.yml` (append lifecycle tests)

- [ ] **Step 1: Write `fact_property_lifecycle.sql`**

```sql
{{ config(materialized='table') }}

WITH p AS (
    SELECT * FROM {{ ref('int_property_rollup') }}
),
d AS (
    SELECT * FROM {{ ref('int_dangerous_building_by_pin') }}
)

SELECT
    {{ dbt_utils.generate_surrogate_key(['p.pin']) }}                                       AS property_sk,
    {{ dbt_utils.generate_surrogate_key(["COALESCE(NULLIF(p.council_district, ''), 'UNKNOWN')"]) }} AS council_district_sk,
    p.pin,
    p.first_violation_date,
    p.last_violation_date,
    p.total_violations,
    p.distinct_violation_types,
    p.resolved_violations,
    p.avg_days_open,
    (d.pin IS NOT NULL)                                                                      AS ever_dangerous_building,
    d.dangerous_building_date,
    COALESCE(d.is_demolition_status, FALSE)                                                  AS is_demolition_status,
    {{ days_between('p.first_violation_date', 'd.dangerous_building_date') }}                AS days_first_violation_to_dangerous,
    CASE
        WHEN COALESCE(d.is_demolition_status, FALSE) THEN 'demolition'
        WHEN d.pin IS NOT NULL                        THEN 'dangerous_building'
        WHEN p.total_violations >= 2                  THEN 'repeat_violations'
        ELSE 'single_violation'
    END                                                                                     AS current_stage
FROM p
LEFT JOIN d ON p.pin = d.pin
```

- [ ] **Step 2: Append to `models/marts/_marts.yml`**

```yaml
  - name: fact_property_lifecycle
    columns:
      - name: property_sk
        tests:
          - unique
          - not_null
          - relationships:
              to: ref('dim_property')
              field: property_sk
      - name: council_district_sk
        tests:
          - relationships:
              to: ref('dim_council_district')
              field: council_district_sk
      - name: current_stage
        tests:
          - accepted_values:
              values: ['single_violation', 'repeat_violations', 'dangerous_building', 'demolition']
```

- [ ] **Step 3: Build + test**

```powershell
dbt build --select fact_property_lifecycle --target dev
```
Expected: PASS, including the `current_stage` accepted_values and `property_sk` uniqueness.

- [ ] **Step 4: Sanity-check the funnel shape**

```powershell
dbt show --inline "select current_stage, count(*) n from {{ ref('fact_property_lifecycle') }} group by 1 order by n desc" --target dev
```
Expected: four stages; `single_violation` largest, `demolition` smallest.

- [ ] **Step 5: Commit**

```powershell
git -C E:\PyProj\kc-blight-analytics add models/marts/facts/fact_property_lifecycle.sql models/marts/_marts.yml
git -C E:\PyProj\kc-blight-analytics commit -m "Add fact_property_lifecycle (accumulating snapshot) + tests"
```

---

## Task 16: Singular tests

**Files:**
- Create: `E:\PyProj\kc-blight-analytics\tests\assert_resolved_after_found.sql`
- Create: `E:\PyProj\kc-blight-analytics\tests\assert_no_negative_days_open.sql`
- Create: `E:\PyProj\kc-blight-analytics\tests\assert_dangerous_after_first_violation.sql`

- [ ] **Step 1: Write `assert_resolved_after_found.sql`**

```sql
SELECT *
FROM {{ ref('int_violations_unioned') }}
WHERE date_resolved IS NOT NULL
  AND date_found IS NOT NULL
  AND date_resolved < date_found
```

- [ ] **Step 2: Write `assert_no_negative_days_open.sql`**

```sql
SELECT *
FROM {{ ref('fact_violation') }}
WHERE days_open < 0
```

- [ ] **Step 3: Write `assert_dangerous_after_first_violation.sql`** (severity `warn` — cross-dataset date ordering can have legitimate exceptions; surfaced, not blocking)

```sql
{{ config(severity='warn') }}

SELECT *
FROM {{ ref('fact_property_lifecycle') }}
WHERE dangerous_building_date IS NOT NULL
  AND first_violation_date IS NOT NULL
  AND dangerous_building_date < first_violation_date
```

- [ ] **Step 4: Run the singular tests**

```powershell
dbt test --select test_type:singular --target dev
```
Expected: the first two PASS; the third PASS or WARN (a WARN is acceptable and informative — note the count).

- [ ] **Step 5: Commit**

```powershell
git -C E:\PyProj\kc-blight-analytics add tests/
git -C E:\PyProj\kc-blight-analytics commit -m "Add singular data-integrity tests"
```

---

## Task 17: Analytics marts — funnel, trend, council district

**Files:**
- Create: `E:\PyProj\kc-blight-analytics\models\marts\analytics\mart_blight_funnel.sql`
- Create: `E:\PyProj\kc-blight-analytics\models\marts\analytics\mart_violations_trend.sql`
- Create: `E:\PyProj\kc-blight-analytics\models\marts\analytics\mart_council_district.sql`

- [ ] **Step 1: Write `mart_blight_funnel.sql`**

```sql
{{ config(materialized='table') }}

WITH lc AS (
    SELECT * FROM {{ ref('fact_property_lifecycle') }}
),
totals AS (
    SELECT
        COUNT(*)                          AS properties_any,
        COUNTIF(total_violations >= 2)    AS properties_repeat,
        COUNTIF(ever_dangerous_building)  AS properties_dangerous,
        COUNTIF(is_demolition_status)     AS properties_demolition
    FROM lc
)
SELECT 1 AS stage_order, 'Any violation'     AS stage, properties_any        AS property_count, 1.0 AS pct_of_violation_properties FROM totals
UNION ALL
SELECT 2, 'Repeat violations',  properties_repeat,     SAFE_DIVIDE(properties_repeat,     properties_any) FROM totals
UNION ALL
SELECT 3, 'Dangerous building', properties_dangerous,  SAFE_DIVIDE(properties_dangerous,  properties_any) FROM totals
UNION ALL
SELECT 4, 'Demolition',         properties_demolition, SAFE_DIVIDE(properties_demolition, properties_any) FROM totals
```

- [ ] **Step 2: Write `mart_violations_trend.sql`**

```sql
{{ config(materialized='table') }}

SELECT
    EXTRACT(YEAR FROM date_found)               AS year,
    source_system,
    COUNT(*)                                    AS total_violations,
    COUNTIF(is_resolved)                        AS resolved_violations,
    APPROX_QUANTILES(days_open, 2)[OFFSET(1)]   AS median_days_open
FROM {{ ref('fact_violation') }}
GROUP BY year, source_system
ORDER BY year, source_system
```

- [ ] **Step 3: Write `mart_council_district.sql`**

```sql
{{ config(materialized='table') }}

WITH v AS (
    SELECT
        council_district_sk,
        COUNT(*)                    AS total_violations,
        COUNT(DISTINCT property_sk) AS distinct_properties,
        APPROX_QUANTILES(IF(is_resolved, days_open, NULL), 2)[OFFSET(1)] AS median_days_to_resolve
    FROM {{ ref('fact_violation') }}
    GROUP BY council_district_sk
),
lc AS (
    SELECT
        council_district_sk,
        COUNTIF(ever_dangerous_building) AS dangerous_building_count,
        SAFE_DIVIDE(COUNTIF(ever_dangerous_building), COUNT(*)) AS pct_escalated_to_dangerous
    FROM {{ ref('fact_property_lifecycle') }}
    GROUP BY council_district_sk
)
SELECT
    d.council_district,
    d.district_label,
    v.total_violations,
    v.distinct_properties,
    lc.dangerous_building_count,
    lc.pct_escalated_to_dangerous,
    v.median_days_to_resolve
FROM {{ ref('dim_council_district') }} d
LEFT JOIN v  ON d.council_district_sk = v.council_district_sk
LEFT JOIN lc ON d.council_district_sk = lc.council_district_sk
```

- [ ] **Step 4: Build all three**

```powershell
dbt build --select mart_blight_funnel mart_violations_trend mart_council_district --target dev
```
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git -C E:\PyProj\kc-blight-analytics add models/marts/analytics/mart_blight_funnel.sql models/marts/analytics/mart_violations_trend.sql models/marts/analytics/mart_council_district.sql
git -C E:\PyProj\kc-blight-analytics commit -m "Add funnel, trend, council-district marts"
```

---

## Task 18: Analytics marts — resolution time, top types, hotspots + mart tests

**Files:**
- Create: `E:\PyProj\kc-blight-analytics\models\marts\analytics\mart_resolution_time.sql`
- Create: `E:\PyProj\kc-blight-analytics\models\marts\analytics\mart_top_violation_types.sql`
- Create: `E:\PyProj\kc-blight-analytics\models\marts\analytics\mart_blight_hotspots.sql`
- Create: `E:\PyProj\kc-blight-analytics\models\marts\analytics\_analytics.yml`

- [ ] **Step 1: Write `mart_resolution_time.sql`**

```sql
{{ config(materialized='table') }}

SELECT
    EXTRACT(YEAR FROM f.date_found)             AS year,
    d.council_district,
    APPROX_QUANTILES(IF(f.is_resolved, f.days_open, NULL), 2)[OFFSET(1)] AS median_days_to_resolve,
    AVG(IF(f.is_resolved, f.days_open, NULL))   AS avg_days_to_resolve
FROM {{ ref('fact_violation') }} f
JOIN {{ ref('dim_council_district') }} d ON f.council_district_sk = d.council_district_sk
GROUP BY year, council_district
ORDER BY year, council_district
```

- [ ] **Step 2: Write `mart_top_violation_types.sql`**

```sql
{{ config(materialized='table') }}

WITH counts AS (
    SELECT
        violation_type_sk,
        COUNT(*)       AS violation_count,
        AVG(days_open) AS avg_days_open
    FROM {{ ref('fact_violation') }}
    GROUP BY violation_type_sk
),
grand AS (SELECT SUM(violation_count) AS grand_total FROM counts)
SELECT
    t.violation_code,
    t.chapter,
    t.violation_description,
    c.violation_count,
    SAFE_DIVIDE(c.violation_count, (SELECT grand_total FROM grand)) AS pct_of_total,
    c.avg_days_open
FROM counts c
JOIN {{ ref('dim_violation_type') }} t ON c.violation_type_sk = t.violation_type_sk
ORDER BY c.violation_count DESC
LIMIT 20
```

- [ ] **Step 3: Write `mart_blight_hotspots.sql`**

```sql
{{ config(materialized='table') }}

SELECT
    lc.pin,
    pr.street_address,
    pr.council_district,
    pr.neighborhood,
    pr.latitude,
    pr.longitude,
    lc.total_violations,
    lc.ever_dangerous_building,
    lc.current_stage
FROM {{ ref('fact_property_lifecycle') }} lc
JOIN {{ ref('dim_property') }} pr ON lc.property_sk = pr.property_sk
ORDER BY lc.total_violations DESC
LIMIT 200
```

- [ ] **Step 4: Write `_analytics.yml`**

```yaml
version: 2

models:
  - name: mart_blight_funnel
    columns:
      - name: stage_order
        tests: [unique, not_null]
  - name: mart_council_district
    columns:
      - name: council_district
        tests: [not_null]
  - name: mart_top_violation_types
    columns:
      - name: violation_code
        tests: [not_null]
```

- [ ] **Step 5: Build all three + tests**

```powershell
dbt build --select mart_resolution_time mart_top_violation_types mart_blight_hotspots --target dev
```
Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git -C E:\PyProj\kc-blight-analytics add models/marts/analytics/mart_resolution_time.sql models/marts/analytics/mart_top_violation_types.sql models/marts/analytics/mart_blight_hotspots.sql models/marts/analytics/_analytics.yml
git -C E:\PyProj\kc-blight-analytics commit -m "Add resolution-time, top-types, hotspots marts + tests"
```

---

## Task 19: Full build, capture headline numbers, dbt docs, README, analyses

**Files:**
- Create: `E:\PyProj\kc-blight-analytics\analyses\adhoc_repeat_offenders.sql`
- Create: `E:\PyProj\kc-blight-analytics\docs\lineage.png` (exported)
- Modify: `E:\PyProj\kc-blight-analytics\README.md`

- [ ] **Step 1: Full clean build of everything**

```powershell
dbt build --target dev
```
Expected: every model + test PASS (the `assert_dangerous_after_first_violation` may WARN).

- [ ] **Step 2: Capture the real headline numbers (record these for the case study in Task 26)**

```powershell
dbt show --inline "select * from {{ ref('mart_blight_funnel') }} order by stage_order" --target dev
dbt show --inline "select district_label, total_violations, round(pct_escalated_to_dangerous,4) esc, median_days_to_resolve from {{ ref('mart_council_district') }} order by total_violations desc" --target dev
dbt show --inline "select min(year) mn, max(year) mx, sum(total_violations) total from {{ ref('mart_violations_trend') }}" --target dev
dbt show --inline "select violation_description, violation_count from {{ ref('mart_top_violation_types') }} order by violation_count desc limit 5" --target dev
```
Record: total properties, % repeat, % escalated to dangerous, % demolition, worst/fastest district by days-to-resolve, total violations across 15 years, top violation type.

- [ ] **Step 3: Write `analyses/adhoc_repeat_offenders.sql`**

```sql
-- Not materialized; exploration only. The properties driving the most blight.
SELECT pin, street_address, council_district, total_violations, current_stage
FROM {{ ref('fact_property_lifecycle') }}
ORDER BY total_violations DESC
LIMIT 50
```

- [ ] **Step 4: Generate docs + export lineage**

```powershell
dbt docs generate --target dev
dbt docs serve
```
In the browser, open the lineage graph, screenshot it, save as `docs/lineage.png`, then stop the server (Ctrl+C).

- [ ] **Step 5: Finalize `README.md`** (replace the stub)

```markdown
# KC Blight Lifecycle Analytics

Tracing **15 years (2009–2025)** of Kansas City property blight — from a
property's first code violation, through repeat violations, to a
"dangerous building" designation and demolition candidacy — combining three
KCMO open-data sources into one dimensional model.

## Stack
Python (Socrata extract-load) → BigQuery → dbt (staging → intermediate → marts)
→ Looker Studio. CI + a scheduled refresh via GitHub Actions.

## Data sources (KCMO Socrata)
- EG NPD Violations (`vq3e-m9ge`) — current violations
- Property Violations [Historical] (`nhtf-e75a`) — 2009–2021
- Dangerous Buildings List (`ax3m-jhxx`) — escalation endpoint

Joined on **PIN** (parcel id).

## Model
- `fact_violation` — one row per violation (transaction grain)
- `fact_property_lifecycle` — one row per property (accumulating snapshot; the funnel)
- Dims: property, council_district, violation_type, date

## Run it
```
py -3.10 -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
dbt deps
python ingest/extract_load.py --include-frozen   # load raw
dbt build                                         # transform + test
```

![lineage](docs/lineage.png)
```

- [ ] **Step 6: Commit**

```powershell
git -C E:\PyProj\kc-blight-analytics add analyses/ docs/lineage.png README.md
git -C E:\PyProj\kc-blight-analytics commit -m "Full build green; add analyses, lineage, README"
```

---

## Task 20: CI workflow (dbt build on push)

**Files:**
- Create: `E:\PyProj\kc-blight-analytics\.github\workflows\dbt-build.yml`

- [ ] **Step 1: Write `dbt-build.yml`**

```yaml
name: dbt build

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  dbt-build:
    runs-on: ubuntu-latest
    env:
      GCP_SA_KEY: ${{ secrets.GCP_SA_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: dbt deps --profiles-dir .
      - run: dbt build --target ci --profiles-dir .
```

- [ ] **Step 2: Make the repo's `profiles.yml.example` usable as `--profiles-dir .`**

The CI uses `--profiles-dir .`, which reads a file literally named `profiles.yml` in the repo root. Copy the example to that name (it contains NO secrets — `ci`/`prod` read `keyfile_json` from the `GCP_SA_KEY` env var; the `dev` block's `keyfile` path is unused in CI):

```powershell
Copy-Item E:\PyProj\kc-blight-analytics\profiles.yml.example E:\PyProj\kc-blight-analytics\profiles.yml
```
Then UN-ignore it so it ships (it has no secrets): add an exception line to `.gitignore`:

```
!profiles.yml
```
(Place this line at the end of `.gitignore`, after the `*.json` etc. rules. `profiles.yml` is YAML, not matched by existing rules, but the explicit allow documents intent.)

- [ ] **Step 3: Commit**

```powershell
git -C E:\PyProj\kc-blight-analytics add .github/workflows/dbt-build.yml profiles.yml .gitignore
git -C E:\PyProj\kc-blight-analytics commit -m "Add CI workflow (dbt build on push, ci target)"
```

---

## Task 21: Scheduled refresh workflow

**Files:**
- Create: `E:\PyProj\kc-blight-analytics\.github\workflows\refresh-sources.yml`

- [ ] **Step 1: Write `refresh-sources.yml`** (weekly EL of live datasets, then rebuild `prod`)

```yaml
name: refresh sources

on:
  schedule:
    - cron: '0 9 * * 1'   # Mondays 09:00 UTC
  workflow_dispatch: {}

jobs:
  refresh:
    runs-on: ubuntu-latest
    env:
      GCP_SA_KEY: ${{ secrets.GCP_SA_KEY }}
      SOCRATA_APP_TOKEN: ${{ secrets.SOCRATA_APP_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: dbt deps --profiles-dir .
      - name: Refresh live source tables
        run: python ingest/extract_load.py            # live datasets only
      - name: Rebuild prod
        run: dbt build --target prod --profiles-dir .
```

- [ ] **Step 2: Commit**

```powershell
git -C E:\PyProj\kc-blight-analytics add .github/workflows/refresh-sources.yml
git -C E:\PyProj\kc-blight-analytics commit -m "Add scheduled source-refresh workflow (prod target)"
```

---

## Task 22: GitHub remote, secrets, prod build, CI verification

**Files:** none (remote operations)

- [ ] **Step 1: Create the remote and push**

```powershell
gh repo create awgdawg/kc-blight-analytics --public --source=E:\PyProj\kc-blight-analytics --remote=origin --push
```

- [ ] **Step 2: Set repo secrets**

```powershell
gh secret set GCP_SA_KEY --repo awgdawg/kc-blight-analytics < C:\Users\auglt\.dbt\cms-analytics-sa.json
# Socrata token: if you have one, set it; otherwise the EL still works (rate-limited).
# gh secret set SOCRATA_APP_TOKEN --repo awgdawg/kc-blight-analytics --body "<token>"
```

- [ ] **Step 3: Build prod locally so the dashboard (Task 23) has tables to read**

```powershell
$env:GCP_SA_KEY = Get-Content C:\Users\auglt\.dbt\cms-analytics-sa.json -Raw
dbt build --target prod
```
Expected: every model materializes into `kc_blight_prod_*` datasets.

- [ ] **Step 4: Verify CI is green**

```powershell
gh run list --repo awgdawg/kc-blight-analytics --limit 3
gh run watch --repo awgdawg/kc-blight-analytics
```
Expected: the `dbt build` workflow completes successfully. (If the scheduled workflow also needs a smoke test, trigger it: `gh workflow run "refresh sources" --repo awgdawg/kc-blight-analytics`.)

- [ ] **Step 5: No commit** (remote state only).

---

## Task 23: Looker Studio dashboard (manual)

**Files:** none (manual Looker Studio build)

- [ ] **Step 1: Create a new Looker Studio report.** Add a **BigQuery** data source for each `prod` mart in `cms-medicare-analytics.kc_blight_prod_marts`: `mart_blight_funnel`, `mart_violations_trend`, `mart_council_district`, `mart_resolution_time`, `mart_top_violation_types`, `mart_blight_hotspots`.

- [ ] **Step 2: Build the views** per spec §6.1: KPI scorecards (total properties, % escalated to dangerous, median days-to-resolve, total violations); funnel chart (`mart_blight_funnel`); 15-year trend line (`mart_violations_trend`); KC map by council district (`mart_council_district`) + hotspot points (`mart_blight_hotspots`); top-20 violation-types bar (`mart_top_violation_types`); resolution-time-by-district chart (`mart_resolution_time`).

- [ ] **Step 3: Theme dark** to match the portfolio: background `#0a0a0b`, accent `#f5a623`, secondary `#4ec9b0`, font IBM Plex Sans.

- [ ] **Step 4: Share → "Anyone with the link can view".** Copy the **embed** URL (File → Embed report) and the public share URL. Record both for Task 25.

---

## Task 24: Portfolio — replace the Snowflake card

**Files:**
- Modify: `E:\PyProj\portfolio\index.html:101-105`
- Delete: `E:\PyProj\portfolio\projects\snowflake-migration.html`

- [ ] **Step 1: Replace the Snowflake card** — change `index.html` lines 101–105 from:

```html
    <a class="proj" href="projects/snowflake-migration.html">
      <div class="proj-top"><span>// case study</span><span class="badge work">work</span></div>
      <h3 class="proj-title">Snowflake migration · healthcare BI</h3>
      <p class="proj-desc">Rebuilt enterprise reporting pipeline from SQL Server to Snowflake/OCI. 8× query speedup, 10M+ rows migrated, full Power BI semantic model refactor.</p>
    </a>
```
to:

```html
    <a class="proj" href="projects/kc-blight.html">
      <div class="proj-top"><span>// bigquery</span><span class="badge live">live</span></div>
      <h3 class="proj-title">Kansas City blight lifecycle</h3>
      <p class="proj-desc">15-year property-blight pipeline across KCMO open data — Socrata extract-load → BigQuery → dbt → Looker, with a scheduled refresh.</p>
    </a>
```

- [ ] **Step 2: Delete the old case-study page**

```powershell
Remove-Item E:\PyProj\portfolio\projects\snowflake-migration.html
```

- [ ] **Step 3: Verify no other file links to the deleted page**

Use Grep for `snowflake-migration.html` across `E:\PyProj\portfolio`. Expected: no remaining references (the About-section Snowflake prose is fine; it doesn't link to the page).

- [ ] **Step 4: Commit**

```powershell
git -C E:\PyProj\portfolio add index.html
git -C E:\PyProj\portfolio rm projects/snowflake-migration.html
git -C E:\PyProj\portfolio commit -m "Replace Snowflake card with KC Blight; remove snowflake case study"
```

---

## Task 25: Portfolio — tabbed live section

**Files:**
- Modify: `E:\PyProj\portfolio\index.html:133-144`
- Modify: `E:\PyProj\portfolio\assets\styles.css` (append tab styles near the BigQuery Embed block ~line 308)
- Modify: `E:\PyProj\portfolio\assets\app.js` (append tab handler before the closing `})();`)

- [ ] **Step 1: Replace the `#live` section body** — change `index.html` lines 133–144 from the current single-iframe block to a tabbed two-board block:

```html
    <section id="live" class="container section">
  <div class="section-label">// 05 / live</div>
  <h2 class="section-title">Live BigQuery boards.</h2>
  <p class="prose" style="margin-bottom: 20px; max-width: none;">Real Looker Studio dashboards powered by the case-study models — embedded, refreshing from BigQuery.</p>
  <div class="bq-tabs" role="tablist">
    <button class="bq-tab active" role="tab" aria-selected="true" data-target="bq-cms">CMS Medicare</button>
    <button class="bq-tab" role="tab" aria-selected="false" data-target="bq-blight">KC Blight</button>
  </div>
  <div class="bq-embed bq-panel active" id="bq-cms">
    <iframe src="https://datastudio.google.com/embed/reporting/e620b108-dee9-4f15-923f-5cb0d60b7331/page/rAQzF"
            style="width:100%;height:100%;border:0;"
            loading="lazy"
            title="CMS Medicare cost-payment gap dashboard"
            allowfullscreen></iframe>
  </div>
  <div class="bq-embed bq-panel" id="bq-blight">
    <iframe data-src="KC_BLIGHT_EMBED_URL"
            style="width:100%;height:100%;border:0;"
            loading="lazy"
            title="Kansas City blight lifecycle dashboard"
            allowfullscreen></iframe>
  </div>
</section>
```
Replace `KC_BLIGHT_EMBED_URL` with the embed URL recorded in Task 23 Step 4. The blight iframe uses `data-src` (not `src`) so it only loads when its tab is first activated.

- [ ] **Step 2: Append tab styles to `assets/styles.css`** (just after the `.bq-embed { ... }` block, before the `/* When live... */` comment near line 321):

```css
.bq-tabs { display: flex; gap: 8px; margin-bottom: 14px; }
.bq-tab {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--text-faint);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 14px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.bq-tab:hover { color: var(--text); }
.bq-tab.active {
  color: var(--bg);
  background: var(--accent);
  border-color: var(--accent);
}
.bq-panel { display: none; }
.bq-panel.active { display: block; }
```

- [ ] **Step 3: Append the tab handler to `assets/app.js`** — insert this block immediately before the final `})();` on line 56:

```javascript
  // ===== Live BigQuery board tabs (with lazy iframe load) =====
  const bqTabs = document.querySelectorAll('.bq-tab');
  bqTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.target;
      bqTabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      document.querySelectorAll('.bq-panel').forEach((p) => {
        p.classList.toggle('active', p.id === targetId);
      });
      const panel = document.getElementById(targetId);
      const iframe = panel ? panel.querySelector('iframe[data-src]') : null;
      if (iframe && !iframe.src) {
        iframe.src = iframe.dataset.src; // lazy-load on first activation
      }
    });
  });
```

- [ ] **Step 4: Verify locally** — open `E:\PyProj\portfolio\index.html` in a browser, click both tabs. Expected: CMS shows by default; clicking "KC Blight" loads and shows the blight dashboard; clicking back hides it. No console errors.

- [ ] **Step 5: Commit**

```powershell
git -C E:\PyProj\portfolio add index.html assets/styles.css assets/app.js
git -C E:\PyProj\portfolio commit -m "Tabbed live BigQuery section (CMS | KC Blight) with lazy iframe"
```

---

## Task 26: Portfolio — KC Blight case study page

**Files:**
- Create: `E:\PyProj\portfolio\projects\kc-blight.html`

- [ ] **Step 1: Read the template** — open `E:\PyProj\portfolio\projects\cms-medicare.html` to copy its exact `<head>`, nav, footer, and case-study section structure/classes (do NOT invent new classes — reuse the shared case-study CSS).

- [ ] **Step 2: Write `projects/kc-blight.html`** using the same template, with these section contents (fill the bracketed numbers from Task 19 Step 2):

- **Title/meta:** "Kansas City Blight Lifecycle — August Turner"
- **Problem:** Cities treat code violations as isolated complaints. This project reframes blight as a *pipeline* — first violation → repeat violations → dangerous-building designation → demolition — across 15 years of KCMO open data, and asks where it concentrates and how fast the city responds.
- **Approach:** Python extract-load from three KCMO Socrata datasets → BigQuery `kc_blight_raw`; dbt staging reconciles a 12-year historical schema with the current EnerGov schema (joined on parcel PIN); a transaction-grain `fact_violation` plus an **accumulating-snapshot** `fact_property_lifecycle`; GitHub Actions CI + a weekly scheduled refresh. Include one code snippet — the `fact_property_lifecycle` `CASE` that assigns `current_stage`.
- **Outcome:** [N] properties tracked; [X]% with repeat violations; [Y]% escalated to dangerous-building status; [Z]% reached demolition; council-district response times ranged from [A] to [B] median days; [TOTAL] violations over 2009–2025. (Use the real numbers recorded in Task 19.)
- **Stack:** Python, Socrata API, dbt, BigQuery, Looker Studio, GitHub Actions.
- **Links:** GitHub repo `https://github.com/awgdawg/kc-blight-analytics`, live Looker dashboard (public URL from Task 23), and an in-page note that the board is embedded on the homepage.

- [ ] **Step 3: Verify** — open the page in a browser; confirm styling matches `cms-medicare.html`, all links work, no broken layout.

- [ ] **Step 4: Commit**

```powershell
git -C E:\PyProj\portfolio add projects/kc-blight.html
git -C E:\PyProj\portfolio commit -m "Add KC Blight case study page"
```

---

## Task 27: Final verification + publish

**Files:** none (verification)

- [ ] **Step 1: Run the spec's verification checklist** (spec §8). Confirm: raw load idempotent; full `dbt build --target dev` green; `fact_property_lifecycle` unique on `property_sk`; CI green; `prod` datasets populated; Looker board renders; portfolio grid is 6 cards with KC Blight live; tabs work; case study reads with real numbers.

- [ ] **Step 2: Push the portfolio**

```powershell
git -C E:\PyProj\portfolio push origin main
```

- [ ] **Step 3: Lighthouse / PageSpeed check** — run PageSpeed Insights on `https://augustturner.dev`. Expected: performance holds (≥ desktop 99 / mobile 93) because the second iframe lazy-loads only on tab click.

- [ ] **Step 4: Verify live** — visit `https://augustturner.dev`, confirm the KC Blight card links to the case study, the live section tabs switch boards, and `https://github.com/awgdawg/kc-blight-analytics` shows green CI.

---

## Self-Review Notes (author)

- **Spec coverage:** EL layer (T3–4), scheduling (T21), schema reconciliation (T7–10), accumulating snapshot (T15), transaction fact (T14), 4 dims (T12–13), 6 marts (T17–18), tests (T9,14,15,16,18), CI (T20), prod target (T2,21,22), dashboard (T23), tabbed live + Snowflake replacement (T24–25), case study (T26). All spec sections mapped.
- **Known build-time risks flagged inline:** NPD council-district column confirmation (T4), `violation_pk` uniqueness (T14), `stg_dangerous_buildings` PIN uniqueness tiebreaker (T9), Socrata point JSON path (`point_coord` macro assumes `coordinates[lng,lat]` — verify in T7 sanity check).
- **FK integrity:** all fact FKs use `COALESCE(..., 'UNKNOWN')` with matching `UNKNOWN` dim members so `relationships` tests pass despite nulls; `fact_violation` requires non-null `date_found`.
