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
       "advisories.json","social.json","impact_graph.json","markets.json","daily_brief.json")
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
 "reports.json":{"reports":[],"providers":{}},
 "events.json":{"events":[]},
 "observations.json":{"observations":[]},
 "alerts.json":{"alerts":[]},
 "collector_health.json":{"quality_gate":"passed"},
 "advisories.json":{"items":[],"sources":{}},
 "social.json":{"posts":[]},
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
        response=page.goto(BASE,wait_until="domcontentloaded",timeout=60000)
        assert response and response.status==200
        page.wait_for_function("window.GXImpactApp?.getState().loaded===true",timeout=60000)
        assert page.locator("#mNodes").inner_text() in ("2","1")
        assert page.locator("#mSeries").inner_text()=="6",page.locator("#mSeries").inner_text()
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth+2"),(
            "Horizontal page overflow",width)
        if mobile:
            assert page.locator(".lab-mobile-nav").is_visible()
            assert page.locator(".chronology-item").count()==2,"Readable mobile list not default"
            page.locator(".chronology-item").first.click()
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
            assert page.locator(".network-svg").is_visible()
            assert page.locator(".graph-node").count()==2
            page.locator('[data-mode="spatial"]').click()
            assert page.locator(".network-svg.spatial").count()==1
            page.locator('[data-mode="network"]').click()
            page.locator(".graph-node circle:not(.hit-zone)").first.click()
            assert page.locator("#contextContent .context-link").count()>0
            page.locator("#contextClose").click() if page.locator("#contextClose").is_visible() else page.locator("#labExplain").click()
            page.locator('[data-view="markets"]').click()
        assert page.locator('[data-market="VIXCLS"]').count()==1
        assert "18.44" in page.locator('[data-market="VIXCLS"]').inner_text()
        page.locator('[data-market="VIXCLS"]').first.click()
        assert page.locator("#contextContent").get_by_text("FRED SOURCE SERIES",exact=False).count()==1
        page.locator("#contextClose").click() if mobile else page.locator('[data-view="compare"]').click()
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
        assert not errors,(width,height,errors)
        page.screenshot(path=str(OUT/f"impact-lab-{width}.png"),full_page=True)
        page.close()
    browser.close()
print("Impact Lab desktop/mobile PASS: real DOM, source-linked graph, 3D style, cutoff replay, published FRED values, 2008 comparison, hypothetical pathways, dossier sheets, no overflow")
