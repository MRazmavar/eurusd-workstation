import sys
import time
from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_page(viewport={"width": 1400, "height": 900})

        print("Navigating to http://127.0.0.1:5173 ...")
        page.goto("http://127.0.0.1:5173")
        page.wait_for_selector('[data-testid="drawing-svg"]', timeout=20000)
        time.sleep(2)

        # 1. Verify Favorites Toolbar
        print("\n--- 1. Testing Favorites Toolbar ---")
        fav_toolbar = page.locator('[data-testid="favorites-toolbar"]')
        assert fav_toolbar.is_visible(), "Favorites toolbar should be visible by default!"
        box_fav = fav_toolbar.bounding_box()
        print(f"Favorites toolbar visible at: x={box_fav['x']}, y={box_fav['y']}, w={box_fav['width']}, h={box_fav['height']}")
        assert box_fav['y'] < 300, f"Toolbar should be comfortably near top, not buried below! Got y={box_fav['y']}"

        # Test dragging favorites toolbar
        fav_handle = page.locator('[data-testid="favorites-toolbar-handle"]')
        h_box = fav_handle.bounding_box()
        page.mouse.move(h_box['x'] + 5, h_box['y'] + 5)
        page.mouse.down()
        page.mouse.move(h_box['x'] + 100, h_box['y'] + 50, steps=10)
        page.mouse.up()
        time.sleep(0.5)
        new_fav_box = fav_toolbar.bounding_box()
        print(f"Favorites toolbar dragged to: x={new_fav_box['x']}, y={new_fav_box['y']}")
        assert new_fav_box['x'] > box_fav['x'], "Toolbar should have moved right!"

        page.on("dialog", lambda dialog: dialog.accept())

        # Clear existing drawings first for clean test
        trash_btn = page.locator('button[title="Remove All Drawings"]')
        if trash_btn.is_visible():
            trash_btn.click()
            time.sleep(0.5)

        chart_svg = page.locator('[data-testid="drawing-svg"]')
        chart_box = chart_svg.bounding_box()
        assert chart_box is not None, "Drawing SVG bounding box not found"

        # 2. Test Long Position Tool (1-Click Instant Placement)
        print("\n--- 2. Testing Long Position Tool (1-Click Placement) ---")
        # Click Long Position from favorites toolbar
        long_btn = page.locator('[data-testid="fav-tool-long_position"]')
        if not long_btn.is_visible():
            # Open prediction tools menu on left toolbar
            print("Opening LeftToolbar prediction menu...")
            page.locator('button[title*="Prediction"]').click()
            time.sleep(0.3)
            page.locator('button:has-text("Long Position")').click()
        else:
            long_btn.click()
        time.sleep(0.5)

        # 1 Single Click to place Long Position
        click_x = chart_box['x'] + 350
        click_y = chart_box['y'] + 250
        print(f"Placing Long Position with 1 single click at ({click_x}, {click_y})...")
        page.mouse.click(click_x, click_y)
        time.sleep(1)

        # Verify Long Position drawing element exists
        long_drawings = page.locator('g[data-testid^="drawing-long-position-"]')
        assert long_drawings.count() >= 1, "Long Position drawing should appear immediately on 1 click!"
        long_id_attr = long_drawings.last.get_attribute("data-testid")
        drawing_id = long_id_attr.replace("drawing-long-position-", "")
        print(f"Long Position successfully placed on 1 click! ID: {drawing_id}")

        # Verify 4 anchor handles exist
        h0 = page.locator(f'[data-testid="anchor-handle-{drawing_id}-0"]') # Entry
        h1 = page.locator(f'[data-testid="anchor-handle-{drawing_id}-1"]') # Stop Loss
        h2 = page.locator(f'[data-testid="anchor-handle-{drawing_id}-2"]') # Take Profit
        h3 = page.locator(f'[data-testid="anchor-handle-{drawing_id}-3"]') # Width
        assert h0.count() == 1, "Handle 0 (Entry) should exist"
        assert h1.count() == 1, "Handle 1 (SL) should exist"
        assert h2.count() == 1, "Handle 2 (TP) should exist"
        assert h3.count() == 1, "Handle 3 (Width) should exist"

        b_h1_initial = h1.bounding_box()
        b_h2_initial = h2.bounding_box()
        print(f"Initial Handle 1 (SL) Y: {b_h1_initial['y']}")
        print(f"Initial Handle 2 (TP) Y: {b_h2_initial['y']}")

        # 3. Test Independent Handle Movement (TradingView Exact Behavior)
        print("\n--- 3. Testing Handle 2 (TP) Drag: Moving TP MUST NOT move Stop Loss ---")
        # Drag Handle 2 (Take Profit) UP by 40px
        page.mouse.move(b_h2_initial['x'] + 5, b_h2_initial['y'] + 5)
        page.mouse.down()
        page.mouse.move(b_h2_initial['x'] + 5, b_h2_initial['y'] - 40, steps=8)
        page.mouse.up()
        time.sleep(0.5)

        b_h1_after_tp = h1.bounding_box()
        b_h2_after_tp = h2.bounding_box()
        print(f"After TP Drag - Handle 2 (TP) Y: {b_h2_after_tp['y']} (Delta: {b_h2_after_tp['y'] - b_h2_initial['y']})")
        print(f"After TP Drag - Handle 1 (SL) Y: {b_h1_after_tp['y']} (Delta: {b_h1_after_tp['y'] - b_h1_initial['y']})")
        assert b_h2_after_tp['y'] < b_h2_initial['y'] - 20, "Handle 2 (TP) should have moved up!"
        assert abs(b_h1_after_tp['y'] - b_h1_initial['y']) < 2, f"Handle 1 (SL) MUST remain 100% frozen when TP is moved! Shift was: {b_h1_after_tp['y'] - b_h1_initial['y']}"
        print("PASS: TP moved independently without resizing or shifting SL!")

        print("\n--- 4. Testing Handle 1 (SL) Drag: Moving SL MUST NOT move Take Profit ---")
        # Drag Handle 1 (Stop Loss) DOWN by 50px
        page.mouse.move(b_h1_after_tp['x'] + 5, b_h1_after_tp['y'] + 5)
        page.mouse.down()
        page.mouse.move(b_h1_after_tp['x'] + 5, b_h1_after_tp['y'] + 50, steps=10)
        page.mouse.up()
        time.sleep(0.5)

        b_h1_after_sl = h1.bounding_box()
        b_h2_after_sl = h2.bounding_box()
        print(f"After SL Drag - Handle 1 (SL) Y: {b_h1_after_sl['y']} (Delta: {b_h1_after_sl['y'] - b_h1_after_tp['y']})")
        print(f"After SL Drag - Handle 2 (TP) Y: {b_h2_after_sl['y']} (Delta: {b_h2_after_sl['y'] - b_h2_after_tp['y']})")
        assert b_h1_after_sl['y'] > b_h1_after_tp['y'] + 5, "Handle 1 (SL) should have moved down!"
        assert abs(b_h2_after_sl['y'] - b_h2_after_tp['y']) < 2, f"Handle 2 (TP) MUST remain 100% frozen when SL is moved! Shift was: {b_h2_after_sl['y'] - b_h2_after_tp['y']}"
        print("PASS: SL moved independently without resizing or shifting TP!")

        # 5. Test Short Position Tool (1-Click Instant Placement)
        print("\n--- 5. Testing Short Position Tool (1-Click Placement) ---")
        short_btn = page.locator('[data-testid="fav-tool-short_position"]')
        if not short_btn.is_visible():
            page.locator('button[title*="Prediction"]').click()
            time.sleep(0.3)
            page.locator('button:has-text("Short Position")').click()
        else:
            short_btn.click()
        time.sleep(0.5)

        short_click_x = chart_box['x'] + 820
        short_click_y = chart_box['y'] + 180
        print(f"Placing Short Position with 1 single click at ({short_click_x}, {short_click_y})...")
        page.mouse.click(short_click_x, short_click_y)
        time.sleep(1)

        short_drawings = page.locator('g[data-testid^="drawing-short-position-"]')
        assert short_drawings.count() >= 1, "Short Position drawing should appear immediately on 1 click!"
        short_id_attr = short_drawings.first.get_attribute("data-testid")
        short_id = short_id_attr.replace("drawing-short-position-", "")
        print(f"Short Position successfully placed on 1 click! ID: {short_id}")

        # 6. Verify Clicking does NOT duplicate drawing
        print("\n--- 6. Verifying No Duplication on Click ---")
        initial_count = page.locator('g[data-testid^="drawing-"]').count()
        # Click on the center of the Short Position drawing
        page.mouse.click(short_click_x + 30, short_click_y + 10)
        time.sleep(0.5)
        after_click_count = page.locator('g[data-testid^="drawing-"]').count()
        print(f"Drawings before click: {initial_count}, after click: {after_click_count}")
        assert initial_count == after_click_count, "Clicking on drawing should NEVER duplicate it!"
        print("PASS: No duplication on click!")

        # Take screenshot
        out_path = r"C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/tradingview_exact_position_tools_verified.png"
        page.screenshot(path=out_path)
        print(f"\nSaved verified screenshot to {out_path}")

        browser.close()
        print("ALL TRADINGVIEW POSITION TOOLS & FAVORITES TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
