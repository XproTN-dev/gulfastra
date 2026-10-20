## Command View v9 — bugfix and stability pass (20 October 2026)

Audited the user-provided desktop recording and exercised the application with real Playwright desktop (1600×960) and mobile (390×844) browser tests.

**Issues fixed:**
- The source-health status now uses explicit **MIN AGO / HR AGO** wording and labels stale collection separately from the time of a published article. The video showed 12 minutes, not 12 hours.
- The **evidence review** pane now uses the archive's actual `sources[]` and publisher metadata, displays named-outlet counts conservatively, exposes original source links and flags wording that requires human review.
- Arabic and English display titles no longer repeat a trailing publisher suffix when it matches the independently stored source byline. The archived title remains unchanged.
- The **Hormuz** filter rejects unrelated article titles that happen to mention the word Hormuz without maritime context; results are labeled as keyword matches, not verified sea incidents.
- Up to four desktop floating windows auto-tile to avoid overlap. A **TILE WINDOWS** control restores the arrangement. On mobile, opening a new workspace replaces the prior one.
- Floating windows start below the top status bar, allowing their close, drag, front and resize controls to remain reachable. Bring-to-front is now wired.
- Open windows preserve scroll position and headline ticker playback on routine 30-second polling. Only actual archive version changes trigger redraw.
- The GitHub branch loader sends **data-changed** events for newly available archive hashes, including subsequent scheduled fetches; it does not invent a WebSocket feed.
- Mobile now has a **TOOLS** menu containing source diagnostics, security reporting, publication timeline and analyst lab.
- The default timeline plots only the past 14 calendar days, excluding misleading historic outliers from the default chart while retaining the archive.
- Timeline bars, evidence source buttons, and warnings now have explicit responsive styles.

**Test gates:** authentic article links, map marker-coordinate agreement with geographic reference centers, Arabic directionality, non-overlapping desktop windows, one mobile window, evidence URLs and publisher counts, source diagnostics, timeline bars, actual MapLibre globe projection, country search, navigation, palette selection, news ticker, full Fusion query workspace and absence of browser JavaScript errors.

**Known limitations:** Github Actions scheduling remains best effort, external publishers and APIs can be delayed or rate-limited, and no site can guarantee verification merely from multiple headlines. GitHub Pages still hosts frontend code; news data is on `intelligence-data` with CDN propagation delays. No operational military or real-time asset tracking has been introduced.


## Command View 09 — Immersive map-first interface

Built in response to the user's supplied visual reference (World Monitor-style global map with movable intelligence windows). This is an **independently implemented** interface using the existing MapLibre basemap and Gulfastra's existing source dataset; no proprietary source code or data is copied.

- **Full-screen dark command map** with a neon phosphor, arctic cyan, or amber palette.
- **MAP / WIRE / GLOBE** top navigation, with an actual MapLibre globe projection where supported and a fallback on errors.
- **Floating, draggable, resizable desktop windows** for the original published news Wire, evidence group verification, Gulf maritime coverage, security headlines, source health, publication timeline, and analyst-tool launch pad.
- **Quick country locator** that flies to known geographic reference coordinates and opens the corresponding source-linked headline coverage.
- Hover cards and map markers use **country-level mention counts**, never fabricated launch, impact, or asset coordinates.
- **Left and right command tool docks** on desktop and a bottom action bar on mobile.
- Bottom scrolling headline ticker contains real original source links. It stops animating for reduced-motion preference or on hover.
- Public data remains in the independent `intelligence-data` GitHub branch; fallback/cached origin and collector delays are shown honestly. GitHub Pages is not redeployed on article collection.
- Arabic source headlines remain in original script with proper RTL.
- Full legacy NEXUS/Fusion workspace accessible from ANALYST LAB; no loss of source links, verification notes, source health, or archive filters.
- Browser regression checks run in desktop/mobile Chromium and validate map marker precision, actual source headlines, floating window controls, palette switches, country search and advanced Fusion query.

**Limitations:** This does not fabricate worldwide incident data to fill the map. Geographic marks are limited by the sources actually collected and their reliably identified countries. The GLOBE visualization is geographic only, not a military-asset tracking feed. No paid external backend, live X firehose, streaming vessel telemetry, or background WebSocket server has been introduced.

## Edition 08 — interface rebuild and appearance studio

The default application is now **news-first** rather than map-first. A dedicated desktop navigation rail sits beside an evidence-centric newsroom and a smaller secondary map. On phones, the original source headlines appear ahead of the map, while filters remain available through an overlay. The desktop map remains expandable. The same original Arabic/English reports, Fusion dossiers, NEXUS Wire, Verify, Hormuz, Replay, query console and GitHub-only public data branch continue to work.

**Three complete visual styles** are available via the header **APPEARANCE** control:

- **Atlas** — light editorial interface, white reporting panels, marine/navy navigation, bright regional map.
- **Nocturne** — high-contrast dark navy intelligence operations layout with restrained teal.
- **Terminal** — minimal dark-carbon technical workspace with phosphor accents and monospaced treatments.

Appearance Studio shows visual previews, indicates the selected theme, applies changes without a page reload, supports Escape and keyboard focus, and remembers the choice in the browser.

The site uses `assets/v8.css` and `assets/v8.js` for the new visual system. Earlier data loaders and map controls are preserved rather than replaced, and the old one-click theme cycling is disabled.

**Accessibility and accuracy:** original Arabic titles preserve right-to-left rendering, source links remain intact, map pins are explicitly country-reference counts rather than exact incident coordinates, and the page distinguishes fresh GitHub-branch content from a bundled snapshot fallback.

Automated Playwright checks cover both desktop and mobile: news placement before/alongside the map, three theme selections, the appearance dialog, map expand/restore, country-marker coordinates, original source news, Arabic rendering, Fusion/NEXUS workbenches and JavaScript errors. Actual screenshots of each theme are saved as workflow artifacts.

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


## v6 — Compact operations layout and faster collection

- **Default map is compact** rather than occupying the full desktop viewport. The **EXPAND / COMPACT** button uses MapLibre's resize method and restores map centering/markers.
- **News-first mobile layout:** the initial map is shorter and the activity histogram is hidden on narrow displays to surface the live-source reporting panel sooner.
- **Three data-linked headline highlights** underneath the map, each linking to the original public report. No fabricated content or simulated data.
- **Three persisted visual themes** (Spectre, Obsidian, Slate) cycled with the upper-right ◐ control. Persisted locally per browser, no login or payments.
- **Collapsible source diagnostics**, with all 20 source checks accessible through the left panel or Fusion Source Health.
- **Distinct timestamps:** a completed collection time versus the newest source publication. The browser reloads published JSON every 45 seconds when visible, but this does not itself run the collector.
- **GitHub Actions schedule: five-minute best-effort collection** using `3/5 * * * *`. GitHub may queue or drop scheduled runs during high load. Publishing to Pages also takes additional time. **This is not real-time incident detection.**
- **GDELT backoff:** because GDELT repeatedly returned HTTP 429, it is probed approximately twice per hour rather than on every five-minute run; the UI labels scheduled skips separately from errors.
- **Automated browser regression tests:** both desktop/mobile map sizing, expand/compact control, theme switch, real linked highlights, Arabic article display, correct country-map coordinates, existing Fusion dossiers/query/country/source-health pages, and no browser errors.

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
