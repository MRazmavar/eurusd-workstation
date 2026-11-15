import asyncio
import os
from playwright.async_api import async_playwright

ARTIFACT_DIR = r"C:\Users\moham\.gemini\antigravity\brain\7a304e26-ed66-4949-8d2a-5874b8c819e9"

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="chrome", headless=True)
        page = await browser.new_page(viewport={"width": 1400, "height": 900})
        await page.goto("http://localhost:5173/", wait_until="networkidle")
        await page.wait_for_timeout(2000)

        # Switch to 4h
        await page.locator("button:has-text('4h')").first.click()
        await page.wait_for_timeout(2000)

        # Pan chart to the right (viewing past) by dragging across the canvas
        chart_el = page.locator(".tv-lightweight-charts, canvas").first
        box = await chart_el.bounding_box()
        if box:
            cx = box["x"] + box["width"] / 2
            cy = box["y"] + box["height"] / 2

            # Drag several times to pan left into the past
            for _ in range(5):
                await page.mouse.move(cx - 200, cy)
                await page.mouse.down()
                await page.mouse.move(cx + 350, cy, steps=10)
                await page.mouse.up()
                await page.wait_for_timeout(200)

        await page.wait_for_timeout(1500)
        screenshot_panned = os.path.join(ARTIFACT_DIR, "timeframe_4h_panned_history.png")
        await page.screenshot(path=screenshot_panned)
        print(f"Captured panned screenshot: {screenshot_panned}")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
