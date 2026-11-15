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
        await page.wait_for_timeout(2500)

        # 1. Verify favorites toolbar is visible on boot
        fav_toolbar = page.locator("[data-testid='favorites-toolbar']")
        is_vis = await fav_toolbar.is_visible()
        print(f"Favorites toolbar visible on boot: {is_vis} (expected: True)")
        assert is_vis, "Favorites toolbar must be visible on boot when favorite tools exist!"

        # Verify no accidental 'X' close button on toolbar
        close_btn_count = await page.locator("[data-testid='favorites-toolbar-close-btn']").count()
        print(f"Close 'X' button count on toolbar: {close_btn_count} (expected: 0)")
        assert close_btn_count == 0, "Accidental close button should be removed from favorites toolbar"

        # 2. Toggle off via left sidebar Star button
        sidebar_star_btn = page.locator("[data-testid='toggle-favorites-toolbar-btn']")
        if await sidebar_star_btn.count() > 0:
            print("Toggling off toolbar via left sidebar Star button...")
            await sidebar_star_btn.click()
            await page.wait_for_timeout(500)
            is_vis_after_toggle = await fav_toolbar.is_visible()
            print(f"Favorites toolbar visible after toggle off: {is_vis_after_toggle} (expected: False)")
            assert not is_vis_after_toggle, "Toolbar should be hidden after toggling off via sidebar"

        # 3. Test user requirement: Starring or unstarring any tool MUST make it reappear!
        print("Starring/unstarring a tool in left toolbar to test auto-reappear...")
        # Open trendlines flyout or click star
        trendlines_flyout_btn = page.locator("button[title*='Trendline Tools Menu'], button[title*='Cursor Tools Menu']").first
        await trendlines_flyout_btn.click()
        await page.wait_for_timeout(400)

        star_btn = page.locator("[data-testid^='star-tool-']").first
        assert await star_btn.count() > 0, "Tool star button not found"
        await star_btn.click()
        await page.wait_for_timeout(600)

        # Verify favorites toolbar IMMEDIATELY reappeared!
        is_reappeared = await fav_toolbar.is_visible()
        print(f"Favorites toolbar reappeared after starring/unstarring tool: {is_reappeared} (expected: True)")
        assert is_reappeared, "Favorites toolbar must immediately reappear when any tool is starred or unstarred!"

        # 4. Drag favorites toolbar to a new position
        handle = page.locator("[data-testid='favorites-toolbar-handle']")
        h_box = await handle.bounding_box()
        assert h_box, "Handle bounding box not found"
        await page.mouse.move(h_box["x"] + h_box["width"] / 2, h_box["y"] + h_box["height"] / 2)
        await page.mouse.down()
        await page.mouse.move(h_box["x"] + 200, h_box["y"] + 150, steps=10)
        await page.mouse.up()
        await page.wait_for_timeout(500)

        # Reload page and verify it remains visible
        print("Reloading page to test persistence...")
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(2000)
        is_vis_after_reload = await page.locator("[data-testid='favorites-toolbar']").is_visible()
        print(f"Favorites toolbar visible after reload: {is_vis_after_reload} (expected: True)")
        assert is_vis_after_reload, "Favorites toolbar must remain visible after reload"

        # Capture verification screenshot
        screenshot_path = os.path.join(ARTIFACT_DIR, "favorites_toolbar_persistent_verified.png")
        await page.screenshot(path=screenshot_path)
        print(f"Captured screenshot: {screenshot_path}")

        print("ALL FAVORITE TOOLS TESTS PASSED SUCCESSFULLY!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
