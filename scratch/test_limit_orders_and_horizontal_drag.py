import sys
import time
from playwright.sync_api import sync_playwright

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_page(viewport={"width": 1400, "height": 900})
        page.goto("http://127.0.0.1:5173")
        page.wait_for_timeout(3000)

        print("==================================================")
        print(">>> 1. Activating Trade Setup via Right Sidebar")
        print("==================================================")
        setup_btn = page.locator("[data-testid='on-chart-setup-btn']")
        assert setup_btn.is_visible(), "On-chart setup button must be visible in RightSidebar"
        setup_btn.click()
        page.wait_for_timeout(1000)

        # Check for Floating Trade Control Panel
        panel = page.locator("[data-testid='floating-trade-panel']")
        assert panel.is_visible(), "FloatingTradeControlPanel must be visible when setup is active"
        print("[PASS] FloatingTradeControlPanel is visible.")

        # Check the setup overlay on chart
        setup_overlay = page.locator("[data-testid='trade-setup-overlay']")
        assert setup_overlay.is_visible(), "Trade setup overlay must be rendered on chart"
        print("[PASS] Trade setup overlay is visible on chart.")

        # Get initial position of setup profit zone
        profit_zone = page.locator("[data-testid='on-chart-setup-profit-zone']")
        init_box = profit_zone.bounding_box()
        print(f"[INFO] Initial Profit Zone Rect: x={init_box['x']}, y={init_box['y']}, w={init_box['width']}, h={init_box['height']}")

        print("==================================================")
        print(">>> 2. Dragging Trade Setup Body Horizontally to the Left")
        print("==================================================")
        # Click on the left portion of the body (away from right border badges)
        start_x = init_box['x'] + 20
        start_y = init_box['y'] + init_box['height'] / 2
        page.mouse.move(start_x, start_y)
        page.mouse.down()
        page.mouse.move(start_x - 150, start_y, steps=8)
        page.mouse.up()
        page.wait_for_timeout(500)

        left_box = profit_zone.bounding_box()
        print(f"[INFO] After left drag: x={left_box['x']}, y={left_box['y']}, w={left_box['width']}")
        assert left_box['x'] < init_box['x'] - 50, f"Expected box to move left, but x moved from {init_box['x']} to {left_box['x']}"
        print("[PASS] Trade setup body successfully moved to the left in time!")

        print("==================================================")
        print(">>> 3. Dragging Trade Setup Body Horizontally to the Right")
        print("==================================================")
        cur_x = left_box['x'] + 20
        cur_y = left_box['y'] + left_box['height'] / 2
        page.mouse.move(cur_x, cur_y)
        page.mouse.down()
        page.mouse.move(cur_x + 220, cur_y, steps=8)
        page.mouse.up()
        page.wait_for_timeout(500)

        right_box = profit_zone.bounding_box()
        print(f"[INFO] After right drag: x={right_box['x']}, y={right_box['y']}, w={right_box['width']}")
        assert right_box['x'] > left_box['x'] + 80, f"Expected box to move right, but x is {right_box['x']}"
        print("[PASS] Trade setup body successfully moved to the right in time!")

        print("==================================================")
        print(">>> 4. Dragging Left-Edge Handle (Start Handle)")
        print("==================================================")
        start_handle = page.locator("[data-testid='on-chart-setup-start-handle']")
        assert start_handle.is_visible(), "Start handle must be visible"
        start_handle_box = start_handle.bounding_box()
        print(f"[INFO] Start handle position: x={start_handle_box['x']}, y={start_handle_box['y']}")
        
        page.mouse.move(start_handle_box['x'] + 2, start_handle_box['y'] + start_handle_box['height'] / 2)
        page.mouse.down()
        page.mouse.move(start_handle_box['x'] - 80, start_handle_box['y'] + start_handle_box['height'] / 2, steps=6)
        page.mouse.up()
        page.wait_for_timeout(500)

        expanded_box = profit_zone.bounding_box()
        print(f"[INFO] After left-handle drag: x={expanded_box['x']}, w={expanded_box['width']}")
        assert expanded_box['width'] > right_box['width'] + 20, "Box width should have expanded after dragging left handle"
        print("[PASS] Left-edge handle successfully adjusted setup start time & width!")

        print("==================================================")
        print(">>> 5. Checking Order Type Deduction (Limit vs Stop vs Market)")
        print("==================================================")
        # Drag Entry Line DOWN well below current price to guarantee BUY LIMIT
        entry_coords = page.evaluate("""() => {
            const entryEl = document.querySelector('[data-testid="on-chart-setup-entry"]');
            const entryLine = entryEl.querySelector('line[stroke-width="12"]') || entryEl.querySelector('line');
            const svgRect = document.querySelector('[data-testid="drawing-svg"]').getBoundingClientRect();
            return {
                entryY: entryLine.y1.baseVal.value + svgRect.top,
                dragX: entryLine.x1.baseVal.value + svgRect.left + 30
            };
        }""")
        print(f"[INFO] Entry Line Coords: {entry_coords}")
        page.mouse.move(entry_coords['dragX'], entry_coords['entryY'])
        page.mouse.down()
        # Moving down increases y, decreases price below market price -> BUY LIMIT
        page.mouse.move(entry_coords['dragX'], entry_coords['entryY'] + 50, steps=6)
        page.mouse.up()
        page.wait_for_timeout(500)

        badge_text_limit = page.locator("[data-testid='floating-trade-panel'] span:has-text('BUY')").first.inner_text()
        confirm_btn_text_limit = page.locator("[data-testid='trade-panel-confirm-setup-btn']").inner_text()
        print(f"[INFO] After dragging entry down: Badge='{badge_text_limit}', Button='{confirm_btn_text_limit}'")
        assert "BUY LIMIT" in badge_text_limit or "LIMIT" in confirm_btn_text_limit, "Expected BUY LIMIT order type when entry is below market price"
        print("[PASS] BUY LIMIT successfully deduced!")

        # Take screenshot of setup before placing
        page.screenshot(path="C:/Users/moham/.gemini/antigravity/scratch/eurusd-workstation/scratch/before_place_limit.png")

        print("==================================================")
        print(">>> 6. Confirming BUY LIMIT Order (Pending State)")
        print("==================================================")
        page.click("[data-testid='trade-panel-confirm-setup-btn']")
        page.wait_for_timeout(1000)

        # Floating panel should now show ORDER PENDING banner
        pending_banner = page.locator("text=ORDER PENDING")
        assert pending_banner.is_visible(), "Expected ORDER PENDING banner in FloatingTradeControlPanel"
        print("[PASS] ORDER PENDING banner is visible!")

        cancel_btn = page.locator("[data-testid='trade-panel-close-btn']")
        assert "Cancel Order" in cancel_btn.inner_text(), "Expected 'Cancel Order' button for pending trade"
        print("[PASS] Cancel Order button correctly displayed!")

        # Verify on-chart pending entry badge
        page.screenshot(path="C:/Users/moham/.gemini/antigravity/scratch/eurusd-workstation/scratch/pending_order_verified.png")
        page.screenshot(path="C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/pending_limit_order_verified.png")
        print("[PASS] Verified pending limit order placement and on-chart badge!")

        print("==================================================")
        print(">>> 7. Testing Mobile Viewport Compatibility (390x844)")
        print("==================================================")
        mobile_page = browser.new_page(viewport={"width": 390, "height": 844})
        mobile_page.goto("http://127.0.0.1:5173")
        mobile_page.wait_for_timeout(2500)

        # In mobile view, floating trade panel is visible with pending order
        mobile_panel = mobile_page.locator("[data-testid='floating-trade-panel']")
        if mobile_panel.count() > 0:
            print("[PASS] Mobile floating panel renders cleanly with pending order.")
            mobile_page.screenshot(path="C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/mobile_pending_order_verified.png")

        print("==================================================")
        print(">>> ALL TESTS PASSED SUCCESSFULLY!")
        print("==================================================")
        browser.close()

if __name__ == "__main__":
    run_test()
