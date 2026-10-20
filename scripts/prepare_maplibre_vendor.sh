#!/usr/bin/env bash
# Prepare independently hosted MapLibre GL JS v6 assets for GitHub Pages.
# This is a reproducible pinned npm tarball, not a runtime CDN dependency.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
VERSION="6.15.0"
echo "Fetching pinned MapLibre GL JS ${VERSION} package for same-origin publication"
npm pack "maplibre-gl@${VERSION}" --pack-destination "$TMP" --silent >/tmp/gulfastra-maplibre-pack.txt
PACKAGE="$(find "$TMP" -maxdepth 1 -name 'maplibre-gl-*.tgz' -print -quit)"
test -n "$PACKAGE"
tar -xzf "$PACKAGE" -C "$TMP"
mkdir -p "$ROOT/vendor"
for f in maplibre-gl.mjs maplibre-gl-worker.mjs maplibre-gl.css; do
  test -s "$TMP/package/dist/$f" || { echo "::error::MapLibre published package lacks $f" >&2; exit 1; }
  cp "$TMP/package/dist/$f" "$ROOT/vendor/$f"
done
cp "$TMP/package/LICENSE.txt" "$ROOT/vendor/LICENSE.txt"
test -s "$ROOT/vendor/maplibre-gl.mjs"
test -s "$ROOT/vendor/maplibre-gl-worker.mjs"
test -s "$ROOT/vendor/maplibre-gl.css"
echo "Bundled MapLibre ${VERSION} main module, worker, CSS and BSD license"
du -h "$ROOT/vendor/"*
