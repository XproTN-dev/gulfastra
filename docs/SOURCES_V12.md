# GULFASTRA X · Expanded public intelligence sources (October 2026)

The news pipeline and observation/social-data pipelines deliberately remain separate. A post or publisher search result is never proof of an incident.

## News discovery / RSS

**Now configured (31 news channels):** Six original English Google News monitoring topics, ten original Arabic monitoring topics, eight direct publisher RSS feeds, plus six channels added in this upgrade:

- **Qatar News Agency — Qatar**: DIRECT QNA XML RSS: `https://qna.org.qa/en/Pages/RSS-Feeds/Qatar`.
- **Qatar News Agency — General**: DIRECT QNA XML RSS: `https://qna.org.qa/en/Pages/RSS-Feeds/General`.
- **Reuters**: source-restricted Google News discovery `site:reuters.com` with Gulf/security context. NOT Reuters-licensed wire access.
- **Associated Press**: source-restricted Google News discovery `site:apnews.com`. NOT AP-licensed wire access.
- **UKMTO**: source-restricted Google News discovery `site:ukmto.org` to reach public advisories. NOT a guaranteed full or prompt official incident feed. Official notices are at `https://www.ukmto.org/recent-incidents`.
- **U.S. Department of State**: source-restricted discovery `site:travel.state.gov` for regional advisories. NOT an official real-time embassy/emergency-warning integration; official RSS/advisory pages remain primary.

These are six additional *search or RSS channels*, not six new independent news organizations of the same kind. Provider fetch success and number of independently corroborated claims are different concepts.

## Structured/public data feeds (separate)

**GDACS**: independently fetched public GeoJSON event listings via `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH`, scoped to Gulf region and recent 7 days, stored as `data/advisories.json`. Contains institution-provided geographical context, warning levels, publication dates and original source links when available. Not a proof of the actual impact or an emergency all-clear. Successful API fetch may yield zero region-matched events.

**ReliefWeb**: optional institutionally approved V2 API `https://api.reliefweb.int/v2/reports`; a pre-approved `appname` is REQUIRED since November 2025. Set GitHub Actions secret `RELIEFWEB_APPROVED_APPNAME` after approval. Ingests recent relevant published report links with only titles/times, not protected full text.

**OpenSky**: optional civil-aircraft observations via the official OpenSky OAuth client credential flow. Provide `OPENSKY_CLIENT_ID` and `OPENSKY_CLIENT_SECRET` as GitHub Actions secrets. Samples only every two hours at most and publishes one aggregated civil-transponder count in a regional bounding box. **Not a live aircraft map, airspace authorization or flight safety indicator.** OpenSky enforces API quotas. No aircraft IDs/tracks are retained in public data.

USGS, NASA EONET, optional NASA FIRMS and optional Cloudflare Radar remain as in v11. GIS locations from providers are not depicted as verified conflict events.

## Public posts on X

The X Posts tab is live as a UI feature. It offers a source-linked archive **only when an authorized X API token is deliberately connected**. Without this configuration, no posts are fabricated: the tab includes shortcuts to X searches and a **click-to-load official X embedded-timeline viewer** for the verified public QNA profiles `@QNAEnglish` and `@QatarNewsAgency`. The timeline widget is rendered by X in the visitor's browser and does not feed our JSON archive, event correlation or alerts. It may be blocked or require login depending on browser settings. Its external script is fetched only after the visitor chooses to load it. We do not scrape X or mislabel search-engine results as official X post API data.

To opt in to official X API **potentially billable** access, explicitly configure all three:

1. GitHub Actions repository variable `GULFASTRA_X_API_ENABLED=true`.
2. GitHub Actions secret `GULFASTRA_X_API_BEARER_TOKEN` (authorized developer token).
3. GitHub Actions secret `GULFASTRA_X_BILLING_APPROVED=true` (explicit acknowledgement that costs may apply).

If ANY value is missing, the connector makes **zero** X requests. Once enabled, it performs only one search of at most ten results per six hours, persists a failed-attempt cooldown before making a call, and keeps seven days of minimal attribution (post ID, author handle, creation time, text excerpt and permalink). Posts are **not** sent through news correlation or critical-alert rules. Verified-account claims are NOT inferred from handles.

Do not enable X just for a demo: current official X API access and pricing vary, and even a capped request may charge your account. The owner must verify billing in the X developer console before opting in.

## Operational notes

- Free-first site: GitHub Pages and GitHub Actions, no always-on backend. GitHub's scheduled runs may be delayed.
- Main news `reports.json`; event correlation `events.json`; official/humanitarian `advisories.json`; optional X `social.json`. They are separate, versioned files on `intelligence-data`.
- Standard-library test: `python scripts/test_supplemental_sources.py` checks date range, bounding boxes, outlet filtering, safe X post links and unverified status.
- Browser test: `python scripts/visual_check_v11.py` checks official and X tabs on mobile and desktop.
- **Do not use this dashboard as emergency warning guidance.** Institutional publications and user posts may be inaccurate, delayed or later corrected.
