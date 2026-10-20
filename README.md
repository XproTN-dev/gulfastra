# Gulfastra — Gulf Public Intelligence Observatory

A free, public-source regional news monitoring dashboard hosted on GitHub Pages.

**Website:** https://xprotn-dev.github.io/gulfastra/

## What actually works

- Full-screen desktop command-center and mobile-first layout, built using static HTML/CSS/JavaScript.
- Interactive MapLibre vector map powered by [OpenFreeMap](https://openfreemap.org/) (no API key).
- Click country-aggregated reporting markers to filter published news. These are **not incident locations**.
- Report feed with filtering by country, type, publication window, and keyword.
- Article details including source outlet, time, reporting type and original external link.
- In-app headline alert center for recently published security reporting.
- Optional browser notifications only **while the page is open** and permission is granted.
- Timeline of hourly news publication, provider connectivity and freshness.
- Scheduled Python collection in GitHub Actions; durable public JSON archive updated in repository.
- Chrome desktop/mobile screenshot-based smoke test with Playwright.

## Public information sources

- Google News RSS topical feeds: missiles/drones, regional security, aviation, commercial shipping, diplomacy and official statements reported in news.
- BBC Middle East RSS.
- Al Jazeera RSS.
- GDELT DOC article index (optional; publicly rate-limited, errors visible in Source Health).

Each feed is monitored separately. GitHub Actions scheduled jobs are **best effort** and may be delayed. Refreshing the website does not force GitHub Actions to run.

## Setup / deploy

1. Go to repository Settings → Pages → Source: GitHub Actions.
2. Publishing workflow runs on every main-branch push.
3. Actions → Refresh OSINT reports → Run workflow to request manual collection.
4. Updates automatically appear on Pages after deployment completes.

## Limitations and interpretation

- **No live radar, missile detection or drone telemetry.** These are news stories about claims and events.
- Keyword category and country extraction are imperfect; a report's source may be incorrect.
- Article publication date is **not** incident occurrence time.
- Country markers show general reference points only, never the location of a launch or impact.
- Mobile browser notifications are not always delivered, and cannot arrive with the tab closed using this static-only architecture.
- GDELT may return HTTP 429 and direct RSS publishers may restrict automated retrieval.
- The archive, code and news metadata are public; do not store secrets.
- Map tiles require connection to OpenFreeMap's external service; display includes map attribution.
- This is not an official alert or emergency warning system.

## Project structure

- `index.html`, `assets/v3.css`, `assets/v3.js`: primary frontend.
- `scripts/collect.py`: news ingestion, relevance filtering and archive maintenance.
- `data/reports.json`: published archive.
- `.github/workflows/collect.yml`: news collection and automatic commit.
- `.github/workflows/pages.yml`: static website publishing.
- `.github/workflows/visual-check.yml` and `scripts/visual_check.py`: real browser verification and screenshots.

### Design baseline

The v3 desktop screenshot and mobile screenshot are captured in the GitHub Actions **Visual & functional website check** run's artifact, for comparing future redesigns with actual rendered output rather than conceptual illustrations.
