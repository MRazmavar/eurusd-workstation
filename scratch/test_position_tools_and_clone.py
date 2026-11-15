import time
from playwright.sync_api import sync_playwright

def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)

        # -------------------------------------------------------------
        # TEST 1: Desktop Viewport - Long & Short Position Tools
        # -------------------------------------------------------------
        print("\n=== TEST 1: Desktop Viewport - Long & Short Position Tools ===")
        context = browser.new_context(viewport={'width': 1366, 'height': 768})
        page = context.new_page()

        page.goto('http://127.0.0.1:5173')
        page.wait_for_selector('div.tv-lightweight-charts', timeout=10000)
        time.sleep(1)

        # Clean slate: remove old drawings from backend and local storage
        import urllib.request
        try:
            req = urllib.request.Request('http://127.0.0.1:8008/api/drawings', method='DELETE')
            urllib.request.urlopen(req)
        except Exception:
            pass

        page.evaluate("() => { localStorage.removeItem('eurusd_drawings'); localStorage.removeItem('drawings'); }")
        page.reload()
        page.wait_for_selector('div.tv-lightweight-charts', timeout=10000)
        time.sleep(2)

        # 1. Select Long Position tool from sidebar
        print("1. Selecting Long Position tool...")
        trading_group_btn = page.locator('button[data-testid="tool-group-trading"]')
        assert trading_group_btn.count() > 0, "Tool group trading button not found"
        trading_group_btn.first.click()
        time.sleep(0.5)

        # 2. Click chart to place Long Position
        print("2. Clicking chart to place Long Position...")
        chart = page.locator('div.tv-lightweight-charts')
        box = chart.bounding_box()
        assert box is not None
        center_x = box['x'] + box['width'] * 0.5
        center_y = box['y'] + box['height'] * 0.5

        page.mouse.click(center_x, center_y)
        time.sleep(1)

        # 3. Verify Long Position drawing rendered in SVG
        long_drawing = page.locator('g[data-testid^="drawing-long-position-"]')
        assert long_drawing.count() == 1, f"Expected 1 Long Position drawing, found {long_drawing.count()}"
        print(f"Found {long_drawing.count()} Long Position drawing")

        # Verify TradingView Visual Geometry: Green profit rect, Red loss rect, Entry line, R:R badge
        profit_rect = long_drawing.first.locator('rect[fill="#089981"]')
        loss_rect = long_drawing.first.locator('rect[fill="#f23645"]')
        rr_badge = long_drawing.first.locator('text:has-text("Risk/reward ratio:")')
        target_tag = long_drawing.first.locator('text:has-text("Target:")')
        stop_tag = long_drawing.first.locator('text:has-text("Stop:")')

        assert profit_rect.count() > 0, "Profit green rect missing"
        assert loss_rect.count() > 0, "Loss red rect missing"
        assert rr_badge.count() > 0, "Central R:R badge missing"
        assert target_tag.count() > 0, "Target tag missing"
        assert stop_tag.count() > 0, "Stop tag missing"
        print(f"Verified TV Visual Geometry: {rr_badge.first.text_content()}")
        print(f"Target Tag: {target_tag.first.text_content()}")
        print(f"Stop Tag: {stop_tag.first.text_content()}")

        # 4. Check selection handles
        handles = page.locator('circle[data-testid^="anchor-handle-"]')
        print(f"Selection handles visible: {handles.count()}")
        assert handles.count() >= 4, "Expected at least 4 selection handles on Long Position"

        # 5. Drag SL handle (point 1) downwards
        sl_handle = page.locator('circle[data-testid$="-1"]')
        assert sl_handle.count() == 1, "SL handle (-1) not found"
        sl_box = sl_handle.first.bounding_box()
        assert sl_box is not None

        print("Dragging SL handle downwards...")
        page.mouse.move(sl_box['x'] + sl_box['width']/2, sl_box['y'] + sl_box['height']/2)
        page.mouse.down()
        page.mouse.move(sl_box['x'] + sl_box['width']/2, sl_box['y'] + sl_box['height']/2 + 40, steps=5)
        page.mouse.up()
        time.sleep(0.5)

        print(f"After SL drag, R:R badge: {rr_badge.first.text_content()}")

        # 6. Test Auto-flip: Drag SL handle ABOVE entry price to flip from Long Position to Short Position!
        print("Testing Auto-flip: Dragging SL handle above Entry price...")
        sl_box_new = sl_handle.first.bounding_box()
        page.mouse.move(sl_box_new['x'] + sl_box_new['width']/2, sl_box_new['y'] + sl_box_new['height']/2)
        page.mouse.down()
        for step in range(1, 15):
            curr_y = sl_box_new['y'] + sl_box_new['height']/2 - (step * 10)
            page.mouse.move(sl_box_new['x'] + sl_box_new['width']/2, curr_y)
            time.sleep(0.02)
        page.mouse.up()
        time.sleep(0.5)

        short_drawing = page.locator('g[data-testid^="drawing-short-position-"]')
        assert short_drawing.count() == 1, "Auto-flip failed: expected drawing to flip to Short Position"
        print("Successfully auto-flipped Long Position to Short Position!")

        # 7. Test Double Click to Open Properties Modal with Inputs & Sizing Tab
        print("7. Testing Properties Modal Inputs Tab...")
        short_drawing.first.dblclick()
        time.sleep(0.5)

        modal = page.locator('div[data-testid="drawing-properties-modal"]')
        assert modal.count() > 0, "Properties modal did not open on double click"
        inputs_tab_btn = page.locator('button[data-testid="tab-position-inputs"]')
        assert inputs_tab_btn.count() > 0, "Inputs & Sizing tab missing from modal"
        print("Properties modal opened with Inputs & Sizing tab!")

        # Verify live stats in modal
        modal_rr = modal.locator('text=Risk/Reward Ratio:')
        assert modal_rr.count() > 0
        print("Found modal Risk/Reward Ratio live calculation!")

        # Close modal
        page.locator('button[data-testid="save-drawing-properties-btn"]').click()
        time.sleep(0.5)

        # 8. Test Ctrl + Mouse Drag to Clone
        print("8. Testing Ctrl + Mouse Drag to Clone...")
        drawings_before = page.locator('g[data-testid^="drawing-object-"]').count()
        print(f"Total drawings before clone: {drawings_before}")

        # Target drawing body
        drawing_body = page.locator('g[data-testid^="drawing-object-"]').first
        d_box = drawing_body.bounding_box()
        assert d_box is not None

        # Hold Ctrl and drag drawing body
        drag_from_x = d_box['x'] + d_box['width'] * 0.3
        drag_from_y = d_box['y'] + d_box['height'] * 0.5
        drag_to_x = drag_from_x + 120
        drag_to_y = drag_from_y + 60

        page.keyboard.down('Control')
        page.mouse.move(drag_from_x, drag_from_y)
        page.mouse.down()
        page.mouse.move(drag_to_x, drag_to_y, steps=8)
        page.mouse.up()
        page.keyboard.up('Control')
        time.sleep(0.5)

        drawings_after = page.locator('g[data-testid^="drawing-object-"]').count()
        print(f"Total drawings after Ctrl+Drag clone: {drawings_after}")
        assert drawings_after == drawings_before + 1, f"Expected {drawings_before + 1} drawings, but got {drawings_after}"
        print("Successfully cloned drawing using Ctrl + Mouse Drag!")

        # Test Undo (Ctrl + Z)
        page.keyboard.press('Control+z')
        time.sleep(0.5)
        drawings_after_undo = page.locator('g[data-testid^="drawing-object-"]').count()
        print(f"Total drawings after Undo (Ctrl+Z): {drawings_after_undo}")
        assert drawings_after_undo == drawings_before, "Undo did not revert cloned drawing"
        print("Successfully verified Undo for cloned drawing!")

        page.screenshot(path='scratch/tv_positions_desktop_verified.png')
        context.close()

        # -------------------------------------------------------------
        # TEST 2: Mobile Viewport Touchscreen Interaction
        # -------------------------------------------------------------
        print("\n=== TEST 2: Mobile Viewport Touchscreen Interaction ===")
        # iPhone 14 mobile emulation
        mobile_device = p.devices['iPhone 14']
        mobile_context = browser.new_context(**mobile_device)
        mobile_page = mobile_context.new_page()

        mobile_page.goto('http://127.0.0.1:5173')
        mobile_page.wait_for_selector('div.tv-lightweight-charts', timeout=10000)
        time.sleep(2)

        # Select Long Position tool from mobile bottom nav -> tools sheet
        print("Selecting Long Position on mobile...")
        tools_nav = mobile_page.locator('button[data-testid="mobile-nav-tools"]')
        if tools_nav.count() > 0:
            tools_nav.click()
            time.sleep(0.5)
        mobile_tool_btn = mobile_page.locator('[data-testid="mobile-tool-item-long_position"]')
        assert mobile_tool_btn.count() > 0, "mobile-tool-item-long_position not found"
        mobile_tool_btn.click()
        time.sleep(0.5)

        # Tap chart to place
        m_chart = mobile_page.locator('div.tv-lightweight-charts')
        m_box = m_chart.bounding_box()
        assert m_box is not None
        tap_x = m_box['x'] + m_box['width'] * 0.5
        tap_y = m_box['y'] + m_box['height'] * 0.5

        mobile_page.touchscreen.tap(tap_x, tap_y)
        time.sleep(1)

        m_long = mobile_page.locator('g[data-testid^="drawing-long-position-"]')
        print(f"Mobile Long Position drawings rendered: {m_long.count()}")
        assert m_long.count() > 0, "Long position not placed on mobile"

        # Check that mobile hit targets have large 32px radius (64px diameter touch target)
        m_handle = mobile_page.locator('circle[data-testid$="-1"]').last
        r_val = m_handle.get_attribute('r')
        print(f"Mobile anchor handle radius: {r_val}px (Touch Target: {float(r_val)*2}px diameter)")
        assert float(r_val) >= 28, f"Mobile handle radius should be >= 28px, got {r_val}"

        # Touch drag handle
        h_box = m_handle.bounding_box()
        assert h_box is not None
        start_tx = h_box['x'] + h_box['width']/2
        start_ty = h_box['y'] + h_box['height']/2

        print("Executing touch drag on mobile anchor handle...")
        mobile_page.mouse.move(start_tx, start_ty)
        mobile_page.mouse.down()
        mobile_page.mouse.move(start_tx, start_ty + 30, steps=5)
        mobile_page.mouse.up()
        time.sleep(0.5)

        mobile_page.screenshot(path='scratch/tv_positions_mobile_verified.png')
        print("Mobile touchscreen interaction verified successfully!")
        mobile_context.close()

        browser.close()
        print("\nALL POSITION TOOL & CLONE TESTS PASSED PERFECTLY!")

if __name__ == '__main__':
    run_tests()
