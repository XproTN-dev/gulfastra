#!/usr/bin/env python3
"""Tiny immutable-version manifest for GitHub-only Gulfastra live data.

Published to the intelligence-data branch; GitHub Pages is NOT rebuilt.
A browser checks this inexpensive metadata before downloading large JSON.
"""
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
import json
import os

ROOT = Path(__file__).resolve().parents[1]
DATA = Path(os.environ.get("GULFASTRA_DATA_DIR", str(ROOT / "data")))
FILES = ("reports.json", "events.json", "revisions.json", "observations.json")

def make_manifest(folder):
    files = {}
    for name in FILES:
        path = folder / name
        if path.is_file():
            payload = path.read_bytes()
            files[name] = {"sha256": sha256(payload).hexdigest()[:24], "bytes": len(payload)}
    try:
        report = json.loads((folder / "reports.json").read_text("utf-8"))
    except (ValueError, OSError):
        report = {}
    try:
        fused = json.loads((folder / "events.json").read_text("utf-8"))
    except (ValueError, OSError):
        fused = {}
    feeds = report.get("providers") or {}
    items = report.get("reports") or []
    latest = max((i.get("published_at", "") for i in items), default="")
    return {
        "schema": 7,
        "channel": "github-intelligence-data",
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "collected_at": report.get("last_run"),
        "latest_article_published_at": latest or None,
        "total_articles": len(items),
        "arabic_articles": sum(r.get("language") == "ar" for r in items),
        "evidence_groups": len(fused.get("events") or []),
        "healthy_sources": sum(v.get("ok") is True for v in feeds.values()),
        "source_count": len(feeds),
        "files": files,
        "precision_note": "Publication and collector timestamps are different. Data is public reporting, not confirmed incidents."
    }

def main():
    DATA.mkdir(parents=True, exist_ok=True)
    manifest = make_manifest(DATA)
    (DATA / "live-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8"
    )
    print("Gulfastra data manifest:", manifest["total_articles"], "articles;",
          manifest["evidence_groups"], "coverage groups;",len(manifest["files"]), "versioned files")

if __name__ == "__main__":
    main()
