#!/usr/bin/env python3
"""Gulfastra public-source headline collector. No simulated incidents."""
import calendar
import datetime as dt
import email.utils
import hashlib
import json
import os
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data" / "reports.json"
UA = "Gulfastra/2.0 (public research dashboard; Github Actions)"
TOPICS = {
    "security": "(Iran OR Saudi OR Qatar OR UAE OR Bahrain OR Kuwait OR Iraq) (missile OR drone OR intercept OR strike OR attack)",
    "transport": "(Hormuz OR Gulf OR Qatar OR Bahrain OR Saudi OR Iran) (airspace OR airport OR shipping OR tanker OR maritime)",
    "diplomacy": "(Iran OR Saudi OR Qatar OR UAE) (US OR America OR negotiations OR sanctions OR diplomacy)"
}
COUNTRY_TERMS = {
    "Iran": ["iran", "tehran", "isfahan"],
    "Saudi": ["saudi", "riyadh", "jeddah"],
    "Qatar": ["qatar", "doha"],
    "UAE": ["united arab emirates", "uae", "dubai", "abu dhabi"],
    "Bahrain": ["bahrain", "manama"],
    "Kuwait": ["kuwait"],
    "Iraq": ["iraq", "baghdad"],
    "Oman": ["oman", "muscat"],
    "Yemen": ["yemen", "sanaa"],
    "Israel": ["israel", "tel aviv"]
}

def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml,application/xml,text/xml"})
    with urllib.request.urlopen(request, timeout=25) as res:
        return res.read(3_000_000)

def date_iso(raw):
    try:
        date = email.utils.parsedate_to_datetime(raw)
        if date.tzinfo is None:
            date = date.replace(tzinfo=dt.timezone.utc)
        return date.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z")
    except Exception:
        return None

def main():
    now = dt.datetime.now(dt.timezone.utc)
    try:
        db = json.loads(DEST.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        db = {}
    old = db.get("reports", [])
    seen = {r.get("id"): r for r in old if r.get("id")}
    providers = {}
    for kind, query in TOPICS.items():
        url = "https://news.google.com/rss/search?q=" + urllib.parse.quote(query + " when:7d") + "&hl=en-US&gl=US&ceid=US:en"
        count = 0
        try:
            xml = ET.fromstring(fetch(url))
            for item in xml.findall(".//channel/item"):
                title = (item.findtext("title") or "").strip()
                link = (item.findtext("link") or "").strip()
                published = date_iso(item.findtext("pubDate") or "")
                source = item.find("source")
                outlet = (source.text or "").strip() if source is not None else "Google News"
                if not title or not link or not published:
                    continue
                content = title.lower()
                matches = [name for name, terms in COUNTRY_TERMS.items() if any(re.search(r"(?<![a-z])"+re.escape(word)+r"(?![a-z])", content) for word in terms)]
                country = matches[0] if matches else ""
                identifier = hashlib.sha256(link.encode("utf-8")).hexdigest()[:20]
                seen[identifier] = {"id": identifier, "title": title[:300], "url": link, "source": outlet[:90], "published_at": published, "country": country, "category": kind, "provider": "Google News RSS"}
                count += 1
            providers["Google News " + kind] = {"ok": True, "items": count}
        except Exception as exc:
            providers["Google News " + kind] = {"ok": False, "error": str(exc)[:180]}
    records = sorted(seen.values(), key=lambda r: r.get("published_at", ""), reverse=True)[:1600]
    db = {"version": 2, "last_run": now.isoformat().replace("+00:00","Z"), "reports": records, "providers": providers, "notice": "Keyword-based public article collection. Reports are not independently verified. Map points indicate countries, not attack coordinates."}
    DEST.parent.mkdir(exist_ok=True, parents=True)
    DEST.write_text(json.dumps(db, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Collected archive: {len(records)} reports; source health: {providers}")

if __name__ == "__main__":
    main()
