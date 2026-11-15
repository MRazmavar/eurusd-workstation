import time
from playwright.sync_api import sync_playwright

def test_deep_anchors_and_mobile_slider():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
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

        # Clear drawings
        page.on('dialog', lambda d: d.accept())
        trash = page.locator('button[title="Remove All Drawings"]')
        if trash.is_visible():
            trash.click()
            time.sleep(0.5)

        chart = page.locator('[data-testid="drawing-svg"]')
        box = chart.bounding_box()

        # Place a Long Position
        page.locator('[data-testid="fav-tool-long_position"]').click()
        page.mouse.click(box['x'] + 100, box['y'] + 220)
        time.sleep(1)

        all_handles = page.locator('[data-testid^="anchor-handle-"]').all()
        assert len(all_handles) >= 5, "Handles must be rendered"
        active_draw_id = all_handles[0].get_attribute('data-testid').split('-')[2]
        print(f"Placed drawing ID: {active_draw_id}", flush=True)

        # 1. Test Handle 3 (Middle-Right) deep drag: 120px to the right into future
        h3 = page.locator(f'[data-testid="anchor-handle-{active_draw_id}-3"]')
        h3_box = h3.bounding_box()
        start_x = h3_box['x'] + h3_box['width'] / 2
        start_y = h3_box['y'] + h3_box['height'] / 2

        drag_dist = 120
        target_x = start_x + drag_dist
        print(f"\n1. Dragging Handle 3 by {drag_dist}px to the right (target: {target_x:.1f})...", flush=True)

        page.mouse.move(start_x, start_y)
        page.mouse.down()
        for step in range(1, 13):
            cur = start_x + (target_x - start_x) * (step / 12)
            page.mouse.move(cur, start_y)
            time.sleep(0.02)
        page.mouse.up()
        time.sleep(0.5)

        h3_box_new = h3.bounding_box()
        new_x = h3_box_new['x'] + h3_box_new['width'] / 2
        actual_delta = new_x - start_x
        print(f"Handle 3 moved by {actual_delta:.1f}px (diff: {actual_delta - drag_dist:.1f}px)", flush=True)
        assert abs(actual_delta - drag_dist) < 15, f"Expected ~{drag_dist}px movement, got {actual_delta:.1f}px"

        # 2. Test Handle 3 drag to the left (reducing width)
        left_drag = 60
        target_left = new_x - left_drag
        print(f"\n2. Dragging Handle 3 to the left by {left_drag}px...", flush=True)
        page.mouse.move(new_x, start_y)
        page.mouse.down()
        for step in range(1, 11):
            cur = new_x + (target_left - new_x) * (step / 10)
            page.mouse.move(cur, start_y)
            time.sleep(0.02)
        page.mouse.up()
        time.sleep(0.5)

        h3_box_left = h3.bounding_box()
        left_x = h3_box_left['x'] + h3_box_left['width'] / 2
        actual_left_delta = new_x - left_x
        print(f"Handle 3 moved left by {actual_left_delta:.1f}px (diff: {actual_left_delta - left_drag:.1f}px)", flush=True)
        assert abs(actual_left_delta - left_drag) < 15, f"Expected ~{left_drag}px left movement, got {actual_left_delta:.1f}px"

        # 3. Test chevron buttons on physical slider in DrawingToolbarPopup
        slider_left_btn = page.locator('[data-testid="drawing-toolbar-scroll-left"]')
        slider_right_btn = page.locator('[data-testid="drawing-toolbar-scroll-right"]')
        scroll_container = page.locator('[data-testid="drawing-toolbar-scroll-container"]')

        assert slider_right_btn.is_visible(), "Right scroll button must be visible"
        initial_scroll = page.evaluate('''(el) => el.scrollLeft''', scroll_container.element_handle())
        print(f"\n3. Initial toolbar scrollLeft: {initial_scroll}px. Clicking right button...", flush=True)

        slider_right_btn.click()
        time.sleep(0.5)

        scroll_after_btn = page.evaluate('''(el) => el.scrollLeft''', scroll_container.element_handle())
        print(f"Toolbar scrollLeft after clicking right: {scroll_after_btn}px", flush=True)
        assert scroll_after_btn > initial_scroll, "Clicking right chevron must scroll toolbar options"

        slider_left_btn.click()
        time.sleep(0.5)
        scroll_after_left = page.evaluate('''(el) => el.scrollLeft''', scroll_container.element_handle())
        print(f"Toolbar scrollLeft after clicking left: {scroll_after_left}px", flush=True)
        assert scroll_after_left < scroll_after_btn, "Clicking left chevron must scroll toolbar back"

        # 4. Save final verified screenshot
        final_png = r"C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/deep_anchors_and_mobile_slider_verified.png"
        page.screenshot(path=final_png)
        print(f"\nSaved deep verification screenshot to: {final_png}", flush=True)

        browser.close()
        print("\nALL DEEP TESTS PASSED WITH 100% SUCCESS!")

if __name__ == '__main__':
    test_deep_anchors_and_mobile_slider()
