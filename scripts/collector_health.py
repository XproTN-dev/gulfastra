#!/usr/bin/env python3
"""Self-describing collection health, written independently of the alert output."""
from datetime import datetime,timezone
from pathlib import Path
import os,json
DATA=Path(os.environ.get("GULFASTRA_DATA_DIR",str(Path(__file__).resolve().parents[1]/"data")))
def read(name):
    try:return json.loads((DATA/name).read_text("utf-8"))
    except (OSError,ValueError):return {}
def make(report,alerts,quality,now=None):
    now=now or datetime.now(timezone.utc)
    feeds=report.get("providers") or {}
    good=sum(item.get("ok") is True for item in feeds.values())
    failed=sum(item.get("ok") is False for item in feeds.values())
    skipped=sum(item.get("ok") is not True and item.get("ok") is not False for item in feeds.values())
    last=report.get("last_successful_run")
    try:age=(now-datetime.fromisoformat(str(last).replace("Z","+00:00"))).total_seconds()/60
    except (ValueError,TypeError):age=None
    fresh=(good>0 and age is not None and 0<=age<=30)
    return {
      "schema":1,"checked_at":now.isoformat().replace("+00:00","Z"),
      "last_attempt_at":report.get("last_run"),
      "last_success_at":last,
      "last_success_age_minutes":round(age,1) if age is not None else None,
      "source_total":len(feeds),"source_success":good,"source_failed":failed,"source_backoff":skipped,
      "quality_gate":quality,
      "alerts_available":quality=="passed" and alerts.get("delivery_status")!="quality-check-failed",
      "collection_state":"healthy" if fresh else "no-recent-success",
      "operational_warning":"No live incident detection; best-effort scheduled public collection."
    }
def main():
    DATA.mkdir(parents=True,exist_ok=True)
    result=make(read("reports.json"),read("alerts.json"),os.environ.get("QUALITY_GATE","unknown"))
    (DATA/"collector_health.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Collector health:",result["collection_state"],result["source_success"],"/",result["source_total"],
          "quality:",result["quality_gate"])
if __name__=="__main__":main()
