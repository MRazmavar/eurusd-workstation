import time
from playwright.sync_api import sync_playwright

def test_mobile_trade_options_and_anchor_drag():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        # Mobile iPhone 14 viewport
        context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            has_touch=True,
            is_mobile=True,
            device_scale_factor=2
        )
        page = context.new_page()
        page.goto('http://127.0.0.1:5173')
        page.wait_for_selector('[data-testid="drawing-svg"]', timeout=15000)
        time.sleep(1.5)

        # Clear any existing drawings
        page.on('dialog', lambda d: d.accept())
        trash = page.locator('button[title="Remove All Drawings"]')
        if trash.is_visible():
            trash.click()
            time.sleep(0.5)

        chart = page.locator('[data-testid="drawing-svg"]')
        box = chart.bounding_box()

        # 1. Place a Long Position drawing
        fav_btn = page.locator('[data-testid="fav-tool-long_position"]')
        if not fav_btn.is_visible():
            # Open mobile tools drawer
            page.locator('button:has-text("Tools")').click()
            time.sleep(0.5)
            page.locator('[data-testid="mobile-tool-item-long_position"]').click()
            time.sleep(0.5)
        else:
            fav_btn.click()
            time.sleep(0.3)

        # Tap chart to place drawing
        place_x = box['x'] + 120
        place_y = box['y'] + 220
        page.mouse.click(place_x, place_y)
        time.sleep(1)

        drawing = page.locator('g[data-testid^="drawing-long-position-"]').first
        assert drawing.count() > 0, "Long position drawing must be placed!"
        draw_id = drawing.get_attribute('data-testid').replace('drawing-long-position-', '')
        print(f"Placed drawing ID: {draw_id}", flush=True)

        # 2. Verify DrawingToolbarPopup on Mobile
        popup = page.locator('[data-testid="drawing-toolbar-popup"]')
        assert popup.is_visible(), "Drawing toolbar popup should appear when drawing is selected"
        popup_box = popup.bounding_box()
        print(f"Popup bounding box on mobile (390px viewport): {popup_box}", flush=True)

        # Ensure popup does not overflow viewport width
        assert popup_box['x'] >= 0, "Popup must not be clipped on the left"
        assert popup_box['x'] + popup_box['width'] <= 390 + 5, "Popup must not overflow right edge of mobile screen!"

        # Verify physical slider and scroll container exist
        slider_bar = page.locator('[data-testid="drawing-toolbar-slider-bar"]')
        slider_input = page.locator('[data-testid="drawing-toolbar-physical-slider"]')
        scroll_container = page.locator('[data-testid="drawing-toolbar-scroll-container"]')

        assert slider_bar.is_visible(), "Physical slider bar should be visible on mobile!"
        assert slider_input.is_visible(), "Physical range slider input should be visible!"
        assert scroll_container.is_visible(), "Scroll container should be visible!"

        # Check initial scroll position
        initial_scroll = page.evaluate('''(el) => el.scrollLeft''', scroll_container.element_handle())
        assert initial_scroll == 0, "Initial scrollLeft should be 0"

        # Test sliding the physical slider
        print("Testing physical slider interaction...", flush=True)
        max_val = float(slider_input.get_attribute('max') or '100')
        assert max_val > 0, f"Slider max should be greater than 0, got {max_val}"

        # Slide physically to 80px
        slider_input.fill(str(min(80, max_val)))
        slider_input.dispatch_event('input')
        slider_input.dispatch_event('change')
        time.sleep(0.3)

        new_scroll = page.evaluate('''(el) => el.scrollLeft''', scroll_container.element_handle())
        print(f"ScrollLeft after slider adjustment: {new_scroll}px", flush=True)
        assert new_scroll > 0, "Physical slider must update horizontal scroll of tools row!"

        # Verify buttons that were previously hidden (e.g. Delete, Settings, Duplicate) are now visible / accessible
        delete_btn = page.locator('[data-testid="delete-drawing-btn"]')
        assert delete_btn.is_visible(), "Delete button must be accessible!"

        # Screenshot mobile trade options toolbar with slider
        mobile_options_png = r"C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/mobile_trade_options_slider_verified.png"
        page.screenshot(path=mobile_options_png)
        print(f"Saved mobile toolbar screenshot to: {mobile_options_png}", flush=True)

        # 3. Test Right Anchor (Handle 3) Dragging 1:1 Tracking
        all_handles = page.locator('[data-testid^="anchor-handle-"]').all()
        print(f"Current visible handles in DOM ({len(all_handles)}):", [h.get_attribute('data-testid') for h in all_handles], flush=True)

        assert len(all_handles) >= 5, "Handles must be rendered for the selected drawing!"
        # Extract active draw_id from the visible handles
        first_handle_id = all_handles[0].get_attribute('data-testid')
        # format: anchor-handle-{draw_id}-{pointIndex}
        parts = first_handle_id.split('-')
        active_draw_id = parts[2]
        print(f"Active drawing ID from handles: {active_draw_id}", flush=True)

        h3 = page.locator(f'[data-testid="anchor-handle-{active_draw_id}-3"]')
        assert h3.count() == 1, "Handle 3 should exist"
        assert h3.count() == 1, "Handle 3 should exist"
        h3_box = h3.bounding_box()
        start_x = h3_box['x'] + h3_box['width'] / 2
        start_y = h3_box['y'] + h3_box['height'] / 2
        print(f"\nTesting Handle 3 drag from ({start_x:.1f}, {start_y:.1f})...", flush=True)

        # Drag 80px to the right
        target_drag_x = start_x + 80
        page.mouse.move(start_x, start_y)
        page.mouse.down()
        for step in range(1, 11):
            cur = start_x + (target_drag_x - start_x) * (step / 10)
            page.mouse.move(cur, start_y)
            time.sleep(0.02)
        page.mouse.up()
        time.sleep(0.5)

        h3_after = h3.bounding_box()
        after_x = h3_after['x'] + h3_after['width'] / 2
        actual_delta = after_x - start_x
        print(f"Handle 3 moved by {actual_delta:.1f}px (target requested: 80.0px, diff: {actual_delta - 80:.1f}px)", flush=True)
        assert abs(actual_delta - 80) < 15, f"Handle 3 must track mouse 1:1, expected ~80px movement but got {actual_delta:.1f}px"

        # Screenshot after right anchor drag
        right_anchor_png = r"C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/right_anchor_drag_1to1_verified.png"
        page.screenshot(path=right_anchor_png)
        print(f"Saved right anchor drag screenshot to: {right_anchor_png}", flush=True)

        browser.close()
        print("\nALL MOBILE OPTIONS AND ANCHOR DRAG TESTS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    test_mobile_trade_options_and_anchor_drag()
