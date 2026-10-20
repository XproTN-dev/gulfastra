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


## v5 — Fusion analytical workspace

The site now includes a full-screen, responsive analyst workstation accessed from the **FUSION** ribbon or mobile FUSION navigation. All source data is hosted on free GitHub Pages; GitHub Actions runs collection and open-data transformation on a best-effort schedule.

| Workbench | What is implemented |
|---|---|
| **Event Fusion** | Conservative grouping of related public headlines, with preserved source URLs, language, publication dates, publisher names and an auditable event record. No "confirmed strike" auto-labels. |
| **Country Desk** | Country-mention group counts, headline volume, indexed publisher diversity, reporting trends. Counts are NOT threat estimates. |
| **Publication Timeline** | Click day bars to filter publication-time evidence and inspect revisions. Not an as-known-at-the-time historical reconstruction. |
| **SITREP** | Source-linked, deterministic summaries in Arabic/English (select language), browser-copy and Markdown download. Automatically published 24h English/Arabic markdown files under `data/`. |
| **Query Console** | Search with `country:Qatar type:security lang:ar after:72h`, `source:...`, `topic:...`, terms, export CSV/JSON. Press `/` for query and Esc to close. |
| **Source Health** | Individual RSS/search provider success, failure, fetch counts, independent hazard feed health and optional integrations. |
| **Environmental context** | USGS earthquakes and NASA EONET geographic observation layers, with optional approved Cloudflare Radar connectivity records. Nothing is inferred to be a military event. |
| **Relationships** | Country co-mentions and publisher distribution; these do not infer causality, affiliation, or hostile activity. |
| **Watchlist** | Locally stored country/topic rules and matching recent reporting. No claim of browser push with the site closed. |
| **Evidence Dossier** | Original source links, group revision history, distinction between named publishers and verification, manual review flags for potentially divergent wording. |
| **Optional Telegram** | `scripts/telegram_digest.py` can send limited source-linked headline digests when `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are configured as GitHub Actions secrets. Disabled otherwise. |

### Data files

- `data/reports.json` — archive of indexed public articles.
- `data/events.json` — deterministic candidate coverage groups with all source links and source-provenance labels.
- `data/revisions.json` — bounded event-group change history.
- `data/observations.json` — USGS, NASA EONET and optional Cloudflare outage records plus provider health.
- `data/sitrep.md`, `data/sitrep-ar.md` — automatically generated source-linked briefings.

### Privacy, precision and limitations

* **No live missile detection or military tracking.** Reports describe public allegations and observations; they aren't validated incidents.
* No automatic "confidence 99%" scores or proof from the number of outlets. Many outlets may syndicate one original story.
* The grouping engine uses conservative wording, category, topic, country-mention and publication-window rules. Bilingual links require additional matching identifiers and remain candidates for analyst review.
* Contradiction flags represent possible language differences only, not proof that a source is lying.
* Public weather, network and seismic observations are distinct from military reporting.
* The visible country positions are reference points for reporting and should not be read as precise targets.
* Optional providers cannot operate without a token, or where provider terms disallow collection/redistribution.
* GitHub scheduled collection is not guaranteed instantaneous. Browser-local watchlist and notifications are not a 24/7 push service.
* The complete event archive and all source metadata in the repository are public. Do not store private keys or user identifiers in data files.

### Automated checks

- `scripts/test_arabic.py` checks Arabic country extraction and classification.
- `scripts/test_fusion.py` prevents false merges, manufactured confirmation, and unstable revisions.
- `scripts/visual_check.py` verifies real desktop and mobile rendering, news article feed, MapLibre map positions, Fusion dossiers, query search and country/source-health views.
- Browser screenshots are downloadable as GitHub Actions artifacts under the **Visual & functional website check** workflow.

---

## Arabic and local Gulf coverage (v4)

- Arabic Google News searches (Arabic locale QA) for missile and drone claims, air-defense and interception reporting, regional maritime and aviation disruptions, and statements concerning Qatar, Saudi Arabia, the UAE, Bahrain, Kuwait, Iraq, Iran and Hormuz.
- Arabic publisher-targeted news search for Al Jazeera Arabic (الجزيرة), Al Arabiya (العربية), Asharq (الشرق), and regional agencies: QNA / SPA / WAM / KUNA / BNA.
- Direct Al Jazeera Arabic RSS at `https://www.aljazeera.net/rss` (if the publisher continues to offer it).
- Arabic headlines display with RTL direction and native MapLibre v6 Arabic shaping on the map. Language tabs support ALL / عربي / ENGLISH.
- **Nabd** is provided through links to its public news/category pages and the original Gulf publishers it aggregates. We do **not** claim that Nabd publishes an unrestricted public data API or that Gulfastra automatically scrapes its private app feed.
- **X / Twitter** is an opt-in external search watch panel for current public posts. X's official API charges for read/search access; Gulfastra's free edition does **not** ingest posts via X's paid API. Treat social posts as unverified until corroborated.
- Regional reporting can mention multiple countries. Country markers refer to mentioned countries, not to alleged impact sites or live military movement. Country circles are tested against the map projection to catch misplaced markers.

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
