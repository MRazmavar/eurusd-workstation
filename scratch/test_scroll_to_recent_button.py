import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\moham\.gemini\antigravity\brain\7a304e26-ed66-4949-8d2a-5874b8c819e9"

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="chrome", headless=True)
        page = await browser.new_page(viewport={"width": 1400, "height": 900})
        print("Navigating to EUR/USD Workstation...")
        await page.goto("http://localhost:5173/", wait_until="networkidle")
        await page.evaluate("() => { Object.keys(localStorage).filter(k => k.startsWith('eurusd_logical_range_')).forEach(k => localStorage.removeItem(k)); }")
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(3000)

        # 1. At live edge: button should initially be hidden
        btn_selector = "[data-testid='scroll-to-recent-btn']"
        btn_count_initial = await page.locator(btn_selector).count()
        print(f"Initial scroll to recent button count at live edge: {btn_count_initial} (expected: 0)")
        assert btn_count_initial == 0, f"Expected 0 button when at latest candle, got {btn_count_initial}"

        # 2. Pan left into historical bars
        print("Panning left into past historical bars...")
        chart_el = page.locator(".tv-lightweight-charts, canvas").first
        box = await chart_el.bounding_box()
        assert box, "Chart element bounding box not found"
        cx = box["x"] + box["width"] / 2
        cy = box["y"] + box["height"] / 2

        # Drag 4 times to the right to move chart back into past
        for _ in range(4):
            await page.mouse.move(cx - 150, cy)
            await page.mouse.down()
            await page.mouse.move(cx + 300, cy, steps=8)
            await page.mouse.up()
            await page.wait_for_timeout(150)

        await page.wait_for_timeout(1000)

        # Button should now be visible!
        btn = page.locator(btn_selector)
        btn_visible = await btn.is_visible()
        print(f"Scroll to recent button visible after panning: {btn_visible} (expected: True)")
        assert btn_visible, "Scroll to recent button should be visible when scrolled into the past!"

        # 3. Test Hover Tooltip: "Scroll to the most recent bar"
        print("Hovering over scroll to recent button...")
        btn_box = await btn.bounding_box()
        assert btn_box, "Button box not found"

        # Hover directly on button
        await page.mouse.move(btn_box["x"] + btn_box["width"] / 2, btn_box["y"] + btn_box["height"] / 2)
        await page.wait_for_timeout(400)

        tooltip = page.locator("[data-testid='scroll-to-recent-tooltip']")
        tooltip_opacity = await tooltip.evaluate("el => window.getComputedStyle(el).opacity")
        print(f"Tooltip opacity on hover: {tooltip_opacity} (expected: 1)")
        assert float(tooltip_opacity) > 0.8, f"Expected tooltip opacity near 1, got {tooltip_opacity}"

        # Capture screenshot of hovered button with tooltip
        screenshot_hover = os.path.join(ARTIFACT_DIR, "scroll_to_recent_hover_tooltip.png")
        await page.screenshot(path=screenshot_hover)
        print(f"Captured hover tooltip screenshot: {screenshot_hover}")

        # 4. Click the button to move fast to the right
        print("Clicking scroll to recent button...")
        await btn.click()
        await page.wait_for_timeout(1500)

        # Button should now be hidden again because we are back at the most recent bar!
        btn_count_after = await page.locator(btn_selector).count()
        print(f"Scroll to recent button count after clicking: {btn_count_after} (expected: 0)")
        assert btn_count_after == 0, f"Expected button to disappear when back at latest candle, got {btn_count_after}"

        # Capture screenshot after returning to recent bar
        screenshot_after = os.path.join(ARTIFACT_DIR, "scroll_to_recent_returned_to_live.png")
        await page.screenshot(path=screenshot_after)
        print(f"Captured returned to live screenshot: {screenshot_after}")

        print("ALL TESTS PASSED SUCCESSFULLY!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
