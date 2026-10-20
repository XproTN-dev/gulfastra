#!/usr/bin/env python3
"""Regression checks: bilingual fusion must never manufacture confirmation or geography."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from fusion import build
def report(i,title,country="Iran",when="2026-10-20T06:00:00Z",source="Outlet A",category="security",lang="en"):
 return {"id":"R"+str(i),"title":title,"country":country,"countries":[country],"published_at":when,
         "url":"https://example.org/story/"+str(i),"source":source,"category":category,"language":lang,"provider":"test"}
tests=[
 report(1,"Iran reports drone interception near Tehran",source="Outlet A"),
 report(2,"Iran reports drone interception near Tehran",source="Outlet B"),
 report(3,"Iran reports missile strikes in different city",source="Outlet C"),
 report(4,"Iran reports drone interception near Tehran",when="2026-10-18T06:00:00Z",source="Outlet A"),
 report(5,"Qatar official airline adds flights to Doha",country="Qatar",category="transport",source="Outlet D")
]
result=build(tests)
groups=result["events"]
assert len(groups)==4,(len(groups),[(e["title"],e["report_count"]) for e in groups])
matching=[e for e in groups if e["report_count"]==2]
assert len(matching)==1,matching
candidate=matching[0]
assert candidate["publisher_count"]==2
assert candidate["corroboration"]=="multi-publisher-unverified"
assert candidate["claim_status"]=="not-independently-verified"
assert candidate["location_quality"]=="country-mention"
assert candidate["confidence"] is None
assert candidate["event_occurred_at"] is None
assert len(candidate["sources"])==2
assert result["country_stats"]["Qatar"]["reports"]==1
second=build(tests,result)
assert len(second["revisions"])==0,"Unchanged source set should not create a revision"
test_more=tests+[report(6,"Iran reports drone interception near Tehran",source="Outlet E")]
third=build(test_more,result)
assert len(third["revisions"])>=1,"New linked evidence should create a source revision"
print("Fusion: clustering, separation, no-false-confirmation, reproducibility and revision tests passed")
