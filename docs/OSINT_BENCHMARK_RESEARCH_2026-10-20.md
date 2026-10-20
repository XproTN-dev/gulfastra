# GULFASTRA — OSINT competitor research (2026-10-20)

STATUS: Reference research only. Do not change the live site or launch Cloudflare migration unless requested.

## Decision on hold
Keep user experience chat-only: assistant edits GitHub repository XproTN-dev/gulfastra, while GitHub Actions performs authorized deployment. If user later chooses Cloudflare Workers + D1 for fast data, GitHub remains source of truth and CI/CD; cloud ingestion runs independently of website redeployment. One-time account connection and GitHub Secrets provisioning may require the user. Strictly prefer free resources and never claim unlimited compute.

## Research scope and limitations
Reviewed first-party methodological publications and UI text for Intel Mapper, WarHeatMap, PizzINT Polyglobe and associated pages, plus GeoConfirmed's first-party social guides and official QGIS plugin listing. GeoConfirmed interactive map returned HTTP 403; Polyglobe interactive app exposed little server-rendered text. Proprietary frontend JS, private APIs, AI prompts, database and exact internal schedules could NOT be inspected or confirmed. Treat vendor marketing statistics as claims.

## Intel Mapper
Website https://intelmapper.com/
Methodology https://intelmapper.com/methodology.html
Official embed https://intelmapper.com/embed/
Android https://play.google.com/store/apps/details?id=com.intelmapper.app

- Theatres: Middle East, Ukraine/Eastern Europe, East Africa and Asia-Pacific. Per-event sourcing, map markers, category filtering, time slider/replay, daily situation briefs, border/control-zone overlays, activity heatmaps and contextual geopolitical data.
- Says it ingests Telegram, X, military statements and selected media, applies a language-model extractor, and filters irrelevant claims.
- Five geolocation safeguards documented: named-facility resolution against OSM, place-name disambiguation, country/region check, coastline/frontline guard, web-search adjudication.
- Explicit uncertain marker labeling (amber ring and approximate status); visible location corrections and six-hour QA re-audit.
- Single-source/multiple-independent-source labels and score 4.0–9.9. No third-party audit of its scores.
- Embed is free with visible attribution. Proprietary feed/white-label access requires contacting the publisher; do not assume any API is publicly reusable.
- Various premium UI features exist; free availability cannot be assumed. Exact JS/DB backend not verified.

## GeoConfirmed
Map https://geoconfirmed.org/map
First-party UI guide https://bsky.app/profile/geoconfirmed.org/post/3lnghda5w3f2o
Official plugin https://plugins.qgis.org/plugins/geoconfirmed_qgis/
Listed plugin code link https://github.com/Silverfish94/GeoConfirmed-QGIS

- Central principle: human-reviewed visually geolocated footage with evidence, contributor attribution, timestamp/frame, Plus Code, location, equipment and related sources.
- Country/theatre selection, icon/category filters, search by description/gear/unit, coordinate search, range/date slider, speed/time-lapse, cumulative/day-by-day display, topographic/satellite views and measuring tool.
- ORBAT-to-map linking where unit identification has been established.
- Official QGIS plugin advertises server-side filtering, Boolean queries, faction and ORBAT filters, radius/canvas/polygon search, source links, Temporal Controller, symbology and GeoPackage export.
- The live map and plugin repository content could not be directly inspected. Do NOT assert its precise web-map framework or private API endpoint.
- Key Gulfastra lesson: visually verified locations should never be merged visually with capital-city or generic country marker news.

## WarHeatMap
Site https://warheatmap.app/
Methodology https://warheatmap.app/methodology
API docs link https://warheatmap.app/api
Published registry https://osint2.ptsdtree.com/sources
About https://warheatmap.app/About

- Reports worldwide conflicts using event pages, sources, statistical panels, severity, event categories, timeline, search, market context and user-selectable activity/casualty/severity heatmaps.
- Publishes source registry: 161 approved / 94 banned outlets as of methodology snapshot. Editorial selections require independent judgment; do not copy source rankings as truth.
- Merges same URLs/titles and same-country fuzzy titles within short windows; retains sources and redirect to canonical event.
- Confidence: one unverified outlet; corroboration from an independent second source; verification involving independent body or on-site reporting.
- Casualty fields separate incident-specific killed/wounded ranges from daily party claims and cumulative totals. Keeps attribution and revision history, checks numeric contradictions, excludes unsupported counts.
- Seven location levels: site, town, district, province, frontline/route, country, offshore/airspace. Site/town get hard pins, middle levels approximate halos, country/offshore NOT plotted as exact points.
- Three different UTC times: event occurrence, source publication and ingestion. Four severity bands. Heat weighting depends on recency, severity and location precision, with legends that differentiate activity from casualties.
- The methodology explicitly states CC BY 4.0 for original event/metadata API output subject to attribution to WarHeatMap.app. Original linked publishers retain their own copyrights.
- An API documentation link is visible, but the retrieved /api page was generic and usable endpoint details could not be independently verified. Do not invent endpoints or claim integration yet.

## PizzINT Polyglobe
App https://www.pizzint.watch/polyglobe/app
Overview https://www.pizzint.watch/polyglobe
OSINT guide https://www.pizzint.watch/guides/open-source-intelligence-tools
Parent site technology https://www.pizzint.watch/about
Hormuz dashboard https://www.pizzint.watch/hormuz

- Modular 3D globe with conflict zones, geolocated X/OSINT posts, prediction-market odds, global military installation context, naval carrier context, thermal anomalies (NASA FIRMS), GDELT news country correlations, Ukraine chronology, user-presence and trade alerts. These are publisher descriptions, not independently validated live positions.
- Dedicated source-linked intel briefs display multiple social signals attached to a summary with time, geography and publisher. Correlation is not verification.
- Hormuz Hub describes UKMTO advisories, IMF PortWatch arrivals, Windward comparison, OFAC context, shipping, oil, and market-implied risk. Some fields displayed loading/syncing; not all data freshness confirmed.
- Parent PizzINT site discloses Next.js 15, React 19, TypeScript, Tailwind, Supabase and Vercel; DO NOT assume these prove Polyglobe's 3D renderer or exact infrastructure.
- No confirmed publicly documented direct Polyglobe feed/API or live X ingestion mechanism. Access/licence must be checked before integrating.

## Independent reusable resources
- MapLibre and keyless OpenFreeMap: https://openfreemap.org/ (already used in Gulfastra)
- NASA FIRMS: https://firms.modaps.eosdis.nasa.gov/api/area/ — free MAP_KEY required, thermal anomaly != strike.
- USGS earthquakes: https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php — already present as separate natural hazard.
- NASA EONET: https://eonet.gsfc.nasa.gov/ — already present.
- GDELT DOC: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/ — monitor 429 rate limiting.
- Polymarket Gamma: https://gamma-api.polymarket.com/docs — public read metadata for sentiment layer only.
- UKMTO: https://www.ukmto.org/ — published maritime safety notices, check permitted access.
- QGIS GeoConfirmed plugin: https://plugins.qgis.org/plugins/geoconfirmed_qgis/
- WarHeatMap CC BY 4.0 methodology: https://warheatmap.app/methodology — attribution and source ownership matter.
- PizzINT Hormuz UX reference: https://www.pizzint.watch/hormuz

## Candidate backlog (NOT implemented)
1. Enforce geo-precision levels with no false coordinates. Use shaded country or aggregated tiles where only region is known.
2. Add full evidence ledger with source independence/syndication and revision records.
3. Human-review candidates from Arabic/English correlation before classifying events verified.
4. Gulf-first civilian layers: aviation, shipping warnings, internet outages, official public safety and humanitarian reports.
5. Distinguish reporting-density from incident-density and casualty metrics; document denominators.
6. Evidence review and analyst-added corrections with provenance.
7. Bilingual situation reports and high-fidelity adaptive map, with optional 3D overview but compact 2D news-first default.
8. Measure published / discovered / ingested / displayed latency independently.
9. When approved, use a free-tier Worker+D1 backend to decouple live ingestion from frontend deployment.
10. Do not make real-time military asset or weapon tracks into a targeting aid; don't mislabel heat/satellite observations as attacks.

This file documents research and paused plans only. It does not authorize development changes.
