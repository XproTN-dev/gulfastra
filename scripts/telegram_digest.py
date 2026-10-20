#!/usr/bin/env python3
"""Optional Telegram CRITICAL PUBLIC REPORTING notices, not emergency warnings.

Only reports passing news-quality, freshness and multi-outlet screening appear.
Disabled unless both TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are configured.
"""
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlencode
import json
import os

ROOT=Path(__file__).resolve().parents[1]
DATA=Path(os.environ.get("GULFASTRA_DATA_DIR",str(ROOT/"data")))
STATE=DATA/"telegram_state.json"

def main():
    token=os.getenv("TELEGRAM_BOT_TOKEN","").strip()
    chat=os.getenv("TELEGRAM_CHAT_ID","").strip()
    if not token or not chat:
        print("Telegram critical notices disabled (two optional secrets not configured)")
        return
    try:
        alerts=json.loads((DATA/"alerts.json").read_text("utf-8"))
    except (OSError, ValueError):
        print("No generated alert feed; skipping Telegram")
        return
    try:
        prior=json.loads(STATE.read_text("utf-8"))
    except (OSError, ValueError):
        prior={}
    sent=set(prior.get("sent_alert_ids") or [])
    newly=set(alerts.get("new_alert_ids") or [])
    batch=[a for a in (alerts.get("alerts") or [])
           if a.get("id") in newly and a.get("id") not in sent
           and a.get("level")=="critical-reporting"][:3]
    if not batch:
        print("Telegram: no new qualifying critical reporting")
        return
    lines=["GULFASTRA · CRITICAL PUBLIC REPORTING",
           "UNVERIFIED NEWS COVERAGE — NOT a confirmed emergency or official safety alert",""]
    for item in batch:
        lines.append("• "+str(item.get("title") or "Reporting update")[:175])
        lines.append("  "+str(item.get("outlet_count") or 0)+" named publishers (editorial independence not established)")
        urls=item.get("source_urls") or []
        for src in urls[:2]:
            if str(src.get("url","")).startswith("https://"):
                lines.append("  "+src["url"])
        lines.append("")
    lines.append("Official local emergency guidance takes precedence.")
    body=urlencode({"chat_id":chat,"text":"\n".join(lines)[:3900],
                    "disable_web_page_preview":"true"}).encode()
    with urlopen(Request("https://api.telegram.org/bot"+token+"/sendMessage",
                         data=body,headers={"Content-Type":"application/x-www-form-urlencoded"}),
                 timeout=20) as response:
        answer=json.loads(response.read())
    if not answer.get("ok"):
        raise RuntimeError("Telegram rejected message")
    sent.update(a["id"] for a in batch)
    STATE.write_text(json.dumps({"schema":2,"sent_alert_ids":list(sent)[-1000:],
                                 "last_sent_at":datetime.now(timezone.utc).isoformat()},indent=2)+"\n",
                     encoding="utf-8")
    print("Telegram: sent",len(batch),"new critical reporting notice(s)")

if __name__=="__main__":
    main()
