#!/usr/bin/env python3
"""Gulfastra published-report alert candidates. NOT a verified emergency warning.
Only new, timestamped, non-speculative reports are eligible for notification.
"""
import json
import os
from pathlib import Path
from datetime import datetime, timezone, timedelta
from news_quality import when, assess
from fusion import publisher

ROOT=Path(__file__).resolve().parents[1]
DATA=Path(os.environ.get("GULFASTRA_DATA_DIR",str(ROOT/"data")))
OUT=DATA/"alerts.json"
STATE=DATA/"alert_state.json"

def build(reports, events, previous=None, now=None):
    now=now or datetime.now(timezone.utc)
    previous=previous or {}
    known=set(previous.get("known_ids") or [])
    initialized=previous.get("initialized") is True
    current={r["id"]:r for r in reports if r.get("id")}
    entries=[]
    for e in events:
        refs=[current.get(x.get("id")) for x in (e.get("sources") or [])]
        refs=[r for r in refs if r]
        flagged=[r for r in refs if r.get("date_quality")=="publisher-time"
                 and assess(r.get("title"),r.get("published_at"),now)["alert_eligible"]]
        if not flagged:
            continue
        # Candidate event clusters cannot be treated as independently verified.
        # A named-publisher count is only a basic noise-reduction gate.
        outlets={publisher(r) for r in refs if str(r.get("source") or "").strip()}
        recent=[r for r in refs if when(r.get("published_at"))
                and now-timedelta(hours=2)<=when(r["published_at"])<=now+timedelta(minutes=10)]
        if not recent:
            continue
        latest=max(recent,key=lambda r:r.get("published_at",""))
        high=len(outlets)>=2 and len(recent)>=2
        entry={
            "id":e["id"],"level":"critical-reporting" if high else "review",
            "title":latest.get("title") or e.get("title",""),
            "published_at":latest.get("published_at"),
            "countries":e.get("countries") or [],
            "category":e.get("category"),
            "topic":e.get("topic"),
            "outlet_count":len(outlets),
            "article_count":len(refs),
            "source_urls":[{"name":r.get("source"),"url":r.get("url")}
                           for r in recent[:5] if str(r.get("url","")).startswith("https://")],
            "context":"New public reporting; original event time/ongoing status not established.",
            "verification":"unverified-reporting",
        }
        entries.append(entry)
    entries.sort(key=lambda a:a["published_at"],reverse=True)
    high=[x for x in entries if x["level"]=="critical-reporting"]
    new=[x["id"] for x in high if initialized and x["id"] not in known]
    # Keep a rolling suppression set; avoid re-alerting older groups if their
    # candidate activity drops out and another headline appears later.
    # Save only HIGH-priority identities: a single-source review item may
    # legitimately escalate later when a second distinct publisher appears.
    seen=list(dict.fromkeys(list(previous.get("known_ids") or [])+
                            [x["id"] for x in high]))
    seen=seen[-4000:]
    ts=now.isoformat().replace("+00:00","Z")
    result={"schema":1,"generated_at":ts,
            "alerts":entries[:120],"new_alert_ids":new[:30],
            "critical_count":len(high),
            "notice":"CRITICAL REPORTING means multiple named outlets published related headlines. This is NOT confirmation, real-time detection or official emergency advice."}
    state={"schema":1,"initialized":True,"last_generated_at":ts,"known_ids":seen}
    return result,state

def main():
    DATA.mkdir(parents=True,exist_ok=True)
    def read(p,fallback):
        try:return json.loads(p.read_text("utf-8"))
        except (OSError,ValueError):return fallback
    reports=read(DATA/"reports.json",{}).get("reports") or []
    events=read(DATA/"events.json",{}).get("events") or []
    prior=read(STATE,{})
    out,state=build(reports,events,prior)
    OUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    STATE.write_text(json.dumps(state,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Alert candidates:",len(out["alerts"]),"multi-outlet:",out["critical_count"],
          "new notifications:",len(out["new_alert_ids"]))

if __name__=="__main__":
    main()
