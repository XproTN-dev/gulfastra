#!/usr/bin/env python3
"""Offline regression gates for publication-linked graphs and genuine macro data."""
import sys
from pathlib import Path
from datetime import datetime,timezone,timedelta
sys.path.insert(0,str(Path(__file__).resolve().parent))
from impact_lab import graph, market_data, csv_points, daily_brief, iso
now=datetime(2026,10,20,18,0,tzinfo=timezone.utc)
def event(id,hours,category="security",topic="airspace",country="Qatar",count=2,digest="v1"):
    time=iso(now-timedelta(hours=hours))
    return {"id":"GF-"+id,"title":"Publication "+id,"last_published":time,"first_published":time,
      "category":category,"topic":topic,"countries":[country],"report_count":count,
      "publisher_count":count,"coverage_stage":"recent-coverage","digest":digest,
      "sources":[{"title":"Source for "+id,"source":"Outlet "+id,
                  "url":"https://example.org/"+id,"published_at":time}]}
events=[event("1",1),event("2",2),event("3",3,topic="shipping"),
  event("4",4,country="Iran"),event("5",200),
  event("6",2,count=1)]
g=graph(events,now=now)
assert len(g["nodes"])==5,g
assert len(g["edges"])==3,g["edges"]
edge=next(e for e in g["edges"] if {e["source"],e["target"]}=={"GF-1","GF-2"})
assert edge["kind"]=="multi-report-topical-overlap"
assert edge["relation_verified"] is False
assert "NOT same event or causation" in edge["label"]
assert all(e["relation_verified"] is False for e in g["edges"])
assert sum(e["kind"]=="topical-proximity-only" for e in g["edges"])==2
assert all(n["incident_status"]=="unknown" for n in g["nodes"])
assert all("https://" in n["sources"][0]["url"] for n in g["nodes"])
g2=graph(events,g,now=now)
assert not g2["new_since_previous_collection"] and not g2["changed_since_previous_collection"]
new=[event("1",1,digest="v2"),*events[1:]]
g3=graph(new,g,now=now)
assert g3["changed_since_previous_collection"]==["GF-1"],g3
csv_fixture="observation_date,VIXCLS\n2008-09-15,31.7\n2008-09-16,.\n2026-10-19,24.3\n"
assert csv_points(csv_fixture,"VIXCLS")==[["2008-09-15",31.7],["2026-10-19",24.3]]
try:
    csv_points("not CSV<html></html>","VIXCLS")
    raise AssertionError("Malformed macro response must not be accepted")
except ValueError:pass
calls=[]
def stub(id):
    calls.append(id)
    return [["2008-09-15",31.7],["2026-10-19",24.3]]
m=market_data({},now,stub)
assert len(m["series"])==6,m
assert len(calls)==6,calls
assert m["series"]["VIXCLS"]["last_observation"]["value"]==24.3
assert m["series"]["VIXCLS"]["historical_2007_2009"]
calls.clear()
cached=market_data(m,now+timedelta(minutes=10),stub)
assert not calls and cached["collection_state"]=="cached"
def broken(id): raise RuntimeError("Provider temporarily inaccessible")
fallback=market_data(m,now+timedelta(hours=14),broken)
assert len(fallback["series"])==6
assert all(x=="stale-cached" for x in fallback["source_status"].values())
brief=daily_brief(events,[{"id":"g","title":"Official advisory","source":"GDACS","published_at":iso(now),"url":"https://example.org"}],m,now=now)
assert brief["groups"]==5,brief
assert len(brief["recent_official_advisories"])==1
assert len(brief["economic_context"])==6
assert "No autonomous forecasts" in brief["disclaimer"],brief["disclaimer"]
print("Impact lab PASS: evidence-only relations, stable revisions, temporal bounds, actual-value macro data, provider fallback, 2008 comparison and cited brief")
