#!/usr/bin/env python3
"""Synthetic fixtures ONLY — protect false-positive boundaries and first-signal speed."""
from datetime import datetime, timezone, timedelta
import json
from fast_sources import usgs,metars,rss,collect,URLS
from early_detector import build
N=datetime(2026,10,22,12,0,tzinfo=timezone.utc)
def iso(m=0):return (N-timedelta(minutes=m)).isoformat().replace("+00:00","Z")
def report(id,title="Airport closed and flights suspended in Qatar",mins=8,quality="publisher-time"):
 return {"id":id,"source":"Fast Outlet","title":title,"published_at":iso(mins),
  "first_seen_at":iso(mins-1),"date_quality":quality,
  "url":"https://example.org/"+id,"countries":["Qatar"]}
quake={"id":"usgs:test","source":"USGS","kind":"earthquake",
  "title":"M 5.9 earthquake Gulf test","published_at":iso(10),"occurred_at":iso(10),
  "url":"https://earthquake.usgs.gov/","lat":25.2,"lon":51.3,"magnitude":5.9}
inputs={"fast_signals.json":{"records":[quake],"sources":{"USGS hourly":{"ok":True}}},
 "direct_signals.json":{"observations":[],"bulletins":[]},
 "observations.json":{"observations":[]},"advisories.json":{"items":[]},
 "reports.json":{"reports":[report("new")]}}
first,state=build(inputs,now=N)
assert first["urgent_count"]==2,first
assert first["new_urgent_ids"]==[],"Never notify historic bootstrap"
assert all(item["event_status"]=="unknown" for item in first["signals"])
assert all(item["coordinates"] is None for item in first["signals"] if item["kind"]=="first-publisher-report")
assert next(item for item in first["signals"] if item["kind"]=="earthquake")["coordinates"]["lat"]==25.2
same,state2=build(inputs,first,state,now=N+timedelta(minutes=1))
assert not same["new_ids"] and not same["new_urgent_ids"],same
new_reports={"reports":[report("new"),report("followup",
 "Qatar airport closed and flights grounded",mins=3)]}
new={**inputs,"reports.json":new_reports}
next_run,state3=build(new,same,state2,now=N+timedelta(minutes=2))
assert len(next_run["new_ids"])==1,next_run
assert len(next_run["new_urgent_ids"])==1,next_run
new_id=next_run["new_urgent_ids"][0]
assert next(x for x in next_run["signals"] if x["id"]==new_id)["evidence_state"]=="unverified-reporting"
again,state4=build(new,next_run,state3,now=N+timedelta(minutes=3))
assert not again["new_urgent_ids"] and not again["new_ids"]
fail,_=build(new,same,state2,now=N+timedelta(minutes=2),quality="failed")
assert not fail["new_urgent_ids"],"Fail CLOSED on broken quality tests"
bad={**inputs,"reports.json":{"reports":[report("old","Airport closed and flights grounded",mins=320),
    report("history","Airport closed last week",mins=10),
    report("denial","Qatar denies reports that airport closed",mins=8),
    report("spec","Could Qatar airport close?",mins=8),
    report("index","Airport closed and flights suspended in Qatar",mins=8,quality="index-first-seen")]}}
doc,_=build(bad,now=N)
assert all(x["kind"]!="first-publisher-report" for x in doc["signals"]),doc["signals"]
noaa={"id":"noaa:abc","kind":"space-weather-bulletin","source":"NOAA SWPC",
 "published_at":iso(10),"title":"G4 Geomagnetic Storm","url":"https://www.swpc.noaa.gov/"}
with_noaa={**inputs,"direct_signals.json":{"observations":[],"bulletins":[noaa]}}
out,_=build(with_noaa,now=N)
assert next(x for x in out["signals"] if x["kind"]=="space-weather-bulletin")["coordinates"] is None
usgs_doc={"features":[{"id":"real","geometry":{"coordinates":[51.5,25.1]},
    "properties":{"time":int((N-timedelta(minutes=7)).timestamp()*1000),"mag":5.5,"url":"https://earthquake.usgs.gov/"}},
   {"id":"far","geometry":{"coordinates":[-70,50]},
    "properties":{"time":int((N-timedelta(minutes=7)).timestamp()*1000),"mag":9}}]}
q=usgs(usgs_doc,N)
assert len(q)==1 and q[0]["id"]=="usgs:real"
airport=[{"icaoId":"OTHH","reportTime":iso(11),"wgst":46,"visib":1.5},
         {"icaoId":"OMDB","reportTime":iso(11),"wgst":5,"visib":10},
         {"icaoId":"KJFK","reportTime":iso(11),"wgst":100}]
w=metars(airport,N)
assert len(w)==1 and w[0]["countries"]==["Qatar"]
assert w[0]["verification"]=="observed-aviation-weather-not-airspace-closure"
feed=('<rss><channel><item><title>Airport closed and flights suspended in Qatar</title>'+
 '<link>https://qna.org.qa/a</link><pubDate>Thu, 22 Oct 2026 11:40:00 GMT</pubDate></item></channel></rss>').encode()
pub=rss(feed,N,"QNA Qatar direct")
assert len(pub)==1 and pub[0]["date_quality"]=="publisher-time"
assert "Qatar" in pub[0]["countries"]
def fixture(url):
 if "earthquake.usgs" in url:return json.dumps(usgs_doc).encode()
 if "aviationweather" in url:return json.dumps(airport).encode()
 return feed
batch=collect(N,fixture,{})
assert batch["sources"]["USGS hourly"]["ok"] is True
assert len(batch["sources"])==4
print("EARLY DETECTOR PASS: provider-first, one-publisher trigger, no backfill, no false confirmation, no future/historic/speculative claims, severity, quality closed, USGS/METAR/RSS")
