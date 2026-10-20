#!/usr/bin/env python3
"""Visual and functional smoke test for the published Gulfastra static dashboard."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"visual-check"
OUT.mkdir(exist_ok=True)
BASE=os.getenv("BASE_URL","http://127.0.0.1:8765/")

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=["--disable-dev-shm-usage"])
    for label,width,height in [("desktop",1600,960),("mobile",390,844)]:
        page=browser.new_page(viewport={"width":width,"height":height},device_scale_factor=1)
        errors=[]
        page.on("pageerror",lambda e: errors.append(str(e)))
        response=page.goto(BASE,wait_until="domcontentloaded",timeout=60000)
        assert response and response.status==200,f"{label} HTML unavailable"
        page.wait_for_selector(".shell")
        page.wait_for_function("document.querySelector('#mTotal').textContent !== '—'",timeout=25000)
        page.wait_for_timeout(7000)
        assert page.locator(".maplibregl-canvas").count()==1, "MapLibre canvas missing"
        assert page.locator("#languageTabs [data-lang=ar]").count()==1, "Arabic news filter missing"
        page.locator("#languageTabs [data-lang=ar]").click()
        arabic_count=page.locator(".report h3[lang=ar]").count()
        assert arabic_count>0, f"{label}: Arabic reports not visible after selecting Arabic"
        assert page.locator(".report h3[lang=ar]").first.get_attribute("dir")=="auto", "Arabic title lacks bidi handling"
        page.locator("#languageTabs [data-lang=all]").click()
        page.wait_for_timeout(650)
        total=page.locator("#mTotal").inner_text()
        count=page.locator(".report").count()
        assert page.locator(".country-pin").count()>0, "No map reference markers" 
        marker_offsets=page.evaluate("""() => {const map=window.__gulfastraMap;const points=window.__gulfastraGeography;if(!map)return [];return [...document.querySelectorAll(".country-pin")].map(node=>{const id=node.dataset.country;const target=map.project(points[id].center);const box=node.getBoundingClientRect(), canvas=map.getContainer().getBoundingClientRect();const centerX=box.left+box.width/2-canvas.left, centerY=box.top+box.height/2-canvas.top;return {id,offset:Math.hypot(centerX-target.x,centerY-target.y),centerX,centerY,targetX:target.x,targetY:target.y}})}""")
        assert all(pt["offset"]<14 for pt in marker_offsets),f"Country marker misplaced on {label}: {marker_offsets}"
        mapcanvas=page.locator(".maplibregl-canvas").count()
        if label=="mobile":
            assert page.locator(".mobile-nav").is_visible(),"Mobile navigation missing"
            page.locator('[data-mobile="filters"]').click()
            assert page.locator("#controlpanel").evaluate("(node)=>node.classList.contains('open')"),"Filters drawer failed"
            page.locator("#closeLayers").click()
        assert count > 0,f"{label} report cards not rendered despite {total} archived reports"
        assert "COVERAGE GROUPS" in page.locator("#feedSummary").inner_text(),"Coverage grouping missing"
        # v6 regression checks: genuine highlights, dynamic status, themes and map sizing
        page.wait_for_selector("#v6Briefs .intel-card",timeout=20000)
        assert page.locator("#v6Briefs .intel-card").count()==3,"Source-linked news highlight rail did not populate"
        assert page.locator("#headerUpdated").inner_text().startswith("COLLECTED"),"Collector time not distinct from headline date"
        assert page.locator("#sourcebox .provider-list").is_hidden(),"Provider diagnostics should start condensed"
        assert page.locator("#v6Theme").count()==1
        page.locator("#v6Theme").click()
        assert page.evaluate("document.body.dataset.gfTheme")=="obsidian","Theme selector failed to switch"
        old_map_height=page.locator("#mapStage").bounding_box()["height"]
        page.locator("#v6ExpandMap").click()
        page.wait_for_timeout(400)
        expanded_height=page.locator("#mapStage").bounding_box()["height"]
        assert expanded_height>old_map_height+35,f"{label}: map expansion failed {old_map_height=} {expanded_height=}"
        page.locator("#v6ExpandMap").click()
        page.wait_for_timeout(400)
        restored_height=page.locator("#mapStage").bounding_box()["height"]
        assert abs(restored_height-old_map_height)<30,f"{label}: compact mode not restored"
        if label=="desktop":
            assert old_map_height < 0.47*height,f"Desktop map consumes too much height: {old_map_height}"
        print(label,"compact_map_px",round(old_map_height),"expanded_px",round(expanded_height),"highlights",page.locator("#v6Briefs .intel-card").count())
        # NEXUS v7 checks — site is useful immediately, even if raw CDN is delayed
        assert page.evaluate("!!window.GulfastraData"),"Missing isolated GitHub data loader"
        status=page.evaluate("window.GulfastraData.info()")
        print(label,"data channel",status["channel"],"manifest",bool(status.get("manifest")),"error",status.get("error"))
        page.locator('[data-gf-open="wire"]').click()
        assert page.locator("#fusionWorkbench").is_visible(),"NEXUS Wire failed to open"
        assert page.locator("#fusionView .gf-wire-item").count()>0,"Original Arabic/English wire is empty"
        page.locator('[data-gf-page="verify"]').click()
        assert page.locator("#fusionView .gf-event").count()>0,"Verification dossier selection empty"
        page.locator('[data-gf-page="hormuz"]').click()
        assert "UKMTO" in page.locator("#fusionView").inner_text(),"Maritime source context missing"
        page.locator("#gfClose").click()
        page.wait_for_selector("#fusionHealth",state="attached")
        assert page.locator('[data-gf-open="fusion"]').count() >= 1
        page.locator('[data-gf-open="fusion"]').first.click()
        assert page.locator("#fusionWorkbench").is_visible(),"v5 workbench hidden"
        page.wait_for_function("document.querySelector('#fusionHealth').textContent.includes('COVERAGE GROUPS')",timeout=30000)
        assert page.locator("#fusionView .gf-event").count()>0,"Fusion event dossiers missing"
        page.locator("#fusionView .gf-event").first.click()
        assert "SOURCE LINKS" in page.locator("#fusionView").inner_text(),"Evidence dossier missing source links"
        page.locator('[data-gf-page="query"]').click()
        page.locator("#gfQueryInput").fill("type:security after:7d")
        page.locator("#gfQueryForm button").click()
        assert "MATCHED" in page.locator("#fusionView").inner_text(),"Query executor not working"
        page.locator('[data-gf-page="sources"]').click()
        assert page.locator("#fusionView .gf-signal").count()>0,"Provider health unavailable"
        page.locator('[data-gf-page="countries"]').click()
        assert page.locator("#fusionView .gf-country").count()>0,"Country desk unavailable"
        page.screenshot(path=str(OUT/f"{label}-fusion.png"),full_page=True)
        page.locator("#gfClose").click()
        assert page.locator("#fusionWorkbench").is_hidden(),"Workbench failed to close"
        page.screenshot(path=str(OUT/f"{label}.png"),full_page=True)
        print(label,"reported_count=",total,"visible_articles=",count,"arabic_visible=",arabic_count,"mapcanvas=",mapcanvas,"marker_offsets=",marker_offsets,"pageerrors=",errors[:5])
        assert mapcanvas==1,"MapLibre canvas missing"
        assert page.locator("#mapLoad").evaluate("(node)=>node.classList.contains(\'off\')"),"Map tiles failed to load"
        assert page.locator(".country-pin").count()>0,"No country reporting markers rendered"
        assert not errors,"JavaScript errors: "+" ; ".join(errors)
        page.close()
    browser.close()
