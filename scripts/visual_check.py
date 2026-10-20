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
        assert page.evaluate("!!window.GulfastraData"),"Independent GitHub public-data branch client missing"
        page.locator('[data-v9-panel="wire"]').first.click()
        assert page.locator('.v9-panel[data-panel="wire"]').is_visible(),"Floating wire did not open"
        assert page.locator('.v9-panel[data-panel="wire"] .v9-news').count()>0,"Wire has no real report articles"
        assert page.locator('.v9-panel[data-panel="wire"] .v9-news a[href^="https://"]').count()>0,"Article links missing"
        page.screenshot(path=str(OUT/f"{name}-wire.png"),full_page=True)
        page.locator('[data-v9-panel="verify"]').first.click()
        assert page.locator('.v9-panel[data-panel="verify"] .v9-news').count()>0,"Evidence groups not shown"
        page.locator('[data-v9-panel="sources"]').first.click()
        assert page.locator('.v9-panel[data-panel="sources"] .v9-source-line').count()>0,"Source health not shown"
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
        for panel in ["sources","verify","wire"]:
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
