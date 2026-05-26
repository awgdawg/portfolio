# Portfolio Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a static HTML/CSS/JS portfolio site for August Turner, hosted on GitHub Pages at `awgdawg/portfolio` (eventually `augustturner.dev`).

**Architecture:** Pure HTML/CSS/JS — no framework, no build step. Single homepage (`index.html`) with 6 scrolling sections. Six standalone project case-study pages under `projects/`, each using a shared layout. One stylesheet, one JS file. Loads Google Fonts (Oxanium + IBM Plex Sans + IBM Plex Mono).

**Tech Stack:** HTML5, CSS3 (custom properties, grid, flexbox, IntersectionObserver), vanilla JavaScript, Google Fonts, GitHub Pages.

**Reference spec:** `docs/superpowers/specs/2026-05-26-portfolio-site-design.md`

**Verification model:** No unit tests — this is presentation HTML. Each task ends with a browser screenshot via the Claude Preview MCP tools (`mcp__Claude_Preview__preview_start`, `preview_screenshot`, `preview_console_logs`) plus an explicit visual check against the spec. The brainstorm preview server (port 5858) can be repurposed, or a fresh server registered in `~/.claude/launch.json` pointed at `python -m http.server` in the project root.

**Verification preview server setup** (do once before Task 3, then reuse):

Add to `C:\Users\auglt\.claude\launch.json`:

```json
{
  "name": "portfolio-site",
  "runtimeExecutable": "cmd",
  "runtimeArgs": ["/c", "cd /d C:\\Users\\auglt\\portfolio && python -m http.server 8080"],
  "port": 8080
}
```

Then `preview_start` with `name: "portfolio-site"` returns a `serverId` to use for screenshots / console / network checks throughout the rest of the plan.

---

## Task 1: Repo scaffold + README

**Files:**
- Create: `README.md`
- Create: `index.html` (empty placeholder)
- Create: `assets/.gitkeep`
- Create: `projects/.gitkeep`

- [ ] **Step 1: Create README.md**

```markdown
# augustturner.dev — portfolio

Static personal portfolio site. Built with HTML/CSS/JS, no framework, no build step.

**Live:** https://augustturner.dev (pending DNS) · https://awgdawg.github.io/portfolio (fallback)

## Local preview

```
python -m http.server 8080
```

Then open http://localhost:8080.

## Structure

- `index.html` — homepage (6 sections, single scroll)
- `projects/*.html` — project case studies, one per page
- `assets/styles.css` — single stylesheet
- `assets/app.js` — KPI counters, scroll reveals, nav highlight
- `assets/resume.pdf` — downloadable resume
- `CNAME` — GitHub Pages custom domain

## Design spec

See `docs/superpowers/specs/2026-05-26-portfolio-site-design.md`.
```

- [ ] **Step 2: Create empty `index.html` (just `<!doctype html>` for now)**

Run:
```
echo "<!doctype html>" > index.html
```

(PowerShell users: `'<!doctype html>' | Set-Content -Encoding utf8 index.html`)

- [ ] **Step 3: Create directories with `.gitkeep` placeholders**

```
mkdir assets projects
touch assets/.gitkeep projects/.gitkeep
```

(PowerShell: `New-Item -ItemType Directory assets, projects -Force; New-Item assets/.gitkeep, projects/.gitkeep`)

- [ ] **Step 4: Commit**

```
git add README.md index.html assets/.gitkeep projects/.gitkeep
git commit -m "Scaffold portfolio repo structure"
```

---

## Task 2: Base CSS — variables, fonts, reset

**Files:**
- Create: `assets/styles.css`
- Modify: `index.html`

- [ ] **Step 1: Write the full base CSS**

Create `assets/styles.css` with:

```css
@import url('https://fonts.googleapis.com/css2?family=Oxanium:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

:root {
  --bg: #0a0a0b;
  --surface: #161719;
  --surface-deep: #0d0e10;
  --border: #2a2b2e;
  --border-strong: #4a3a17;
  --text: #e8e6e3;
  --text-muted: #b8b6b1;
  --text-dim: #9a9892;
  --text-faint: #5d5d5d;
  --accent: #f5a623;
  --accent-bg: #1a1612;
  --live: #4ec9b0;
  --live-border: #2d4a44;
  --sql-keyword: #c586c0;
  --sql-fn: #4ec9b0;
  --sql-string: #f5a623;

  --font-display: 'Oxanium', sans-serif;
  --font-body: 'IBM Plex Sans', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;

  --container-max: 920px;
  --container-pad: 28px;
}

*, *::before, *::after { box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4 {
  font-family: var(--font-display);
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 0;
}

p { margin: 0; }
a { color: inherit; text-decoration: none; }

.container {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 var(--container-pad);
}

.mono { font-family: var(--font-mono); }
.display { font-family: var(--font-display); }

.section-label {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-bottom: 14px;
}

::selection { background: var(--accent); color: #0a0a0b; }
```

- [ ] **Step 2: Wire the CSS into `index.html`**

Replace `index.html` content with:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>August Turner · BI / analytics engineering</title>
  <meta name="description" content="Business intelligence analyst with seven years building reliable analytics on healthcare and operational data.">
  <link rel="stylesheet" href="assets/styles.css">
</head>
<body>
  <h1 class="container">Font loaded.</h1>
</body>
</html>
```

- [ ] **Step 3: Verify in browser**

Start the preview server (`preview_start` with `name: "portfolio-site"`), then `preview_screenshot`.

Expected: "Font loaded." renders in Oxanium (geometric, slightly squared), white on charcoal background.

Also run `preview_console_logs` — expected: no console errors.

- [ ] **Step 4: Commit**

```
git add assets/styles.css index.html
git commit -m "Add base CSS — variables, fonts, reset, container"
```

---

## Task 3: Homepage scaffold — nav + 6 section containers + footer

**Files:**
- Modify: `index.html`
- Modify: `assets/styles.css` (append)

- [ ] **Step 1: Write the homepage HTML skeleton**

Replace `index.html` body with:

```html
<body>
  <nav class="nav">
    <div class="container nav-inner">
      <a href="#" class="nav-brand">aug.turner</a>
      <ul class="nav-links">
        <li><a href="#about">About</a></li>
        <li><a href="#skills">Skills</a></li>
        <li><a href="#projects">Projects</a></li>
        <li><a href="#live">Live</a></li>
        <li><a href="#contact">Contact</a></li>
      </ul>
    </div>
  </nav>

  <main>
    <section id="hero" class="container section"><div class="section-label">// 01 / hero</div></section>
    <section id="about" class="container section"><div class="section-label">// 02 / about</div></section>
    <section id="skills" class="container section"><div class="section-label">// 03 / skills</div></section>
    <section id="projects" class="container section"><div class="section-label">// 04 / projects</div></section>
    <section id="live" class="container section"><div class="section-label">// 05 / live</div></section>
    <section id="contact" class="container section"><div class="section-label">// 06 / contact</div></section>
  </main>

  <footer class="footer">
    <div class="container footer-inner">
      <span>aug.turner / 2026 · KC, MO</span>
      <span>built with ♥ + SQL</span>
    </div>
  </footer>
</body>
```

- [ ] **Step 2: Append nav + section + footer styles to `assets/styles.css`**

```css
/* ===== Nav ===== */
.nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(10, 10, 11, 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border);
}
.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
  padding-bottom: 14px;
}
.nav-brand {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 15px;
}
.nav-brand::before { content: '◣ '; color: var(--accent); }
.nav-links {
  display: flex;
  gap: 22px;
  list-style: none;
  padding: 0;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.nav-links a {
  color: var(--text-dim);
  padding-bottom: 2px;
  border-bottom: 1px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}
.nav-links a:hover { color: var(--text); }
.nav-links a.active { color: var(--text); border-bottom-color: var(--accent); }

/* ===== Section spacing ===== */
.section { padding-top: 56px; padding-bottom: 24px; }
.section-title { font-size: 28px; line-height: 1.05; letter-spacing: -0.015em; margin-bottom: 16px; }

/* ===== Footer ===== */
.footer {
  border-top: 1px solid var(--border);
  margin-top: 56px;
}
.footer-inner {
  display: flex;
  justify-content: space-between;
  padding-top: 24px;
  padding-bottom: 24px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--text-faint);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
```

- [ ] **Step 3: Verify in browser**

`preview_screenshot`. Expected: sticky nav with brand and 5 links visible. 6 empty section labels stack vertically (// 01 / hero, // 02 / about, etc.). Footer at bottom with two mono lines. No horizontal scroll.

- [ ] **Step 4: Verify nav scroll-to-anchor works**

`preview_eval` with `document.querySelector('a[href="#contact"]').click(); window.scrollY > 200`. Expected return: `true`.

- [ ] **Step 5: Commit**

```
git add index.html assets/styles.css
git commit -m "Add homepage scaffolding — nav, section containers, footer"
```

---

## Task 4: Homepage section — Hero + KPI cards

**Files:**
- Modify: `index.html` (the `#hero` section)
- Modify: `assets/styles.css` (append)

- [ ] **Step 1: Fill in the hero section HTML**

Replace the `<section id="hero">` block with:

```html
<section id="hero" class="container section hero">
  <div class="section-label">// 01 / hero</div>
  <h1 class="hero-name">August<br>Turner.</h1>
  <p class="hero-tagline">Business intelligence analyst with seven years building reliable analytics on healthcare and operational data — Snowflake, Power BI, Oracle Analytics Cloud, and the SQL that holds them together.</p>
  <span class="status-pill">Open to roles · BI / Analytics Engineering</span>

  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-top"><span>// kpi 01</span></div><div><span class="kpi-val" data-target="7" data-suffix="+">7+</span><span class="kpi-unit">years</span></div></div>
    <div class="kpi"><div class="kpi-top"><span>// kpi 02</span></div><div><span class="kpi-val" data-target="20" data-suffix="+">20+</span><span class="kpi-unit">pipelines</span></div></div>
    <div class="kpi"><div class="kpi-top"><span>// kpi 03</span></div><div><span class="kpi-val" data-target="15">15</span><span class="kpi-unit">dashboards</span></div></div>
    <div class="kpi"><div class="kpi-top"><span>// kpi 04</span></div><div><span class="kpi-val" data-target="10" data-suffix="M+">10M+</span><span class="kpi-unit">rows migrated</span></div></div>
  </div>
</section>
```

(The `data-target` / `data-suffix` attributes are read by `app.js` in Task 11. Until then, the static value displays.)

- [ ] **Step 2: Append hero + KPI styles to `assets/styles.css`**

```css
/* ===== Hero ===== */
.hero { padding-top: 64px; }
.hero-name {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 64px;
  line-height: 0.95;
  letter-spacing: -0.025em;
  margin: 12px 0 14px;
}
.hero-tagline {
  font-size: 17px;
  line-height: 1.45;
  color: var(--text-muted);
  max-width: 580px;
}
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--live);
  text-transform: uppercase;
  padding: 4px 10px;
  border: 1px solid var(--live-border);
  border-radius: 4px;
  margin-top: 18px;
}
.status-pill::before { content: '●'; animation: pulse 2s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

/* ===== KPI grid ===== */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 34px;
}
.kpi {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 16px;
  transition: border-color 0.15s;
}
.kpi:hover { border-color: var(--border-strong); }
.kpi-top {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
}
.kpi-val {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 32px;
  color: var(--accent);
  line-height: 1;
  letter-spacing: -0.02em;
}
.kpi-unit {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-dim);
  margin-left: 6px;
}
```

- [ ] **Step 3: Verify in browser**

`preview_screenshot`. Expected: "August Turner." in huge Oxanium across two lines, tagline below in Plex Sans, teal pulsing "OPEN TO ROLES · BI / ANALYTICS ENGINEERING" pill, 4 KPI cards in a row with amber numbers (7+, 20+, 15, 10M+).

`preview_console_logs` — expected: no errors.

- [ ] **Step 4: Commit**

```
git add index.html assets/styles.css
git commit -m "Add hero section + 4 KPI cards"
```

---

## Task 5: Homepage section — About

**Files:**
- Modify: `index.html` (the `#about` section)
- Modify: `assets/styles.css` (append)

- [ ] **Step 1: Fill in the about section HTML**

Replace `<section id="about">` with:

```html
<section id="about" class="container section">
  <div class="section-label">// 02 / about</div>
  <h2 class="section-title">What I do.</h2>
  <p class="prose">
    I build the data infrastructure behind clinical and operational reporting — <strong>ETL pipelines, semantic models, performance-tuned warehouses</strong>. My current work migrates large SQL Server reporting workloads onto Snowflake and OCI, rebuilding the BI layer for accuracy and speed. Background: BS in Ecology &amp; Evolutionary Biology, self-taught into data, currently looking for my next BI / analytics engineering role.
  </p>
</section>
```

- [ ] **Step 2: Append prose styles**

```css
.prose {
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-muted);
  max-width: 680px;
}
.prose strong { color: var(--text); font-weight: 500; }
```

- [ ] **Step 3: Verify in browser**

`preview_screenshot`. Expected: "What I do." heading in Oxanium, paragraph below in Plex Sans with "ETL pipelines, semantic models, performance-tuned warehouses" in lighter color (bold/strong).

- [ ] **Step 4: Commit**

```
git add index.html assets/styles.css
git commit -m "Add about section"
```

---

## Task 6: Homepage section — Skills / Stack

**Files:**
- Modify: `index.html` (the `#skills` section)
- Modify: `assets/styles.css` (append)

- [ ] **Step 1: Fill in skills HTML**

Replace `<section id="skills">` with:

```html
<section id="skills" class="container section">
  <div class="section-label">// 03 / skills</div>
  <h2 class="section-title">Stack.</h2>
  <div class="skills-grid">
    <div class="skill-group-label">Warehouse &amp; data</div>
    <div class="pill-row">
      <span class="pill strong">Snowflake</span>
      <span class="pill strong">SQL (Advanced)</span>
      <span class="pill">Oracle Analytics Cloud</span>
      <span class="pill">BigQuery</span>
      <span class="pill">PostgreSQL</span>
      <span class="pill">SQL Server</span>
    </div>

    <div class="skill-group-label">BI &amp; modeling</div>
    <div class="pill-row">
      <span class="pill strong">Power BI</span>
      <span class="pill">DAX</span>
      <span class="pill">Semantic modeling</span>
      <span class="pill">Looker Studio</span>
      <span class="pill">Kibana</span>
    </div>

    <div class="skill-group-label">Engineering</div>
    <div class="pill-row">
      <span class="pill">Python</span>
      <span class="pill">ETL design</span>
      <span class="pill">dbt</span>
      <span class="pill">Git</span>
    </div>

    <div class="skill-group-label">Healthcare data</div>
    <div class="pill-row">
      <span class="pill">HL7</span>
      <span class="pill">FHIR</span>
      <span class="pill">Clinical workflows</span>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Append skills styles**

```css
.skills-grid {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 18px 24px;
  align-items: start;
  margin-top: 8px;
}
.skill-group-label {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--text-dim);
  text-transform: uppercase;
  padding-top: 5px;
}
.pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pill {
  display: inline-block;
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--text-muted);
  background: #131416;
}
.pill.strong {
  color: var(--accent);
  border-color: var(--border-strong);
  background: var(--accent-bg);
}
```

- [ ] **Step 3: Verify in browser**

`preview_screenshot`. Expected: "Stack." heading. 4 rows of pills: Warehouse & data, BI & modeling, Engineering, Healthcare data. Snowflake / SQL (Advanced) / Power BI shown in amber-tinted pills. Others in neutral.

- [ ] **Step 4: Commit**

```
git add index.html assets/styles.css
git commit -m "Add skills section with grouped pills"
```

---

## Task 7: Homepage section — Projects (6 card grid)

**Files:**
- Modify: `index.html` (the `#projects` section)
- Modify: `assets/styles.css` (append)

- [ ] **Step 1: Fill in projects HTML**

Replace `<section id="projects">` with:

```html
<section id="projects" class="container section">
  <div class="section-label">// 04 / projects</div>
  <h2 class="section-title">Selected work.</h2>
  <div class="proj-grid">
    <a class="proj" href="projects/snowflake-migration.html">
      <div class="proj-top"><span>// case study</span><span class="badge work">work</span></div>
      <h3 class="proj-title">Snowflake migration · healthcare BI</h3>
      <p class="proj-desc">Rebuilt enterprise reporting pipeline from SQL Server to Snowflake/OCI. 8× query speedup, 10M+ rows migrated, full Power BI semantic model refactor.</p>
    </a>
    <a class="proj" href="projects/cms-medicare.html">
      <div class="proj-top"><span>// bigquery</span><span class="badge planned">planned</span></div>
      <h3 class="proj-title">CMS Medicare claims analytics</h3>
      <p class="proj-desc">Spending and utilization patterns across CMS public datasets. SQL transformations, partitioning strategy, Looker Studio dashboard.</p>
    </a>
    <a class="proj" href="projects/nyc-taxi.html">
      <div class="proj-top"><span>// bigquery</span><span class="badge planned">planned</span></div>
      <h3 class="proj-title">NYC TLC trip records</h3>
      <p class="proj-desc">Billion-row dataset — partitioning, clustering, and query-cost optimization study.</p>
    </a>
    <a class="proj" href="projects/github-archive.html">
      <div class="proj-top"><span>// bigquery</span><span class="badge planned">planned</span></div>
      <h3 class="proj-title">GitHub Archive trends</h3>
      <p class="proj-desc">Open-source ecosystem trends. BQ ML forecasting on language adoption.</p>
    </a>
    <a class="proj" href="projects/receipts-pipeline.html">
      <div class="proj-top"><span>// personal</span><span class="badge live">live</span></div>
      <h3 class="proj-title">Gmail → PDF receipt pipeline</h3>
      <p class="proj-desc">Python automation: Gmail API → parse receipt metadata → generate PDFs → structured archive. End-to-end ETL on personal data.</p>
    </a>
    <a class="proj" href="projects/cb-trading-journal.html">
      <div class="proj-top"><span>// personal</span><span class="badge live">live</span></div>
      <h3 class="proj-title">CB Trading Journal</h3>
      <p class="proj-desc">Python pipeline: Coinbase + Robinhood APIs → PostgreSQL → trade analytics. Personal trading data ETL.</p>
    </a>
  </div>
</section>
```

- [ ] **Step 2: Append project styles**

```css
.proj-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 24px;
}
.proj {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 18px;
  min-height: 130px;
  display: block;
  transition: border-color 0.15s, transform 0.15s;
}
.proj:hover { border-color: var(--border-strong); transform: translateY(-1px); }
.proj-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-bottom: 12px;
}
.proj-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 17px;
  line-height: 1.2;
  margin-bottom: 6px;
}
.proj-desc {
  font-size: 12.5px;
  color: var(--text-dim);
  line-height: 1.5;
}
.badge {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.15em;
  padding: 2px 7px;
  border-radius: 3px;
  border: 1px solid var(--border);
  color: var(--text-dim);
}
.badge.live { color: var(--live); border-color: var(--live-border); }
.badge.planned { color: #d4a05e; border-color: var(--border-strong); }
.badge.work { color: var(--text-dim); border-color: var(--border); }
```

- [ ] **Step 3: Verify in browser**

`preview_screenshot`. Expected: "Selected work." heading. 6 cards in 2×3 grid. Badges: 1 `work` (grey), 3 `planned` (amber), 2 `live` (teal). Cards are clickable (will 404 until Task 14+ creates the target pages — that's expected for now).

`preview_eval` with `document.querySelectorAll('.proj').length`. Expected: `6`.

- [ ] **Step 4: Commit**

```
git add index.html assets/styles.css
git commit -m "Add projects section with 6-card grid"
```

---

## Task 8: Homepage section — Live BigQuery placeholder

**Files:**
- Modify: `index.html` (the `#live` section)
- Modify: `assets/styles.css` (append)

- [ ] **Step 1: Fill in live section HTML**

Replace `<section id="live">` with:

```html
<section id="live" class="container section">
  <div class="section-label">// 05 / live</div>
  <h2 class="section-title">Live BigQuery board.</h2>
  <p class="prose" style="margin-bottom: 20px;">A real Looker Studio dashboard powered by one of the case-study queries — embedded, refreshes from BigQuery.</p>
  <div class="bq-embed" id="bq-embed">
    <div class="bq-placeholder">
      <div class="bq-placeholder-title">[ Looker Studio embed pending ]</div>
      <div class="bq-placeholder-sub">— ships with the CMS Medicare project —</div>
    </div>
  </div>
</section>
```

When the CMS Medicare BQ project is built and the Looker Studio report exists, replace the `.bq-placeholder` div with the iframe (see comment in styles).

- [ ] **Step 2: Append embed styles**

```css
.bq-embed {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  height: 320px;
  overflow: hidden;
}
/* When live, replace .bq-placeholder with:
   <iframe src="LOOKER_STUDIO_PUBLIC_URL" style="width:100%;height:100%;border:0;" loading="lazy"></iframe>
*/
.bq-placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-faint);
  font-family: var(--font-mono);
  font-size: 11px;
}
.bq-placeholder-title {
  font-family: var(--font-display);
  font-size: 16px;
  color: var(--text-dim);
}
```

- [ ] **Step 3: Verify in browser**

`preview_screenshot`. Expected: "Live BigQuery board." heading, prose paragraph, large dark-surface card with centered "[ Looker Studio embed pending ]" placeholder text.

- [ ] **Step 4: Commit**

```
git add index.html assets/styles.css
git commit -m "Add live BigQuery embed section (placeholder)"
```

---

## Task 9: Homepage section — Contact

**Files:**
- Modify: `index.html` (the `#contact` section)
- Modify: `assets/styles.css` (append)

- [ ] **Step 1: Fill in contact HTML**

Replace `<section id="contact">` with:

```html
<section id="contact" class="container section">
  <div class="section-label">// 06 / contact</div>
  <h2 class="section-title">Get in touch.</h2>
  <div class="contact-grid">
    <a class="contact-card cta" href="mailto:aug.l.turner@gmail.com">
      <div class="contact-label">// email</div>
      <div class="contact-val">aug.l.turner@gmail.com</div>
    </a>
    <a class="contact-card" href="https://linkedin.com/in/august-turner-702518123" target="_blank" rel="noopener">
      <div class="contact-label">// linkedin</div>
      <div class="contact-val">in/august-turner</div>
    </a>
    <a class="contact-card" href="https://github.com/awgdawg" target="_blank" rel="noopener">
      <div class="contact-label">// github</div>
      <div class="contact-val">@awgdawg</div>
    </a>
    <a class="contact-card" href="assets/resume.pdf" download>
      <div class="contact-label">// resume</div>
      <div class="contact-val">↓ pdf</div>
    </a>
  </div>
</section>
```

- [ ] **Step 2: Append contact styles**

```css
.contact-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 24px;
}
.contact-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 16px;
  display: block;
  transition: border-color 0.15s;
}
.contact-card:hover { border-color: var(--border-strong); }
.contact-card.cta { background: var(--accent-bg); border-color: var(--border-strong); }
.contact-card.cta .contact-val { color: var(--accent); }
.contact-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.15em;
  color: var(--text-dim);
  text-transform: uppercase;
  margin-bottom: 6px;
}
.contact-val {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 14px;
  color: var(--text);
}
```

- [ ] **Step 3: Verify links work**

`preview_eval`:

```js
(() => {
  const cards = [...document.querySelectorAll('.contact-card')];
  return cards.map(c => ({ href: c.getAttribute('href'), label: c.querySelector('.contact-label').textContent.trim() }));
})()
```

Expected: 4 entries — `mailto:aug.l.turner@gmail.com`, `https://linkedin.com/...`, `https://github.com/awgdawg`, `assets/resume.pdf`.

`preview_screenshot`. Expected: 4 contact cards across, email card highlighted with amber background + amber text.

- [ ] **Step 4: Commit**

```
git add index.html assets/styles.css
git commit -m "Add contact section with 4 cards"
```

---

## Task 10: JS — KPI counters, scroll reveal, active nav

**Files:**
- Create: `assets/app.js`
- Modify: `index.html` (script tag)
- Modify: `assets/styles.css` (append reveal helpers)

- [ ] **Step 1: Write `assets/app.js`**

```js
(function () {
  'use strict';

  // ===== KPI counter (count up when scrolled into view) =====
  const counters = document.querySelectorAll('.kpi-val[data-target]');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.target, 10);
      const suffix = el.dataset.suffix || '';
      const duration = 600;
      const start = performance.now();
      function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        const val = Math.round(target * eased);
        el.textContent = val + suffix;
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach((c) => counterObserver.observe(c));

  // ===== Scroll reveal (fade + 8px lift) =====
  const revealTargets = document.querySelectorAll('.kpi, .proj, .contact-card, .skill-group-label, .pill-row, .bq-embed');
  revealTargets.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = (i % 6) * 60 + 'ms';
  });
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-in');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealTargets.forEach((el) => revealObserver.observe(el));

  // ===== Active nav link on scroll =====
  const sections = document.querySelectorAll('main section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      navLinks.forEach((a) => {
        a.classList.toggle('active', a.getAttribute('href') === '#' + id);
      });
    });
  }, { rootMargin: '-30% 0px -65% 0px' });
  sections.forEach((s) => navObserver.observe(s));
})();
```

- [ ] **Step 2: Add reveal helper styles**

Append to `assets/styles.css`:

```css
.reveal { opacity: 0; transform: translateY(8px); transition: opacity 0.5s ease, transform 0.5s ease; }
.reveal-in { opacity: 1; transform: translateY(0); }
@media (prefers-reduced-motion: reduce) {
  .reveal, .reveal-in { opacity: 1; transform: none; transition: none; }
  .status-pill::before { animation: none; }
}
```

- [ ] **Step 3: Add the script tag to `index.html`**

Add right before `</body>`:

```html
<script src="assets/app.js" defer></script>
```

- [ ] **Step 4: Verify counter + reveal + nav highlight all fire**

`preview_eval`:

```js
(() => {
  // Wait one frame, then return KPI values + nav active state
  return new Promise((r) => {
    setTimeout(() => {
      const kpis = [...document.querySelectorAll('.kpi-val')].map(e => e.textContent);
      const active = [...document.querySelectorAll('.nav-links a.active')].map(a => a.textContent.trim());
      r({ kpis, active });
    }, 1200);
  });
})()
```

Expected: `kpis` ends with `["7+", "20+", "15", "10M+"]` (counters reached targets). `active` is `["About"]` (top-of-page default).

`preview_console_logs` — expected: no errors.

- [ ] **Step 5: Commit**

```
git add assets/app.js index.html assets/styles.css
git commit -m "Add JS — KPI counters, scroll reveal, active nav"
```

---

## Task 11: Responsive — mobile + tablet

**Files:**
- Modify: `assets/styles.css` (append media queries)

- [ ] **Step 1: Append media queries**

```css
/* ===== Responsive ===== */
@media (max-width: 767px) {
  :root { --container-pad: 18px; }

  .nav-links { gap: 14px; font-size: 10px; }
  .nav-links a { white-space: nowrap; }

  .hero-name { font-size: 44px; }
  .hero-tagline { font-size: 15px; }

  .kpi-grid { grid-template-columns: 1fr 1fr; }
  .kpi-val { font-size: 26px; }

  .skills-grid { grid-template-columns: 1fr; gap: 6px 0; }
  .skill-group-label { padding-top: 14px; }
  .skill-group-label:first-child { padding-top: 0; }

  .proj-grid { grid-template-columns: 1fr; }

  .contact-grid { grid-template-columns: 1fr 1fr; }

  .footer-inner { flex-direction: column; gap: 6px; text-align: center; }
  .section-title { font-size: 22px; }
  .bq-embed { height: 240px; }
}

@media (max-width: 480px) {
  .nav-links { display: none; }
}
```

- [ ] **Step 2: Verify mobile layout**

`preview_resize` to 390×844, then `preview_screenshot`. Expected: KPI grid 2×2, project grid 1-column, contact grid 2×2, no horizontal scroll.

`preview_eval` with `document.documentElement.scrollWidth === document.documentElement.clientWidth`. Expected: `true` (no horizontal overflow).

- [ ] **Step 3: Verify tablet layout**

`preview_resize` to 768×1024, then `preview_screenshot`. Expected: KPI grid still 4-wide, project grid 2-wide (spec §4 — desktop layout preserved at 768px).

- [ ] **Step 4: Reset to desktop**

`preview_resize` to 1440×900.

- [ ] **Step 5: Commit**

```
git add assets/styles.css
git commit -m "Add responsive breakpoints — mobile + tablet"
```

---

## Task 12: Case-study shared CSS

**Files:**
- Modify: `assets/styles.css` (append case-study styles)

- [ ] **Step 1: Append case-study styles to `assets/styles.css`**

```css
/* ===== Case study page ===== */
.cs-container { max-width: 1100px; margin: 0 auto; padding: 0 var(--container-pad); }

.cs-header { padding: 56px 0 32px; border-bottom: 1px solid var(--border); }
.cs-crumb {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  color: var(--text-dim);
  text-transform: uppercase;
  margin-bottom: 14px;
}
.cs-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 44px;
  line-height: 1.05;
  letter-spacing: -0.02em;
  margin: 0 0 14px;
}
.cs-subtitle { font-size: 16px; color: var(--text-muted); max-width: 720px; line-height: 1.5; }

.cs-meta { display: flex; gap: 28px; margin-top: 26px; padding-top: 22px; border-top: 1px solid #1a1b1d; flex-wrap: wrap; }
.cs-meta-item .lbl {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  color: var(--text-dim);
  text-transform: uppercase;
  margin-bottom: 4px;
}
.cs-meta-item .val { font-family: var(--font-display); font-weight: 500; font-size: 14px; }

.cs-body { display: grid; grid-template-columns: 220px 1fr; gap: 56px; padding: 40px 0 80px; }
.cs-toc { position: sticky; top: 80px; align-self: start; }
.cs-toc .toc-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.2em;
  color: var(--text-dim);
  text-transform: uppercase;
  margin-bottom: 14px;
}
.cs-toc ul { list-style: none; padding: 0; margin: 0; }
.cs-toc li {
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 7px 0 7px 14px;
  border-left: 1px solid var(--border);
  color: var(--text-dim);
}
.cs-toc li.active { color: var(--accent); border-left-color: var(--accent); }
.cs-toc a { color: inherit; display: block; }

.cs-section { margin-bottom: 48px; scroll-margin-top: 80px; }
.cs-section-num {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.2em;
  color: var(--text-dim);
  text-transform: uppercase;
  margin-bottom: 10px;
}
.cs-section h2 { font-size: 26px; line-height: 1.1; margin-bottom: 16px; }
.cs-section p { font-size: 15px; line-height: 1.7; color: var(--text-muted); margin: 0 0 14px; max-width: 640px; }
.cs-section strong { color: var(--text); font-weight: 500; }
.cs-section ul { list-style: none; padding: 0; margin: 8px 0 14px; }
.cs-section ul li {
  font-size: 14.5px;
  color: var(--text-muted);
  padding: 5px 0 5px 24px;
  position: relative;
  line-height: 1.55;
  max-width: 640px;
}
.cs-section ul li::before {
  content: '→';
  position: absolute;
  left: 0;
  color: var(--accent);
  font-family: var(--font-mono);
}

.code-block {
  background: var(--surface-deep);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 16px 18px;
  font-family: var(--font-mono);
  font-size: 12.5px;
  line-height: 1.6;
  margin: 20px 0;
  max-width: 720px;
  overflow-x: auto;
  white-space: pre;
}
.sql-keyword { color: var(--sql-keyword); }
.sql-fn { color: var(--sql-fn); }
.sql-string { color: var(--sql-string); }
.sql-comment { color: var(--text-faint); font-style: italic; }

.outcome-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  max-width: 640px;
  margin: 16px 0 8px;
}
.outcome {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 14px;
}
.outcome .lbl {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.15em;
  color: var(--text-dim);
  text-transform: uppercase;
  margin-bottom: 8px;
}
.outcome .val { font-family: var(--font-display); font-weight: 700; font-size: 24px; color: var(--accent); line-height: 1; }

.link-row { display: flex; gap: 10px; max-width: 640px; flex-wrap: wrap; }
.link-card {
  flex: 1 1 200px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 14px;
}
.link-card .lbl {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.15em;
  color: var(--text-dim);
  text-transform: uppercase;
  margin-bottom: 6px;
}
.link-card .val { font-family: var(--font-display); font-weight: 500; font-size: 13px; color: var(--accent); }

/* Case study mobile */
@media (max-width: 767px) {
  .cs-title { font-size: 32px; }
  .cs-body { grid-template-columns: 1fr; gap: 24px; }
  .cs-toc { position: static; }
  .cs-toc ul { display: flex; flex-wrap: wrap; gap: 6px; }
  .cs-toc li { border-left: none; padding: 4px 8px; border: 1px solid var(--border); border-radius: 3px; }
  .outcome-grid { grid-template-columns: 1fr 1fr; }
  .cs-meta { gap: 18px; }
}

/* In-development banner */
.dev-banner {
  background: var(--accent-bg);
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  padding: 12px 16px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--accent);
  margin-bottom: 24px;
  max-width: 640px;
}
.dev-banner::before { content: '⚙ '; }
```

- [ ] **Step 2: Commit**

```
git add assets/styles.css
git commit -m "Add case-study page styles (shared)"
```

(No visual to verify yet — first project page in next task.)

---

## Task 13: Project page — Snowflake migration (full case study)

**Files:**
- Create: `projects/snowflake-migration.html`

- [ ] **Step 1: Write the full case-study page**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Snowflake migration · healthcare BI — August Turner</title>
  <meta name="description" content="Case study: rebuilt enterprise reporting pipeline from SQL Server to Snowflake/OCI. 8× query speedup, 10M+ rows migrated.">
  <link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
  <nav class="nav">
    <div class="container nav-inner">
      <a href="../" class="nav-brand">aug.turner</a>
      <a href="../#projects" class="nav-links" style="font-family:var(--font-mono);font-size:11px;color:var(--text-dim);letter-spacing:0.12em;text-transform:uppercase;">← back to portfolio</a>
    </div>
  </nav>

  <header class="cs-container cs-header">
    <div class="cs-crumb">// projects / case-study · 01</div>
    <h1 class="cs-title">Snowflake migration<br>for healthcare BI.</h1>
    <p class="cs-subtitle">Rewrote a sprawling SQL Server reporting layer onto Snowflake + Oracle Analytics Cloud. Eight-times query speedup, ten-million-plus rows migrated, full Power BI semantic model refactored from scratch.</p>
    <div class="cs-meta">
      <div class="cs-meta-item"><div class="lbl">// role</div><div class="val">Lead BI engineer</div></div>
      <div class="cs-meta-item"><div class="lbl">// timeline</div><div class="val">2023 — present</div></div>
      <div class="cs-meta-item"><div class="lbl">// type</div><div class="val"><span class="badge work">work · anonymized</span></div></div>
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

    <main>
      <section id="problem" class="cs-section">
        <div class="cs-section-num">// 01 / problem</div>
        <h2>Reporting layer that wouldn't scale.</h2>
        <p>Operational reporting was anchored on a SQL Server warehouse that had grown for a decade. <strong>Multi-million-row tables</strong> behind dashboards used by service operations to monitor SLA adherence and patient-impact metrics — and the dashboards were getting slower every quarter.</p>
        <p>Key symptoms:</p>
        <ul>
          <li>Power BI refreshes timing out during business hours</li>
          <li>Stored queries with hand-tuned joins that no one alive understood</li>
          <li>Semantic model bloated with many-to-many fixes and shadow measures</li>
          <li>No clear path to incremental load — full refresh every time</li>
        </ul>
      </section>

      <section id="approach" class="cs-section">
        <div class="cs-section-num">// 02 / approach</div>
        <h2>Rebuild the layer, don't lift-and-shift.</h2>
        <p>Migrated source-of-truth queries to <strong>Snowflake views</strong>, with companion logical models in <strong>OAC</strong>. Rewrote stored queries from scratch instead of porting them — preserved business rules, dropped the legacy scaffolding.</p>
        <pre class="code-block"><span class="sql-comment">-- representative Snowflake view (anonymized)</span>
<span class="sql-keyword">CREATE OR REPLACE VIEW</span> ops.encounter_sla_v2 <span class="sql-keyword">AS</span>
<span class="sql-keyword">SELECT</span> e.encounter_id, e.patient_uid,
  <span class="sql-fn">DATEDIFF</span>(<span class="sql-string">'hour'</span>, e.opened_at, COALESCE(e.resolved_at, <span class="sql-fn">CURRENT_TIMESTAMP</span>())) <span class="sql-keyword">AS</span> hours_open,
  <span class="sql-keyword">CASE WHEN</span> e.resolved_at <span class="sql-keyword">IS NULL</span> <span class="sql-keyword">THEN</span> <span class="sql-string">'open'</span> <span class="sql-keyword">ELSE</span> <span class="sql-string">'closed'</span> <span class="sql-keyword">END</span> <span class="sql-keyword">AS</span> status
<span class="sql-keyword">FROM</span> raw.encounters e
<span class="sql-keyword">WHERE</span> e.opened_at &gt;= <span class="sql-fn">DATEADD</span>(<span class="sql-string">'year'</span>, -2, <span class="sql-fn">CURRENT_DATE</span>());</pre>
        <ul>
          <li>Staged ingestion with incremental loads on warehouse-friendly clustering keys</li>
          <li>Converted complex DAX → Oracle Logical SQL; validated via reconciliation tests</li>
          <li>Rebuilt Power BI semantic model — normalized relationships, killed shadow measures</li>
        </ul>
      </section>

      <section id="outcome" class="cs-section">
        <div class="cs-section-num">// 03 / outcome</div>
        <h2>Faster dashboards, cleaner model.</h2>
        <div class="outcome-grid">
          <div class="outcome"><div class="lbl">query speedup</div><div class="val">8×</div></div>
          <div class="outcome"><div class="lbl">rows migrated</div><div class="val">10M+</div></div>
          <div class="outcome"><div class="lbl">refresh time</div><div class="val">−72%</div></div>
        </div>
        <p>Most importantly, the semantic model became <strong>diagnosable</strong>. New measures land in a day instead of a week, and reconciliations against source-of-truth are routine instead of dramatic.</p>
      </section>

      <section id="stack" class="cs-section">
        <div class="cs-section-num">// 04 / stack</div>
        <h2>Stack.</h2>
        <div class="pill-row">
          <span class="pill">Snowflake</span>
          <span class="pill">Oracle Analytics Cloud</span>
          <span class="pill">Power BI</span>
          <span class="pill">DAX</span>
          <span class="pill">Oracle Logical SQL</span>
          <span class="pill">SQL Server (source)</span>
          <span class="pill">HL7</span>
        </div>
      </section>

      <section id="links" class="cs-section">
        <div class="cs-section-num">// 05 / links</div>
        <h2>References.</h2>
        <div class="link-row">
          <div class="link-card"><div class="lbl">// related project</div><div class="val">↗ CMS Medicare BQ</div></div>
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
    // Active TOC highlight on scroll
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

- [ ] **Step 2: Verify in browser**

In Preview: navigate to `http://localhost:8080/projects/snowflake-migration.html`. `preview_screenshot`.

Expected: case-study layout with sticky TOC (01 Problem highlighted in amber), 5 sections, SQL code block with syntax colors, outcome grid with 3 KPI cards (8×, 10M+, −72%), stack pills, links row.

`preview_console_logs` — expected: no errors.

- [ ] **Step 3: Verify TOC highlight follows scroll**

`preview_eval`:

```js
document.getElementById('outcome').scrollIntoView();
new Promise(r => setTimeout(() => {
  const active = document.querySelector('.cs-toc li.active a');
  r(active ? active.textContent.trim() : null);
}, 500));
```

Expected: `"03 · Outcome"`.

- [ ] **Step 4: Verify back-to-portfolio link works**

`preview_eval`:

```js
document.querySelector('.nav-links').getAttribute('href')
```

Expected: `"../#projects"`.

- [ ] **Step 5: Commit**

```
git add projects/snowflake-migration.html
git commit -m "Add Snowflake migration case study (full)"
```

---

## Task 14: Project pages — 3 BigQuery placeholders

**Files:**
- Create: `projects/cms-medicare.html`
- Create: `projects/nyc-taxi.html`
- Create: `projects/github-archive.html`

- [ ] **Step 1: Write `projects/cms-medicare.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>CMS Medicare claims analytics — August Turner</title>
  <meta name="description" content="BigQuery case study (in development): spending and utilization patterns across CMS public datasets.">
  <link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
  <nav class="nav">
    <div class="container nav-inner">
      <a href="../" class="nav-brand">aug.turner</a>
      <a href="../#projects" class="nav-links" style="font-family:var(--font-mono);font-size:11px;color:var(--text-dim);letter-spacing:0.12em;text-transform:uppercase;">← back to portfolio</a>
    </div>
  </nav>

  <header class="cs-container cs-header">
    <div class="cs-crumb">// projects / case-study · 02</div>
    <h1 class="cs-title">CMS Medicare<br>claims analytics.</h1>
    <p class="cs-subtitle">Spending and utilization patterns across the CMS public claims datasets — SQL transformations, partitioning strategy, and a Looker Studio dashboard built on top.</p>
    <div class="cs-meta">
      <div class="cs-meta-item"><div class="lbl">// dataset</div><div class="val">bigquery-public-data.cms_medicare</div></div>
      <div class="cs-meta-item"><div class="lbl">// type</div><div class="val"><span class="badge planned">planned</span></div></div>
    </div>
  </header>

  <div class="cs-container cs-body">
    <aside class="cs-toc">
      <div class="toc-label">// contents</div>
      <ul>
        <li class="active"><a href="#scope">01 · Scope</a></li>
        <li><a href="#stack">02 · Planned stack</a></li>
      </ul>
    </aside>

    <main>
      <div class="dev-banner">Status: in development — case study lands when the project ships.</div>

      <section id="scope" class="cs-section">
        <div class="cs-section-num">// 01 / scope</div>
        <h2>What's planned.</h2>
        <p>Goal: a clean, reproducible analytics workflow on CMS Medicare claims data — the kind that turns a public dataset into a working dashboard. Modeling questions like provider-level spend variance, regional utilization trends, and procedure-mix shifts over time.</p>
        <ul>
          <li>Source: BigQuery public dataset <code class="mono">bigquery-public-data.cms_medicare</code></li>
          <li>Transformations: layered SQL views, partitioned on claim date, clustered on provider</li>
          <li>Output: an embedded Looker Studio dashboard, plus a writeup of cost/perf tradeoffs</li>
        </ul>
      </section>

      <section id="stack" class="cs-section">
        <div class="cs-section-num">// 02 / planned stack</div>
        <h2>Stack.</h2>
        <div class="pill-row">
          <span class="pill">BigQuery</span>
          <span class="pill">SQL</span>
          <span class="pill">Looker Studio</span>
          <span class="pill">dbt</span>
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
</body>
</html>
```

- [ ] **Step 2: Write `projects/nyc-taxi.html`**

Same shell as cms-medicare. Replace the `<header>` and `<main>` content with:

```html
<header class="cs-container cs-header">
  <div class="cs-crumb">// projects / case-study · 03</div>
  <h1 class="cs-title">NYC TLC<br>trip records.</h1>
  <p class="cs-subtitle">Billion-row dataset — a performance study in BigQuery partitioning, clustering, and query-cost tuning.</p>
  <div class="cs-meta">
    <div class="cs-meta-item"><div class="lbl">// dataset</div><div class="val">bigquery-public-data.new_york_taxi_trips</div></div>
    <div class="cs-meta-item"><div class="lbl">// type</div><div class="val"><span class="badge planned">planned</span></div></div>
  </div>
</header>
```

And in `<main>`:

```html
<div class="dev-banner">Status: in development — case study lands when the project ships.</div>

<section id="scope" class="cs-section">
  <div class="cs-section-num">// 01 / scope</div>
  <h2>What's planned.</h2>
  <p>Take a billion-row BigQuery public dataset and treat it like a real warehouse problem — partitioning strategy, clustering keys, slot/cost tradeoffs, and how query design decisions show up in the bill.</p>
  <ul>
    <li>Source: <code class="mono">bigquery-public-data.new_york_taxi_trips</code></li>
    <li>Focus: cost-per-query analysis across naive vs. tuned implementations</li>
    <li>Output: a writeup with before/after query plans, cost numbers, and a Looker Studio summary</li>
  </ul>
</section>

<section id="stack" class="cs-section">
  <div class="cs-section-num">// 02 / planned stack</div>
  <h2>Stack.</h2>
  <div class="pill-row">
    <span class="pill">BigQuery</span>
    <span class="pill">SQL</span>
    <span class="pill">Looker Studio</span>
  </div>
</section>
```

- [ ] **Step 3: Write `projects/github-archive.html`**

Same shell. `<header>`:

```html
<header class="cs-container cs-header">
  <div class="cs-crumb">// projects / case-study · 04</div>
  <h1 class="cs-title">GitHub Archive<br>trends.</h1>
  <p class="cs-subtitle">Open-source ecosystem trends — language adoption, repo creation rates, and a BigQuery ML forecasting pass.</p>
  <div class="cs-meta">
    <div class="cs-meta-item"><div class="lbl">// dataset</div><div class="val">bigquery-public-data.github_repos</div></div>
    <div class="cs-meta-item"><div class="lbl">// type</div><div class="val"><span class="badge planned">planned</span></div></div>
  </div>
</header>
```

And `<main>`:

```html
<div class="dev-banner">Status: in development — case study lands when the project ships.</div>

<section id="scope" class="cs-section">
  <div class="cs-section-num">// 01 / scope</div>
  <h2>What's planned.</h2>
  <p>Use the GitHub Archive BigQuery dataset to map language and ecosystem trends over time — then take a forecasting pass with BigQuery ML to see which patterns are real signal vs. noise.</p>
  <ul>
    <li>Source: <code class="mono">bigquery-public-data.github_repos</code> + <code class="mono">githubarchive</code></li>
    <li>Modeling: BQ ML for time-series forecasting on language adoption</li>
    <li>Output: a writeup + small interactive chart</li>
  </ul>
</section>

<section id="stack" class="cs-section">
  <div class="cs-section-num">// 02 / planned stack</div>
  <h2>Stack.</h2>
  <div class="pill-row">
    <span class="pill">BigQuery</span>
    <span class="pill">BQ ML</span>
    <span class="pill">SQL</span>
  </div>
</section>
```

- [ ] **Step 4: Verify all 3 render**

For each of cms-medicare, nyc-taxi, github-archive: `preview_screenshot`. Expected: header with planned badge, dev-banner near the top, 2 TOC items, scope + stack sections.

- [ ] **Step 5: Commit**

```
git add projects/cms-medicare.html projects/nyc-taxi.html projects/github-archive.html
git commit -m "Add 3 BigQuery placeholder case studies"
```

---

## Task 15: Project pages — 2 personal projects

**Files:**
- Create: `projects/receipts-pipeline.html`
- Create: `projects/cb-trading-journal.html`

- [ ] **Step 1: Write `projects/receipts-pipeline.html`**

Use the same case-study shell as Task 13 (full structure, no dev-banner). Header:

```html
<header class="cs-container cs-header">
  <div class="cs-crumb">// projects / case-study · 05</div>
  <h1 class="cs-title">Gmail → PDF<br>receipt pipeline.</h1>
  <p class="cs-subtitle">Python automation that pulls receipts from Gmail, parses sender + amount + date metadata, generates clean PDFs, and files them into a structured archive — an ETL workflow built on personal email.</p>
  <div class="cs-meta">
    <div class="cs-meta-item"><div class="lbl">// repo</div><div class="val"><a href="https://github.com/awgdawg/Receipts" target="_blank" rel="noopener" style="color:var(--accent)">awgdawg/Receipts ↗</a></div></div>
    <div class="cs-meta-item"><div class="lbl">// type</div><div class="val"><span class="badge live">personal · live</span></div></div>
  </div>
</header>
```

Main content (TOC: Problem / Approach / Outcome / Stack / Links):

```html
<aside class="cs-toc">
  <div class="toc-label">// contents</div>
  <ul>
    <li class="active"><a href="#problem">01 · Problem</a></li>
    <li><a href="#approach">02 · Approach</a></li>
    <li><a href="#outcome">03 · Outcome</a></li>
    <li><a href="#stack">04 · Stack</a></li>
  </ul>
</aside>

<main>
  <section id="problem" class="cs-section">
    <div class="cs-section-num">// 01 / problem</div>
    <h2>Receipts live in email forever.</h2>
    <p>Every online purchase generates a receipt that ends up buried in Gmail — searchable, but not portable. For expense tracking, taxes, and warranty claims, you need them as actual files, organized by vendor and date. Doing it by hand is tedious and inconsistent.</p>
  </section>

  <section id="approach" class="cs-section">
    <div class="cs-section-num">// 02 / approach</div>
    <h2>Build the ETL the way you'd build it at work.</h2>
    <p>Treated personal email as a data source. Wrote a Python pipeline that <strong>extracts</strong> matching emails via the Gmail API, <strong>transforms</strong> the parsed metadata (sender, amount, date, vendor) into a normalized shape, and <strong>loads</strong> generated PDFs into a date-partitioned directory structure.</p>
    <ul>
      <li>Gmail API with OAuth — pulls messages matching a configurable filter</li>
      <li>Metadata parsing handles HTML, plaintext, and attached-PDF variants</li>
      <li>PDF generation for emails that only have HTML receipts</li>
      <li>Idempotent — tracks processed message IDs to avoid duplicates on re-run</li>
    </ul>
  </section>

  <section id="outcome" class="cs-section">
    <div class="cs-section-num">// 03 / outcome</div>
    <h2>An archive that actually exists.</h2>
    <p>Years of receipts now live as structured PDFs on disk, organized by date and vendor. Re-running the script is a no-op for already-processed mail. The pipeline doubles as a working reference for "what a real ETL looks like, end to end" — useful as a portfolio artifact for someone otherwise constrained by NDAs.</p>
  </section>

  <section id="stack" class="cs-section">
    <div class="cs-section-num">// 04 / stack</div>
    <h2>Stack.</h2>
    <div class="pill-row">
      <span class="pill">Python</span>
      <span class="pill">Gmail API</span>
      <span class="pill">OAuth 2.0</span>
      <span class="pill">PDFKit</span>
      <span class="pill">pdfplumber</span>
      <span class="pill">BeautifulSoup</span>
    </div>
    <div class="link-row" style="margin-top:18px">
      <div class="link-card"><div class="lbl">// repo</div><div class="val"><a href="https://github.com/awgdawg/Receipts" target="_blank" rel="noopener" style="color:var(--accent)">↗ github.com/awgdawg/Receipts</a></div></div>
    </div>
  </section>
</main>
```

(Wrap in same `<!doctype>` + `<nav>` + `<footer>` + `<script>` shell as Task 13's snowflake-migration.html.)

- [ ] **Step 2: Write `projects/cb-trading-journal.html`**

Same shell. Header:

```html
<header class="cs-container cs-header">
  <div class="cs-crumb">// projects / case-study · 06</div>
  <h1 class="cs-title">CB Trading<br>Journal.</h1>
  <p class="cs-subtitle">Personal trading-data ETL — pulls trades from Coinbase and Robinhood APIs, normalizes into a single Postgres schema, and surfaces P&amp;L plus position analytics on top.</p>
  <div class="cs-meta">
    <div class="cs-meta-item"><div class="lbl">// repo</div><div class="val"><a href="https://github.com/awgdawg/CB-Trading-Journal" target="_blank" rel="noopener" style="color:var(--accent)">awgdawg/CB-Trading-Journal ↗</a></div></div>
    <div class="cs-meta-item"><div class="lbl">// type</div><div class="val"><span class="badge live">personal · WIP</span></div></div>
  </div>
</header>
```

Main content:

```html
<aside class="cs-toc">
  <div class="toc-label">// contents</div>
  <ul>
    <li class="active"><a href="#problem">01 · Problem</a></li>
    <li><a href="#approach">02 · Approach</a></li>
    <li><a href="#stack">03 · Stack</a></li>
  </ul>
</aside>

<main>
  <div class="dev-banner">Status: work-in-progress — repo is rough, cleanup in flight.</div>

  <section id="problem" class="cs-section">
    <div class="cs-section-num">// 01 / problem</div>
    <h2>Two brokerages, one ledger.</h2>
    <p>Coinbase and Robinhood each have their own API, schema, and quirks. Anyone trading on both ends up reconciling spreadsheets by hand. The goal: pull both into one Postgres warehouse and treat it like any other operational data — clean, queryable, joinable.</p>
  </section>

  <section id="approach" class="cs-section">
    <div class="cs-section-num">// 02 / approach</div>
    <h2>Normalize the schema, lean on SQL for analytics.</h2>
    <p>Extract from each broker's REST API, transform into a unified <code class="mono">trades</code> + <code class="mono">positions</code> schema in PostgreSQL, then build SQL views on top for realized/unrealized P&amp;L, position-size weighting, and time-windowed returns.</p>
    <ul>
      <li>Per-broker extractors handle API auth, pagination, rate limits</li>
      <li>Normalized schema isolates broker quirks from analytics queries</li>
      <li>Daily refresh job catches new trades incrementally</li>
    </ul>
  </section>

  <section id="stack" class="cs-section">
    <div class="cs-section-num">// 03 / stack</div>
    <h2>Stack.</h2>
    <div class="pill-row">
      <span class="pill">Python</span>
      <span class="pill">Coinbase API</span>
      <span class="pill">Robinhood API</span>
      <span class="pill">PostgreSQL</span>
      <span class="pill">SQL</span>
    </div>
  </section>
</main>
```

- [ ] **Step 3: Verify both render**

`preview_screenshot` on each. Expected: full case-study layout. CB Trading Journal shows the WIP dev-banner.

- [ ] **Step 4: Commit**

```
git add projects/receipts-pipeline.html projects/cb-trading-journal.html
git commit -m "Add 2 personal project case studies"
```

---

## Task 16: Assets — resume PDF + Open Graph image

**Files:**
- Create: `assets/resume.pdf`
- Create: `assets/og-image.png`
- Modify: `index.html` (add OG meta tags)

- [ ] **Step 1: Copy resume**

PowerShell:
```
Copy-Item 'E:\DL\BIA2_resume.pdf' 'C:\Users\auglt\portfolio\assets\resume.pdf'
```

- [ ] **Step 2: Verify resume download works**

`preview_eval`:
```js
fetch('assets/resume.pdf').then(r => ({ ok: r.ok, type: r.headers.get('content-type'), bytes: r.headers.get('content-length') }))
```

Expected: `{ ok: true, type: 'application/pdf', ... }`.

Also click the resume card on the homepage manually — browser should download or open in PDF viewer.

- [ ] **Step 3: Create OG image (1200×630)**

Generate a simple OG image matching the site aesthetic — black bg, big Oxanium name, KPI strip below, amber accent mark. Two approaches:

**Option A (easier):** Use a free OG image generator (e.g., og.tailgraph.com, bannerbear free tier) with brand colors and copy. Save the output as `assets/og-image.png`.

**Option B (cleaner):** Write a small HTML page (`tools/og-template.html`) styled to 1200×630, screenshot it via `preview_screenshot` after `preview_resize` 1200×630, save the PNG as `assets/og-image.png`. Don't ship the template page.

- [ ] **Step 4: Add OG + Twitter meta tags to `index.html`**

In `<head>`, after the existing `<meta name="description">`:

```html
<meta property="og:type" content="website">
<meta property="og:title" content="August Turner · BI / analytics engineering">
<meta property="og:description" content="Business intelligence analyst with seven years building reliable analytics on healthcare and operational data.">
<meta property="og:url" content="https://augustturner.dev">
<meta property="og:image" content="https://augustturner.dev/assets/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="August Turner · BI / analytics engineering">
<meta name="twitter:description" content="Business intelligence analyst with seven years building reliable analytics on healthcare and operational data.">
<meta name="twitter:image" content="https://augustturner.dev/assets/og-image.png">
```

- [ ] **Step 5: Test OG preview**

Open `https://www.opengraph.xyz/url/<URL>` once the site is deployed (Task 17). Expected: card renders with correct title, description, and image.

For now: visual sanity-check the og-image.png file directly.

- [ ] **Step 6: Commit**

```
git add assets/resume.pdf assets/og-image.png index.html
git commit -m "Add resume PDF + OG image + social meta tags"
```

---

## Task 17: GitHub remote + Pages setup

**Files:** none (GitHub config only)

- [ ] **Step 1: Create remote repo (manual)**

User action — go to https://github.com/new and create `awgdawg/portfolio`, public, no README/license (we have those locally).

Alternative via `gh` CLI if installed:
```
gh repo create awgdawg/portfolio --public --source=. --remote=origin --push
```

- [ ] **Step 2: Add remote and push**

```
git remote add origin https://github.com/awgdawg/portfolio.git
git branch -M main
git push -u origin main
```

- [ ] **Step 3: Enable GitHub Pages**

User action — in the repo on GitHub: Settings → Pages → Source: "Deploy from a branch", Branch: `main`, Folder: `/ (root)`. Save.

Expected: GitHub shows "Your site is live at https://awgdawg.github.io/portfolio/" within 30s–2min.

- [ ] **Step 4: Verify live URL**

Open `https://awgdawg.github.io/portfolio/` in a browser. Expected: homepage renders identically to local preview. All 6 project links navigate correctly. Resume downloads.

- [ ] **Step 5: Document the live URL in README**

Update `README.md` to confirm the github.io URL is live; custom domain status pending.

```
git add README.md
git commit -m "Note live URL in README"
git push
```

---

## Task 18: Lighthouse + accessibility verification

**Files:** none (verification only)

- [ ] **Step 1: Run Lighthouse on the live URL**

In Chrome DevTools → Lighthouse → run on `https://awgdawg.github.io/portfolio/`. Capture all 4 scores (Performance / Accessibility / Best Practices / SEO).

Spec quality bars (from §8): Performance ≥ 95, Accessibility ≥ 95.

- [ ] **Step 2: Address any issues that drop below bars**

Common issues and fixes:
- **Performance dip:** check that fonts use `display=swap` (already set in Task 2); compress og-image.png; defer non-critical JS (already deferred via `defer` attribute).
- **Accessibility dip:** make sure `alt` text exists on any `<img>` (currently none used), color contrast verified (palette designed for AA), `lang` attribute on `<html>` (already set to "en"), nav has proper semantic structure.
- **SEO dip:** confirm meta description, OG tags, and a single h1 per page.

- [ ] **Step 3: Manual keyboard nav test**

In the live site, press Tab repeatedly from page load. Expected order: nav links → hero (no focusables) → project cards (each card is focusable since they're `<a>` tags) → contact links. No skipped/trapped focus.

`preview_eval` to confirm focus chain locally:
```js
(() => {
  const all = [...document.querySelectorAll('a, button, input, [tabindex]:not([tabindex="-1"])')];
  return all.map(el => el.tagName + ' · ' + (el.getAttribute('href') || el.textContent.trim().slice(0,30)));
})()
```

Expected: nav links first, then sequential project + contact links.

- [ ] **Step 4: Responsive smoke test on live URL**

Open Chrome DevTools device mode. Verify at:
- 390×844 (iPhone 14): KPIs stack 2×2, projects 1-column, no horizontal scroll
- 768×1024 (iPad portrait): KPIs 4-wide, projects 2-wide
- 1440×900 (desktop): KPIs 4-wide, projects 2-wide

- [ ] **Step 5: Final commit if any fixes were needed**

```
git add -p
git commit -m "Lighthouse + a11y fixes"
git push
```

---

## Task 19: Custom domain (deferred — execute when user buys `augustturner.dev`)

**Files:**
- Create: `CNAME`
- DNS configuration (registrar dashboard)

- [ ] **Step 1: Confirm `augustturner.dev` availability and purchase**

User action — check Porkbun, Cloudflare, or Namecheap. If unavailable, fall back to one of: `augturner.dev`, `aturner.dev`, `august-turner.dev`, `augustlturner.com`. Use the chosen domain in the steps below.

- [ ] **Step 2: Create `CNAME` file in repo**

```
echo "augustturner.dev" > CNAME
git add CNAME
git commit -m "Add CNAME for custom domain"
git push
```

(PowerShell: `'augustturner.dev' | Set-Content -Encoding ascii CNAME -NoNewline`.)

- [ ] **Step 3: Configure DNS at registrar**

For an apex domain (`augustturner.dev` with no `www.`), add 4 A records pointing to GitHub Pages IPs:

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

For `www.augustturner.dev`, add a CNAME pointing to `awgdawg.github.io`.

- [ ] **Step 4: Verify DNS + GitHub Pages picks up custom domain**

In GitHub repo Settings → Pages: enter `augustturner.dev` in "Custom domain", save. Wait for GitHub's DNS check to pass.

Run `dig augustturner.dev` or use https://www.whatsmydns.net to confirm propagation.

- [ ] **Step 5: Enable Enforce HTTPS**

Once GitHub Pages shows "DNS check successful", check the "Enforce HTTPS" box in Settings → Pages.

Expected: `https://augustturner.dev` loads the portfolio with a valid Let's Encrypt cert.

- [ ] **Step 6: Update social meta tags + README + LinkedIn**

OG meta tags in `index.html` (Task 16 Step 4) already point to `augustturner.dev` — no change needed.

Update README live URL. Update LinkedIn profile to use the custom domain. Update resume's URL field.

```
git add README.md
git commit -m "Switch live URL to augustturner.dev"
git push
```

---

## Self-Review

**Spec coverage (§ refers to design spec):**

- §1 Goal — covered implicitly by all tasks; the cumulative result is a recruiter funnel + project showcase.
- §2 Architecture & deployment — Tasks 1, 17, 19.
- §3 Visual system (palette, type, motion, UI patterns) — Tasks 2 (variables + fonts), 4–10 (UI patterns in use), 10 (motion).
- §4 Homepage layout — Tasks 3 (scaffold) + 4–9 (each section) + 11 (responsive).
- §5 Project case-study template — Tasks 12 (CSS) + 13–15 (six pages using it).
- §6.1 Hero content — Task 4.
- §6.2 About — Task 5.
- §6.3 Skills — Task 6.
- §6.4 Project tiles — Task 7.
- §6.5 Case-study scope — Tasks 13 (full Snowflake), 14 (3 BQ placeholders), 15 (2 personal).
- §6.6 Contact — Task 9.
- §6.7 Footer — Task 3.
- §7 Live BigQuery embed (Looker Studio iframe approach) — Task 8 (placeholder) + comment in CSS for live swap-in.
- §8 Verification & launch checklist — Tasks 17 (Pages enable), 18 (Lighthouse + a11y + responsive), 19 (custom domain).
- §9 Out of scope — explicitly deferred; not in plan.

No gaps detected.

**Placeholder scan:** No "TBD", "TODO", "implement later" anywhere. The Snowflake case-study page in Task 13 inlines the full content; placeholder pages (Task 14) explicitly use a labeled `.dev-banner`, which is intentional UI, not a writing placeholder.

**Type / name consistency:**
- `.kpi-val` used in Task 4 HTML and Task 10 JS selector — match ✓
- `data-target` and `data-suffix` defined in Task 4 HTML and read in Task 10 JS — match ✓
- `.proj`, `.contact-card`, `.section-label` consistent across tasks ✓
- `.cs-*` namespaces (case-study) defined in Task 12 and used in Tasks 13–15 — match ✓
- CSS variable names (`--bg`, `--surface`, `--accent`, etc.) introduced in Task 2 and referenced thereafter — match ✓
- Section IDs (`#hero`, `#about`, `#skills`, `#projects`, `#live`, `#contact`) consistent between HTML (Task 3) and JS selectors (Task 10) ✓

Plan is internally consistent. Ready for execution.
