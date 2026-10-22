#!/usr/bin/env python3
"""Independent public observations from EMSC & NOAA SWPC.

EMSC: explicitly geolocated seismic observations. NOAA: NON-GEOGRAPHIC
space-weather bulletins; never place at a guessed point on the Gulf map.
Each provider fails independently and last-good data remain timestamped.
"""
import json
import os
import hashlib
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlencode

DATA=Path(os.getenv("GULFASTRA_DATA_DIR",str(Path(__file__).resolve().parents[1]/"data")))
OUT=DATA/"direct_signals.json"
NOW=datetime.now(timezone.utc)
EMSC="https://www.seismicportal.eu/fdsnws/event/1/query"
NOAA="https://services.swpc.noaa.gov/products/alerts.json"
def iso(d):return d.astimezone(timezone.utc).isoformat().replace("+00:00","Z")
def parse(s):
    try:
        d=datetime.fromisoformat(str(s).replace("Z","+00:00"))
        return d.astimezone(timezone.utc) if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except (TypeError,ValueError):return None
def fetch_json(url):
    req=Request(url,headers={"User-Agent":"GULFASTRA/12 independent published signals (contact via Github)",
        "Accept":"application/json"})
    with urlopen(req,timeout=15) as r:
        if r.status==204:return {"features":[]}
        return json.loads(r.read(1500000).decode("utf-8"))
def load():
    try:return json.loads(OUT.read_text("utf-8"))
    except (OSError,ValueError):return {}
def emsc_records(doc,now=NOW):
    features=doc.get("features",[]) if isinstance(doc,dict) else []
    result=[]
    for f in features[:200]:
        p=f.get("properties") or {};geo=f.get("geometry") or {}
        c=geo.get("coordinates") or []
        if geo.get("type")!="Point" or not isinstance(c,list) or len(c)<2:continue
        try:lon=float(c[0]);lat=float(c[1]);mag=float(p.get("mag")) if p.get("mag") is not None else None
        except (TypeError,ValueError):continue
        if not(32<=lon<=66 and 10<=lat<=40):continue
        observed=parse(p.get("time"))
        if not observed or observed<now-timedelta(days=7) or observed>now+timedelta(minutes=5):continue
        identifier=str(p.get("unid") or f.get("id") or p.get("source_id") or "")
        if not identifier:continue
        result.append({"id":"emsc:"+identifier,"kind":"earthquake","source":"EMSC",
          "title":"EMSC earthquake · "+str(p.get("flynn_region") or "regional seismic event")[:120],
          "url":"https://www.emsc-csem.org/Earthquake_information/",
          "occurred_at":iso(observed),"published_at":iso(observed),
          "source_updated_at":iso(parse(p.get("lastupdate")) or observed),
          "lat":lat,"lon":lon,"magnitude":mag,"coordinates_quality":"provider-reported epicentre",
          "classification":"seismic-observation-not-conflict","source_id":identifier})
    return result
def noaa_records(blob,now=NOW):
    if not isinstance(blob,list):raise ValueError("Unexpected NOAA bulletins shape")
    output=[]
    for x in blob[:150]:
        date=parse(x.get("issue_datetime","").replace(" ","T")+"Z")
        if not date or date<now-timedelta(hours=48) or date>now+timedelta(minutes=5):continue
        msg=str(x.get("message") or "")
        headline=next((line.strip() for line in msg.splitlines() if
            any(line.strip().upper().startswith(prefix) for prefix in
                ("ALERT:","WATCH:","WARNING:","EXTENDED WARNING:","SUMMARY:"))),None)
        if not headline:continue
        ident=str(x.get("product_id") or "product")
        digest=hashlib.sha256((ident+"|"+iso(date)).encode()).hexdigest()[:12]
        output.append({"id":"noaa-swpc:"+digest,"kind":"space-weather-bulletin",
            "source":"NOAA SWPC","title":headline[:230],
            "url":"https://www.swpc.noaa.gov/products/alerts-watches-and-warnings",
            "published_at":iso(date),"product_id":ident,
            "geo_precision":"non-geographic-global-bulletin",
            "verification":"provider bulletin; geographic impacts not inferred"})
    return output
def make():
    DATA.mkdir(parents=True,exist_ok=True)
    old=load()
    prior={r["id"]:r for r in old.get("observations",[]) if r.get("id")}
    bulletins={r["id"]:r for r in old.get("bulletins",[]) if r.get("id")}
    health={}
    source_history=old.get("health") or {}
    def collect(source,url,parser,target):
        old_state=source_history.get(source) or {}
        last=parse(old_state.get("last_attempt_at"))
        if last and NOW-last<timedelta(minutes=18):
            health[source]={**old_state,"state":"cached","checked_at":iso(NOW)}
            return
        status={"last_attempt_at":iso(NOW),"state":"unavailable","ok":False}
        try:
            rows=parser(fetch_json(url),NOW)
            for r in rows:target[r["id"]]=r
            status.update({"state":"healthy","ok":True,"returned":len(rows),"last_success_at":iso(NOW)})
        except Exception as e:
            status["error"]=str(e)[:130]
        health[source]=status
    args=urlencode({"format":"json","starttime":(NOW-timedelta(days=2)).strftime("%Y-%m-%dT%H:%M:%S"),
       "minlatitude":10,"maxlatitude":40,"minlongitude":32,"maxlongitude":66,"limit":150,"orderby":"time"})
    collect("EMSC",EMSC+"?"+args,emsc_records,prior)
    collect("NOAA SWPC",NOAA,noaa_records,bulletins)
    obs=[r for r in prior.values() if parse(r.get("occurred_at")) and
       NOW-timedelta(days=7)<=parse(r["occurred_at"])<=NOW+timedelta(minutes=5)]
    notes=[r for r in bulletins.values() if parse(r.get("published_at")) and
       NOW-timedelta(hours=48)<=parse(r["published_at"])<=NOW+timedelta(minutes=5)]
    obs.sort(key=lambda r:r["occurred_at"],reverse=True)
    notes.sort(key=lambda r:r["published_at"],reverse=True)
    OUT.write_text(json.dumps({"schema":1,"generated_at":iso(NOW),"observations":obs[:200],
      "bulletins":notes[:50],"health":health,
      "notice":"EMSC events are seismic observations; NOAA warnings are global/non-geographic. Neither is evidence of war, conflict or Gulf-specific damage."},
      ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
    print("Direct independent:",len(obs),"EMSC observations,",len(notes),"NOAA bulletins",
          [(s,v.get("state")) for s,v in health.items()])
if __name__=="__main__":make()
