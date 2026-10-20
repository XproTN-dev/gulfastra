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
        page.on("pageerror",lambda error:errors.append(str(error)))
        response=page.goto(BASE,wait_until="domcontentloaded",timeout=60000)
        assert response and response.status==200,("site unavailable",name)
        page.wait_for_function("Boolean(window.GXApp?.getState().loaded)",timeout=60000)
        assert page.locator(".topbar").is_visible()
        assert page.locator(".map-wrap").is_visible()
        assert page.locator("#metricReports").inner_text()!="—","Data metrics not populated"
        assert page.locator("#stream .intel-card").count()>0 or "No matching" in page.locator("#stream").inner_text()
        assert page.locator("#timelineBars button").count()==48,"Real-data publication timeline missing"
        assert page.evaluate("!document.querySelector('link[href*=v9.css]')"),"Old CSS should not be loaded"
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
        if name=="mobile":
            page.locator('[data-mobile="intel"]').click()
            assert page.locator(".intel-rail").is_visible()
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
    browser.close()
print("GULFASTRA X browser quality gate: desktop/mobile, data, map layout, tabs, search, theme, timeline and errors PASS")
