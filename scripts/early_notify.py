#!/usr/bin/env python3
"""Optional Telegram notices for NEW P1 signals; never imply official emergency.

Requires opt-in repository variable DETECTOR_TELEGRAM_ENABLED=true plus the
existing TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID secrets. No paid calls by
default. Persist delivery watermark only AFTER Telegram acknowledges success.
"""
import json,os
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request,urlopen
DATA=Path(os.environ.get("GULFASTRA_DATA_DIR",str(Path(__file__).resolve().parents[1]/"data")))
OUT=DATA/"early_telegram_state.json"
def read(path):
 try:return json.loads(path.read_text("utf-8"))
 except (ValueError,OSError):return {}
def main():
 if os.environ.get("DETECTOR_TELEGRAM_ENABLED","").lower()!="true":
  print("Early Telegram disabled by owner; no network request");return
 token=os.environ.get("TELEGRAM_BOT_TOKEN","").strip()
 chat=os.environ.get("TELEGRAM_CHAT_ID","").strip()
 if not token or not chat:
  print("Early Telegram disabled: token/chat secret missing");return
 signals=read(DATA/"early_signals.json")
 if signals.get("quality_gate")!="passed":return
 state=read(OUT);sent=set(state.get("sent_ids") or [])
 fresh=set(signals.get("new_urgent_ids") or [])
 pending=[s for s in signals.get("signals",[]) if s.get("id") in fresh
  and s.get("id") not in sent and s.get("priority")=="P1"][:4]
 if not pending:return
 for s in pending:
  status="PROVIDER-REPORTED OBSERVATION/ADVISORY" if s["evidence_state"]!="unverified-reporting" else "UNVERIFIED FIRST PUBLISHER CLAIM"
  lines=["GULFASTRA · EARLY PUBLIC SIGNAL (P1)",
   "REQUIRES REVIEW — not confirmation or emergency guidance.",
   status,str(s["title"])[:200],"Published: "+str(s["first_published_at"]),
   "First detected: "+str(s["first_detected_at"])]
  for evidence in s.get("sources",[])[:2]:
   if str(evidence.get("url","")).startswith("https://"):lines.append(str(evidence["url"]))
  lines.append("Verify with official local authorities. Do not infer an active incident.")
  body=urlencode({"chat_id":chat,"text":"\n".join(lines)[:3800],"disable_web_page_preview":"true"}).encode()
  with urlopen(Request("https://api.telegram.org/bot"+token+"/sendMessage",data=body,
        headers={"Content-Type":"application/x-www-form-urlencoded"}),timeout=12) as r:
   result=json.loads(r.read(100000))
  if not result.get("ok"):raise RuntimeError("Telegram rejected notice")
  sent.add(s["id"])
  OUT.write_text(json.dumps({"schema":1,"sent_ids":list(sorted(sent))[-1800:]}),encoding="utf-8")
  print("Delivered source-labelled first signal",s["id"][:30])
if __name__=="__main__":main()
