#!/usr/bin/env python3
"""GULFASTRA X: source-grounded reporting network, daily briefing and FRED context.

No inferred cause-and-effect, simulated market prices, probabilistic 'world risk',
unverified incident status, or external paid API. Python standard library only.
"""
from __future__ import annotations
import csv
import io
import json
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

DATA = Path(os.environ.get("GULFASTRA_DATA_DIR", str(Path(__file__).resolve().parents[1] / "data")))
NOW = datetime.now(timezone.utc)
SERIES = {
    "VIXCLS": ("CBOE VIX (daily close)", "index", "market-volatility"),
    "DCOILBRENTEU": ("Brent crude spot price", "USD/barrel", "energy"),
    "DCOILWTICO": ("WTI crude spot price", "USD/barrel", "energy"),
    "BAMLH0A0HYM2": ("US high-yield option-adjusted spread", "percentage points", "credit"),
    "T10Y2Y": ("US 10-year less 2-year Treasury yield", "percentage points", "rates"),
    "UNRATE": ("US unemployment rate", "percent", "employment")
}
COUNTRY_NAME = {
    "Iran":"Iran", "Saudi":"Saudi Arabia", "Qatar":"Qatar", "UAE":"United Arab Emirates",
    "Bahrain":"Bahrain", "Kuwait":"Kuwait", "Iraq":"Iraq", "Oman":"Oman",
    "Yemen":"Yemen", "Israel":"Israel"
}
WINDOW = timedelta(days=7)
def iso(dt):
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00","Z")
def when(x):
    try:
        d=datetime.fromisoformat(str(x).replace("Z","+00:00"))
        return d.astimezone(timezone.utc) if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except (TypeError, ValueError): return None
def read(name):
    try: return json.loads((DATA/name).read_text(encoding="utf-8"))
    except (OSError, ValueError): return {}
def write(name,obj):
    DATA.mkdir(parents=True,exist_ok=True)
    (DATA/name).write_text(json.dumps(obj,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
def clean_url(x):
    return x if isinstance(x,str) and x.startswith("https://") else ""
def identity(e):
    return str(e.get("id") or "")
def eligible(e, now=NOW):
    # Event correlation is based on headlines, not verified incidents.
    t=when(e.get("last_published"))
    return (identity(e).startswith("GF-") and t is not None and
            now-WINDOW <= t <= now+timedelta(minutes=10))
def graph(events,previous=None,now=NOW):
    prior={e.get("id"):e for e in (previous or {}).get("nodes",[]) if e.get("id")}
    selected=sorted((e for e in events if eligible(e,now)),key=lambda e:e["last_published"],reverse=True)
    # Bound chart density and group duplicates; retain stable published event IDs.
    nodes=[]
    for e in selected[:150]:
        sources=[{"publisher":str(s.get("source") or "")[:90],
                  "url":clean_url(s.get("url")),"title":str(s.get("title") or "")[:220],
                  "published_at":s.get("published_at")}
                 for s in e.get("sources",[])[:5] if clean_url(s.get("url"))]
        nodes.append({"id":identity(e),"title":str(e.get("title") or "")[:220],
          "category":e.get("category") or "other","topic":e.get("topic") or "unspecified",
          "countries":e.get("countries") or [],"published_at":e.get("last_published"),
          "first_published":e.get("first_published"),
          "digest":e.get("digest") or "", "publisher_count":int(e.get("publisher_count") or 0),
          "report_count":int(e.get("report_count") or 0),
          "coverage_stage":e.get("coverage_stage") or "unknown",
          "incident_status":"unknown","verification":"source-correlated-reporting",
          "sources":sources})
    # A relation is shared metadata only, NEVER a proven causal arrow.
    # To avoid a complete graph of a country's news, require SAME TOPIC, shared
    # country, multiple linked articles and close-in-time publication.
    edges=[]
    degree={}
    for i,node in enumerate(nodes):
        a=when(node["published_at"])
        if not a:continue
        for other in nodes[i+1:i+60]:
            b=when(other["published_at"])
            if not b or abs((a-b).total_seconds())>36*3600:continue
            if node["topic"]=="unspecified" or node["topic"]!=other["topic"]:continue
            countries=sorted(set(node["countries"]) & set(other["countries"]))
            if not countries:continue
            if node["report_count"]<2 and other["report_count"]<2:continue
            if degree.get(node["id"],0)>=4 or degree.get(other["id"],0)>=4:continue
            edges.append({"source":node["id"],"target":other["id"],
                "kind":"shared-topic-and-country","relation_verified":False,
                "label":"Related published coverage · NOT causation",
                "shared_topic":node["topic"],"shared_countries":countries[:3],
                "first_visible_at":iso(max(a,b))})
            degree[node["id"]]=degree.get(node["id"],0)+1
            degree[other["id"]]=degree.get(other["id"],0)+1
            if len(edges)>=200:break
        if len(edges)>=200:break
    past={k:v.get("digest") for k,v in prior.items()}
    additions=[n["id"] for n in nodes if n["id"] not in past]
    changes=[n["id"] for n in nodes if n["id"] in past and n["digest"]!=past[n["id"]]]
    return {"schema":1,"generated_at":iso(now),
        "window_days":7,"nodes":nodes,"edges":edges,
        "new_since_previous_collection":additions[:100],
        "changed_since_previous_collection":changes[:100],
        "relationship_notice":"Edges indicate metadata overlap, not evidence of cause, correlation strength, event occurrence or severity.",
        "temporal_notice":"Replay uses publisher publication timestamps, not occurrence times or exact historical system states."}
def csv_points(content,series_id):
    reader=csv.DictReader(io.StringIO(content.lstrip("\ufeff")))
    headers=reader.fieldnames or []
    if series_id not in headers or not ({"observation_date","DATE"} & set(headers)):
        raise ValueError("Unexpected FRED CSV headers")
    datefield="observation_date" if "observation_date" in headers else "DATE"
    points=[]
    for row in reader:
        try:
            day=datetime.strptime(str(row.get(datefield)),"%Y-%m-%d").date()
            v=float(row.get(series_id) or "nan")
            if not (-1e8<v<1e8): continue
        except (TypeError,ValueError):continue
        points.append([day.isoformat(),round(v,5)])
    return points
def fetch_one(series_id):
    url="https://fred.stlouisfed.org/graph/fredgraph.csv?"+urlencode({
        "id":series_id,"cosd":"2007-01-01"})
    req=Request(url,headers={"User-Agent":"GULFASTRA/12 public-data-research","Accept":"text/csv"})
    with urlopen(req,timeout=16) as response:
        csv_bytes=response.read(2_000_000).decode("utf-8-sig")
    points=csv_points(csv_bytes,series_id)
    if not points:raise ValueError("No numeric observations returned")
    return points
def market_data(previous=None,now=NOW,fetcher=fetch_one):
    previous=previous or {}
    old=previous.get("series") or {}
    last=when(previous.get("last_fetch_attempt"))
    # Rate-limit large historic CSV downloads and preserve the last provider data.
    if last and now-last<timedelta(hours=12):
        out=dict(previous)
        out["checked_at"]=iso(now)
        out["collection_state"]="cached"
        return out
    result={}
    status={}
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures={pool.submit(fetcher,id):id for id in SERIES}
        for future in as_completed(futures):
            id=futures[future]
            title,units,group=SERIES[id]
            try:
                points=future.result()
                # Retain daily market observations for past year, 2007-09 history
                # to compare actual value levels, not infer crisis probability.
                recent=[p for p in points if p[0]>= (now-timedelta(days=395)).date().isoformat()]
                history=[p for p in points if "2007-01-01"<=p[0]<"2010-01-01"]
                recent=recent[-400:]
                history=history[::max(1,len(history)//200)][:220]
                value=recent[-1] if recent else points[-1]
                if not (value[0]<=now.date().isoformat()):
                    raise ValueError("Future-dated observation")
                result[id]={"id":id,"name":title,"unit":units,"category":group,
                    "source":"FRED / underlying publisher",
                    "url":"https://fred.stlouisfed.org/series/"+id,
                    "last_observation":{"date":value[0],"value":value[1]},
                    "recent":recent,"historical_2007_2009":history,
                    "retrieved_at":iso(now),
                    "note":"Frequency and release delays vary; observations are not live market quotes."}
                status[id]="healthy"
            except Exception as exc:
                if id in old:
                    result[id]=old[id]
                    status[id]="stale-cached"
                else:
                    status[id]="unavailable"
    return {"schema":1,"generated_at":iso(now),"last_fetch_attempt":iso(now),
       "checked_at":iso(now),"collection_state":"completed-with-errors" if
        any(v!="healthy" for v in status.values()) else "healthy",
       "series":result,"source_status":status,
       "interpretation":"Not tick data. No crisis probability, global risk percentage, live prices or inferred causation.",
       "historical_comparison":"Raw 2007–2009 published FRED observations, not a normalized assertion that present conditions resemble 2008."}
def daily_brief(events,advisories,markets,previous=None,now=NOW):
    active=[e for e in events if eligible(e,now) and
            when(e.get("last_published"))>=now-timedelta(hours=24)]
    active.sort(key=lambda e:e["last_published"],reverse=True)
    topics={}
    for e in active:
        cat=e.get("category") or "other"
        topics[cat]=topics.get(cat,0)+1
    articles=[]
    for e in active[:24]:
        source=next((s for s in e.get("sources",[]) if clean_url(s.get("url"))),{})
        articles.append({"event_id":e.get("id"),"title":str(e.get("title") or "")[:220],
             "category":e.get("category"),"published_at":e.get("last_published"),
             "countries":e.get("countries") or [],
             "outlet_count":e.get("publisher_count") or 0,
             "report_count":e.get("report_count") or 0,
             "source":source.get("source") or "Unknown publisher",
             "source_url":clean_url(source.get("url")),
             "verification":"published-source-claims-only"})
    advice=[{"id":e.get("id"),"title":e.get("title"),
            "source":e.get("source"),"published_at":e.get("published_at"),
            "url":clean_url(e.get("url"))}
             for e in advisories if when(e.get("published_at")) and
             now-timedelta(hours=48)<=when(e["published_at"])<=now][:12]
    macro=[{"id":id,"name":s["name"],"date":s["last_observation"]["date"],
            "value":s["last_observation"]["value"],"unit":s["unit"],
            "url":s["url"]} for id,s in markets.get("series",{}).items()
            if s.get("last_observation")]
    macro.sort(key=lambda x:x["id"])
    return {"schema":1,"generated_at":iso(now),"period_hours":24,
        "source_window_start":iso(now-timedelta(hours=24)),
        "groups":len(active),"category_counts":topics,"developments":articles,
        "recent_official_advisories":advice,"economic_context":macro,
        "disclaimer":"Deterministic listing of published reports and provider observations. No autonomous forecasts, event verification or unsupported causal claims."}
def main():
    DATA.mkdir(parents=True,exist_ok=True)
    events=read("events.json").get("events") or []
    advisories=read("advisories.json").get("items") or []
    before=read("impact_graph.json")
    graph_out=graph(events,before)
    macro_out=market_data(read("markets.json"))
    brief_out=daily_brief(events,advisories,macro_out)
    write("impact_graph.json",graph_out)
    write("markets.json",macro_out)
    write("daily_brief.json",brief_out)
    print("Impact lab: %s reporting nodes, %s related-coverage edges, %s actual FRED series, %s recent briefing groups" % (
        len(graph_out["nodes"]),len(graph_out["edges"]),len(macro_out["series"]),brief_out["groups"]))
if __name__=="__main__":main()
