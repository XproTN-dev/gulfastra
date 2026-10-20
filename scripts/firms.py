#!/usr/bin/env python3
"""Optional NASA FIRMS thermal anomaly context.

A FIRMS detection is NOT a fire confirmation, strike, explosion or attack.
Uses NASA's free registered MAP_KEY as a private Actions secret; never
publishes credentials. Collects only recent Gulf-bbox satellite detections.
"""
from __future__ import annotations
import csv
import io
import json
import os
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from pathlib import Path
from urllib.request import Request, urlopen

DATA=Path(os.environ.get("GULFASTRA_DATA_DIR",
                        str(Path(__file__).resolve().parents[1]/"data")))
FILE=DATA/"observations.json"
GULF_BBOX="32,10,66,40"
SOURCE="VIIRS_NOAA21_NRT"

def iso(t):
    return t.astimezone(timezone.utc).isoformat().replace("+00:00","Z")

def observed_at(item):
    date=str(item.get("acq_date") or "")
    time=str(item.get("acq_time") or "0000").zfill(4)
    try:
        return datetime.strptime(date+time,"%Y-%m-%d%H%M").replace(tzinfo=timezone.utc)
    except ValueError:
        return None

def read_csv(payload, now=None):
    now=now or datetime.now(timezone.utc)
    results=[]
    for row in csv.DictReader(io.StringIO(payload)):
        try:
            lat=float(row["latitude"]);lon=float(row["longitude"])
            if not 10<=lat<=40 or not 32<=lon<=66:continue
        except (ValueError,TypeError,KeyError):
            continue
        instant=observed_at(row)
        if not instant or instant<now-timedelta(days=3) or instant>now+timedelta(hours=1):continue
        frp=row.get("frp","")
        identifier="firms:"+sha256(f"{SOURCE}:{row['acq_date']}:{row['acq_time']}:{lat:.4f}:{lon:.4f}".encode()).hexdigest()[:22]
        results.append({
            "id":identifier,"kind":"thermal-detection","source":"NASA FIRMS / VIIRS NOAA-21",
            "title":"Satellite thermal anomaly (NOT a verified fire or conflict incident)",
            "url":"https://firms.modaps.eosdis.nasa.gov/",
            "occurred_at":iso(instant),"published_at":iso(instant),
            "lon":lon,"lat":lat,"frp":float(frp) if frp.replace(".","",1).isdigit() else None,
            "coordinates_quality":"satellite-estimated-detection",
            "classification":"remote-sensing-thermal-anomaly-unverified",
            "sensor":SOURCE
        })
    return results[:1300]

def main():
    DATA.mkdir(parents=True,exist_ok=True)
    key=os.environ.get("NASA_FIRMS_MAP_KEY","").strip()
    try:archive=json.loads(FILE.read_text(encoding="utf-8"))
    except (OSError,ValueError):archive={"schema":1,"observations":[],"health":[]}
    items={r["id"]:r for r in archive.get("observations",[]) if r.get("id")}
    health=[h for h in archive.get("health",[]) if h.get("source")!="NASA FIRMS"]
    now=datetime.now(timezone.utc)
    status={"source":"NASA FIRMS","last_run":iso(now)}
    if not key:
        status.update({"ok":None,"state":"not-configured","requires_secret":"NASA_FIRMS_MAP_KEY"})
    else:
        try:
            # Area CSV endpoint, documented by NASA FIRMS. Scoped; 1-day view.
            url=f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/{SOURCE}/{GULF_BBOX}/1"
            req=Request(url,headers={"User-Agent":"Gulfastra/11 public geographic thermal context"})
            with urlopen(req,timeout=23) as response:
                data=response.read(2_500_000).decode("utf-8-sig")
            batch=read_csv(data,now)
            for record in batch:items[record["id"]]=record
            status.update({"ok":True,"count":len(batch)})
        except Exception as exc:
            # Do not leak the MAP_KEY if an API URL is embedded in an error string.
            status.update({"ok":False,"error":str(exc).replace(key,"[REDACTED]")[:120]})
    health.append(status)
    cutoff=now-timedelta(days=14)
    retained=[]
    for item in items.values():
        try:
            t=datetime.fromisoformat(str(item.get("occurred_at")).replace("Z","+00:00"))
            if t.tzinfo is None:t=t.replace(tzinfo=timezone.utc)
        except (ValueError,TypeError):continue
        if t>=cutoff:retained.append(item)
    retained.sort(key=lambda r:r.get("occurred_at") or "",reverse=True)
    archive.update({"schema":2,"updated_at":iso(now),"observations":retained[:1800],
                    "health":health,
                    "disclaimer":"USGS/NASA observations are distinct from unverified conflict claims. FIRMS thermal detections do not establish causes."})
    FILE.write_text(json.dumps(archive,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("FIRMS:",status.get("state",status.get("ok")),"thermal records",status.get("count",0))
if __name__=="__main__":main()
