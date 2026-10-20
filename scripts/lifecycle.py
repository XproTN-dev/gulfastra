#!/usr/bin/env python3
"""Publication-evidence lifecycle for candidate reporting clusters.

These stages describe NEWS COVERAGE ACTIVITY, not whether a reported incident
actually occurred, is ongoing, or has been resolved. Inactivity never equals
resolution. Only original publisher timestamps drive recency stages; an index
first-seen timestamp cannot establish the article's publication time.
"""
from datetime import datetime, timezone, timedelta
from news_quality import when

TWO_HOURS = timedelta(hours=2)
ONE_DAY = timedelta(days=1)
ONE_WEEK = timedelta(days=7)
MAX_FUTURE = timedelta(minutes=10)

def stage_event(event, now=None):
    now = now or datetime.now(timezone.utc)
    records = event.get("sources") or []
    observed = []
    for r in records:
        # Legacy records and GDELT first-indexed timestamps are not
        # authoritative publication times and do not imply current activity.
        if r.get("date_quality") != "publisher-time":
            continue
        instant = when(r.get("published_at"))
        if instant and instant <= now + MAX_FUTURE:
            observed.append((instant, r))
    observed.sort(key=lambda x:x[0])
    if not observed:
        return {
            "coverage_stage": "publication-time-unknown",
            "coverage_last_published_at": None,
            "coverage_first_published_at": None,
            "current_reporting": False,
            "recent_publisher_count": 0,
            "recent_article_count": 0,
            "incident_status": "unknown",
            "event_occurrence_verified": False,
            "lifecycle_note": "Original publication time unavailable. No event status inferred.",
        }
    earliest = observed[0][0]
    latest = observed[-1][0]
    eligible_recent=[r for instant,r in observed if now-TWO_HOURS <= instant <= now]
    distinct={str(r.get("publisher_key") or r.get("source") or "").casefold().strip()
              for r in eligible_recent if str(r.get("publisher_key") or r.get("source") or "").strip()}
    current = bool(eligible_recent)
    if current:
        if latest-earliest >= timedelta(minutes=10) and len(distinct)>=2:
            stage="developing-coverage"
        elif earliest >= now-TWO_HOURS:
            stage="new-coverage"
        else:
            stage="renewed-coverage"
    elif latest >= now-ONE_DAY:
        stage="recent-coverage"
    elif latest >= now-ONE_WEEK:
        stage="quiet-coverage"
    else:
        stage="archived-coverage"
    return {
        "coverage_stage":stage,
        "coverage_first_published_at":earliest.isoformat().replace("+00:00","Z"),
        "coverage_last_published_at":latest.isoformat().replace("+00:00","Z"),
        "current_reporting":current,
        "recent_publisher_count":len(distinct),
        "recent_article_count":len(eligible_recent),
        "incident_status":"unknown",
        "event_occurrence_verified":False,
        "lifecycle_note":"Stage describes article-publication activity only. Incident existence, current operational status and resolution remain unverified.",
    }
