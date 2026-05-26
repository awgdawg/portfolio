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
