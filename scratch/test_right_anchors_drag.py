import time
from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        page = browser.new_page(viewport={'width': 1400, 'height': 900})
        page.goto('http://127.0.0.1:5173')
        page.wait_for_selector('[data-testid="drawing-svg"]', timeout=15000)
        time.sleep(1)

        # Clear existing drawings
        page.on('dialog', lambda d: d.accept())
        trash = page.locator('button[title="Remove All Drawings"]')
        if trash.is_visible():
            trash.click()
            time.sleep(0.5)

        chart = page.locator('[data-testid="drawing-svg"]')
        box = chart.bounding_box()

        # Place Long Position
        page.locator('[data-testid="fav-tool-long_position"]').click()
        time.sleep(0.3)
        page.mouse.click(box['x'] + 400, box['y'] + 250)
        time.sleep(1)

        drawing = page.locator('g[data-testid^="drawing-long-position-"]').first
        draw_id = drawing.get_attribute('data-testid').replace('drawing-long-position-', '')

        # Check all 6 handles exist
        h0 = page.locator(f'[data-testid="anchor-handle-{draw_id}-0"]') # Left Entry
        h1 = page.locator(f'[data-testid="anchor-handle-{draw_id}-1"]') # Mid SL
        h2 = page.locator(f'[data-testid="anchor-handle-{draw_id}-2"]') # Mid TP
        h3 = page.locator(f'[data-testid="anchor-handle-{draw_id}-3"]') # Right Entry / Width
        h4 = page.locator(f'[data-testid="anchor-handle-{draw_id}-4"]') # Top-Right TP
        h5 = page.locator(f'[data-testid="anchor-handle-{draw_id}-5"]') # Bottom-Right SL

        for idx, h in enumerate([h0, h1, h2, h3, h4, h5]):
            assert h.count() == 1, f"Handle {idx} should exist"

        print("All 6 position handles rendered successfully!")

        # 1. Test Handle 3 (Middle-Right): Drag to the right AND up diagonally
        h3_box = h3.bounding_box()
        target_x = h3_box['x'] + 120
        target_y = h3_box['y'] - 60
        print(f"\n1. Dragging Middle-Right Handle 3 from ({h3_box['x']}, {h3_box['y']}) to ({target_x}, {target_y})...")
        page.mouse.move(h3_box['x'] + 14, h3_box['y'] + 14)
        page.mouse.down()
        page.mouse.move(target_x, target_y, steps=10)
        time.sleep(0.5)
        page.mouse.up()
        time.sleep(0.5)

        h3_new = h3.bounding_box()
        print(f"Handle 3 is now at ({h3_new['x'] + 14}, {h3_new['y'] + 14})")
        # Verify handle moved both horizontally and vertically
        assert h3_new['x'] > h3_box['x'] + 80, "Handle 3 should have moved right with mouse!"
        assert h3_new['y'] < h3_box['y'] - 30, "Handle 3 should have moved up with mouse!"
        print("PASS: Middle-Right Handle 3 followed mouse in both X and Y!")

        # 2. Test Handle 4 (Top-Right Take Profit): Drag to the right AND up
        h4_box = h4.bounding_box()
        target_x4 = h4_box['x'] + 80
        target_y4 = h4_box['y'] - 40
        print(f"\n2. Dragging Top-Right Handle 4 from ({h4_box['x']}, {h4_box['y']}) to ({target_x4}, {target_y4})...")
        page.mouse.move(h4_box['x'] + 14, h4_box['y'] + 14)
        page.mouse.down()
        page.mouse.move(target_x4, target_y4, steps=10)
        time.sleep(0.5)
        page.mouse.up()
        time.sleep(0.5)

        h4_new = h4.bounding_box()
        print(f"Handle 4 is now at ({h4_new['x'] + 14}, {h4_new['y'] + 14})")
        assert h4_new['x'] > h4_box['x'] + 40, "Handle 4 should have moved right with mouse!"
        assert h4_new['y'] < h4_box['y'] - 20, "Handle 4 should have moved up with mouse!"
        print("PASS: Top-Right Handle 4 followed mouse in both X and Y!")

        # 3. Test Handle 5 (Bottom-Right Stop Loss): Drag to the left AND down
        h5_box = h5.bounding_box()
        target_x5 = h5_box['x'] - 60
        target_y5 = h5_box['y'] + 80
        print(f"\n3. Dragging Bottom-Right Handle 5 from ({h5_box['x']}, {h5_box['y']}) to ({target_x5}, {target_y5})...")
        page.mouse.move(h5_box['x'] + 14, h5_box['y'] + 14)
        page.mouse.down()
        page.mouse.move(target_x5, target_y5, steps=10)
        time.sleep(0.5)
        page.mouse.up()
        time.sleep(0.5)

        h5_new = h5.bounding_box()
        print(f"Handle 5 is now at ({h5_new['x'] + 14}, {h5_new['y'] + 14})")
        assert h5_new['x'] < h5_box['x'] - 20, "Handle 5 should have moved left with mouse!"
        assert h5_new['y'] > h5_box['y'] + 10, "Handle 5 should have moved down with mouse!"
        print("PASS: Bottom-Right Handle 5 followed mouse in both X and Y!")

        # 4. Drag Middle-Right Handle to the LEFT past the entry line
        h0_box = h0.bounding_box()
        h3_cur = h3.bounding_box()
        target_left_x = h0_box['x'] - 80
        print(f"\n4. Dragging Right Handle past Entry line to the left: target_x={target_left_x}...")
        page.mouse.move(h3_cur['x'] + 14, h3_cur['y'] + 14)
        page.mouse.down()
        page.mouse.move(target_left_x, h3_cur['y'] + 14, steps=15)
        time.sleep(0.5)
        page.mouse.up()
        time.sleep(0.5)

        h3_past_left = h3.bounding_box()
        print(f"Handle 3 is now at x={h3_past_left['x'] + 14} (entry was at x={h0_box['x'] + 14})")
        assert h3_past_left['x'] < h0_box['x'], "Handle 3 should freely move to the left of entry point without getting stuck!"
        print("PASS: Right handle freely moves in either direction past entry without getting stuck!")

        # Screenshot verification
        out_path = r"C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/right_anchor_points_verified.png"
        page.screenshot(path=out_path)
        print(f"\nScreenshot saved to: {out_path}")

        browser.close()
        print("\nALL RIGHT ANCHOR POINT TESTS PASSED WITH 100% SUCCESS!")

if __name__ == '__main__':
    main()
