#!/usr/bin/env python3
"""Fail CLOSED for alerts while continuing safe public-news collection.

The normal alert watermark must remain untouched, avoiding false first-run
notifications when a later revision repairs the quality gate.
"""
from datetime import datetime,timezone
from pathlib import Path
import json,os
DATA=Path(os.environ.get("GULFASTRA_DATA_DIR",str(Path(__file__).resolve().parents[1]/"data")))
DATA.mkdir(parents=True,exist_ok=True)
out={"schema":1,"generated_at":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),
     "alerts":[],"new_alert_ids":[],"critical_count":0,
     "delivery_status":"quality-check-failed",
     "notice":"Alert generation disabled: quality tests failed. Do not interpret an empty alert list as an all-clear."}
(DATA/"alerts.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("Critical alerts suppressed: quality check failed, news collection continues.")
