# GULFASTRA X — v11 intelligence command center

**Public website:** https://xprotn-dev.github.io/gulfastra/

**New application:** https://xprotn-dev.github.io/gulfastra/command/

**Exact previous v9 application:** https://xprotn-dev.github.io/gulfastra/legacy-v9.html

This is a map-first, evidence-first, free/GitHub-only static OSINT research tool. It is not an official emergency alert system, a source of classified data, a conflict targeting tool, or live military telemetry.

## What v11 replaces

The v3–v9 interface accumulated six conflicting stylesheets. V11 uses its own static modular client (`command/index.html`, `assets/command11*.js` and `assets/command11.css`), with no previous-generation stylesheet. GitHub Pages redirects the site's root to this application while keeping the exact previous root HTML at `legacy-v9.html`.

## Available user workflows

| Capability | Implementation | Integrity |
|---|---|---|
| Global and Gulf map | MapLibre / OpenFreeMap with globe/standard presets | Geographic backdrop, not satellite reconnaissance |
| Natural hazards | USGS and NASA EONET published coordinate-backed observations | Geolocated by originating provider, not a strike/attack |
| Thermal observations | Optional NASA FIRMS VIIRS NOAA-21 area CSV, enabled via private secret | Satellite anomaly; causes not established |
| Static ports and airports | Eight clearly labelled geographic reference markers | **Not** traffic or operating-status telemetry |
| Country news coverage | Off by default; country mention counts drawn at reference centers | Not incident locations |
| Alerts | Existing source-linked `alerts.json` candidates, quality gate and freshness expiry | Unverified published claims, not emergency guidance |
| Intelligence stream | Relevance of publication recency and named source diversity | Not a severity or probability score |
| Evidence dossiers | Underlying articles, URLs, wording flags and provenance | Claims remain unverified |
| News/situation briefing | Deterministic statistics and original evidence | Not generative AI or predictions |
| Source health | Collector status, quality-gate, delayed-source warnings | Backoff and success distinguished |
| Timeline replay | Filter by original publication/observation times | Not an exhaustive reconstruction of past knowledge |
| Saved watchlist | Local browser storage; countries and keyword filters | No external watchlist uploads |
| Search/analyst commands | Ctrl+K or /, natural matching plus structured query | No paid LLM |
| JSON export | Current filtered evidence and original-source metadata | No hidden server-side storage |
| Appearance | Midnight, Obsidian, Sand, spacing control and mobile navigation | Low-complexity, separate design |
| Optional notifications | Browser opt-in while page open and optional Telegram via GitHub secrets | Best-effort latency; not continuous push |

### Structured analyst search

Open the command palette with **Ctrl+K**, then enter:

`country:Qatar topic:security hours:24`

`country:UAE topic:transport hours:168`

Supported country codes include Qatar, Iran, Saudi, UAE, Bahrain, Kuwait, Iraq, Oman, Yemen and Israel. Topics: all/security/transport/diplomacy. Windows: 0/24/72/168/720 hours, where 0 is the indexed archive.

The country coverage layer aggregates article mentions, not true attack coordinates. Geo-observations are a separate map layer. Static facility markers are not a live-operating-status feed.

### Time semantics

News timestamps describe publications or first indexing; they do not establish the underlying occurrence time or whether a claimed event is currently active. `coverage_stage` stages such as developing/quiet/archived describe publication activity. Silence from publishers does not establish resolution. The timeline is based on the actual dataset, not an illustrative chart.

### Optional private integrations

- **NASA FIRMS:** Sign up for a free map key at https://firms.modaps.eosdis.nasa.gov/api/map_key/ and configure the GitHub Actions secret `NASA_FIRMS_MAP_KEY`. The automated collector will request the regional bounding box and retain clearly labelled VIIRS thermal anomalies. The private key is never checked in or made available to the public browser. Without the secret, thermal detections remain unavailable; no synthetic points appear.
- **Cloudflare Radar:** The optional `CF_RADAR_TOKEN` secret is supported by the observations collector. Connectivity outages are country-level provider reports, not exact map points.
- **Telegram:** Set both `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in repository Actions secrets to enable published-source critical reporting notifications. Absent these, no remote Telegram delivery is configured.
- **Other external aviation/maritime feeds:** The Sources tab includes external official/provider portals but does not claim a live OpenSky, UKMTO, NOTAM, AIS, or satellite-tracking integration. Data quotas, terms, credentials and geolocation semantics must be confirmed before adding those to the map.

No paid AI service, camera feed or live TV stream is secretly connected. A properly licensed live-media wall or generative local-model analyst integration requires a supported source and operator-provided authorization; the deterministic SITREP is currently the honest fallback.

## Deployment and quality

- Site: GitHub Pages, no running application server.
- Data: `intelligence-data` branch, versioned by `data/live-manifest.json`; client uses GitHub raw with a bundled fallback when unavailable.
- Collectors: GitHub Actions best-effort schedule; failures and staleness surfaced.
- Static JS and data tests: `node scripts/test_command11.mjs`.
- Browser QA: `scripts/visual_check_v11.py` at desktop and mobile sizes; screenshots uploaded as a CI artifact by `command11-checks.yml`.
- Collector and thermal provenance tests: Python quality gate and `scripts/test_firms.py`.
- Rollback: `legacy-v9.html` is a byte-for-byte copy of the previous `index.html`. Revert the index redirect commit or replace root with this file if needed.

## Known limitations

- Browser maps and external data fetches require network access to CDN / GitHub and published map tiles. They are not guaranteed instant.
- The maintained archive keeps a limited rolling history; time replay cannot reconstruct what a user would have known in a past moment outside that coverage.
- Event fusion remains conservative deterministic title correlation, not complete cross-lingual entity resolution or incident verification.
- Approximate facility reference coordinates do not establish regulatory operating status or safety.
- The sidebar's source directory is a navigational resource, not proof those external platforms are actively ingested.
- The high-level interface is bilingual-ready and supports Arabic headlines. Full native Arabic localization still requires a separate comprehensive QA pass.
- Computer-vision, multi-camera, genuine streaming vessel/aircraft assets, real-time emergency notifications and commercial LLM access are **not claimed as implemented**.

The project should be judged against evidence accuracy, timeliness, usability and measured false-alert rates, not by visual volume.
