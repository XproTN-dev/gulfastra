#!/usr/bin/env python3
"""Gulfastra v3 — collects public headlines for regional situational awareness.
Headlines are not independent confirmation of any reported event.
"""
from __future__ import annotations
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from hashlib import sha256
from pathlib import Path
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen
import json
import os
import re
import xml.etree.ElementTree as ET
from arabic_sources import is_arabic, category_for_arabic, country_mentions, arabic_tag

ROOT = Path(__file__).resolve().parents[1]
DEST = Path(os.environ.get("GULFASTRA_DATA_DIR", str(ROOT / "data"))) / "reports.json"
UA = "Gulfastra/3.0 (+https://github.com/XproTN-dev/gulfastra; public news research)"
TODAY = datetime.now(timezone.utc)

FEEDS = {
    "Google News · missiles/drones": '("Iran" OR "Saudi Arabia" OR "Qatar" OR "UAE" OR "Bahrain") (missile OR drone OR interception) when:7d',
    "Google News · security": '("Iran" OR "Iraq" OR "Saudi Arabia" OR "Gulf") (strike OR attack OR air defense OR military) when:7d',
    "Google News · aviation": '("Iran" OR "Qatar" OR "Dubai" OR "Saudi Arabia" OR "Bahrain") (airspace OR airport closure OR flights suspended) when:7d',
    "Google News · shipping": '("Hormuz" OR "Persian Gulf" OR "Red Sea") (shipping OR tanker OR vessel OR disruption) when:7d',
    "Google News · diplomacy": '("US" OR "America") ("Iran" OR "Saudi Arabia") (sanctions OR diplomacy OR ceasefire OR negotiations) when:7d',
    "Google News · regional": '("Iran" OR "Gulf states" OR "Saudi Arabia") (security warning OR military statement OR regional tension) when:7d',
}
ARABIC_FEEDS = {
    "عربي · إيران والخليج": '("إيران" OR "الخليج") (صواريخ OR مسيرات OR هجوم OR دفاع جوي OR اعتراض) when:7d',
    "عربي · قطر": '("قطر" OR "الدوحة") (هجوم OR صواريخ OR مسيرات OR اجواء OR المجال الجوي) when:7d',
    "عربي · السعودية": '("السعودية" OR "الرياض") (صواريخ OR مسيرات OR دفاع جوي OR هجوم) when:7d',
    "عربي · الإمارات والبحرين": '("الإمارات" OR "البحرين") (هجوم OR اعتراض OR صواريخ OR مسيرات) when:7d',
    "عربي · الكويت والعراق": '("الكويت" OR "العراق") (هجوم OR صواريخ OR مسيرات OR انفجار) when:7d',
    "عربي · مضيق هرمز": '("هرمز" OR "الخليج العربي") (ملاحة OR ناقلات OR سفن OR تحذيرات) when:7d',
    "عربي · الجزيرة": 'site:aljazeera.net (إيران OR الخليج OR قطر) (صواريخ OR مسيرات OR هجوم OR وقف إطلاق النار) when:7d',
    "عربي · العربية": 'site:alarabiya.net (إيران OR السعودية OR الإمارات) (صواريخ OR مسيرات OR هجوم OR هدنة) when:7d',
    "عربي · الشرق": 'site:asharq.com (إيران OR السعودية OR الخليج) (صواريخ OR مسيرات OR هجوم OR حرب) when:7d',
    "عربي · وكالات الخليج": '(site:qna.org.qa OR site:spa.gov.sa OR site:wam.ae OR site:kuna.net.kw OR site:bna.bh) (إيران OR الخليج OR صواريخ OR هجوم) when:7d',
}
DIRECT_RSS = {
    "الجزيرة نت · RSS عربي": "https://www.aljazeera.net/rss",
    "BBC Middle East RSS": "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml",
    "Al Jazeera RSS": "https://www.aljazeera.com/xml/rss/all.xml",
}
COUNTRIES = {
    "Iran": ("iran","tehran","isfahan","persian"),
    "Saudi": ("saudi","riyadh","jeddah","aramco"),
    "Qatar": ("qatar","doha"),
    "UAE": ("uae","united arab emirates","dubai","abu dhabi"),
    "Bahrain": ("bahrain","manama"),
    "Kuwait": ("kuwait",),
    "Iraq": ("iraq","baghdad"),
    "Oman": ("oman","muscat"),
    "Yemen": ("yemen","houthi","sanaa"),
    "Israel": ("israel","tel aviv"),
}
REGION = re.compile(r'\b(iran|tehran|isfahan|saudi|riyadh|qatar|doha|uae|dubai|emirates|abu dhabi|bahrain|kuwait|iraq|baghdad|oman|yemen|houthi|hormuz|persian gulf|arabian gulf|gulf states|red sea|israel|tel aviv|centcom)\b', re.I)
SECURITY = re.compile(r'\b(missile|rocket|drone|uav|intercept|strike|airstrike|attack|explosion|bomb|military|warship|air defense|air defence|security warning|threat|conflict|ceasefire|base attack)\b', re.I)
TRANSPORT = re.compile(r'\b(airspace|airport|flight|airline|tanker|ship|shipping|vessel|strait|navigation|maritime|port closure|oil supply|hormuz)\b', re.I)
DIPLOMACY = re.compile(r'\b(diploma|negotiat|sanction|talks|envoy|peace|treaty|ceasefire|nuclear|summit|foreign minister|trump|president|statement|agreement|security council)\b', re.I)
IRRELEVANT = re.compile(r'\b(football|soccer|cricket|celebrity|wedding|recipe|movie|video game|transfer market)\b', re.I)

def fetch(url):
    req = Request(url, headers={"User-Agent": UA, "Accept": "application/json, application/rss+xml, application/xml, text/xml"})
    with urlopen(req, timeout=24) as response:
        return response.read(4_000_000)

def published_date(value):
    if not value:
        return None
    try:
        moment = parsedate_to_datetime(value)
        if moment.tzinfo is None:
            moment = moment.replace(tzinfo=timezone.utc)
        return moment.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    except (ValueError, TypeError):
        return None

def gdelt_date(value):
    try:
        return datetime.strptime(value, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
    except (ValueError, TypeError):
        return None

def determine_country(title):
    mentions = country_mentions(title)
    if len(mentions) > 1:
        return ""  # Multi-country mention, no misleading location assignment
    if len(mentions) == 1:
        return mentions[0]
    value = title.lower()
    for country, keys in COUNTRIES.items():
        if any(re.search(r"(?<![a-z])" + re.escape(term) + r"(?![a-z])", value) for term in keys):
            return country
    return ""

def classify(title):
    if is_arabic(title):
        return category_for_arabic(title)
    if not REGION.search(title) or IRRELEVANT.search(title):
        return None
    if SECURITY.search(title):
        return "security"
    if TRANSPORT.search(title):
        return "transport"
    if DIPLOMACY.search(title):
        return "diplomacy"
    return None

def tag(title, category):
    if is_arabic(title):
        return arabic_tag(title,category)
    value = title.lower()
    if "intercept" in value or "air defense" in value or "air defence" in value:
        return "INTERCEPTION REPORT"
    if re.search(r'\b(missile|rocket)\b',value):
        return "MISSILE REPORT"
    if re.search(r'\b(drone|uav)\b',value):
        return "DRONE REPORT"
    if re.search(r'\b(airspace|airport|flight|airline)\b',value):
        return "AVIATION REPORT"
    if re.search(r'\b(tanker|hormuz|vessel|shipping|maritime|ship)\b',value):
        return "MARITIME REPORT"
    return {"security":"SECURITY REPORT", "transport":"DISRUPTION REPORT", "diplomacy":"DIPLOMACY REPORT"}.get(category,"REGIONAL REPORT")

def record(title, link, published, outlet, provider):
    if not all((title,link,published)):
        return None
    category = classify(title)
    if not category or not link.startswith("https://"):
        return None
    country = determine_country(title)
    key = sha256(link.encode("utf-8")).hexdigest()[:24]
    return {"id":key,"title":title[:300],"url":link,
            "source":outlet[:100] if outlet else provider,"published_at":published,
            "country":country,"countries":country_mentions(title),"language":"ar" if is_arabic(title) else "en","category":category,"tag":tag(title,category),"provider":provider}

def add_rss(name, url, seen, statuses):
    attempted = 0
    accepted = 0
    try:
        doc = ET.fromstring(fetch(url))
        items = doc.findall(".//channel/item")
        for item in items:
            attempted += 1
            title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip()
            date = published_date(item.findtext("pubDate"))
            outlet_tag = item.find("source")
            outlet = (outlet_tag.text or "").strip() if outlet_tag is not None else name
            report = record(title,link,date,outlet,name)
            if report:
                seen[report["id"]] = report
                accepted += 1
        statuses[name] = {"ok":True,"items":attempted,"relevant":accepted}
    except Exception as exc:
        statuses[name] = {"ok":False,"error":str(exc)[:160]}

def add_gdelt(seen, statuses):
    name = "GDELT · article index"
    params = urlencode({"query":'(Iran OR Saudi OR Qatar OR UAE OR Bahrain) (missile OR drone OR military OR airspace OR shipping)',
                        "mode":"ArtList","maxrecords":"75","format":"json","timespan":"48h","sort":"datedesc"})
    try:
        doc = json.loads(fetch("https://api.gdeltproject.org/api/v2/doc/doc?"+params).decode("utf-8"))
        hits = doc.get("articles",[])
        relevant=0
        for item in hits:
            title=(item.get("title") or "").strip()
            url=item.get("url") or ""
            when=gdelt_date(item.get("seendate"))
            outlet=item.get("domain") or urlsplit(url).netloc
            report=record(title,url,when,outlet,name)
            if report:
                seen[report["id"]]=report
                relevant+=1
        statuses[name]={"ok":True,"items":len(hits),"relevant":relevant}
    except Exception as exc:
        statuses[name]={"ok":False,"error":str(exc)[:160]}

def main():
    try:
        archive=json.loads(DEST.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        archive={}
    seen={}
    for old in archive.get("reports",[]):
        title=old.get("title","")
        if classify(title) and old.get("url") and old.get("id"):
            old["category"]=classify(title)
            old["tag"]=tag(title,old["category"])
            old["countries"]=country_mentions(title)
            old["country"]=determine_country(title)
            old["language"]="ar" if is_arabic(title) else "en"
            seen[old["id"]]=old
    statuses={}
    for name,query in FEEDS.items():
        url="https://news.google.com/rss/search?"+urlencode({"q":query,"hl":"en-US","gl":"US","ceid":"US:en"})
        add_rss(name,url,seen,statuses)
    for name,query in ARABIC_FEEDS.items():
        url="https://news.google.com/rss/search?"+urlencode({"q":query,"hl":"ar","gl":"QA","ceid":"QA:ar"})
        add_rss(name,url,seen,statuses)
    for name,url in DIRECT_RSS.items():
        add_rss(name,url,seen,statuses)
    # GDELT has been returning HTTP 429. Probe at most twice per hour,
    # rather than rate-limiting the entire five-minute news collector.
    if TODAY.minute % 30 < 5:
        add_gdelt(seen,statuses)
    else:
        statuses["GDELT · article index"] = {
            "ok": None, "state": "rate-limit-backoff",
            "note": "Probed twice hourly; previous HTTP 429 responses"
        }
    records=sorted(seen.values(),key=lambda x:x.get("published_at",""),reverse=True)[:2600]
    good=any(info.get("ok") for info in statuses.values())
    timestamp=TODAY.isoformat().replace("+00:00","Z")
    output={"version":4,"last_run":timestamp,
            "last_successful_run":timestamp if good else archive.get("last_successful_run"),
            "reports":records,"providers":statuses,
            "notice":"Public news headlines only, not verified attacks. Approximate country reference markers. Provider errors are reported."}
    DEST.parent.mkdir(parents=True,exist_ok=True)
    DEST.write_text(json.dumps(output,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print("Saved",len(records),"relevant public articles; successful providers",sum(bool(s.get("ok")) for s in statuses.values()),"/",len(statuses))

if __name__=="__main__":
    main()
