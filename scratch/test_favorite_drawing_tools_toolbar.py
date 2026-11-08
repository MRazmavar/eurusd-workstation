import time
import sys
import json
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def test_favorite_drawing_tools_toolbar():
    print("=" * 70)
    print("RUNNING AUTOMATED TEST: Favorite Drawing Tools & On-Chart Dock")
    print("=" * 70)

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(viewport={"width": 1600, "height": 950})
        page = context.new_page()

        print("[Step 1] Navigating to EUR/USD Workstation...")
        page.goto("http://127.0.0.1:5173", wait_until="networkidle")
        page.wait_for_selector("[data-testid='drawing-svg']", timeout=12000)
        time.sleep(2.0)
        print("  -> PASSED: Workstation loaded!")

        # Step 2: Verify the floating Favorites Toolbar is visible on the chart
        print("[Step 2] Verifying floating Favorites Toolbar on chart...")
        fav_toolbar = page.locator("[data-testid='favorites-toolbar']")
        fav_toolbar.wait_for(state="visible", timeout=6000)
        print("  -> PASSED: Favorites Toolbar is visible on the chart!")

        # Check default tools in favorites toolbar
        trendline_fav = page.locator("[data-testid='fav-tool-trendline']")
        hline_fav = page.locator("[data-testid='fav-tool-horizontal_line']")
        rect_fav = page.locator("[data-testid='fav-tool-rectangle']")

        assert trendline_fav.is_visible(), "Expected trendline in favorites toolbar"
        assert hline_fav.is_visible(), "Expected horizontal_line in favorites toolbar"
        assert rect_fav.is_visible(), "Expected rectangle in favorites toolbar"
        print("  -> PASSED: Default favorite tools (Trend Line, Horizontal Line, Rectangle) are present!")

        # Step 3: Fast tool activation from the Favorites Toolbar
        print("[Step 3] Testing 1-click tool selection from Favorites Toolbar...")
        hline_fav.click()
        time.sleep(0.5)

        # Check that horizontal_line has the active styling
        classes = hline_fav.get_attribute("class") or ""
        print(f"  -> Horizontal Line button classes: '{classes}'")
        assert "bg-[#2962ff]" in classes, f"Expected active blue background on selected tool, got: {classes}"
        print("  -> PASSED: Horizontal Line immediately activated via Favorites Toolbar!")

        # Step 4: Test star in front of each tool in the left toolbar flyout
        print("[Step 4] Opening Left Toolbar Trendlines flyout menu to test tool stars...")
        # Open trendlines flyout by right clicking or clicking the menu arrow
        trendlines_arrow = page.locator("button[title='Trend Lines Menu']")
        trendlines_arrow.click()
        time.sleep(0.5)

        # Verify star for ray tool
        star_ray = page.locator("[data-testid='star-tool-ray']")
        star_ray.wait_for(state="visible", timeout=5000)
        print("  -> PASSED: Star icon found in front of 'Ray' tool in flyout menu!")

        # Ray is currently not favorited, click its star
        print("  -> Clicking star in front of Ray tool to add it to favorites...")
        star_ray.click()
        time.sleep(0.6)

        # Check that ray is now in favorites toolbar
        ray_fav = page.locator("[data-testid='fav-tool-ray']")
        assert ray_fav.is_visible(), "Expected Ray to appear in Favorites Toolbar after starring"
        print("  -> PASSED: Ray tool immediately appeared in the on-chart Favorites Toolbar!")

        # Check localStorage persistence
        saved_favs = page.evaluate("() => localStorage.getItem('eurusd_favorite_tools')")
        print(f"  -> Saved favorites in localStorage: {saved_favs}")
        assert "ray" in saved_favs, f"Expected 'ray' in saved favorites, got: {saved_favs}"

        # Unstar trendline from the flyout
        print("[Step 5] Unstarring Trend Line from Left Toolbar flyout...")
        star_trendline = page.locator("[data-testid='star-tool-trendline']")
        star_trendline.click()
        time.sleep(0.6)

        # Close flyout
        page.keyboard.press("Escape")
        time.sleep(0.3)

        # Verify trendline is removed from favorites toolbar
        assert not trendline_fav.is_visible(), "Expected Trend Line to be removed from Favorites Toolbar"
        print("  -> PASSED: Trend Line successfully removed from Favorites Toolbar!")

        # Step 6: Test closing and reopening Favorites Toolbar
        print("[Step 6] Testing closing and reopening Favorites Toolbar...")
        close_btn = page.locator("[data-testid='favorites-toolbar-close-btn']")
        close_btn.click()
        time.sleep(0.5)
        assert not fav_toolbar.is_visible(), "Expected Favorites Toolbar to be hidden after close"
        print("  -> PASSED: Favorites Toolbar hidden via close button!")

        # Click the star button at the bottom of the left toolbar to toggle it back
        toggle_favs_btn = page.locator("[data-testid='toggle-favorites-toolbar-btn']")
        toggle_favs_btn.click()
        time.sleep(0.5)
        assert fav_toolbar.is_visible(), "Expected Favorites Toolbar to reappear when toggled on"
        print("  -> PASSED: Favorites Toolbar restored via Left Toolbar Star button!")

        # Step 7: Test dragging handle
        print("[Step 7] Testing dragging handle of the Favorites Toolbar...")
        handle = page.locator("[data-testid='favorites-toolbar-handle']")
        box = handle.bounding_box()
        if box:
            page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            page.mouse.down()
            page.mouse.move(box["x"] + 150, box["y"] - 120)
            page.mouse.up()
            time.sleep(0.5)
            print("  -> Dragged handle to reposition.")

            saved_pos = page.evaluate("() => localStorage.getItem('eurusd_fav_toolbar_pos')")
            print(f"  -> Saved toolbar position in localStorage: {saved_pos}")
            assert saved_pos is not None, "Expected saved position in localStorage"

        # Step 8: Capture visual verification artifact
        print("[Step 8] Capturing visual artifact screenshot...")
        artifact_path = r"C:\Users\moham\.gemini\antigravity\brain\7a304e26-ed66-4949-8d2a-5874b8c819e9\workstation_favorites_toolbar_verified.png"
        page.screenshot(path=artifact_path)
        print(f"  -> Screenshot saved to: {artifact_path}")

        browser.close()
        print("=" * 70)
        print("ALL FAVORITE DRAWING TOOLS TESTS PASSED SUCCESSFULLY!")
        print("=" * 70)

if __name__ == '__main__':
    test_favorite_drawing_tools_toolbar()
