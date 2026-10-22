#!/usr/bin/env python3
"""Real Chromium and mobile-touch smoke tests using isolated synthetic test fixtures.

Test-only mocked publications are NEVER deployed or saved as live GULFASTRA data.
"""
from pathlib import Path
import json,os,time
from urllib.parse import urlparse
from datetime import datetime,timedelta,timezone
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"visual-check"
OUT.mkdir(exist_ok=True)
BASE=os.getenv("LAB_BASE_URL","http://127.0.0.1:8765/lab/")
now=datetime.now(timezone.utc)
iso=lambda dt:dt.isoformat().replace("+00:00","Z")
hour=lambda h:iso(now-timedelta(hours=h))
files=("reports.json","events.json","observations.json","alerts.json","collector_health.json",
       "advisories.json","social.json","impact_graph.json","markets.json","daily_brief.json","direct_signals.json")
node1={"id":"GF-TEST1","title":"Illustrative Qatar airspace headline — CI FIXTURE ONLY",
 "category":"transport","topic":"airspace","published_at":hour(1),"first_published":hour(1),
 "report_count":3,"publisher_count":2,"countries":["Qatar"],"digest":"v1","coverage_stage":"recent-coverage",
 "sources":[{"title":"Mock source with original URL","publisher":"Test Publisher",
 "url":"https://example.com/fixture","published_at":hour(1)}]}
node2={**node1,"id":"GF-TEST2","title":"Second illustrative reporting group","published_at":hour(2),"digest":"v2"}
market_ids=["VIXCLS","DCOILBRENTEU","DCOILWTICO","BAMLH0A0HYM2","T10Y2Y","UNRATE"]
mock_series={id:{"id":id,"name":id+" CI mocked values (test only)","unit":"index",
 "last_observation":{"date":"2026-10-19","value":18.44},"recent":[["2026-10-17",20],["2026-10-19",18.44]],
 "historical_2007_2009":[["2008-10-14",38],["2008-10-15",40]],
 "retrieved_at":hour(1),"url":"https://fred.stlouisfed.org/series/"+id} for id in market_ids}
payloads={
 "reports.json":{"reports":[{"id":"report-recent","title":"Mock recent source report about Qatar","source":"QNA Test",
   "url":"https://example.com/report-recent","category":"transport","topic":"aviation",
   "published_at":hour(.2),"countries":["Qatar"]},
   {"id":"report-old","title":"Older archived headline","source":"Mock archive",
   "url":"https://example.com/report-old","category":"transport","topic":"aviation",
   "published_at":hour(3),"countries":["Qatar"]}],"providers":{}},
 "events.json":{"events":[]},
 "observations.json":{"observations":[]},
 "alerts.json":{"alerts":[]},
 "collector_health.json":{"quality_gate":"passed"},
 "advisories.json":{"items":[],"sources":{}},
 "social.json":{"posts":[]},
 "direct_signals.json":{"schema":1,"observations":[{"id":"emsc:fixture","source":"EMSC",
 "kind":"earthquake","title":"EMSC test observation","url":"https://www.emsc-csem.org/",
 "occurred_at":hour(.3),"published_at":hour(.3),"lat":25.3,"lon":51.5,
 "coordinates_quality":"provider-reported epicentre"}],
 "bulletins":[{"id":"noaa:fixture","source":"NOAA SWPC",
 "kind":"space-weather-bulletin","title":"NOAA global geomagnetic alert (TEST)",
 "url":"https://www.swpc.noaa.gov/","published_at":hour(.4),
 "geo_precision":"non-geographic-global-bulletin"}],
 "health":{"EMSC":{"state":"healthy","ok":True},"NOAA SWPC":{"state":"healthy","ok":True}}},
 "impact_graph.json":{"schema":1,"generated_at":hour(0),"nodes":[node1,node2],
  "edges":[{"source":"GF-TEST1","target":"GF-TEST2","kind":"shared-topic-and-country",
  "label":"Related metadata NOT causation","relation_verified":False,
  "first_visible_at":hour(1),"shared_countries":["Qatar"],"shared_topic":"airspace"}]},
 "markets.json":{"schema":1,"series":mock_series,"source_status":dict.fromkeys(market_ids,"healthy")},
 "daily_brief.json":{"schema":1,"groups":2,"generated_at":hour(0),
  "developments":[{"event_id":"GF-TEST1","title":node1["title"],"published_at":hour(1),
 "category":"transport","outlet_count":2}],"recent_official_advisories":[],"category_counts":{"transport":2}}
}
manifest={"schema":7,"channel":"github-intelligence-data","collected_at":hour(0),
 "files":{name:{"sha256":"test-fixture"} for name in files},
 "healthy_sources":31,"source_count":31,"quality_gate":"passed"}
def handle(route):
    url=urlparse(route.request.url)
    name=url.path.rsplit("/",1)[-1]
    payload=manifest if name=="live-manifest.json" else payloads.get(name)
    if payload is None:
        route.abort()
        return
    route.fulfill(status=200,headers={"Access-Control-Allow-Origin":"*","Content-Type":"application/json"},
                  body=json.dumps(payload))
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=["--disable-dev-shm-usage","--no-sandbox"])
    for width,height in [(1536,960),(390,844),(360,740),(768,1024)]:
        mobile=width<=430
        page=browser.new_page(viewport={"width":width,"height":height},
              is_mobile=mobile,has_touch=mobile)
        errors=[]
        page.on("pageerror",lambda e:errors.append(str(e)))
        page.route("**/intelligence-data/data/**",handle)
        page.route("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson",
          lambda route: route.fulfill(status=200,
            headers={"Access-Control-Allow-Origin":"*","Content-Type":"application/json"},
            body=json.dumps({"features":[{"id":"usgs-fixture","geometry":{"type":"Point",
                "coordinates":[51.1,25.1]},"properties":{"time":int((now-timedelta(minutes=10)).timestamp()*1000),
                "title":"USGS test seismic observation","url":"https://earthquake.usgs.gov/"}}]})))
        response=page.goto(BASE,wait_until="domcontentloaded",timeout=60000)
        assert response and response.status==200
        try:
            page.wait_for_function("window.GXImpactApp?.getState().loaded===true",timeout=20000)
        except Exception:
            report=page.evaluate("""()=>{
                return {labModule:!!window.GXImpactApp,mapModule:!!window.GXImpactMap,
                  core:!!window.GXCore,renderer:!!window.GXImpactRender,
                  mapEngine:!!window.GXMap,state:window.GXImpactApp?.getState()?.status,
                  warning:window.GXImpactApp?.getState()?.warning,
                  body:document.body.textContent?.slice(0,700)};
            }""")
            raise AssertionError(f"Impact Lab did not initialize at {width}px: {report}; page errors: {errors}")

        assert page.locator("#labTheme").input_value()=="crimson"
        assert page.evaluate("document.body.dataset.theme==='crimson'")
        page.locator("#labTheme").select_option("matrix")
        assert page.evaluate("document.body.dataset.theme==='matrix'")
        page.locator("#labTheme").select_option("arctic")
        assert page.evaluate("document.body.dataset.theme==='arctic'")
        page.locator("#labTheme").select_option("carbon")
        assert page.evaluate("document.body.dataset.theme==='carbon'")
        page.locator("#labTheme").select_option("crimson")
        assert page.evaluate("document.body.dataset.theme==='crimson'")
        assert page.locator("#mNodes").inner_text() in ("2","1")
        assert page.locator("#mSeries").inner_text()=="6",page.locator("#mSeries").inner_text()
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth+2"),(
            "Horizontal page overflow",width)
        # Real interactive map is part of the Lab. Require a MapLibre canvas,
        # not a screenshot or a button that sends people to the Command Center.
        if mobile:
            page.locator('[data-mobile-view="map"]').click()
        else:
            page.locator('[data-view="map"]').click()
        page.wait_for_function(
            "Boolean(window.GXImpactMap?.started && window.maplibregl?.Map && document.querySelector('#map canvas'))",
            timeout=40000)
        assert page.locator("#labMapHost").is_visible()
        assert page.locator("#map canvas").count()>=1
        assert "Latest published reports" in page.locator("#labMapCounts").inner_text()
        assert page.locator('[data-map-hours="1"]').get_attribute("class")=="active"
        assert page.locator("#labMapCounts").inner_text().find("Latest published reports: 1")!=-1,(
          "One-hour window included older news",page.locator("#labMapCounts").inner_text())
        assert page.locator('[data-latest-report]').count()==1
        assert "EMSC" in page.locator("#labDirectProviders").inner_text()
        assert "NOAA" in page.locator("#labDirectProviders").inner_text()
        assert "Not pinned" in page.locator("#labSpaceWeather").inner_text()
        page.locator('[data-map-hours="6"]').click()
        assert page.locator('[data-latest-report]').count()==2,"Six-hour selection should show older source story"
        page.locator('[data-map-hours="1"]').click()
        assert page.locator('[data-latest-report]').count()==1
        page.locator('[data-latest-report]').first.click()
        assert "country label is not an exact" in page.locator("#contextContent").inner_text()
        if page.locator("#contextClose").is_visible():
            page.locator("#contextClose").click()

        page.locator('[data-map-action="gulf"]').click()
        page.locator('[data-map-layer="coverage"]').uncheck()
        assert not page.locator('[data-map-layer="coverage"]').is_checked()
        page.locator('[data-map-layer="coverage"]').check()
        if mobile:
            dims=page.locator("#map").bounding_box()
            assert dims and dims["width"]>180 and dims["height"]>120,(width,dims)
            page.locator('[data-mobile-view="graph"]').click()
        else:
            page.locator('[data-view="graph"]').click()
        assert page.locator("#labMapHost").is_hidden()
        assert not errors,(width,"Map errors",errors)
        if mobile:
            assert page.locator(".lab-mobile-nav").is_visible()
            # Redesigned graph defaults to real topic clusters on small screens,
            # rather than microscopic labels or the old plain chronology view.
            assert page.locator(".cluster-card").count()==1,"Mobile topic grouping missing"
            assert page.locator(".network-svg").count()==0,"Old visual hairball was not removed"
            page.locator(".cluster-card").first.click()
            assert page.locator(".cluster-story").count()==2,"Topic drilldown missing real stories"
            page.locator(".cluster-story").first.click()
            assert page.locator("#impactApp").evaluate("el=>el.classList.contains('context-open')")
            sheet=page.locator("#labContext").bounding_box()
            assert sheet and sheet["y"]+sheet["height"]<=height+3,(
                "Bottom sheet extends outside mobile viewport",sheet,height)
            page.locator("#contextClose").click()
            page.locator("#labFiltersOpen").click()
            assert page.locator(".lab-controls").is_visible()
            page.locator("#countryLab").select_option("Qatar")
            assert page.evaluate("window.GXImpactApp.getState().country==='Qatar'")
            page.locator('[data-mobile-view="markets"]').click()
        else:
            assert page.locator(".cluster-card").count()==1,"Topic cards not rendered"
            assert page.locator(".network-svg").count()==0,"Old overlapping graph still in DOM"
            page.locator(".cluster-card").first.click()
            assert page.locator(".cluster-story").count()==2,"Topic drilldown should preserve every group"
            page.locator(".cluster-back").click()
            assert page.locator(".cluster-card").count()==1
            page.locator('[data-mode="spatial"]').click()
            assert page.locator(".relation-card").count()==1,"Actual metadata connection not available"
            page.locator(".relation-card").first.click()
            assert "NOT evidence" in page.locator("#contextContent").inner_text()
            # Tablet investigations use a modal side sheet; dismiss before
            # changing modes. Desktop detail panel remains docked.
            if page.locator("#contextClose").is_visible():
                page.locator("#contextClose").click()
            page.locator('[data-mode="network"]').click()
            page.locator(".cluster-card").first.click()
            page.locator(".cluster-story").first.click()
            assert page.locator("#contextContent .context-link").count()>0
            if page.locator("#contextClose").is_visible():
                page.locator("#contextClose").click()
            page.locator('[data-view="markets"]').click()
        assert page.locator('[data-market="VIXCLS"]').count()==1
        assert "18.44" in page.locator('[data-market="VIXCLS"]').inner_text()
        page.locator('[data-market="VIXCLS"]').first.click()
        assert page.locator("#contextContent").get_by_text("FRED SOURCE SERIES",exact=False).count()==1
        # Tablet width 768px also uses the overlay investigation panel.
        # Close it before attempting top navigation; avoid duplicate clicks.
        if page.locator("#contextClose").is_visible():
            page.locator("#contextClose").click()
        page.locator('[data-view="compare"]').click()
        assert "2008 REFERENCE" in page.locator("#stageContent").inner_text()
        page.locator('[data-view="pathways"]').click()
        assert "HYPOTHETICAL" in page.locator("#stageContent").inner_text()
        page.locator('[data-view="brief"]').click()
        assert "Latest 24-hour" in page.locator("#stageContent").inner_text()
        page.locator('[data-view="timeline"]').click()
        page.locator("#labReplay").evaluate("""e=>{
          e.value="10";e.dispatchEvent(new Event("input",{bubbles:true}))
        }""")
        assert page.locator("#mNodes").inner_text()=="0","Historical replay must filter future publications"
        page.locator("#labNow").click()
        assert page.locator("#mNodes").inner_text()=="2"
        if width>=390:
            page.locator("#labLang").click()
            assert page.evaluate("document.documentElement.dir==='rtl'"),(
               "Arabic workspace must switch document direction")
            assert "الموجز" in page.locator('[data-view="brief"]').inner_text()
            page.locator("#labLang").click()
            assert page.evaluate("document.documentElement.dir==='ltr'")
        assert not errors,(width,height,errors)
        page.screenshot(path=str(OUT/f"impact-lab-{width}.png"),full_page=True)
        page.close()
    browser.close()
print("Impact Lab desktop/mobile PASS: real DOM, source-linked graph, 3D style, cutoff replay, published FRED values, 2008 comparison, hypothetical pathways, dossier sheets, no overflow")
