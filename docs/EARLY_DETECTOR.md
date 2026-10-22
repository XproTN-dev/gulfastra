# GULFASTRA X — Early Detection Engine v1

**Site:** https://xprotn-dev.github.io/gulfastra/lab/ → EARLY DETECTIONS. Original Command Center, map, reporting graphs and research data remain intact.

## What it detects

This system is NOT an accredited emergency or security warning service. It monitors public provider observations and first publisher reports; it does not claim to independently verify attacks, casualties, airport closures or ongoing danger.

| Source | Fast/public information | Caveat |
|---|---|---|
| USGS | Gulf earthquake magnitude and provider epicentre; one-hour GeoJSON feed | Earthquake observation is not proof of damage |
| NOAA AviationWeather | Gulf airport weather reports; significant gusts, very low visibility, weather | METAR is not a NOTAM, closure or security warning; observations often update hourly |
| QNA Qatar & General | Direct RSS publisher headlines, when available | Reported news is not independently confirmed event occurrence |
| GDACS, EMSC, NOAA SWPC | Published hazard advisories, seismic observations, global space-weather bulletins | Source limitations, geography and timestamps respected |
| NASA EONET, optional Cloudflare Radar, optional FIRMS | Natural hazards, connectivity and thermal anomalies | Context, not military attack detection |
| Broader RSS, Reuters/AP-indexed discovery and Google News | Dated high-impact public reporting | Search results may lag; syndication isn't independent corroboration |

Structured X posts require separate approved developer/billing access and are NOT silently scraped or purchased.

## Data architecture

- Priority collector: scripts/fast_sources.py polls compact official public endpoints.
- Detector: scripts/early_detector.py classifies provider observations and high-impact, genuine-timestamp first publisher reporting.
- Separate GitHub workflow: .github/workflows/fast-detect.yml scheduled every five minutes (best effort); the larger collection workflow remains a fallback.
- Files on intelligence-data: data/fast_signals.json, data/early_signals.json, data/early_state.json. The manifest lists immutable hashes, allowing browser updates without redeploying GitHub Pages.
- Screen: EARLY DETECTIONS shows P1 review, P2 important, P3 context, plus provider health, publication and first-detection timestamps. No fake events.
- Initial feed load creates a baseline and never sends historical P1 backfill notifications.

**Verification:** provider-observation, provider-published-advisory and unverified-reporting stay separate. A single source can create an unverified early report. P1 is an immediate human review cue, not emergency confirmation or a statistical probability. No source silence is an all-clear.

Tests: python scripts/test_early_detector.py. They cover USGS location and dates, METAR severe conditions, RSS pubDate, retrospective/denied/speculative rejection, baseline suppression, repeated refresh, first-signal P1, and fail-closed quality gate.

## Notification options

Browser notifications are opt-in from the Detection page. They only operate while the webpage remains open and has notification permission.

Optional Telegram is disabled by default. To enable, set repository variable DETECTOR_TELEGRAM_ENABLED=true and set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID as GitHub Actions secrets. Messages carry the original source and verification caveats, with successful-send deduplication.

## Optional 2-minute Debian collector

**Not activated automatically.** Requires a Debian/Linux non-root account with Python 3.12+, Git, reliable connectivity and the owner's SSH key authorized to push to intelligence-data. Do not share a private SSH key.

Under that account, run these commands one at a time:

    mkdir -p "$HOME/gulfastra-detector"
    git clone --branch main git@github.com:XproTN-dev/gulfastra.git "$HOME/gulfastra-detector/source"
    git clone --branch intelligence-data git@github.com:XproTN-dev/gulfastra.git "$HOME/gulfastra-detector/archive"
    mkdir -p "$HOME/.config/systemd/user"
    cp "$HOME/gulfastra-detector/source/deploy/early-detector/gulfastra-early.service" "$HOME/.config/systemd/user/"
    cp "$HOME/gulfastra-detector/source/deploy/early-detector/gulfastra-early.timer" "$HOME/.config/systemd/user/"
    systemctl --user daemon-reload
    systemctl --user start gulfastra-early.service
    journalctl --user -u gulfastra-early.service -n 80 --no-pager
    systemctl --user enable --now gulfastra-early.timer
    systemctl --user list-timers

An administrator can optionally enable persistence after logout:

    sudo loginctl enable-linger "$USER"

The runner pulls main/code and independent data, tests before collecting, updates only the data branch and will not start a second systemd oneshot while the previous run is active. It never needs paid APIs.

When several independent server runs demonstrably publish correctly, set GitHub Actions repository variable EXTERNAL_DETECTOR_ACTIVE=true to skip overlapping scheduled GitHub fast-detect runs. Do not switch off fallback until verified.

## Honest speed limitation

Fast detection latency = original source publication + provider/index availability + collector scheduling + fetch/processing + Git push/CDN + browser refresh or Telegram delivery. Five-minute GitHub schedules can be delayed or dropped. Browser notifications stop when the tab closes. METAR publication isn't a live flight tracker; neither METAR nor news headlines are reliable proof of an active security incident.

Measure the first-reported source timestamp, first collector observation, first display time, false alerts and missed public events before claiming to outperform established news services.
