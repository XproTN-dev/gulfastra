# Gulfastra NEXUS v7 — GitHub-only execution plan

Status: first v7.0 milestone implemented and under automated regression testing. Cloudflare migration remains on hold.

## What changed

- GitHub branch intelligence-data holds independently updated public archives; main holds application code.
- The GitHub Actions collector checks out main scripts and intelligence-data storage separately; outputs are committed only to the data branch.
- The Pages deployment workflow is restricted to frontend code changes on main; intelligence-data pushes do not trigger Pages.
- A tiny data/live-manifest.json contains collection time, healthy source count and content hashes for reports, events, revisions and observations.
- A shared browser loader first renders a bundled snapshot and upgrades in the background to the data branch. It coalesces file downloads and only requests new versions when the manifest changes.
- Frontend status distinguishes GITHUB DATA from CACHED or SNAPSHOT fallback.
- New NEXUS workspaces WIRE (original Arabic/English headlines), VERIFY (evidence review) and HORMUZ (maritime reporting with official-source links) join existing Fusion, Replay, LAB and map.
- Chromium desktop and mobile checks verify Arabic display, geographic markers, news cards, NEXUS views, Fusion dossiers and source connection.

## Key limits

- Five-minute scheduled Actions are best-effort and may run late.
- raw.githubusercontent.com can be CDN-cached. The browser checks the manifest frequently but cannot force instant upstream publication.
- Public news articles are not automatically verified incidents.
- No operational UKMTO ingestion, real-time vessel map, WebSocket backend, or Cloudflare deployment has been claimed.
- Bundled Pages archive is a clearly labeled fallback and may be old.

## Planned next milestones

- v7.1 Reduce archive bandwidth and Git history growth with hot slices and heartbeat-only updates, then measure discovery-to-browser latency.
- v7.2 Introduce audited article, claim and event identities, geolocation precision, source independence and human correction.
- v7.3 Add permitted official Gulf aviation, maritime, civil protection and infrastructure feeds after license/endpoint checks.
- v7.4 Modular frontend refactor, dense responsive newsroom and improved geographical display.
- v7.5 Optional globe, spatial exports and reproducible historical replay.

## Reproducibility

- Code: main branch.
- Public data: intelligence-data branch.
- Scheduled collection: .github/workflows/collect.yml.
- Pages deployment: .github/workflows/pages.yml.
- Chromium regression: .github/workflows/visual-check.yml.

All changes remain manageable through GitHub and ChatGPT. New account provisioning is not needed for this GitHub-only phase.
