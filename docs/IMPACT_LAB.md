## v13: live-first map, real visual themes and independent provider sources

The Impact Lab now defaults to **LIVE MAP** and a **1-hour** filter for source publication or observation timestamps. The map has separate 1h, 2h, 6h, 12h, 24h, 48h and 7-day filters. Map selection is independent of the 48-hour reporting network replay, so the user can investigate older topic relationships without silently altering the fresh map.

**The difference between a real event and coverage:** USGS/EMSC seismic observations are placed at the provider's published epicentre; GDACS advisories use regional provider geometry; country news counts are shown on explicitly labelled country reference markers and never at guessed incident coordinates. A recent article is not proof of an active emergency. The side rail displays source-linked recent articles and collection-vs-publication timestamps.

**Non-publisher telemetry and announcements:**
- **USGS:** existing GitHub observations plus a separate browser-side `all_hour.geojson` query while the map is viewed. USGS publishes these feeds approximately every minute. This direct request can bypass GitHub collection delay for earthquakes ONLY, if browser access permits; failed direct requests preserve last cached observations.
- **EMSC:** official FDSN seismic API via `scripts/direct_signals.py`, with actual Gulf-region coordinates, event times, magnitude and last-update values. Provider fetch cooldown ~18 minutes.
- **NOAA SWPC:** direct public JSON space-weather watches, warnings and alerts. Shown only in the independent provider pulse with original source link. This is **global/non-geographic** context and never gets artificial Qatar or Gulf pin coordinates.
- **Existing** USGS, NASA EONET, GDACS, optional NASA FIRMS and Cloudflare Radar observations are retained, and OpenSky remains opt-in with approved credentials. Public X posts still require an authorized API key for structured ingestion; embedded timelines are external to our collector.

The page shows **freshness and provider status**. The site does not claim minute-by-minute geopolitical reporting: GitHub Actions cron is best effort; news feeds and indexers publish at different delays, and newer articles can be absent until they are indexed. Expand the time window if no new reports match; zero results is not a regional safety conclusion.

**Four functional themes** under the lab header, saved locally: OBSIDIAN RED (black/red default), CARBON (warm industrial), MATRIX (green tactical), and ARCTIC LIGHT (light palette). Themes affect workspace surfaces, text, cards, charts and toolbars, not just button labels. MapLibre tile styling remains dependent on the tile provider.

# GULFASTRA X · Impact Lab v12

**Production URL:** https://xprotn-dev.github.io/gulfastra/lab/  
**Original Command Center:** https://xprotn-dev.github.io/gulfastra/command/  
**Exact v9 fallback:** https://xprotn-dev.github.io/gulfastra/legacy-v9.html

Inspired by analytical workflows shown in Breakpoint Monitor videos, but independently implemented with **source provenance and explicit uncertainty**. No code, proprietary risk formula, or image was copied.

## Six functioning workspaces

1. **Publication Network / Intelligence Landscape** — readable source-backed topic clusters rather than overlapping headlines and miniature dots. The default TOPICS view groups all recent source-correlated publication groups by their actual collector topic, displays recent source headlines, and opens a complete story list on selection. HEADLINES displays chronological source cards; RELATIONS shows only actual published shared-metadata links and allows side-by-side evidence inspection. A link is **not verified causation or incident equivalence**. No synthetic 3D map or arbitrary causal probability is shown.
2. **Time Explorer** — actual publication timestamps and 48-hour/7-day cutoff replay. It is not a reconstruction of historical source availability or incident-occurrence time. Reporting can be missed or updated afterward.
3. **FRED Indicators** — real publicly available series from `fred.stlouisfed.org` (VIXCLS, DCOILBRENTEU, DCOILWTICO, BAMLH0A0HYM2, T10Y2Y, UNRATE). Every card links to FRED and provides latest **observation date**, value and retrieval status. GitHub Actions fetches the open CSV roughly every 12h; different underlying series publish at different cadences. Not live market quotes.
4. **2008 Comparison** — recorded values from 2007–2009, with October 15, 2008 or the closest available earlier reference period, and current published values. Curves overlay historical and recent windows with a shared raw-value vertical scale, **not shared calendar dates**; no percentage similarity/probability of another crisis is claimed.
5. **Impact Pathways** — explanatory scenario mechanisms for shipping/energy, aviation/trade, financial stress and hazards/logistics. These are labelled **hypothetical** and do not assert any real current incident caused an economic outcome. There is intentionally no fabricated global danger percentage.
6. **Daily Brief** — deterministic rolling last-24h event/publication summary and source links, plus institutional notices and FRED context. It is not generated by a hidden LLM. “New or updated since last visit” compares locally saved event IDs/digests against the current dataset; on first visit a baseline is saved rather than inventing changes.

## Data pipeline

The site remains free-first and runs through **GitHub Pages + GitHub Actions**, with no backend server.

Collector: `scripts/impact_lab.py` reads already-published `events.json` and `advisories.json`, then emits:

- `data/impact_graph.json` — latest ~150 source-correlated reporting groups and bounded weak/strong shared-metadata links. Original evidence URLs provided per node; all link status unverified.
- `data/markets.json` — six FRED series with recent and 2007–2009 observations. A failure preserves last-good data but marks the series `stale-cached`; an unavailable series is not plotted with synthetic values. The collector limits full downloads to every 12 hours.
- `data/daily_brief.json` — evidence-linked 24-hour public reporting groups, official advisories and source-attributed macro observations.

The files are committed to `intelligence-data` and referenced by versioned hashes in `data/live-manifest.json`. The browser only re-downloads a file when the manifest hash changes. Collection and publication times are displayed separately.

**Graph edges are topical association, not a finding of independent corroboration.** To prevent a misleading web of connections, a node is capped at three links, regional/general headlines are excluded, publication gaps are constrained, and relation kind is encoded. `topical-proximity-only` denotes a weaker relationship than `multi-report-topical-overlap`, and neither establishes shared real-world event identity or causal impact.

## Mobile

On screens up to 650px the graph defaults to **readable topic cards**; tapping a topic reveals every matching source-group headline, and tapping a headline opens publisher evidence. A bottom tab bar switches Graph / Markets / Brief / Filters / Map. An evidence selection opens a dismissible bottom sheet; filters open a drawer. HEADLINES and RELATIONS modes remain available, without showing 150 headlines on top of each other. Neither the mobile sheet nor the graph depends on a paid visualization package.

## Validation

- `python scripts/test_impact_lab.py`: source-based graph, misleading-causation prevention, bounded time windows, market CSV parser, historical data, failed-provider fallback, daily brief.
- `node scripts/test_impact_frontend.mjs`: static runtime loading, graph SVG, date cutoff and actual-values-only market widgets.
- `scripts/visual_check_lab.py`: Chromium at 1536px, 768px, 390px and 360px with deterministic, **test-only fixtures**. Tests interactions and screenshots; synthetic fixture data is never deployed publicly.
- `.github/workflows/impact-lab-checks.yml`: CI offline and browser jobs; GitHub Pages deploy validates the deployed `/lab/` route.
- Main command center and exact v9 rollback remain operational separately.

## Important limitations

- The event graph describes public reports, not verified active incidents. Correlation between events does not show causation.
- FRED data are historical/published research series, not intraday trading data or a live pricing service. Always inspect original series metadata and licensing for commercial uses.
- Report grouping is a conservative title-based heuristic. Source syndication and bilingual reporting can produce duplicate groups, so node and publisher counts have measurement error.
- Historical comparisons have different social, economic and regulatory contexts. The interface offers no forecast, trade signal, recession probability or recommendation.
- Other video elements such as continuously streaming global market terminals, proprietary risk formulas and autonomous causal explanation are not implemented or claimed.
- GitHub Actions scheduled collection can be delayed and the browser cannot receive updates faster than the latest published dataset.
