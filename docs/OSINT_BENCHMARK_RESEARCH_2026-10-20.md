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


---

# ADDENDUM — Reference sites 5 & 6 (2026-10-20)

Research extension specifically requested for:
- https://world-monitor.com/
- https://www.defconlevel.com/global-assets-map

This is research only. DO NOT change the deployed Gulfastra application or resume the paused Cloudflare migration.

## Critical identity warning: THREE similarly named World Monitor domains

1. https://world-monitor.com/ is the specific CLOSED-SOURCE site requested by the user. It calls itself "World Monitor — Live world map of news, markets, conflicts & incidents." Public navigation: THE MAP / THE WIRE / THE GLOBE. X account referenced from homepage: https://x.com/WorldMonitorCom
2. https://www.worldmonitor.app/ is a SEPARATE open-source product maintained by koala73, https://github.com/koala73/worldmonitor. Its own published official identity page explicitly says world-monitor.com is unaffiliated: https://www.worldmonitor.app/world-monitor.md
3. Other lookalike hosts (worldmonitorintel.com, worldmonitor.io, world-monitor.app) are also not established as the same product.

NEVER attribute koala73's code, architecture, source catalog, APIs, 3D engine or AGPL license to world-monitor.com. This is the most important research integrity finding in this addendum.

## 5. WORLD-MONITOR.COM — broad situational awareness (exact user-linked site)

### Directly corroborated public experience

Homepage: https://world-monitor.com/
- Identity/title: World Monitor, AI-powered real-time aggregator for world news, financial markets, conflicts and global incidents.
- Three top-level navigation concepts: THE MAP (spatial incidents), THE WIRE (chronological intelligence reporting), THE GLOBE (global interactive visualization).
- Homepage describes these signal categories:
  * GDELT global news events.
  * Active conflicts, protests and geopolitical incidents.
  * Earthquakes and natural disasters.
  * Infectious disease outbreak surveillance.
  * Commercial flights and maritime vessels.
  * Stocks and crypto financial data.
  * Prediction-market odds.
  * ISS and space-launch tracking.
  * Live cameras and other OSINT leads.
- Search-country input appears in one indexed snapshot; a UTC clock and a LIVE/CONNECTING TO FEED connection indicator appear.
- One October 20 indexed view showed "Failed to load events", "FEED OFFLINE", and a retry button. This establishes that the site shows an error/retry state; it does NOT prove typical uptime, current provider functionality or actual polling cadence.
- Main page labels itself "ORIGINAL." Treat branding as self-description, not proof of technical authorship or code originality.

### Data sources actually identified by the exact site

| Signal | Directly named source from world-monitor.com itself | Verification status |
| --- | --- | --- |
| Global news/event index | GDELT | Explicitly named; query type, refresh and normalization unavailable |
| Earthquake / hazards | None identified by name | Categories advertised; NOT proof of USGS/GDACS integration |
| Flight / vessel | None identified by name | Categories advertised; ADS-B/AIS provider NOT verified |
| Stocks and crypto | None identified by name | Markets advertised, exact exchange/provider unknown |
| Prediction markets | None identified by name | Odds advertised; do not presume Polymarket unless confirmed |
| Outbreaks | None identified by name | Disease surveillance advertised; no WHO feed proven |
| ISS / space launches | None identified by name | Tracking advertised; telemetry provider unverified |
| Cameras | None identified by name | Public webcam content advertised; sources/licenses unverified |

External tool catalogs describe additional tabs such as STOCKS, STREAMS, PREDICTIONS, CAMERAS, DEFCON and OUTBREAKS; these cannot be confidently verified from currently readable first-party homepage and should not be promoted as audited available controls.

An unaffiliated third-party domain fingerprint report mentions Next.js and Cloudflare for world-monitor.com; such heuristics do NOT establish the site's actual current Next.js version, frontend bundle dependencies, API deployment topology, CDN settings or backend. No authenticated official GitHub source repository or public ingestion scripts for THIS domain were confirmed. Avoid copying closed-source site assets.

### Architecture/UX patterns worth reproducing independently

1. Map vs Wire vs Globe is a useful three-mode navigation model. For Gulfastra, default to compact map + Arabic/English reporting feed, with an optional globe when requested.
2. Country quick search is genuinely useful to Gulf-focused users; connect search to country-level claims, official notices and maritime/aviation events with accurate geospatial uncertainty.
3. Status must differentiate connecting, recently updated, temporarily degraded, error, and offline. Crucially, a LIVE badge alone is not evidence of new observations.
4. Multiple data verticals can share one location/time context while remaining distinct claims: article, official report, seismic observation, market price and webcam should NEVER become a single "confirmed attack."
5. Add provider-specific last-success and last-source-item times and a manual retry button. Keep stale cached data labeled rather than an empty screen.
6. User-friendly globe and search are presentation lessons only; no direct proprietary source reuse has been authorized.

### What remains unknown

Production JavaScript bundles, component and map libraries, precise API paths, refresh polling intervals, cache TTLs, data acquisition agreements, live X/Telegram collection, license, event schema, and backend host are NOT verified. Automated page extraction is mostly a pre-rendered app shell with some offline/loading states. No evidence of a public reusable API was established.

### Citable sources

- https://world-monitor.com/
- https://www.world-monitor.com/
- https://www.worldmonitor.app/world-monitor.md (explicitly documents independent ownership)
- https://www.katanservant.com/en/osint (third-party tooling catalog; treat stack details as unverified)
- https://desenmascara.me/analisis/6dcaf1cb-465c-4cd2-952d-1e5dbb57496f (automated domain fingerprint only; not an official technical audit)

## 6. DEFCONLEVEL GLOBAL-ASSETS-MAP — editorial geopolitical intelligence

Exact page https://www.defconlevel.com/global-assets-map
Context page https://www.defconlevel.com/global-conflict-map/
Resources hub https://www.defconlevel.com/resources-tools
Independent readiness overview https://www.defconlevel.com/current-defcon-levels

### Coverage model and map UX

First-party cached metadata calls the target route "Global Conflict Map | Live Military & Geopolitical Tracker"; the sibling /global-conflict-map/ page is a more verbose map index. These two routes are related by explicit on-page full-screen links but should not be treated as the same endpoint.

- Full-screen map route describes:
  - Active conflicts.
  - Military operations and deployments (high-level/editorially reported).
  - Geopolitical hotspots.
  - Cyber incidents within last 30 days; older incidents move to an archive layer.
  - Strategic asset reference positions and critical infrastructure events.
- Marker categories and severity-style colors separate the different types; clicking a marker is described as opening its intelligence brief, primary sources and date-stamped event history.
- Responsive map supports mobile touch, tablet layouts and a full-screen toggle.
- The larger conflict page displays category/tension counts, colored intensity legend, regional/command selection, monitored-category jump navigation, situation detail drawers/pages and event alert links.
- Describes sustained conflict versus tension-zone categories; tension zones are useful for diplomatic standoffs and developing instability prior to sustained violence.
- Distinct analytical pages include current readiness assessment, threat advisories, active alerts, financial impact monitor, cyber monitoring and preparedness guidance. The map is the collection/presentation layer; readiness is an EDITORIAL INTERPRETATION layer, not the same raw evidence.
- Nuclear-risk badge model on the companion page considers: nuclear-armed actors directly participating; nuclear signaling; proximity to relevant infrastructure. High risk requires multiple factors plus escalation trajectory. These are the publisher's heuristic editorial criteria, NOT classified government readiness data.
- On the conflict page, color scale described as red = sustained operations, orange = high intensity, yellow = medium, blue = tension/monitored. The exact map legend can vary; don't fabricate precise marker glyph assets.

### Published sourcing and validation

Target full-screen map explicitly identifies:
- U.S. Department of Defense/War official press releases.
- Cybersecurity and Infrastructure Security Agency (CISA) advisories.
- NATO position statements.
- Other official government/military announcements and published established defense reporting.

Companion conflict categorization credits:
- ACLED (Armed Conflict Location & Event Data Project).
- CFR Global Conflict Tracker.
- UCDP (Uppsala Conflict Data Program).
- UN OCHA.
- Official government/defense press releases and corroborating reports.

Editorial model described on the companion page:
1. Confirm monitored situation against at least two upstream authoritative sources.
2. Cross-check parties, timing and claimed impact counts using government announcements and established outlets.
3. Review classification approximately weekly; maintain logged changes in its internal editorial history.
4. Do not add uncorroborated brief/single-source stories to the VERIFIED monitored-situation layer.
5. Map records cite at least one published primary/authoritative source; that is a different and weaker minimum than the two-source threshold for the monitored situation index. Preserve this distinction.

### Update cadence — particularly relevant to Gulfastra

- FULL SCREEN MAP FAQ: map dataset reviewed/updated daily; operational changes when primary source statements become available; cyber markers last 30 days before archiving.
- The /global-conflict-map/ companion says editorial alerts typically processed daily and overall situation classifications reviewed weekly.
- The resources hub clarifies that some economic trackers poll faster, cyber vendor maps mirror upstream telemetry, and independent DEFCON estimate changes only when evidence changes.
- Therefore labels such as "LIVE" and "real-time" do NOT prove a low-latency streaming event backend. The last data update text and individual alert timestamps should be shown separately.
- The companion page's "Last data update" and newer listed alerts may diverge: they refer to different products/sections. Avoid asserting that a new headline automatically updates all map classifications.

### Readiness and uncertainty warning

The official U.S. military DEFCON level is not publicly published as a continuously visible government data feed. The DEFCON number on this commercial/editorial site is expressly an independent OSINT estimate, NOT an official or leaked readiness state. Do not copy its number into Gulfastra as verified state information. Reference: https://www.defconlevel.com/current-defcon-levels

### Licensing and technical internals

- Website says direct linking is welcome; educational/informational map embedding may be available through a documented embed endpoint. High-volume licensing/syndication or reuse of editorial assessments should go through publisher contact.
- ACLED and UCDP datasets each have their own access terms and attribution requirements; citing them does not grant free redistribution of a derived commercial feed.
- Target full-screen map returned HTTP 403 when accessed by automated retrieval. Cached index and accessible first-party companion pages provide the documented features but NOT a technical asset audit.
- Exact JavaScript/framework, mapping engine (Leaflet/Mapbox/MapLibre/Cesium), database, network endpoints, source JSON files, source update daemon and API availability are NOT verified. No public reuse license for the proprietary map data or scripts was found.
- Do NOT export, republish or reverse-engineer active strategic-asset coordinates; focus Gulfastra on delayed/aggregated contextual reporting and civilian impacts.

### Best patterns for Gulfastra

1. Separate OBSERVATIONS vs EDITORIAL ASSESSMENTS. Evidence data should not mechanically become a claimed official "DEFCON" status.
2. Classification vs incident timeline: place verified historical situation summaries alongside rapid headline discovery, never merge their freshness clocks.
3. Integrate clearly cited public civil-safety and cyber notifications (e.g. CISA, government travel advisory/RSS) as a different layer from anonymous OSINT.
4. Tiered event life cycle: developing → corroborated → active → resolved → archived, with the source evidence required for every transition.
5. Regional focus: GCC civilian effect, airspace/airport operational advisories, maritime commerce warnings, network disruption and public safety notices.
6. Every map marker should open an evidence record, source dates and a correction log. Country-only items remain aggregate/map shading, not fake exact point events.
7. Consistent real-world categories, legend, mobile compact/full-screen option and explicit update metadata.

### Citable sources

- https://www.defconlevel.com/global-assets-map
- https://www.defconlevel.com/global-conflict-map/
- https://www.defconlevel.com/resources-tools
- https://www.defconlevel.com/current-defcon-levels

## BONUS — Separate, truly open-source World Monitor: worldmonitor.app

This is NOT the user's requested world-monitor.com. It is included ONLY because its published and inspectable code offers especially high-value reusable engineering patterns for a future Gulfastra release.

- Official source: https://github.com/koala73/worldmonitor
- Official identity/disambiguation: https://www.worldmonitor.app/world-monitor.md
- Engineering architecture: https://www.worldmonitor.app/docs/architecture
- Source providers, licenses, and ingestion: https://www.worldmonitor.app/docs/data-sources
- Published panels/layers/tools catalog: https://www.worldmonitor.app/reference/coverage/
- Software licensing: AGPL-3.0-only for main source; attribution/copyleft/source-disclosure obligations apply. SDKs may have different licensing. Do not copy code blindly or suggest all proprietary services become free merely because the frontend is open-source.

### Verified public technology stack from maintained upstream repository
- Frontend: vanilla TypeScript and Vite.
- Geographic rendering: globe.gl + Three.js for 3D; deck.gl + MapLibre GL for 2D/WebGL.
- Native desktop: Tauri 2 with Rust / Node sidecar; desktop binaries for major operating systems.
- AI: local Ollama, browser-side Transformers.js; some hosted inference via Groq/OpenRouter depending on configuration.
- Server: Vercel Edge/Functions, Railway long-lived relay, caching with Upstash Redis, CDN and service worker.
- Programmatic APIs: MCP endpoint, REST with documented OpenAPI spec, npm CLI and Python/Go/Ruby SDKs; MCP calls and various advanced tools are gated by keys/plans.
- Multiple variants (world, tech, finance, commodity, energy, happy), multilingual UI with RTL and local feeds. This is a separate, larger project than Gulfastra.

### Most useful freely readable engineering details
1. SmartPollLoop: exponential failure backoff up to 4×; hidden-tab 5× throttle; user-triggered refresh; attempt counter and circuit breakers. Do not poll every upstream source at one uniform cadence.
2. Fast bootstrapping: seed a combined typed response rather than dozens of parallel endpoint handshakes. Selective keys allow restoring individual panels.
3. 3-tier caching: in-memory → Upstash Redis → upstream; stale-on-error fallback, negative cache after provider failures, in-flight promise deduplication to avoid a stampede.
4. Provider-specific freshness expectations: news, market, weather, seismic, navigation update at very different tempos. Fresh / Aging / Stale / Critical / Disabled states; visible data-gap warnings.
5. Browser polygon geolocation: point-in-polygon checks against a local GeoJSON country map rather than a geocoding API; avoids arbitrary region reference dots.
6. Feed provenance: named publisher identity, source metadata, separate Google News transport vs originating publisher, tier/affiliation/bias caution.
7. Backend-side feed digest: server aggregates locale/category feeds before clients fetch the consolidated response. Public docs state a 900s news digest cache and per-feed caching; this shows that dashboard polling every few seconds does NOT magically create newer news.
8. Layer-aware conditional loading and performance: web workers, virtualized panels, lazy maps, request coalescing, compressed assets.
9. Clear separation between raw social OSINT leads and verified events, upstream restrictions and paid capabilities.

### Critical resource/price caution

Running the source locally may be free if you already own the compute, but AI API fallbacks, hosted relay, Redis, shipping providers, X official API and higher-tier product features can incur costs. AGPL licensing imposes obligations for hosted modifications. It should be used as an engineering reference, not falsely marketed as a free unrestricted source of all live data.

## SIX-SITE GULFASTRA COMPARISON (replaces ranking based solely on visuals)

| Reference | Particularly valuable pattern | Proven reusable/public source? | Biggest limitation |
| --- | --- | --- | --- |
| IntelMapper | Geolocation safeguards; source correlation; periodic QA | Free attributed embed; public methodology | Exact private ingestion/model stack and full feed unavailable |
| GeoConfirmed | Human-verified geolocation; QGIS searches/exports | Official plugin listing; code repository pointer | Live map returned HTTP 403; raw evidence access conditions |
| WarHeatMap | Location precision, correction ledger, casualty uncertainty | Original event metadata CC BY 4.0 per methodology | API contracts/reuse endpoint not independently validated |
| PizzINT Polyglobe | 3D layered signal types; Hormuz maritime overview | Published UX/docs; public independent data references | Globe internals and X ingestion unverified |
| world-monitor.com | Map/Wire/Globe product modes; cross-domain awareness | GDELT explicitly named; homepage UI | Closed internals; one crawl showed offline feed; no audited live latency |
| DEFCON Level Assets Map | Source-to-assessment separation; editorial readiness rubric | Official statements and public research datasets | Daily/weekly editorial cadence, 403 map, proprietary API unknown |

Additional standalone engineering reference: koala73/worldmonitor is an unrelated AGPL open-source project with particularly good documented adaptive polling, caching, map layering and freshness semantics.

## REVISED IMPLEMENTATION PRIORITIES (PROPOSALS ONLY — NOT AUTHORIZED)

P0: Reliable source identity, timestamps for occurred/published/ingested/displayed, and per-feed latency/health budget. No blanket LIVE claims.
P0: Precision-aware geographic representation; no fabricated asset/attack coordinates; country-only aggregate shade and explicit unknown precision.
P0: Split headlines, independently verified incident evidence, official advisories, environmental observations and subjective assessments into distinct record types.
P1: Priority Gulf civilian-impact newsroom with high-frequency official public-safety/aviation/maritime feeds; Arabic metadata and source originators.
P1: Source pipeline designed for partial source failure: adaptive per-source polling, caching, retry with exponential backoff, stale-on-error, duplicate suppression and conditional fetch.
P1: Analyst evidence timeline with original documents, reconciliation and corrections; paid/private publisher data requires permission.
P2: Map vs Wire vs Globe mode where Wire is information-dense and default map stays compact; optional open-source globe if sustainable.
P2: Historical event classifications (active/tension/resolved/archived) with exact editorial thresholds, not made-up numeric DEFCON values.
P2: GIS and Markdown/CSV exports, accessibility, multilingual RTL, and separate story/article vs incident metrics.
P3: Carefully labeled market/prediction context and environmental context with independent provider-specific refresh clocks.

## Engineering and integrity gate

This research is documentation only. DO NOT deploy new UI, add tracking, turn on Cloudflare, ingest new proprietary datasets, or alter GitHub Actions due only to this file. Validate licensing, CORS and provider quotas before any integration; never convert source marketing descriptions into verified implementation details.

