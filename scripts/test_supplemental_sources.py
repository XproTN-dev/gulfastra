#!/usr/bin/env python3
"""Offline accuracy/availability gates for optional official and social feeds."""
from datetime import timedelta
from supplemental_sources import NOW, gdacs_records, reliefweb_records, open_sky_snapshot, timestamp
from x_public_posts import parse_posts
t=timestamp(NOW-timedelta(minutes=25))
gd={"features":[
 {"id":"obs1","type":"Feature","geometry":{"type":"Point","coordinates":[51.5,25.3]},
 "properties":{"eventtype":"EQ","eventid":"1234","name":"Qatar test earthquake",
 "alertlevel":"orange","fromdate":t,"url":"https://www.gdacs.org/"}},
 {"id":"invalid","geometry":{"type":"Point","coordinates":[155,40]},
 "properties":{"eventtype":"EQ","eventid":"999","fromdate":t}},
 {"geometry":{"type":"Point","coordinates":[51,25]},
 "properties":{"eventtype":"EQ","eventid":"1","fromdate":"2018-01-01T00:00:00Z"}}
]}
items=gdacs_records(gd)
assert len(items)==1,items
assert items[0]["kind"]=="official-disaster-advisory"
assert items[0]["verification"]!="confirmed-incident"
assert items[0]["lat"]==25.3
rw=reliefweb_records({"data":[{"id":12,"fields":{
  "title":"Qatar humanitarian response update","date":{"created":t},
  "url":"https://reliefweb.int/report/test"}}]})
assert len(rw)==1 and rw[0]["kind"]=="humanitarian-publication",rw
assert reliefweb_records({"data":[{"id":13,"fields":{"title":"Football results in Europe","date":{"created":t}}}]})==[]
sky=open_sky_snapshot({"time":int(NOW.timestamp()),
 "states":[[None,None,None,None,None,51.6,25.1],[None,None,None,None,None,90,25],
           [None,None,None,None,None,None,30]]})
assert sky["civil_transponder_observations"]==1,sky
assert open_sky_snapshot({"time":int((NOW-timedelta(days=1)).timestamp()),"states":[]}) is None
x=parse_posts({"data":[{"id":"123456789012","created_at":t,"author_id":"42","text":"Qatar: news report"},
 {"id":"badurl","created_at":t,"author_id":"42","text":"fake"}],
 "includes":{"users":[{"id":"42","username":"TestReporter"}]}})
assert len(x)==1 and x[0]["url"]=="https://x.com/TestReporter/status/123456789012"
assert x[0]["verification"]=="unverified" and not x[0]["is_official_account"]
print("Supplemental gate PASS: GDACS time/geolocation, ReliefWeb title filters, OpenSky aggregation, X source provenance, no fabricated claims")
