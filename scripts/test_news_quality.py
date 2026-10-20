#!/usr/bin/env python3
"""Offline-only news and alert regression tests. No HTTP or secrets required."""
from datetime import datetime, timezone, timedelta
from news_quality import assess, freshness, canonical_url, normalized_title
from alerts import build
from collect import record, classify

now=datetime.now(timezone.utc)
def iso(time):return time.isoformat().replace("+00:00","Z")
recent=iso(now-timedelta(minutes=15))
old=iso(now-timedelta(days=16))
assert freshness(recent,now)=="new-reporting"
assert freshness(old,now)=="archive"
assert freshness(iso(now+timedelta(days=2)),now)=="future-or-invalid"
assert assess("Riyadh airport closed and flights suspended",recent,now)["critical_candidate"]
assert not assess("Could Riyadh airport close if tensions escalate?",recent,now)["critical_candidate"]
assert not assess("Riyadh airport closed last week",recent,now)["critical_candidate"]
assert not assess("Saudi Arabia denies reports that Riyadh airport closed",recent,now)["critical_candidate"]
assert not assess("Riyadh airport closed and flights suspended",old,now)["critical_candidate"]
assert not assess("Riyadh airport closed and flights suspended",iso(now+timedelta(minutes=2)),now)["critical_candidate"]
assert assess("إغلاق المجال الجوي في السعودية بعد هجوم",recent,now)["critical_candidate"]
assert not assess("احتمال إغلاق المجال الجوي في السعودية",recent,now)["critical_candidate"]
assert canonical_url("https://www.example.com/a?utm_source=x&oc=5")=="https://example.com/a"
assert normalized_title("Iran reports interception - Example News")==normalized_title("Iran reports interception")
assert classify("Saudi Arabia airports closed after attacks")=="security"
assert classify("Qatar airspace closed indefinitely")=="transport"
assert classify("Qatar wins football competition") is None
article=record("Qatar airspace closed","https://publisher.example/news",recent,"Outlet A","unit test")
assert article and article["date_quality"]=="publisher-time"
assert not record("Qatar airspace closed","http://publisher.example/news",recent,"Outlet A","unit test")
assert not record("Qatar airspace closed","https://publisher.example/news",iso(now+timedelta(days=2)),"Outlet A","unit test")

def example(i,title="Riyadh airport closed and flights suspended",source=None,quality="publisher-time"):
    return {"id":i,"title":title,"source":source or i,"url":"https://example.org/"+i,
            "published_at":recent,"date_quality":quality,"category":"transport"}
def cluster(i,ids):
    return {"id":i,"category":"transport","topic":"aviation","countries":["Saudi"],
            "title":"Riyadh airport closed","sources":[{"id":rid} for rid in ids]}
a=example("A",source="Outlet A")
b=example("B",source="Outlet B")
c=example("C",source="Outlet C")
old_claim=example("LEGACY",quality="legacy-unverified")
single,single_state=build([a],[cluster("GF-1",["A"])],now=now)
assert single["critical_count"]==0 and single["alerts"][0]["level"]=="review"
upgraded,_=build([a,b],[cluster("GF-1",["A","B"])],single_state,now)
assert upgraded["new_alert_ids"]==["GF-1"],"Escalation from review must notify"
from fusion import publisher
assert publisher({"source":"France 24 · Middle East"})==publisher({"source":"France 24 · الشرق الأوسط"})
assert publisher({"source":"Al Jazeera RSS"})==publisher({"source":"الجزيرة نت · RSS عربي"})
initial,state=build([a,b],[cluster("GF-1",["A","B"])],now=now)
assert initial["critical_count"]==1
assert initial["new_alert_ids"]==[],"Initial historical backfill must not notify"
repeat,state2=build([a,b],[cluster("GF-1",["A","B"])],state,now)
assert repeat["new_alert_ids"]==[],"Repeated identical stories must not re-alert"
with_new,_=build([a,b,c],[cluster("GF-1",["A","B"]),cluster("GF-2",["B","C"])],state2,now)
assert with_new["new_alert_ids"]==["GF-2"],with_new
legacy,_=build([old_claim],[cluster("GF-OLD",["LEGACY"])],now=now)
assert legacy["alerts"]==[],"Old migrated records cannot create new critical notifications"
stale,_=build([dict(a,published_at=old),dict(b,published_at=old)],
              [cluster("GF-OLD",["A","B"])],now=now)
assert stale["alerts"]==[],"Archived publications must not be alert candidates"
print("News-quality gates passed: freshness, speculation, denial, Arabic, URL dedup, "
      "future dates, archival suppression, alert clustering and bootstrap safety.")
