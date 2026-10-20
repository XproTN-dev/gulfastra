#!/usr/bin/env python3
"""Optional Telegram digest of PUBLIC REPORTING. Disabled without GitHub Secrets.
No military telemetry, no confirmed-attack language, no user credentials in git.
"""
import datetime as dt
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlencode

ROOT=Path(__file__).resolve().parents[1]
DATA=Path(os.environ.get("GULFASTRA_DATA_DIR", str(ROOT / "data")))
STATE=DATA/"telegram_state.json"
URL="https://api.telegram.org/bot"

def when(s):
    try:return dt.datetime.fromisoformat(s.replace("Z","+00:00"))
    except (ValueError,AttributeError):return dt.datetime.fromtimestamp(0,dt.timezone.utc)

def run():
    token=os.getenv("TELEGRAM_BOT_TOKEN","").strip()
    chat=os.getenv("TELEGRAM_CHAT_ID","").strip()
    if not token or not chat:
        print("Telegram alerts disabled; TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID not configured")
        return
    data=json.loads((DATA/"events.json").read_text(encoding="utf-8"))
    try:last=json.loads(STATE.read_text(encoding="utf-8"))
    except (OSError,ValueError):last={"notified_at":"1970-01-01T00:00:00Z"}
    now=dt.datetime.now(dt.timezone.utc)
    recent=[e for e in data["events"] if e["category"]=="security" and when(e["last_published"])>when(last["notified_at"])]
    recent.sort(key=lambda x:x["last_published"],reverse=True)
    if not recent:
        print("Telegram: no new security news coverage")
        return
    # Limit to one digest per hour (unless the first run). An alert is about reporting, NOT a confirmed attack.
    if now-when(last["notified_at"])<dt.timedelta(minutes=55):
        print("Telegram: hourly digest throttled")
        return
    lines=["GULFASTRA • PUBLIC SECURITY REPORTING","UNVERIFIED HEADLINES — not real-time attack warnings",""]
    for e in recent[:5]:
        lines.append("• "+e["title"][:155])
        lines.append("  "+str(e["report_count"])+" linked headlines; "+e["corroboration"])
        if e["sources"]:
            lines.append("  "+e["sources"][0]["url"])
        lines.append("")
    lines.append("Full feed: https://xprotn-dev.github.io/gulfastra/")
    message="\n".join(lines)[:3900]
    body=urlencode({"chat_id":chat,"text":message,"disable_web_page_preview":"true"}).encode()
    with urlopen(Request(URL+token+"/sendMessage",data=body,headers={"Content-Type":"application/x-www-form-urlencoded"}),timeout=20) as resp:
        answer=json.loads(resp.read())
    if not answer.get("ok"):
        raise RuntimeError("Telegram rejected message (status not OK)")
    STATE.write_text(json.dumps({"notified_at":now.isoformat().replace("+00:00","Z"),
                                 "sent_groups":min(len(recent),5)},indent=2)+"\n",encoding="utf-8")
    print("Telegram: sent public-source digest",min(len(recent),5),"coverage groups")
if __name__=="__main__":run()
