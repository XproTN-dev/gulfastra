#!/usr/bin/env python3
"""Offline regression gates for source-based coverage lifecycle.

Never infer an active/ongoing/resolved incident from news article activity.
"""
from datetime import datetime, timezone, timedelta
from lifecycle import stage_event

NOW=datetime(2026,10,20,12,0,tzinfo=timezone.utc)
def iso(minutes):
    return (NOW-timedelta(minutes=minutes)).isoformat().replace("+00:00","Z")
def entry(mins,source="Outlet A",quality="publisher-time"):
    return {"published_at":iso(mins),"date_quality":quality,"source":source,"publisher_key":source}
def stage(*sources):
    return stage_event({"sources":list(sources)},NOW)
def assert_unknown(result):
    assert result["incident_status"]=="unknown",result
    assert result["event_occurrence_verified"] is False,result

first=stage(entry(20))
assert first["coverage_stage"]=="new-coverage" and first["current_reporting"]
assert_unknown(first)
developing=stage(entry(90,"Outlet A"),entry(60,"Outlet B"))
assert developing["coverage_stage"]=="developing-coverage",developing
assert developing["recent_publisher_count"]==2,developing
assert_unknown(developing)
renewed=stage(entry(250,"Outlet A"),entry(20,"Outlet B"))
assert renewed["coverage_stage"]=="renewed-coverage",renewed
assert_unknown(renewed)
recent=stage(entry(480))
assert recent["coverage_stage"]=="recent-coverage" and not recent["current_reporting"],recent
assert_unknown(recent)
quiet=stage(entry(3000))
assert quiet["coverage_stage"]=="quiet-coverage",quiet
assert_unknown(quiet)
archived=stage(entry(16000))
assert archived["coverage_stage"]=="archived-coverage" and not archived["current_reporting"],archived
assert_unknown(archived)
indexed=stage(entry(10,quality="index-first-seen"))
assert indexed["coverage_stage"]=="publication-time-unknown" and not indexed["current_reporting"],indexed
assert_unknown(indexed)
missing=stage({"published_at":None,"date_quality":"publisher-time"})
assert missing["coverage_stage"]=="publication-time-unknown",missing
assert_unknown(missing)
future={"published_at":(NOW+timedelta(days=1)).isoformat(),"date_quality":"publisher-time","source":"Outlet A"}
assert stage(future)["coverage_stage"]=="publication-time-unknown"
print("Lifecycle gates: new, developing, renewed, recent, quiet, archived, GDELT/legacy, invalid/future and no-inferred-resolution passed")
