#!/usr/bin/env python3
"""GULFASTRA early detector v1.

Detect PUBLIC SIGNALS, never claim verified incident occurrence from headlines.
New first signals do not wait for multiple newsrooms. Provider-authored
observations/warnings and unverified reporting have distinct verification states.
All records carry original sources and publication/first-detected timestamps.
"""
from __future__ import annotations
import json,os,hashlib,re
from datetime import datetime,timezone,timedelta
from pathlib import Path
from news_quality import assess, when, normalized_title
DATA=Path(os.environ.get("GULFASTRA_DATA_DIR",str(Path(__file__).resolve().parents[1]/"data")))
OUT=DATA/"early_signals.json"
STATE=DATA/"early_state.json"
def iso(d):return d.astimezone(timezone.utc).isoformat().replace("+00:00","Z")
def read(name):
 try:return json.loads((DATA/name).read_text("utf-8"))
 except (ValueError,OSError):return {}
def src(row):
 return [{"name":str(row.get("source") or "Public provider")[:90],
  "url":str(row.get("url"))[:800],"published_at":row.get("published_at")}
  ] if str(row.get("url") or "").startswith("https://") else []
def provider_row(row,origin,now):
 t=when(row.get("published_at") or row.get("occurred_at"))
 if not t or t<now-timedelta(hours=8) or t>now+timedelta(minutes=5):return None
 kind=str(row.get("kind") or "")
 level="P3"
 if kind=="earthquake":
  try:mag=float(row.get("magnitude"))
  except (TypeError,ValueError):return None
  if mag<3.5:return None
  level="P1" if mag>=5.5 else "P2" if mag>=4.5 else "P3"
 elif kind=="aviation-weather":
  level="P2"
 elif kind in ("official-disaster-advisory","natural-hazard"):
  alert=str(row.get("level") or "").lower()
  level="P1" if alert=="red" else "P2" if alert=="orange" else "P3"
 elif kind=="space-weather-bulletin":
  # SWPC is a global forecast/notice, NOT local geopolitical threat.
  title=str(row.get("title") or "")
  if not re.search(r"\b(?:G[45]|R[45]|S[45])\b",title,re.I):return None
  level="P2"
 elif kind=="connectivity-outage":
  level="P2"
 elif kind=="humanitarian-publication":
  return None
 else:return None
 is_observation=kind in ("earthquake","aviation-weather","natural-hazard","connectivity-outage")
 signal_id=str(row.get("id") or "")
 if not signal_id:return None
 lat,lon=row.get("lat"),row.get("lon")
 exact=kind=="earthquake" and lat is not None and lon is not None
 return {"id":signal_id,"kind":kind,
  "priority":level,"evidence_state":"provider-observation" if is_observation else "provider-published-advisory",
  "title":str(row.get("title") or "Provider signal")[:250],
  "first_published_at":iso(t),"last_published_at":iso(t),
  "countries":row.get("countries") or [],
  "coordinates":{"lat":lat,"lon":lon,"precision":row.get("coordinates_quality") or
     row.get("location_quality") or "provider"} if exact else None,
  "sources":src(row),"original_source":str(row.get("source") or origin)[:100],
  "event_status":"unknown","signal_status":"published",
  "evidence_note":("Provider-recorded earthquake, NOT a confirmed damage or security incident."
     if kind=="earthquake" else
     "Official weather observation; does not prove an airport closure." if kind=="aviation-weather"
     else "Official notice, not independent verification of impacts."),
  "provider_updated_at":row.get("source_updated_at")}
def news_rows(news,fast,now):
 results={}
 entries=list(fast)+list(news)
 for r in entries:
  title=str(r.get("title") or "")
  t=when(r.get("published_at"))
  if not title or not t or t>now+timedelta(minutes=3) or t<now-timedelta(minutes=110):continue
  quality=r.get("date_quality")
  if quality!="publisher-time":continue
  screened=assess(title,r.get("published_at"),now)
  if screened["context"]!="reporting":continue
  if screened["severity"] not in ("critical-candidate","elevated-reporting"):continue
  is_fast=r.get("kind")=="direct-publisher-report"
  # Pure publisher-time is not enough if historical headlines were backfilled.
  if not is_fast:
   ingested=when(r.get("first_seen_at"))
   if not ingested or ingested<now-timedelta(hours=2) or ingested>now+timedelta(minutes=5):continue
  countries=list(r.get("countries") or [])
  canonical=normalized_title(title)
  if len(canonical)<14:continue
  # One normalized story per country and headline; multiple RSS queries for
  # the same publisher are not new independent corroboration.
  signature=hashlib.sha256((canonical+"|"+",".join(sorted(countries))).encode()).hexdigest()[:20]
  id="report:"+signature
  publisher=str(r.get("source") or "")[:90]
  url=str(r.get("url") or "")
  if not url.startswith("https://"):continue
  priority="P1" if screened["critical_candidate"] else "P2"
  evidence={"name":publisher,"url":url,"published_at":iso(t)}
  prior=results.get(id)
  if not prior:
   results[id]={"id":id,"kind":"first-publisher-report","priority":priority,
    "evidence_state":"unverified-reporting","title":title[:250],
    "first_published_at":iso(t),"last_published_at":iso(t),
    "countries":countries,"coordinates":None,"sources":[evidence],
    "original_source":publisher,"event_status":"unknown","signal_status":"unverified-claim",
    "evidence_note":"Early publisher-reported claim. It may be incorrect, corrected, or syndicated; an urgent label is NOT official confirmation.",
    "provider_updated_at":None}
  else:
   if all(e["url"]!=url for e in prior["sources"]):prior["sources"].append(evidence)
   if prior["last_published_at"]<iso(t):prior["last_published_at"]=iso(t)
   if priority=="P1":prior["priority"]="P1"
 return list(results.values())
def evidence_hash(s):
 text="|".join([s["id"],s["priority"],s["evidence_state"],s["title"],
   s.get("last_published_at") or ""]+
   sorted(x["url"] for x in s.get("sources",[]) if x.get("url")))
 return hashlib.sha256(text.encode()).hexdigest()[:16]
def build(inputs,old=None,state=None,now=None,quality="passed"):
 now=now or datetime.now(timezone.utc)
 old=old or {};state=state or {}
 collected={}
 for origin,file_name,key in [
   ("fast","fast_signals.json","records"),("direct","direct_signals.json","observations"),
   ("NOAA","direct_signals.json","bulletins"),("environmental","observations.json","observations"),
   ("GDACS","advisories.json","items")
 ]:
  for row in (inputs.get(file_name) or {}).get(key,[]):
   item=provider_row(row,origin,now)
   if item:collected[item["id"]]=item
 for item in news_rows((inputs.get("reports.json") or {}).get("reports",[]),
             [r for r in (inputs.get("fast_signals.json") or {}).get("records",[])
                if r.get("kind")=="direct-publisher-report"],now):
  collected[item["id"]]=item
 # Provider-derived aliases remain distinct when IDs differ; do not invent
 # equivalence between EMSC/USGS without authoritative shared event IDs.
 previous={r.get("id"):r for r in old.get("signals",[]) if r.get("id")}
 seen=set(state.get("known_ids") or [])
 notified=set(state.get("notified_priority_ids") or [])
 initialized=state.get("initialized") is True
 current=[];new=[];updated=[];urgent=[]
 for obj in collected.values():
  obj["evidence_fingerprint"]=evidence_hash(obj)
  before=previous.get(obj["id"])
  obj["first_detected_at"]=before.get("first_detected_at") if before else iso(now)
  obj["last_checked_at"]=iso(now)
  if obj["id"] not in seen and initialized:
   new.append(obj["id"])
  elif before and before.get("evidence_fingerprint")!=obj["evidence_fingerprint"]:
   updated.append(obj["id"])
  # Re-alert only if priority rises to P1 for this identity, not every refresh.
  # First collector run establishes a safe baseline: no history spam.
  if (initialized and quality=="passed" and obj["priority"]=="P1"
      and obj["id"]+"|P1" not in notified
      and (obj["id"] not in seen or before and before.get("priority")!="P1")):
   urgent.append(obj["id"])
   notified.add(obj["id"]+"|P1")
  current.append(obj)
 current.sort(key=lambda s:(int(s["priority"][1]),-when(s["last_published_at"]).timestamp(),
                             s["id"]))
 seen.update(collected)
 doc={"schema":1,"generated_at":iso(now),"signals":current[:300],
   "new_ids":new[:100] if initialized else [],
   "updated_ids":updated[:100] if initialized else [],
   "new_urgent_ids":urgent[:30] if initialized else [],
   "source_status":{
    "fast":(inputs.get("fast_signals.json") or {}).get("sources") or {},
    "independent":(inputs.get("direct_signals.json") or {}).get("health") or {},
    "environmental":(inputs.get("observations.json") or {}).get("health") or [],
    "institutional":(inputs.get("advisories.json") or {}).get("sources") or {}
   },
   "quality_gate":quality,"initialized":initialized,
   "provider_count":sum(s["evidence_state"]!="unverified-reporting" for s in current),
   "unverified_report_count":sum(s["evidence_state"]=="unverified-reporting" for s in current),
   "urgent_count":sum(s["priority"]=="P1" for s in current),
   "notice":"EARLY SIGNALS are NOT confirmed attacks or emergencies. P1 indicates review urgency, not certainty. Only provider-reported geolocation is mapped. Stale collection must not be presented as live."}
 next_state={"schema":1,"initialized":True,"last_run_at":iso(now),
   "known_ids":list(sorted(seen))[-6000:],
   "notified_priority_ids":list(sorted(notified))[-6000:]}
 return doc,next_state
def main():
 DATA.mkdir(parents=True,exist_ok=True)
 inputs={key:read(key) for key in ["fast_signals.json","direct_signals.json",
   "observations.json","advisories.json","reports.json"]}
 out,state=build(inputs,read("early_signals.json"),read("early_state.json"),
                 quality=os.getenv("QUALITY_GATE","passed"))
 OUT.write_text(json.dumps(out,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
 STATE.write_text(json.dumps(state,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
 print("Early signals:",len(out["signals"]),"urgent:",out["urgent_count"],
   "new:",len(out["new_ids"]),"notify:",len(out["new_urgent_ids"]),
   "quality:",out["quality_gate"])
if __name__=="__main__":main()
