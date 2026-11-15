import asyncio
import os
import sys
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\moham\.gemini\antigravity\brain\7a304e26-ed66-4949-8d2a-5874b8c819e9"

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="chrome", headless=True)
        context = await browser.new_context(viewport={"width": 1400, "height": 900})
        page = await context.new_page()

        print("Navigating to EUR/USD Workstation...")
        await page.goto("http://localhost:5173/", wait_until="networkidle")
        await page.wait_for_timeout(3000)

        # 1. Switch to 4h timeframe
        print("Switching to 4h timeframe...")
        tf_btn_4h = page.locator("button:has-text('4h')").first
        if await tf_btn_4h.count() > 0:
            await tf_btn_4h.click()
        else:
            # Dropdown
            tf_dropdown = page.locator("[data-testid='timeframe-dropdown-btn']").first
            if await tf_dropdown.count() > 0:
                await tf_dropdown.click()
                await page.locator("button:has-text('4h')").first.click()

        await page.wait_for_timeout(2500)

        # Verify on 4h that no session rectangles are drawn
        session_rects = await page.locator("[data-testid^='session-rect-']").count()
        print(f"Session rectangles visible on 4h: {session_rects} (expected: 0)")
        assert session_rects == 0, f"Expected 0 session rects on 4h, got {session_rects}"

        # Capture 4h screenshot
        screenshot_4h = os.path.join(ARTIFACT_DIR, "timeframe_4h_clean_no_sessions.png")
        await page.screenshot(path=screenshot_4h)
        print(f"Captured 4h screenshot: {screenshot_4h}")

        # 2. Switch from 4h back to 15m
        print("Switching from 4h to 15m to test transition glitch...")
        # Check during the switch for any abnormally wide rectangles
        tf_btn_15m = page.locator("button:has-text('15m')").first
        if await tf_btn_15m.count() > 0:
            await tf_btn_15m.click()
        else:
            tf_dropdown = page.locator("[data-testid='timeframe-dropdown-btn']").first
            await tf_dropdown.click()
            await page.locator("button:has-text('15m')").first.click()

        # Monitor over 1500ms in 100ms intervals
        glitch_detected = False
        for i in range(15):
            await page.wait_for_timeout(100)
            widths = await page.evaluate("Array.from(document.querySelectorAll('[data-testid^=\"session-rect-\"]')).map(el => el.getBoundingClientRect().width)")
            for w in widths:
                if w > 800: # Abnormally stretched across entire chart
                    print(f"GLITCH DETECTED at step {i}: box width={w}")
                    glitch_detected = True
                    break
            if glitch_detected:
                break

        print(f"Transition glitch detected: {glitch_detected} (expected: False)")
        assert not glitch_detected, "Giant blue sessions glitch appeared during timeframe switch!"

        # Wait for 15m to settle
        await page.wait_for_timeout(2000)
        session_rects_15m = await page.locator("[data-testid^='session-rect-']").count()
        print(f"Session rectangles visible on 15m: {session_rects_15m}")

        # Capture 15m screenshot
        screenshot_15m = os.path.join(ARTIFACT_DIR, "timeframe_15m_clean_sessions.png")
        await page.screenshot(path=screenshot_15m)
        print(f"Captured 15m screenshot: {screenshot_15m}")

        # 3. Switch to 1D timeframe
        print("Switching to 1D timeframe...")
        tf_btn_1d = page.locator("button:has-text('1D')").first
        if await tf_btn_1d.count() > 0:
            await tf_btn_1d.click()
        else:
            tf_dropdown = page.locator("[data-testid='timeframe-dropdown-btn']").first
            await tf_dropdown.click()
            await page.locator("button:has-text('1D')").first.click()

        await page.wait_for_timeout(2500)
        session_rects_1d = await page.locator("[data-testid^='session-rect-']").count()
        print(f"Session rectangles visible on 1D: {session_rects_1d} (expected: 0)")
        assert session_rects_1d == 0, f"Expected 0 session rects on 1D, got {session_rects_1d}"

        # Capture 1D screenshot
        screenshot_1d = os.path.join(ARTIFACT_DIR, "timeframe_1D_clean_history.png")
        await page.screenshot(path=screenshot_1d)
        print(f"Captured 1D screenshot: {screenshot_1d}")

        print("ALL TESTS PASSED SUCCESSFULLY!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
