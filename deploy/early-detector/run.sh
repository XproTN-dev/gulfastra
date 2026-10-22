#!/usr/bin/env bash
# Optional 2-minute public polling. Owner must first configure SSH push access.
set -euo pipefail
umask 077
BASE="$HOME/gulfastra-detector"
if [[ -n "${GULFASTRA_HOME:-}" ]]; then BASE="$GULFASTRA_HOME";fi
SRC="$BASE/source"
ARCHIVE="$BASE/archive"
if [[ ! -d "$SRC/.git" || ! -d "$ARCHIVE/.git" ]]; then
  echo >&2 "Configure SOURCE and ARCHIVE clones first; refusing an unknown checkout."
  exit 2
fi
if [[ "$(git -C "$SRC" branch --show-current)" != main ]] ||
   [[ "$(git -C "$ARCHIVE" branch --show-current)" != intelligence-data ]]; then
  echo >&2 "Incorrect branch; expected main (source) and intelligence-data (archive)."
  exit 2
fi
git -C "$SRC" pull --ff-only --quiet origin main
git -C "$ARCHIVE" pull --ff-only --quiet origin intelligence-data
python3 "$SRC/scripts/test_early_detector.py"
export GULFASTRA_DATA_DIR="$ARCHIVE/data"
python3 "$SRC/scripts/fast_sources.py"
QUALITY_GATE=passed python3 "$SRC/scripts/early_detector.py"
python3 "$SRC/scripts/publish_manifest.py"
git -C "$ARCHIVE" config user.name "gulfastra-detector"
git -C "$ARCHIVE" config user.email "gulfastra-detector@users.noreply.github.com"
git -C "$ARCHIVE" add data/fast_signals.json data/early_signals.json \
  data/early_state.json data/live-manifest.json
if ! git -C "$ARCHIVE" diff --cached --quiet; then
  git -C "$ARCHIVE" commit -m "data: trusted fast public detector refresh" --quiet
  for attempt in 1 2 3 4; do
    if git -C "$ARCHIVE" pull --rebase -X theirs origin intelligence-data &&
       git -C "$ARCHIVE" push origin HEAD:intelligence-data; then
      break
    fi
    git -C "$ARCHIVE" rebase --abort || true
    if [[ "$attempt" == 4 ]]; then echo >&2 "Publish failed.";exit 1;fi
    sleep 3
  done
fi
python3 "$SRC/scripts/early_notify.py"
if [[ -f "$ARCHIVE/data/early_telegram_state.json" ]]; then
  git -C "$ARCHIVE" add data/early_telegram_state.json
  if ! git -C "$ARCHIVE" diff --cached --quiet; then
    git -C "$ARCHIVE" commit -m "data: acknowledged early detector notices" --quiet
    git -C "$ARCHIVE" pull --rebase -X theirs origin intelligence-data
    git -C "$ARCHIVE" push origin HEAD:intelligence-data
  fi
fi
