#!/usr/bin/env python3
"""Fetch independent public *non-conflict* environmental observations for Gulf region.
Precisely geolocated earthquakes or natural events must not be mislabelled as strikes.
Optional Cloudflare Radar can be connected with user-provided secret, if licensed for use.
"""
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.request import Request, urlopen
import json
import os
ROOT=Path(__file__).resolve().parents[1]
DEST=Path(os.environ.get("GULFASTRA_DATA_DIR", str(ROOT / "data")))/"observations.json"
UA="Gulfastra observatory; public environmental context"
BBOX=(32,10,66,40)  # longitudes 32..66, latitudes 10..40

def get(url,token=None):
    headers={"User-Agent":UA,"Accept":"application/json"}
    if token: headers["Authorization"]="Bearer "+token
    with urlopen(Request(url,headers=headers),timeout=23) as response:
        return json.loads(response.read(5_000_000).decode())

def inside(lon,lat):
    return isinstance(lon,(int,float)) and isinstance(lat,(int,float)) and 32<=lon<=66 and 10<=lat<=40

def make():
    now=datetime.now(timezone.utc).isoformat().replace("+00:00","Z")
    try: old=json.loads(DEST.read_text(encoding="utf-8"))
    except (OSError,ValueError):old={}
    prior={x["source"]:x for x in old.get("health",[]) if x.get("source")}
    records={}
    for item in old.get("observations",[]):
        if item.get("id"):records[item["id"]]=item
    health=[]
    try:
        url="https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson"
        blob=get(url);n=0
        for feature in blob.get("features",[]):
            p=feature.get("properties",{});coords=(feature.get("geometry") or {}).get("coordinates") or []
            if len(coords)<2 or not inside(coords[0],coords[1]):continue
            date=datetime.fromtimestamp((p.get("time") or 0)/1000,timezone.utc).isoformat().replace("+00:00","Z")
            k="usgs:"+str(feature.get("id"))
            records[k]={"id":k,"kind":"earthquake","source":"USGS","title":p.get("title") or "USGS observation",
                        "url":p.get("url") or url,"occurred_at":date,"published_at":date,
                        "lon":coords[0],"lat":coords[1],"magnitude":p.get("mag"),
                        "coordinates_quality":"observed","classification":"observed-natural-hazard"}
            n+=1
        health.append({"source":"USGS","ok":True,"count":n,"last_run":now})
    except Exception as e:
        health.append({"source":"USGS","ok":False,"error":str(e)[:160],"last_run":now})
    try:
        url="https://eonet.gsfc.nasa.gov/api/v3/events/geojson?days=14&limit=200&status=all"
        blob=get(url);n=0
        for feature in blob.get("features",[]):
            p=feature.get("properties",{}) or {}
            geo=feature.get("geometry",{}) or {}
            coords=geo.get("coordinates")
            if geo.get("type")!="Point" or not isinstance(coords,list) or len(coords)<2 or not inside(coords[0],coords[1]):continue
            date=p.get("date") or now
            k="eonet:"+str(p.get("id"))
            records[k]={"id":k,"kind":"natural-event","source":"NASA EONET","title":p.get("title") or "NASA natural event",
                        "url":p.get("link") or url,"occurred_at":date,"published_at":date,
                        "lon":coords[0],"lat":coords[1],"coordinates_quality":"observed","classification":"observed-natural-hazard"}
            n+=1
        health.append({"source":"NASA EONET","ok":True,"count":n,"last_run":now})
    except Exception as e:
        health.append({"source":"NASA EONET","ok":False,"error":str(e)[:160],"last_run":now})
    # Optional -- do not silently claim free Cloudflare availability without a token.
    token=os.environ.get("CF_RADAR_TOKEN","").strip()
    if not token:
        health.append({"source":"Cloudflare Radar","ok":None,"state":"not-configured","requires_secret":"CF_RADAR_TOKEN","last_run":now})
    else:
        try:
            blob=get("https://api.cloudflare.com/client/v4/radar/annotations/outages?limit=100&dateRange=7d&format=json",token)
            if not blob.get("success"):raise ValueError("Cloudflare returned unsuccessful response")
            outages=(blob.get("result") or {}).get("annotations") or []
            mapping={"IR":"Iran","SA":"Saudi","QA":"Qatar","AE":"UAE","BH":"Bahrain","KW":"Kuwait","IQ":"Iraq","OM":"Oman","YE":"Yemen","IL":"Israel"}
            n=0
            for i,item in enumerate(outages):
                cc=[mapping[c] for c in (item.get("locations") or []) if c in mapping]
                if not cc:continue
                k="radar:"+str(item.get("id") or i)
                records[k]={"id":k,"kind":"connectivity-outage","source":"Cloudflare Radar",
                    "title":"Published connectivity disruption ("+", ".join(cc)+")",
                    "url":item.get("linkedUrl") or "https://radar.cloudflare.com/outage-center",
                    "occurred_at":item.get("startDate"),"published_at":item.get("startDate"),
                    "countries":cc,"coordinates_quality":"country-level",
                    "classification":"provider-reported-outage","outage_type":(item.get("outage") or {}).get("outageType")}
                n+=1
            health.append({"source":"Cloudflare Radar","ok":True,"count":n,"last_run":now})
        except Exception as e:
            health.append({"source":"Cloudflare Radar","ok":False,"error":str(e)[:160],"last_run":now})
    cutoff=(datetime.now(timezone.utc)-timedelta(days=14))
    values=[]
    for o in records.values():
        try:date=datetime.fromisoformat(str(o.get("occurred_at")).replace("Z","+00:00"))
        except (TypeError,ValueError):continue
        if date>=cutoff:values.append(o)
    values.sort(key=lambda e:e.get("occurred_at") or "",reverse=True)
    DEST.parent.mkdir(exist_ok=True,parents=True)
    payload={"schema":1,"updated_at":now,"observations":values[:250],
        "health":health,"disclaimer":"Natural hazards and connectivity disruptions are separate public observations. They are NOT classified as attacks or evidence of conflict."}
    DEST.write_text(json.dumps(payload,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print("Observation collector",len(values),"records",[(s["source"],s.get("ok")) for s in health])
if __name__=="__main__":make()
