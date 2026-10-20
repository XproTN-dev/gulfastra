#!/usr/bin/env python3
"""Opt-in X API social-reporting feed. Never silently incur charges.
NO user posts are automatically treated as events or independent corroboration.
A paid X developer token and explicit billing approval are required.
One single capped search per 6 hours at most; never query on every news refresh.
"""
import json,os,re
from datetime import datetime,timezone,timedelta
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urlencode

DATA=Path(os.environ.get("GULFASTRA_DATA_DIR",str(Path(__file__).resolve().parents[1]/"data")))
FILE=DATA/"social.json"
NOW=datetime.now(timezone.utc)
QUERY='(Qatar OR Bahrain OR Kuwait OR "Saudi Arabia" OR "Strait of Hormuz" OR "Gulf of Oman") (advisory OR shipping OR airspace OR earthquake OR safety) -is:retweet lang:en'
def iso(t):return t.astimezone(timezone.utc).isoformat().replace("+00:00","Z")
def instant(value):
    try:
        x=datetime.fromisoformat(str(value).replace("Z","+00:00"))
        return x.astimezone(timezone.utc) if x.tzinfo else x.replace(tzinfo=timezone.utc)
    except (ValueError,TypeError):return None
def parse_posts(doc):
    usermap={str(u.get("id")):u for u in (doc.get("includes") or {}).get("users",[])}
    rows=[]
    for p in doc.get("data") or []:
        pid=str(p.get("id") or "")
        if not re.fullmatch(r"\d{8,23}",pid):continue
        date=instant(p.get("created_at"))
        if not date or date>NOW+timedelta(minutes=10) or date<NOW-timedelta(days=7):continue
        user=usermap.get(str(p.get("author_id")),{})
        handle=re.sub(r"[^A-Za-z0-9_]","",str(user.get("username") or ""))[:32]
        if not handle:continue
        title=" ".join(str(p.get("text") or "").split()).strip()[:270]
        if not title:continue
        rows.append({
            "id":"x:"+pid,"platform":"X","post_id":pid,
            "url":"https://x.com/"+handle+"/status/"+pid,"author":"@"+handle,
            "text":title,"published_at":iso(date),
            "kind":"unverified-public-social-post","verification":"unverified",
            "is_official_account":False,
            "notice":"Social media post; no independent event verification or location precision."})
    return rows
def load():
    try:return json.loads(FILE.read_text("utf-8"))
    except (OSError,ValueError):return {}
def main():
    DATA.mkdir(parents=True,exist_ok=True)
    old=load();existing={p["id"]:p for p in old.get("posts") or [] if p.get("id")}
    previous=old.get("source") or {}
    token=os.getenv("GULFASTRA_X_API_BEARER_TOKEN","").strip()
    enabled=os.getenv("GULFASTRA_X_API_ENABLED","").strip().lower()=="true"
    approval=os.getenv("GULFASTRA_X_BILLING_APPROVED","").strip().lower()=="true"
    last=instant(previous.get("last_attempt_at"))
    status={"state":"disabled-by-default","ok":None,"network_requests":0}
    if not enabled:status["state"]="disabled-by-default"
    elif not approval:status["state"]="billing-approval-required"
    elif not token:status["state"]="api-token-required"
    elif last and NOW-last<timedelta(hours=6):
        status=dict(previous);status["state"]="cooldown";status["network_requests"]=0
    else:
        # Persist attempt timestamp even on failure to prevent repeat paid calls.
        status={"state":"pending","last_attempt_at":iso(NOW),"ok":None,"network_requests":0}
        write(existing,status)
        try:
            url="https://api.x.com/2/tweets/search/recent?"+urlencode({
                "query":QUERY,"max_results":10,
                "tweet.fields":"created_at,author_id,lang",
                "expansions":"author_id",
                "user.fields":"username,name"})
            req=Request(url,headers={"Authorization":"Bearer "+token,
                 "User-Agent":"Gulfastra/11.2 independent social reporting"})
            status["network_requests"]=1
            with urlopen(req,timeout=18) as response:doc=json.loads(response.read(150000))
            rows=parse_posts(doc)
            for p in rows:existing[p["id"]]=p
            status.update({"ok":True,"state":"healthy","last_success_at":iso(NOW),
                "new_posts":len(rows),"max_results":10})
        except Exception as e:
            status.update({"ok":False,"state":"failed",
                "error":str(e).replace(token,"[REDACTED]")[:160]})
    write(existing,status)
    print("X social:",status.get("state"),"posts indexed",len(existing))
def write(records,status):
    cutoff=NOW-timedelta(days=7)
    values=[x for x in records.values() if instant(x.get("published_at")) and
            cutoff<=instant(x["published_at"])<=NOW+timedelta(minutes=10)]
    values.sort(key=lambda p:p["published_at"],reverse=True)
    out={"schema":1,"generated_at":iso(NOW),"posts":values[:100],"source":status,
         "notice":"X is separate unverified social reporting. No posts are used as confirmed incidents, alerts or independent corroboration. API requires explicit billing approval and may incur charges."}
    FILE.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
if __name__=="__main__":main()
