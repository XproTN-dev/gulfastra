#!/usr/bin/env python3
"""Real Chromium checks for GULFASTRA X (run in CI, no fabricated feeds)."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"visual-check"
OUT.mkdir(exist_ok=True)
BASE=os.getenv("BASE_URL","http://127.0.0.1:8765/command/")

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,args=["--disable-dev-shm-usage","--no-sandbox"])
    for name,width,height in [("desktop",1600,960),("mobile",390,844)]:
        page=browser.new_page(viewport={"width":width,"height":height})
        errors=[]
        page.on("pageerror",lambda error:errors.append(
            str(error)+" | "+str(getattr(error,"stack",""))[:1000]
        ))
        response=page.goto(BASE,wait_until="domcontentloaded",timeout=60000)
        assert response and response.status==200,("site unavailable",name)
        page.wait_for_function("Boolean(window.GXApp?.getState().loaded)",timeout=60000)
        # A populated news panel is insufficient: the REAL map library and canvas must load.
        page.wait_for_function(
            "Boolean(window.maplibregl?.Map && document.querySelector('#map canvas'))",
            timeout=30000,
        )
        assert page.evaluate("window.GXMapLibrarySource==='same-origin'"), (
            "MapLibre must load from same-origin GitHub Pages instead of CDN"
        )
        assert "MAP LIBRARY UNAVAILABLE" not in page.locator("#mapFallback").inner_text()
        assert page.locator(".topbar").is_visible()
        assert page.locator(".map-wrap").is_visible()
        assert page.locator("#metricReports").inner_text()!="—","Data metrics not populated"
        assert "COLLECTED" in page.locator("#freshnessCollection").inner_text()
        assert "LATEST ARTICLE" in page.locator("#freshnessArticle").inner_text()
        assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 2"), (
            "Phone/desktop root must not horizontally overflow the viewport"
        )
        if name.startswith("mobile"):
            assert page.locator("#mobileFeedStatus").is_visible()
            assert "COLLECTED" in page.locator("#mobileBatchAge").inner_text()
            assert page.locator("#mobileNewsAge").inner_text() not in ["", "CHECKING…"]

        assert page.locator("#freshnessBar").is_visible(),"Collection freshness must be visible"
        assert "COLLECTED" in page.locator("#freshnessBar").inner_text()
        assert "LATEST ARTICLE" in page.locator("#freshnessBar").inner_text()
        assert "NOT REAL-TIME" in page.locator("#freshnessBar").inner_text()
        # A manifest-only refresh must not re-create the intel DOM or reset scroll.
        steady=page.evaluate("""async()=>{
          const stream=document.querySelector('#stream');
          stream.scrollTop=100;
          const first=stream.firstElementChild;
          const top=stream.scrollTop;
          await window.GXApp.refresh();
          return {same:first===stream.firstElementChild,before:top,after:stream.scrollTop};
        }""")
        assert steady["same"] and abs(steady["before"]-steady["after"])<=1, (
            "Unchanged periodic data must not redraw or scroll the stream",steady)

        assert page.locator("#stream .intel-card").count()>0 or "No matching" in page.locator("#stream").inner_text()
        assert page.locator("#timelineBars button").count()==48,"Real-data publication timeline missing"
        assert page.evaluate('!document.querySelector(\'link[href*="v9.css"]\')'),"Old CSS should not be loaded"
        assert page.evaluate("getComputedStyle(document.querySelector('.map-wrap')).height!=='0px'")
        page.screenshot(path=str(OUT/f"v11-{name}-overview.png"),full_page=True)
        page.locator("#commandButton").click()
        assert page.locator("#commandOverlay").is_visible()
        page.locator("#globalSearch").fill("Gulf")
        assert page.locator("#commandResults button").count()>0
        page.keyboard.press("Escape")
        assert page.locator("#commandOverlay").is_hidden()
        page.locator("#settingsButton").click()
        assert page.locator("#settingsOverlay").is_visible()
        page.locator('[data-theme-choice="obsidian"]').click()
        assert page.evaluate("document.body.dataset.theme==='obsidian'")
        page.locator("#settingsClose").click()
        assert page.locator("#settingsOverlay").is_hidden()
        # Mobile layer controls live in the collapsed drawer, not on the map viewport.
        if name.startswith("mobile"):
            page.locator('[data-mobile="layers"]').click()
            page.wait_for_function("document.querySelector('#app').classList.contains('mobile-layers')")
            drawer = page.evaluate("""() => {
                const r=document.querySelector('.layers-rail').getBoundingClientRect();
                const w=document.querySelector('.workarea').getBoundingClientRect();
                return {top:r.top-w.top,bottom:w.bottom-r.bottom,height:r.height,workHeight:w.height};
            }""")
            assert abs(drawer["top"])<3 and abs(drawer["bottom"])<3, (
                "Mobile drawer misaligned with workspace: "+str(drawer)
            )
            assert drawer["height"]>=drawer["workHeight"]-4, (
                "Mobile layers drawer unnecessarily clipped: "+str(drawer)
            )
        page.locator('[data-hours="168"]').first.click()
        assert page.locator('[data-hours="168"]').first.get_attribute("class")=="active"
        assert not page.evaluate("window.GXApp.getState().replay"),"Default should not be historical replay"
        page.locator("#timelineScrub").evaluate("""el=>{
            el.value="37";
            el.dispatchEvent(new Event("input",{bubbles:true}));
        }""")
        assert page.evaluate("window.GXApp.getState().replay"),"Timeline scrubber not affecting time filter"
        page.locator("#timelineNow").click()
        assert not page.evaluate("window.GXApp.getState().replay")
        if name.startswith("mobile"):
            page.locator('[data-mobile="intel"]').click()
            assert page.locator(".intel-rail").is_visible()
            page.locator('[data-tab="news"]').click()
            page.wait_for_timeout(250)
            scroll = page.locator("#stream").evaluate("""el => {
                el.scrollTop=180;
                return {before:el.scrollTop,canScroll:el.scrollHeight>el.clientHeight};
            }""")
            if scroll["canScroll"] and scroll["before"]>0:
                page.evaluate("async()=>await window.GXApp.refresh()")
                after=page.locator("#stream").evaluate("el=>el.scrollTop")
                assert abs(after-scroll["before"])<12, (
                    "Refresh caused analyst feed to jump: "+str((scroll,after))
                )
            page.locator('[data-mobile="layers"]').click()
            assert page.locator(".layers-rail").is_visible()
        else:
            page.locator('[data-workspace="maritime"]').click()
            assert page.evaluate("window.GXApp.getState().workspace==='maritime'")
            page.locator('[data-tab="sources"]').click()
            assert "SOURCE" in page.locator("#streamSummary").inner_text()
        page.screenshot(path=str(OUT/f"v11-{name}-interactions.png"),full_page=True)
        assert not errors,f"{name} JS errors: {errors}"
        page.close()
    # Separate viewport regression: drawer should occupy the WORKAREA, not
    # include the top bar offset a second time (former mobile clipping bug).
    for width,height in [(360,740),(390,844),(430,932),(768,1024)]:
        page=browser.new_page(viewport={"width":width,"height":height},
            is_mobile=width<=430,has_touch=width<=430)
        errors=[]
        page.on("pageerror",lambda err:errors.append(str(err)))
        page.goto(BASE,wait_until="domcontentloaded",timeout=60000)
        page.wait_for_function("Boolean(window.GXApp?.getState().loaded)",timeout=60000)
        page.locator('[data-mobile="layers"]').click() if width<=430 else page.locator("#tabletLayersButton").click()
        if width==768:
            assert page.locator("#tabletLayersButton").get_attribute("aria-expanded")=="true"
            page.wait_for_timeout(300)
            assert page.evaluate("document.querySelector('#app').classList.contains('mobile-layers')")
            page.locator("#collapseLayers").click()
            assert page.locator("#tabletLayersButton").get_attribute("aria-expanded")=="false"
        if width<=430:
            page.wait_for_timeout(300)
            geometry=page.evaluate("""()=>{
              const area=document.querySelector('.workarea').getBoundingClientRect();
              const drawer=document.querySelector('.layers-rail').getBoundingClientRect();
              return {areaTop:area.top,areaBottom:area.bottom,
                drawerTop:drawer.top,drawerBottom:drawer.bottom,
                drawerHeight:drawer.height,width:innerWidth,htmlWidth:document.documentElement.scrollWidth};
            }""")
            assert abs(geometry["areaTop"]-geometry["drawerTop"])<=2,(
              "Mobile drawer starts outside the workarea",geometry)
            assert geometry["drawerBottom"]<=geometry["areaBottom"]+2,(
              "Mobile drawer extends below workarea",geometry)
            assert geometry["htmlWidth"]<=geometry["width"]+2,(
              "Mobile layout causes horizontal page overflow",geometry)
            page.locator('.layers-rail').evaluate("el=>el.scrollTop=el.scrollHeight")
            assert page.locator("#manageWatch").is_visible()
            page.locator('[data-mobile="intel"]').click()
            page.wait_for_timeout(300)
            intel=page.evaluate("""()=>{
              const r=document.querySelector('.intel-rail').getBoundingClientRect();
              return {left:r.left,right:r.right,width:innerWidth}
            }""")
            assert intel["left"]>=-2 and intel["right"]<=intel["width"]+2,(
              "Intel panel is offscreen",intel)
            page.locator('[data-mobile="map"]').click()
            page.wait_for_timeout(300)
            assert page.evaluate("!document.body.classList.contains('mobile-intel')")
        assert not errors,(width,height,errors)
        page.screenshot(path=str(OUT/f"v11-viewport-{width}.png"),full_page=True)
        page.close()
    browser.close()
print("GULFASTRA X browser quality gate: desktop/mobile, freshness, no-redraw, 360-768px drawers, map, timeline and errors PASS")
