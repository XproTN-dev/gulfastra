#!/usr/bin/env python3
"""Offline provider-truthfulness and coordinate/time validation."""
from datetime import datetime,timezone,timedelta
from direct_signals import emsc_records,noaa_records
n=datetime(2026,10,22,9,0,tzinfo=timezone.utc)
doc={"features":[{"id":"regional1","geometry":{"type":"Point","coordinates":[51.5,25.3]},
 "properties":{"unid":"20261022_abc","time":"2026-10-22T08:40:00Z",
 "flynn_region":"Qatar","mag":3.1}},
 {"id":"outside","geometry":{"type":"Point","coordinates":[15,20]},
 "properties":{"unid":"out","time":"2026-10-22T08:40:00Z"}},
 {"id":"future","geometry":{"type":"Point","coordinates":[51,25]},
 "properties":{"unid":"future","time":"2026-10-24T08:40:00Z"}}]}
rows=emsc_records(doc,n)
assert len(rows)==1 and rows[0]["source"]=="EMSC",rows
assert rows[0]["lon"]==51.5 and rows[0]["lat"]==25.3
assert "conflict" in rows[0]["classification"]
messages=[{"product_id":"K05A","issue_datetime":"2026-10-22 08:10:00.000",
 "message":"Space Weather Message Code: ALTK05\nALERT: Geomagnetic K-index of 5 \nAffected primarily high latitude"},
 {"product_id":"old","issue_datetime":"2026-10-05 05:10:00",
 "message":"WARNING: Historical alert"}]
alerts=noaa_records(messages,n)
assert len(alerts)==1,alerts
assert "Geomagnetic" in alerts[0]["title"]
assert alerts[0]["geo_precision"]=="non-geographic-global-bulletin"
assert "lat" not in alerts[0] and "lon" not in alerts[0]
print("Independent direct signals PASS: EMSC geography/time, NOAA no synthetic coordinates or conflict events")
