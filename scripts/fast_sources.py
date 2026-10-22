#!/usr/bin/env python3
"""Small independent fast-public-signal collection, stdlib only.

No paid API and no inferred conflict events. This is a PUBLIC polling path,
not a guaranteed realtime service. AviationWeather forbids CORS so API is
queried by Python (Actions/server), not directly by the browser.
"""
from __future__ import annotations
import json, os, hashlib, re, xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from news_quality import when, assess, normalized_title
from arabic_sources import country_mentions

DATA=Path(os.environ.get("GULFASTRA_DATA_DIR",str(Path(__file__).resolve().parents[1]/"data")))
OUT=DATA/"fast_signals.json"
UA="GULFASTRA-Detection/1.0 (public research; https://github.com/XproTN-dev/gulfastra)"
AIRPORTS={"OTHH":"Qatar","OBBI":"Bahrain","OKKK":"Kuwait",
          "OMDB":"UAE","OMAA":"UAE","OERK":"Saudi","OOMS":"Oman"}
URLS={
 "USGS hourly":"https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson",
 "AviationWeather METAR":"https://aviationweather.gov/api/data/metar?"+urlencode(
     {"ids":",".join(AIRPORTS),"format":"json"}),
 "QNA Qatar direct":"https://qna.org.qa/en/Pages/RSS-Feeds/Qatar",
 "QNA General direct":"https://qna.org.qa/en/Pages/RSS-Feeds/General",
}
def iso(d):return d.astimezone(timezone.utc).isoformat().replace("+00:00","Z")
def safe_url(s):return isinstance(s,str) and s.startswith("https://")
def load():
 try:return json.loads(OUT.read_text("utf-8"))
 except (OSError,ValueError):return {}
def get(url):
 with urlopen(Request(url,headers={"User-Agent":UA,"Accept":"application/json, application/rss+xml, application/xml, text/xml"}),timeout=10) as r:
  if r.status==204:return b"[]"
  return r.read(1_600_000)
def usgs(doc,now):
 items=[]
 for f in doc.get("features",[])[:350]:
  p=f.get("properties") or {}; coords=(f.get("geometry") or {}).get("coordinates") or []
  if len(coords)<2:continue
  try:
   lon,lat=float(coords[0]),float(coords[1])
   t=datetime.fromtimestamp(float(p["time"])/1000,timezone.utc)
   mag=float(p["mag"]) if p.get("mag") is not None else None
  except (ValueError,TypeError,KeyError,OverflowError):continue
  if not(32<=lon<=66 and 10<=lat<=40) or t<now-timedelta(hours=2) or t>now+timedelta(minutes=5):continue
  id=str(f.get("id") or "").strip()
  if not id:continue
  items.append({"id":"usgs:"+id,"source":"USGS","kind":"earthquake","title":str(p.get("title") or "Earthquake observation")[:180],
   "published_at":iso(t),"occurred_at":iso(t),"source_updated_at":iso(datetime.fromtimestamp(
      float(p.get("updated") or p["time"])/1000,timezone.utc)),
   "url":p.get("url") if safe_url(p.get("url")) else "https://earthquake.usgs.gov/",
   "lat":lat,"lon":lon,"magnitude":mag,
   "location_quality":"preliminary provider epicentre","verification":"provider-observed-earthquake-not-damage"})
 return items
def metars(doc,now):
 if not isinstance(doc,list):raise ValueError("METAR API response is not a list")
 result=[]
 for item in doc:
  if not isinstance(item,dict):continue
  airport=str(item.get("icaoId") or "").upper()
  if airport not in AIRPORTS:continue
  t=when(item.get("reportTime") or item.get("obsTime"))
  if not t or t<now-timedelta(hours=2) or t>now+timedelta(minutes=10):continue
  speed=item.get("wgst")
  try:gust=float(speed or 0)
  except (ValueError,TypeError):gust=0
  visibility=item.get("visib")
  try:vis=float(visibility) # AviationWeather decoded METAR visibility in statute miles
  except (ValueError,TypeError):vis=None
  wx=str(item.get("wxString") or "").upper()
  high_gust=gust>=40
  low_vis=vis is not None and vis<=0.5
  weather=bool(re.search(r"(^|\s)(?:\+TS|TSRA|\+RA|SQ|FC)(?:\s|$)",wx))
  if not(high_gust or low_vis or weather):continue
  # METAR weather is NOT a NOTAM, an airport closure, or a security incident.
  markers=(["gust "+str(round(gust))+"kt"] if high_gust else [])+(
   ["visibility "+str(visibility)+" mi"] if low_vis else [])+(["reported "+wx[:30]] if weather else [])
  title="Significant aviation WEATHER observation at "+airport+": "+", ".join(markers)
  result.append({"id":"metar:"+airport+":"+t.strftime("%Y%m%d%H%M"),
    "source":"NOAA AviationWeather","kind":"aviation-weather","title":title[:210],
    "published_at":iso(t),"occurred_at":iso(t),"airport":airport,
    "countries":[AIRPORTS[airport]],"url":"https://aviationweather.gov/data/metar/?id="+airport,
    "verification":"observed-aviation-weather-not-airspace-closure",
    "location_quality":"named-airport-station","weather_flags":markers})
 return result
def rss(xml_bytes,now,label):
 root=ET.fromstring(xml_bytes)
 tag=root.tag.lower()
 if not(tag.endswith("rss") or tag.endswith("feed") or tag.endswith("rdf")):
  raise ValueError("Publisher URL is not RSS/Atom XML")
 items=[]
 entries=[x for x in root.iter() if x.tag.split("}")[-1] in ("item","entry")]
 for e in entries[:65]:
  field=lambda name:next((x for x in e.iter() if x.tag.split("}")[-1]==name),None)
  title=(field("title").text or "").strip() if field("title") is not None else ""
  pdate=field("pubDate") or field("published") or field("updated")
  if pdate is None:continue
  try:dt=parsedate_to_datetime((pdate.text or "").strip())
  except (ValueError,TypeError,OverflowError):dt=when(pdate.text)
  if not dt:continue
  dt=dt.astimezone(timezone.utc) if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
  if dt<now-timedelta(hours=7) or dt>now+timedelta(minutes=5) or not title:continue
  link=field("link")
  url=((link.get("href") or link.text or "") if link is not None else "").strip()
  if not safe_url(url):continue
  signature=hashlib.sha256((normalized_title(title)+"|"+label).encode()).hexdigest()[:20]
  items.append({"id":"qna:"+signature,"kind":"direct-publisher-report","source":label,
   "title":title[:270],"published_at":iso(dt),"url":url,
   "countries":country_mentions(title),"date_quality":"publisher-time",
   "verification":"direct-publisher-publication-not-event-confirmation"})
 return items
def collect(now=None,fetch=get,previous=None):
 now=now or datetime.now(timezone.utc)
 previous=previous if previous is not None else load()
 statuses={};combined={}
 for row in previous.get("records",[]):
  if row.get("id") and (when(row.get("published_at")) or now-timedelta(days=1))>=now-timedelta(hours=8):
   combined[row["id"]]=row
 with ThreadPoolExecutor(max_workers=4) as pool:
  futures={}
  for source,url in URLS.items():
   prev=(previous.get("sources") or {}).get(source) or {}
   last=when(prev.get("attempt_at"))
   cooldown=10 if source=="AviationWeather METAR" else 4
   if last and timedelta(0)<=now-last<timedelta(minutes=cooldown):
    statuses[source]={**prev,"state":"cooldown","checked_at":iso(now)}
    continue
   futures[pool.submit(fetch,url)]=source
  for future in as_completed(futures):
   source=futures[future];state={"attempt_at":iso(now),"state":"failed","ok":False}
   try:
    body=future.result()
    if source=="USGS hourly":records=usgs(json.loads(body),now)
    elif source=="AviationWeather METAR":records=metars(json.loads(body),now)
    else:records=rss(body,now,source)
    for row in records:combined[row["id"]]=row
    state.update({"ok":True,"state":"healthy","last_success_at":iso(now),"records":len(records)})
   except Exception as e:state["error"]=str(e)[:140]
   statuses[source]=state
 rows=[r for r in combined.values() if when(r.get("published_at")) and
       now-timedelta(hours=8)<=when(r["published_at"])<=now+timedelta(minutes=5)]
 rows.sort(key=lambda x:x.get("published_at",""),reverse=True)
 return {"schema":1,"generated_at":iso(now),"records":rows[:350],"sources":statuses,
  "notice":"Direct source observations and publisher posts; no inference of attacks, airport closure, verified damage or ongoing danger."}
def main():
 DATA.mkdir(parents=True,exist_ok=True)
 doc=collect()
 OUT.write_text(json.dumps(doc,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
 print("Fast sources:",len(doc["records"]),[(k,v.get("state")) for k,v in doc["sources"].items()])
if __name__=="__main__":main()
