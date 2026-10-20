# GULFASTRA data operations and alert reliability

## What this platform can and cannot know

- News feeds give **publication timestamps** (when known). They do not prove the time or existence of the underlying event.
- **Current reporting** and **developing coverage** mean journalists have published recently; they do not mean an event is active.
- The event lifecycle always retains `incident_status: unknown` unless separately verifiable primary evidence is introduced and audited. It never treats quiet news as a resolution.
- `alerts.json` denotes **critical public reporting for analyst review**, not verified attack detection or public emergency guidance.

## Data refresh

**Primary collector:** [Refresh OSINT reports](../actions/workflows/collect.yml), approximately every five minutes on a best-effort GitHub Actions schedule. Code: `main`; live records: `intelligence-data`.

**Why the October 20 reliability patch matters:** Previously ~25 external RSS requests were sequential with 24-second timeouts. Worst-case stalls could approach the 12-minute job limit. `scripts/collect.py` now uses six concurrent workers, per-endpoint 10-second timeouts, deterministic source merging, per-source success/failure and a retained last-good archive.

**Emergency manual refresh:** Open the workflow URL above → **Run workflow** → select `main` → run. Allow GitHub Actions to complete; inspect the run's jobs and failure logs if it fails. Manual runs do not convert the system into realtime telemetry.

## Operational observability

- `data/live-manifest.json` — the browser's branch-versioned heartbeat. `collected_at` means **last successful** fetch, not the most recent attempted run. `last_collection_attempt_at` is exposed separately.
- `data/collector_health.json` — sources healthy/failed/skipped, alert quality-gate state, source age.
- `data/reports.json` — article archive, source status; historical articles are not emergencies.
- `data/events.json` — candidate coverage groups, original linked sources, lifecycle state; never verified incidents by default.
- `data/alerts.json` — alert candidates requiring review, zeroed if the safety tests fail.
- `data/alert_state.json` — alert-history watermark; preserve across runs to avoid first-run/backfill false alarms.

The critical-reporting system **fails closed** when its tests fail, but safe news collection continues. If the alert quality gate fails, an empty alert list **must not** be interpreted as an all-clear.

**Independent watchdog:** [OSINT collection watchdog](../actions/workflows/collector-watchdog.yml) checks the data-branch manifest approximately every 20 minutes. After more than 45 minutes without a successful collection, it attempts to open **one** GitHub issue entitled `[GULFASTRA] Collector data is stale` and closes it automatically after recovery. This requires GitHub Issues to be enabled and Action permissions to allow issue writes. Since GitHub Actions schedules are best-effort, the watchdog also cannot guarantee punctual delivery.

## Publication-lifecycle states

| State | Deterministic interpretation |
|---|---|
| `new-coverage` | At least one trusted publisher timestamp within 2h and the first known relevant publication was within 2h |
| `developing-coverage` | Recent trusted reporting, with multiple newsroom names publishing at least 10 minutes apart |
| `renewed-coverage` | Newly published reporting on a previously covered candidate group |
| `recent-coverage` | Most recent trusted publication occurred in the last day |
| `quiet-coverage` | Most recent trusted publication is between one and seven days old |
| `archived-coverage` | Last trusted publication is over seven days old |
| `publication-time-unknown` | No reliable original publisher publication timestamp was available |

Publication times from GDELT first-seen metadata or legacy records are not enough to infer active coverage. These labels describe the **reporting cycle**, not the operational state of a conflict, disaster or security event.

## Verification and test gates

`python scripts/test_arabic.py`

`python scripts/test_fusion.py`

`python scripts/test_news_quality.py`

`python scripts/test_lifecycle.py`

Each standard-library Python test runs without networking or credentials. Their verdict is included in the live manifest as `quality_gate`. A failed verdict suppresses alerts while allowing non-alert news to continue publishing.

## Critical notification delivery

The website top bar can show **CRITICAL REPORTING** when recent, multi-outlet severe claims qualify. Browser notifications are opt-in and require the tab to be open/visible. Optional Telegram alerts use `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` configured as GitHub Actions secrets. The bot sends new distinct qualified reporting only, with evidence URLs and explicit unverified warnings. Without these secrets, no off-site Telegram delivery is configured.

For real-world public safety decisions, always follow official authorities and emergency services, not this news aggregation dashboard.
