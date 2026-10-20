# Gulfastra — Gulf Intelligence Dashboard

Free GitHub Pages OSINT dashboard with a regional map, public-source headline monitoring, keyword-based incident categories, and source links.

## Setup
1. Settings > Pages > Build and deployment > Source > **GitHub Actions**.
2. Actions > Refresh OSINT reports > Run workflow. The scheduled action also runs approximately every 20 minutes when GitHub schedules it.
3. View published site at https://xprotn-dev.github.io/gulfastra/.

No Python server is required for viewers. GitHub Actions uses Python standard library to collect Google News RSS results and commit data/reports.json. GitHub Pages deploys on push.

## Limitations
- A headline about a drone or missile is **not** verification of a launch.
- Map markers show representative country centers, not attack sites or weapon movement.
- GitHub Actions schedule is best-effort and can be delayed or disabled after inactivity.
- Some public RSS feeds may fail, throttle requests, or change their formats.
- The dataset is public and should not contain secrets.
- Map tiles require network connectivity and are subject to third-party usage policies.

## Structure
- index.html: dashboard UI
- assets/style.css: design system
- assets/app.js: interactive map, filtering, timeline and article inspector
- scripts/collect.py: headline collection, deduplication, classification
- data/reports.json: published data archive
- .github/workflows: Pages deployment and scheduled collection

This project reports publicly published information; it is not an emergency warning service.
