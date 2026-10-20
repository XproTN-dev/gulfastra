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
        total=page.locator("#mTotal").inner_text()
        count=page.locator(".report").count()
        mapcanvas=page.locator(".maplibregl-canvas").count()
        if label=="mobile":
            assert page.locator(".mobile-nav").is_visible(),"Mobile navigation missing"
            page.locator('[data-mobile="filters"]').click()
            assert page.locator("#controlpanel").evaluate("(node)=>node.classList.contains('open')"),"Filters drawer failed"
            page.locator("#closeLayers").click()
        assert count > 0,f"{label} report cards not rendered despite {total} archived reports"\n        page.screenshot(path=str(OUT/f"{label}.png"),full_page=True)
        print(label,"reported_count=",total,"visible_articles=",count,"mapcanvas=",mapcanvas,"pageerrors=",errors[:5])
        assert mapcanvas==1,"MapLibre canvas missing"
        assert not errors,"JavaScript errors: "+" ; ".join(errors)
        page.close()
    browser.close()
