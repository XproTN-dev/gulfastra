#!/usr/bin/env python3
"""Gulfastra Command View 09 — real Chromium regression at desktop and mobile sizes."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"visual-check"
OUT.mkdir(exist_ok=True)
BASE=os.getenv("BASE_URL","http://127.0.0.1:8765/")

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=["--disable-dev-shm-usage"])
    for name,width,height in [("desktop",1600,960),("mobile",390,844)]:
        page=browser.new_page(viewport={"width":width,"height":height},device_scale_factor=1)
        errors=[]
        page.on("pageerror",lambda e: errors.append(str(e)))
        response=page.goto(BASE,wait_until="domcontentloaded",timeout=60000)
        assert response and response.status==200,f"{name}: webpage unavailable"
        page.wait_for_function("document.querySelector('#mTotal').textContent !== '—'",timeout=35000)
        page.wait_for_selector("#v9TickerItems a",timeout=25000)
        page.wait_for_selector(".country-pin",timeout=30000)
        page.wait_for_function("document.querySelector('#mapLoad').classList.contains('off')",timeout=30000)
        assert page.locator(".maplibregl-canvas").count()==1
        assert page.locator("#mapStage").bounding_box()["height"]>=height-3,"Main map does not fill command view"
        assert page.locator("#feedpanel").is_hidden(),"Legacy newsroom must not obscure world map"
        assert page.locator(".v9-primary-nav").is_visible(),"MAP/WIRE/GLOBE navigation missing"
        assert page.locator("#v9TickerItems a").count()>=5,"Ticker lacks real linked headlines"
        assert page.locator("#languageTabs [data-lang=ar]").count()==1,"Arabic control missing"
        # Legacy data pipeline still populates both languages, but map-first layout is intentional.
        page.locator("#languageTabs [data-lang=ar]").evaluate("(node)=>node.click()")
        assert page.locator(".report h3[lang=ar]").count()>0,"Arabic source parsing failed"
        page.locator("#languageTabs [data-lang=all]").evaluate("(node)=>node.click()")
        # Markers MUST sit at registered country-reference coordinates, not arbitrary incident points.
        coordinates=page.evaluate("""() => {
          const map=window.__gulfastraMap,positions=window.__gulfastraGeography;
          return [...document.querySelectorAll('.country-pin')].map(node=>{
            const expected=map.project(positions[node.dataset.country].center);
            const a=node.getBoundingClientRect(),b=map.getContainer().getBoundingClientRect();
            return {country:node.dataset.country,error:Math.hypot(a.left+a.width/2-b.left-expected.x,a.top+a.height/2-b.top-expected.y)};
          });
        }""")
        assert coordinates and all(p["error"]<15 for p in coordinates),f"Reference markers mispositioned: {coordinates}"
        # Regression: MapLibre owns the marker element's CSS transform.
        # The former :hover transform sent circles to the wrong coordinates,
        # repeatedly triggering pointer enter/leave and a flickering tooltip.
        if name=="desktop":
            hover=page.evaluate("""() => {
              const p=[...document.querySelectorAll('.country-pin')].map(el=>{
                const r=el.getBoundingClientRect();
                return {el,country:el.dataset.country,x:r.left+r.width/2,y:r.top+r.height/2};
              }).find(p=>p.x>125&&p.x<innerWidth-140&&p.y>120&&p.y<innerHeight-105&&p.el.contains(document.elementFromPoint(p.x,p.y)));
              return p?{country:p.country,x:p.x,y:p.y}:null;
            }""")
            assert hover,"No unobstructed marker for pointer-hover regression"
            for _ in range(3):
                page.mouse.move(120,120)
                page.mouse.move(hover["x"],hover["y"])
                page.wait_for_timeout(180)
                moved=page.evaluate("""country => {
                  const el=document.querySelector('.country-pin[data-country="'+country+'"]');
                  const map=window.__gulfastraMap,coords=window.__gulfastraGeography[country].center;
                  const expected=map.project(coords),a=el.getBoundingClientRect(),b=map.getContainer().getBoundingClientRect();
                  return {error:Math.hypot(a.left+a.width/2-b.left-expected.x,a.top+a.height/2-b.top-expected.y),
                    hovered:getComputedStyle(el,'::before').transform!=='none',tooltip:!!document.querySelector('.v9-tooltip')};
                }""",hover["country"])
                assert moved["hovered"] and moved["error"]<6 and moved["tooltip"],f"Country circle jumps/flickers on hover: {moved}"
            page.screenshot(path=str(OUT/"desktop-marker-hover.png"),full_page=True)
        assert page.evaluate("!!window.GulfastraData"),"Independent GitHub public-data branch client missing"
        page.locator('[data-v9-panel="wire"]:visible').first.click()
        assert page.locator('.v9-panel[data-panel="wire"]').is_visible(),"Floating wire did not open"
        assert page.locator('.v9-panel[data-panel="wire"] .v9-news').count()>0,"Wire has no real report articles"
        assert page.locator('.v9-panel[data-panel="wire"] .v9-news a[href^="https://"]').count()>0,"Article links missing"
        page.screenshot(path=str(OUT/f"{name}-wire.png"),full_page=True)
        page.locator('[data-v9-panel="verify"]:visible').first.click()
        assert page.locator('.v9-panel[data-panel="verify"] .v9-news').count()>0,"Evidence groups not shown"
        page.locator('[data-v9-panel="sources"]:visible').first.click()
        assert page.locator('.v9-panel[data-panel="sources"] .v9-source-line').count()>0,"Source health not shown"
        # The reference-video bug: windows used to cascade directly on top of each other.
        if name=="desktop":
            assert page.locator(".v9-panel").count()==3
            rects=page.locator(".v9-panel").evaluate_all("""nodes=>nodes.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})""")
            for i,ra in enumerate(rects):
                for rb in rects[i+1:]:
                    overlap=max(0,min(ra["x"]+ra["w"],rb["x"]+rb["w"])-max(ra["x"],rb["x"])) * max(0,min(ra["y"]+ra["h"],rb["y"]+rb["h"])-max(ra["y"],rb["y"]))
                    assert overlap<5,f"Windows overlap instead of tiling: {rects}"
            page.locator("#v9Tile").click()
            assert page.locator(".v9-panel").count()==3,"Window tile control closed panels"
        else:
            assert page.locator(".v9-panel").count()==1,"Mobile should display only one floating workspace at a time"
        assert page.locator("#v9DataStatus").inner_text().find("SOURCES")!=-1,"Source channel status missing"
        # Evidence links and date-specific signals are not just visual decorations.
        if page.locator('.v9-panel[data-panel="verify"]').count()==0:
            page.locator('[data-v9-panel="verify"]:visible').first.click()
        assert page.locator('.v9-panel[data-panel="verify"] .v9-verify-links a[href^="https://"]').count()>0,"Evidence source links missing"
        assert "0 NAMED OUTLETS" not in page.locator('.v9-panel[data-panel="verify"]').inner_text(),"False zero-source attribution"
        if name=="mobile":
            page.locator("#v9MobileToolsButton").click()
            assert page.locator("#v9MobileMenu").is_visible(),"Mobile analyst tools are inaccessible"
            page.locator('#v9MobileMenu [data-v9-panel="timeline"]').click()
            assert page.locator("#v9MobileMenu").is_hidden(),"Tools menu did not close after selection"
        else:
            page.locator('[data-v9-panel="timeline"]:visible').first.click()
        assert page.locator('.v9-panel[data-panel="timeline"] .v9-timeline-row').count()>0,"Historical timeline missing"
        page.screenshot(path=str(OUT/f"{name}-multi-window.png"),full_page=True)
        # Palettes affect the complete application and persist.
        page.locator("#v9Appearance").click()
        assert page.locator("#v9AppearanceMenu").is_visible()
        page.locator('[data-v9-theme="arctic"]').click()
        assert page.evaluate("document.body.dataset.v9Palette")=="arctic"
        page.screenshot(path=str(OUT/f"{name}-arctic.png"),full_page=True)
        page.locator("#v9Appearance").click()
        page.locator('[data-v9-theme="ember"]').click()
        assert page.evaluate("document.body.dataset.v9Palette")=="ember"
        page.screenshot(path=str(OUT/f"{name}-ember.png"),full_page=True)
        page.locator("#v9Appearance").click()
        page.locator('[data-v9-theme="phosphor"]').click()
        assert page.evaluate("document.body.dataset.v9Palette")=="phosphor"
        # Close floating windows and check controls remain clickable.
        for panel in [el.get_attribute("data-panel") for el in page.locator(".v9-panel").all()]:
            page.locator(f'.v9-panel[data-panel="{panel}"] .v9-panel-close').click()
        assert page.locator(".v9-panel").count()==0
        if name=="mobile":
            page.locator("#v9MobileFilters").click()
        else:
            page.locator("#v9Filters").click()
        assert page.locator("#controlpanel").is_visible(),"Context filter drawer did not open"
        assert page.locator("#controlpanel").evaluate("node=>node.classList.contains('v9-show')")
        page.locator("#closeLayers").click()
        assert page.locator("#controlpanel").is_hidden()
        # Search and globe behavior are genuinely interactive, not decorative.
        assert page.locator("#v9CountryList option").count()>0,"Country locator choices missing"
        page.locator("#v9Locate").fill("Qatar")
        page.locator("#v9LocateGo").click()
        assert page.locator('.v9-panel[data-panel="wire"]').count()==1,"Country search did not open source evidence"
        page.locator('.v9-panel[data-panel="wire"] .v9-panel-close').click()
        page.locator("#v9Reset").click()
        page.locator('[data-v9-mode="globe"]').click()
        if page.evaluate("typeof window.__gulfastraMap.setProjection==='function'"):
            assert page.locator('[data-v9-mode="globe"]').get_attribute("class")=="active","Globe mode did not activate"
            assert page.evaluate("window.__gulfastraMap.getProjection().type")=="globe","Globe button only changed its label; projection remains flat"
            page.wait_for_timeout(500)
        page.locator('[data-v9-mode="map"]').click()
        page.locator("#v9ZoomIn").click()
        page.locator("#v9Reset").click()
        page.wait_for_timeout(650)
        page.screenshot(path=str(OUT/f"{name}.png"),full_page=True)
        # Regression test complete analyst workbench, even though it is now accessed from floating LAB.
        page.locator('[data-gf-open="fusion"]').first.evaluate("(node)=>node.click()")
        assert page.locator("#fusionWorkbench").is_visible(),"Full evidence workbench failed"
        page.locator('[data-gf-page="query"]').click()
        page.locator("#gfQueryInput").fill("type:security after:7d")
        page.locator("#gfQueryForm button").click()
        assert "MATCHED" in page.locator("#fusionView").inner_text(),"OSINT query failed"
        page.locator('[data-gf-page="sources"]').click()
        assert page.locator("#fusionView .gf-signal").count()>0
        page.locator("#gfClose").click()
        assert page.locator("#fusionWorkbench").is_hidden()
        assert not errors,f"{name} JavaScript errors: "+"; ".join(errors)
        print(name,"archive",page.locator("#mTotal").inner_text(),
              "country_markers",len(coordinates),
              "ticker_links",page.locator("#v9TickerItems a").count(),
              "data_channel",page.evaluate("window.GulfastraData.info().channel"),
              "pageerrors",errors)
        page.close()
    browser.close()
