#!/usr/bin/env python3
"""Public GDACS advisories; OPTIONAL pre-approved ReliefWeb and OpenSky clients.
No inferred incidents, live flight tracks, or active-danger claims.
Uses standard library; never sends secrets to the static frontend.
"""
import json, os, re
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlencode

DATA=Path(os.environ.get("GULFASTRA_DATA_DIR",str(Path(__file__).resolve().parents[1]/"data")))
OUT=DATA/"advisories.json"
NOW=datetime.now(timezone.utc)
SCOPE={"Iran","Iraq","Qatar","Saudi","UAE","Bahrain","Kuwait","Oman","Yemen","Israel"}
GULF_WORDS=re.compile(r"\b(iran|iraq|qatar|saudi|uae|emirates|bahrain|kuwait|oman|yemen|israel|persian gulf|arabian gulf|hormuz|red sea)\b",re.I)

def timestamp(d):
    return d.astimezone(timezone.utc).isoformat().replace("+00:00","Z")
def instant(value):
    try:
        dt=datetime.fromisoformat(str(value).replace("Z","+00:00"))
        return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)
    except (TypeError,ValueError):
        return None
def get_json(url,headers=None,data=None,timeout=12):
    h={"User-Agent":"Gulfastra/11.2 public situational context","Accept":"application/json"}
    h.update(headers or {})
    with urlopen(Request(url,headers=h,data=data),timeout=timeout) as r:
        return json.loads(r.read(2_500_000))
def safe_url(url):
    return url if isinstance(url,str) and url.startswith("https://") else ""
def read():
    try:return json.loads(OUT.read_text("utf-8"))
    except (OSError,ValueError):return {}
def recency(status,previous,hours):
    last=instant((previous or {}).get("last_attempt_at"))
    if last and NOW-last<timedelta(hours=hours):
        result=dict(previous)
        result.update({"state":"rate-limit-backoff","checked_at":timestamp(NOW)})
        status.update(result)
        return True
    return False
def gdacs_records(doc):
    output=[]
    for f in doc.get("features",[])[:200]:
        p=f.get("properties") or {}
        g=f.get("geometry") or {}
        coords=g.get("coordinates")
        if g.get("type")!="Point" or not isinstance(coords,list) or len(coords)<2:continue
        try:lon,lat=float(coords[0]),float(coords[1])
        except (ValueError,TypeError):continue
        if not(30<=lon<=69 and 8<=lat<=43):continue
        code=str(p.get("eventtype") or "hazard").upper()
        identifier=str(p.get("eventid") or f.get("id") or "")
        if not identifier:continue
        published=p.get("fromdate") or p.get("todate") or p.get("date")
        date=instant(published)
        if not date or date>NOW+timedelta(minutes=10) or date<NOW-timedelta(days=14):continue
        url=safe_url(p.get("url") or p.get("link")) or "https://www.gdacs.org/"
        output.append({"id":"gdacs:"+code+":"+identifier,
         "source":"GDACS","kind":"official-disaster-advisory",
         "title":str(p.get("name") or p.get("title") or code+" natural-hazard advisory")[:240],
         "published_at":timestamp(date),"url":url,"category":"natural-hazard",
         "level":str(p.get("alertlevel") or "unspecified").lower(),
         "lat":lat,"lon":lon,"location_quality":"GDACS event geometry / regional approximation",
         "verification":"official-provider-advisory-not-confirmed-damage",
         "reference_id":identifier})
    return output
def reliefweb_records(doc):
    rows=[]
    for entry in doc.get("data",[])[:30]:
        fields=entry.get("fields") or {}
        title=str(fields.get("title") or "").strip()
        if not title or not GULF_WORDS.search(title):continue
        date=instant((fields.get("date") or {}).get("created") if isinstance(fields.get("date"),dict) else fields.get("date"))
        if not date or date<NOW-timedelta(days=14):continue
        url=safe_url(fields.get("url") or fields.get("url_alias")) or "https://reliefweb.int/"
        rows.append({"id":"reliefweb:"+str(entry.get("id")),"source":"ReliefWeb",
          "kind":"humanitarian-publication","category":"humanitarian",
          "title":title[:240],"published_at":timestamp(date),"url":url,
          "location_quality":"headline-country-only","verification":"published-humanitarian-report-not-direct-observation"})
    return rows
def open_sky_snapshot(blob):
    states=blob.get("states") or []
    t=blob.get("time")
    if not isinstance(t,(int,float)):return None
    ts=datetime.fromtimestamp(t,timezone.utc)
    if abs((NOW-ts).total_seconds())>3600:return None
    # Aggregate civil transponder observations. Do NOT publish individual aircraft
    # tracks, detailed identity or coordinates; this is a snapshot, not a NOTAM.
    count=sum(1 for s in states if len(s)>6 and isinstance(s[5],(float,int))
       and isinstance(s[6],(float,int)) and 32<=s[5]<=66 and 10<=s[6]<=40)
    return {"sample_at":timestamp(ts),"civil_transponder_observations":count,
      "scope":"Gulf bounding box / not an airspace status indicator",
      "warning":"OpenSky sampled observations are incomplete and not proof of flight safety, closure or air traffic volume."}
def run():
    DATA.mkdir(parents=True,exist_ok=True)
    old=read();before={x["id"]:x for x in old.get("items",[]) if x.get("id")}
    status={}
    previous=old.get("sources") or {}
    # GDACS official regional geometries and alert levels. Its API is free.
    gd={"last_attempt_at":timestamp(NOW)}
    if not recency(gd,previous.get("GDACS"),0.5):
        try:
            url="https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?"+urlencode({
                "fromdate":(NOW-timedelta(days=7)).date().isoformat(),
                "todate":NOW.date().isoformat()})
            events=gdacs_records(get_json(url))
            for e in events:before[e["id"]]=e
            gd.update({"ok":True,"state":"healthy","new_records":len(events)})
        except Exception as e:gd.update({"ok":False,"state":"failed","error":str(e)[:120]})
    status["GDACS"]=gd

    app=os.environ.get("RELIEFWEB_APPROVED_APPNAME","").strip()
    rw={"last_attempt_at":timestamp(NOW)}
    if not app:rw={"ok":None,"state":"requires-preapproved-appname"}
    elif not recency(rw,previous.get("ReliefWeb"),2):
        try:
            uri="https://api.reliefweb.int/v2/reports?"+urlencode({"appname":app,"limit":100,"preset":"latest"})
            records=reliefweb_records(get_json(uri))
            for e in records:before[e["id"]]=e
            rw.update({"ok":True,"state":"healthy","new_records":len(records)})
        except Exception as e:rw.update({"ok":False,"state":"failed","error":str(e).replace(app,"[REDACTED]")[:120]})
    status["ReliefWeb"]=rw

    client=os.environ.get("OPENSKY_CLIENT_ID","").strip()
    secret=os.environ.get("OPENSKY_CLIENT_SECRET","").strip()
    sky={"last_attempt_at":timestamp(NOW)}
    snap=old.get("aviation_snapshot")
    if not client or not secret:sky={"ok":None,"state":"requires-oauth-credentials"}
    elif not recency(sky,previous.get("OpenSky"),2):
        try:
            token_endpoint="https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token"
            blob=get_json(token_endpoint,{"Content-Type":"application/x-www-form-urlencoded"},
                urlencode({"grant_type":"client_credentials","client_id":client,"client_secret":secret}).encode())
            bearer=str(blob.get("access_token") or "")
            if not bearer:raise ValueError("No OAuth access token")
            uri="https://opensky-network.org/api/states/all?"+urlencode({
                "lamin":10,"lomin":32,"lamax":40,"lomax":66})
            snap=open_sky_snapshot(get_json(uri,{"Authorization":"Bearer "+bearer}))
            if snap is None:raise ValueError("No valid recent OpenSky snapshot")
            sky.update({"ok":True,"state":"healthy","observations":snap["civil_transponder_observations"]})
        except Exception as e:
            sky.update({"ok":False,"state":"failed","error":str(e).replace(secret,"[REDACTED]")[:120]})
    status["OpenSky"]=sky
    items=[x for x in before.values() if instant(x.get("published_at")) and
           NOW-timedelta(days=14)<=instant(x["published_at"])<=NOW+timedelta(minutes=10)]
    items.sort(key=lambda e:e["published_at"],reverse=True)
    output={"schema":1,"generated_at":timestamp(NOW),"items":items[:300],
      "sources":status,"aviation_snapshot":snap,
      "notice":"Independent public advisories. GDACS geolocation may describe a region. OpenSky is only a sampled civil-transponder count. No incidents are declared ongoing or independently verified."}
    OUT.write_text(json.dumps(output,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Supplemental:",len(output["items"]),"records",[(k,v.get("state")) for k,v in status.items()])
if __name__=="__main__":run()
