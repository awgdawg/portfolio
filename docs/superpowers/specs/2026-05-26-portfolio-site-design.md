# Portfolio Site — Design Spec

**Author:** August Turner
**Date:** 2026-05-26
**Status:** Approved, ready for implementation planning

## 1. Goal

Build a personal portfolio site that doubles as a recruiter funnel (skim-friendly homepage) and a project showcase (deep project case studies). Primary audience: hiring managers and recruiters evaluating August for BI / analytics / analytics-engineering roles, with healthcare-data domain as a differentiator.

**Success looks like:** a recruiter who lands on the site from LinkedIn or a resume link can answer "what does August do, is he good, can I contact him?" in under 30 seconds — and a hiring manager who clicks into a project case study can see real depth in 2–3 minutes.

## 2. Architecture & Deployment

**Stack:** Pure HTML / CSS / JavaScript. No build step. No frameworks. No dependencies beyond Google Fonts.

**Hosting:** GitHub Pages, project-site mode.
- Repo: `awgdawg/portfolio`
- Default URL: `awgdawg.github.io/portfolio`
- Custom domain: `augustturner.dev` (pending purchase + DNS setup)

**File structure:**

```
portfolio/
├── index.html                       # homepage (all 6 sections, single scroll)
├── projects/
│   ├── snowflake-migration.html       # work case study (anonymized)
│   ├── cms-medicare.html              # BigQuery — planned
│   ├── nyc-taxi.html                  # BigQuery — planned
│   ├── github-archive.html            # BigQuery — planned
│   ├── receipts-pipeline.html         # personal — Gmail→PDF
│   └── cb-trading-journal.html        # personal — Coinbase/Robinhood
├── assets/
│   ├── styles.css                  # single stylesheet, CSS variables for theme
│   ├── app.js                      # KPI counters, scroll reveals, nav highlight
│   ├── resume.pdf                  # BIA2_resume.pdf (downloadable)
│   └── og-image.png                # social share preview
├── CNAME                           # contains "augustturner.dev"
└── README.md                       # repo readme (not the site)
```

**Deploy flow:** push to `main` → GitHub Pages auto-builds → live in ~30s.

## 3. Visual System

### 3.1 Aesthetic direction

Dashboard-as-portfolio — the site visually echoes a BI tool (KPI cards, mono labels, syntax-highlighted SQL snippets, terse data callouts). Bold and on-brand for an analytics professional without being a costume.

### 3.2 Palette

| Token | Hex | Use |
|------|------|-----|
| `--bg` | `#0a0a0b` | Page canvas (near-black, slightly warm) |
| `--surface` | `#161719` | Cards, panels |
| `--surface-deep` | `#0d0e10` | Code blocks |
| `--border` | `#2a2b2e` | Default card border |
| `--border-strong` | `#4a3a17` | Amber-tinted border (highlighted pills, hover) |
| `--text` | `#e8e6e3` | Primary text |
| `--text-muted` | `#b8b6b1` | Body copy, secondary text |
| `--text-dim` | `#9a9892` | Labels, captions |
| `--text-faint` | `#5d5d5d` | Comments, ambient |
| `--accent` | `#f5a623` | Amber — KPI numbers, brand mark, highlights |
| `--accent-bg` | `#1a1612` | Subtle amber-tinted surface (highlighted pill bg) |
| `--live` | `#4ec9b0` | Teal — "live" indicator, deltas, positive signals |
| `--live-border` | `#2d4a44` | Teal-bordered pills |
| `--sql-keyword` | `#c586c0` | SQL keywords (SELECT, FROM, etc.) |
| `--sql-fn` | `#4ec9b0` | SQL functions (DATE_TRUNC, COUNT) |
| `--sql-string` | `#f5a623` | SQL string literals |

### 3.3 Typography

Two families, three roles. Loaded from Google Fonts.

- **Oxanium** — display font. Headlines, section titles, KPI numbers, brand mark, nav brand. Weights: 500, 600, 700. Letter-spacing: `-0.01em` to `-0.02em` on large sizes.
- **IBM Plex Sans** — body font. Tagline, About copy, project descriptions, case-study prose. Weights: 400, 500, 600.
- **IBM Plex Mono** — utility font. Section labels (`// 01 / hero`), KPI units, pills, code blocks, footer, TOC items. Weights: 400, 500.

Use `font-display: swap` to avoid layout shift on font load.

### 3.4 Motion

Restrained — atmosphere, not Vegas.

- KPI numbers count up when scrolled into view (~600ms, ease-out)
- Cards fade in + 8px lift on scroll reveal, 80ms stagger
- Hover on cards: border brightens to amber (no transform)
- "● live" indicator pulses softly (2s loop)
- Nav link active state: amber underline crosshair, no slide
- No parallax, no scroll-jacking, no big intros

### 3.5 UI patterns

- **Section label**: `// NN / name` in mono, uppercase, dim color
- **KPI card**: dark surface, mono `// kpi NN` top label, oversized amber Oxanium number, mono unit text
- **Skill pill**: bordered mono chip, neutral by default, amber-tinted background for headline skills
- **Project card**: dark surface, top row with `// type` label + badge (live/planned/work), Oxanium title, Plex Sans description
- **Code block**: deep-surface bg, mono font, syntax colors per palette
- **Status indicator**: small ● dot + label, teal for "live" / "open to roles"

## 4. Homepage Layout

Single-page scroll. Sections in order:

1. **Nav** (sticky) — brand `aug.turner` with amber `◣` mark; links: About / Skills / Projects / Live / Contact
2. **Hero** — large Oxanium name "August Turner.", tagline (see §6), status pill, 4-up KPI cards
3. **About / "What I do."** — short paragraph
4. **Skills / "Stack."** — grouped pills (Warehouse & data, BI & modeling, Engineering, Healthcare data)
5. **Projects / "Selected work."** — 6 project cards in 2×3 grid (desktop), 1-column (mobile)
6. **Live BigQuery board** — Looker Studio iframe embedded
7. **Contact / "Get in touch."** — 4 cards: email (highlighted CTA), LinkedIn, GitHub, Resume PDF
8. **Footer** — terse mono

### Responsive behavior

- Desktop (≥1024px): KPI grid 4-wide, project grid 2-wide
- Tablet (768–1023px): KPI grid 4-wide, project grid 2-wide
- Mobile (<768px): KPI grid 2×2, project grid 1-column, nav collapses to hamburger or compact bar (no horizontal scroll)

## 5. Project Case-Study Template

All 6 project pages share an identical shell.

### Layout

- **Nav** — same as homepage, with "← back to portfolio" link replacing section nav
- **Header** — crumb (`// projects / case-study · NN`), big Oxanium title, subtitle, meta strip (role, timeline, type badge)
- **Body grid** — 220px sticky TOC sidebar + main content
- **TOC** — `01 · Problem`, `02 · Approach`, `03 · Outcome`, `04 · Stack`, `05 · Links`; active item amber + amber left border
- **Sections** — numbered `// NN / name` labels, Oxanium h2, Plex Sans body, arrow-prefixed bullets in amber

### Content blocks available

- Prose paragraphs
- Arrow-prefixed bullet lists (`→` in amber)
- Syntax-highlighted SQL code blocks
- Outcome KPI grid (3-up mini KPI cards)
- Stack pills
- Link cards (link-out references)

## 6. Content

### 6.1 Hero
- **Name:** August Turner.
- **Tagline:** Business intelligence analyst with seven years building reliable analytics on healthcare and operational data — Snowflake, Power BI, Oracle Analytics Cloud, and the SQL that holds them together.
- **Status pill:** OPEN TO ROLES · BI / ANALYTICS ENGINEERING
- **KPIs:** 7+ years · 20+ pipelines · 15 dashboards · 10M+ rows migrated

### 6.2 About — "What I do."
> I build the data infrastructure behind clinical and operational reporting — ETL pipelines, semantic models, performance-tuned warehouses. My current work migrates large SQL Server reporting workloads onto Snowflake and OCI, rebuilding the BI layer for accuracy and speed. Background: BS in Ecology & Evolutionary Biology, self-taught into data, currently looking for my next BI / analytics engineering role.

### 6.3 Skills

| Group | Pills (★ = headline / amber-tinted) |
|-------|-------------------------------------|
| Warehouse & data | ★ Snowflake, ★ SQL (Advanced), Oracle Analytics Cloud, BigQuery, PostgreSQL, SQL Server |
| BI & modeling | ★ Power BI, DAX, Semantic modeling, Looker Studio, Kibana |
| Engineering | Python, ETL design, dbt, Git |
| Healthcare data | HL7, FHIR, Clinical workflows |

### 6.4 Project cards (homepage tiles)

| # | Title | Badge | Short description (homepage tile) |
|---|-------|-------|-----------------------------------|
| 1 | Snowflake migration · healthcare BI | `work` | Rebuilt enterprise reporting pipeline from SQL Server to Snowflake/OCI. 8× query speedup, 10M+ rows migrated, full Power BI semantic model refactor. |
| 2 | CMS Medicare claims analytics | `planned` | Spending and utilization patterns across CMS public datasets. SQL transformations, partitioning strategy, Looker Studio dashboard. |
| 3 | NYC TLC trip records | `planned` | Billion-row dataset — partitioning, clustering, and query-cost optimization study. |
| 4 | GitHub Archive trends | `planned` | Open-source ecosystem trends. BQ ML forecasting on language adoption. |
| 5 | Gmail → PDF receipt pipeline | `live` | Python automation: Gmail API → parse receipt metadata → generate PDFs → structured archive. End-to-end ETL on personal data. |
| 6 | CB Trading Journal | `live` | Python pipeline: Coinbase + Robinhood APIs → PostgreSQL → trade analytics. Personal trading data ETL. |

### 6.5 Case-study content scope at launch

- **Snowflake migration** — full anonymized case study at launch (Problem / Approach / Outcome / Stack / Links). Outcome numbers: 8× query speedup, 10M+ rows migrated, –72% refresh time.
- **3 BigQuery projects** — placeholder case-study pages with the homepage card description, a "Status: in development" banner, and "case study coming soon" copy. Full content filled in after each BQ project is built.
- **2 personal projects** — drafted from existing repos (`awgdawg/Receipts` for receipt pipeline, `awgdawg/CB-Trading-Journal` for trading journal). CB Trading Journal flagged as WIP.

### 6.6 Contact
- Email: `aug.l.turner@gmail.com` (highlighted as primary CTA)
- LinkedIn: `linkedin.com/in/august-turner-702518123` (displayed as `in/august-turner`)
- GitHub: `github.com/awgdawg` (displayed as `@awgdawg`)
- Resume: link to `assets/resume.pdf` (sourced from `BIA2_resume.pdf` provided 2026-05-26)

### 6.7 Footer
`aug.turner / 2026 · KC, MO` (left) · `built with ♥ + SQL` (right)

## 7. Live BigQuery Embed

Section 5 of homepage. Approach: **Looker Studio iframe** embedded.

- Source data: CMS Medicare claims (the first BQ project to be built)
- Implementation: Build a Looker Studio report on top of BQ, embed via Looker's share iframe URL
- Loads async; placeholder card while iframe loads
- If iframe fails (Looker outage, blocked), show a fallback card with link out to the public report URL
- v1 may ship with a placeholder ("dashboard coming with the CMS Medicare project") until the BQ project lands

## 8. Verification & Launch Checklist

### Functional checks (must pass before launch)
- [ ] Site builds with zero JS errors in console
- [ ] All 6 homepage sections render in order on desktop (1440px) and mobile (390px)
- [ ] All 6 project pages load from homepage card clicks
- [ ] Resume PDF download works (returns BIA2_resume.pdf)
- [ ] Email link opens default mail client
- [ ] LinkedIn + GitHub links open in new tab, correct URLs
- [ ] Skip nav (Tab key) reaches all sections in logical order
- [ ] Looker Studio iframe loads on `// 05 / live` section (or placeholder shown if BQ project not yet built)

### Quality bars
- [ ] Lighthouse Performance ≥ 95
- [ ] Lighthouse Accessibility ≥ 95
- [ ] No cumulative layout shift on font load (`font-display: swap`)
- [ ] Mobile (390px): no horizontal scroll, KPI grid stacks 2×2, project grid stacks 1-column
- [ ] Tablet (768px): KPI grid stays 4-wide, project grid stays 2×3

### Pre-launch
- [ ] Repo `awgdawg/portfolio` created, GitHub Pages enabled (Settings → Pages → main branch)
- [ ] `augustturner.dev` purchased + DNS configured (A records or CNAME to `awgdawg.github.io`)
- [ ] `CNAME` file in repo containing `augustturner.dev`
- [ ] HTTPS enabled on GitHub Pages (auto after DNS propagates)
- [ ] Open Graph image generated and tested via opengraph.xyz preview
- [ ] Site URL added to LinkedIn profile and resume

## 9. Out of v1 Scope

Deferred — not blockers for launch:

- Real content for the 3 BigQuery case studies (depends on building the BQ projects)
- Blog / writing section
- Light mode toggle
- Analytics (Plausible / Vercel Analytics — add later if desired)
- Custom 404 page
- RSS feed
- Newsletter signup
