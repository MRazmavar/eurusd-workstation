import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        context = browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
        page = context.new_page()
        page.goto('http://127.0.0.1:5173')
        page.wait_for_selector('[data-testid="drawing-svg"]', timeout=15000)
        time.sleep(1.5)

        # Place a long position using tools drawer or direct invocation
        page.evaluate('''() => {
            // Find drawing manager or trigger long_position
            const btn = document.querySelector('[data-testid="mobile-tool-item-long_position"]') ||
                        document.querySelector('[data-testid="fav-tool-long_position"]');
            if (btn) btn.click();
        }''')
        time.sleep(0.5)

        svg = page.locator('[data-testid="drawing-svg"]')
        box = svg.bounding_box()
        # Tap on chart to place position
        page.touchscreen.tap(box['x'] + 150, box['y'] + 250)
        time.sleep(1)

        drawing = page.locator('g[data-testid^="drawing-long-position-"]').first
        if drawing.count() == 0:
            print("No drawing placed! Trying to place via desktop fav button...")
            page.locator('[data-testid="fav-tool-long_position"]').click()
            page.mouse.click(box['x'] + 150, box['y'] + 250)
            time.sleep(1)
            drawing = page.locator('g[data-testid^="drawing-long-position-"]').first

        draw_id = drawing.get_attribute('data-testid').replace('drawing-long-position-', '')
        print(f"Placed drawing ID: {draw_id}")

        h3 = page.locator(f'[data-testid="anchor-handle-{draw_id}-3"]')
        h3_box = h3.bounding_box()
        print(f"Handle 3 initial box: {h3_box}")

        # Now test drag to the right by 100px using touchscreen gesture / mouse
        start_x = h3_box['x'] + h3_box['width'] / 2
        start_y = h3_box['y'] + h3_box['height'] / 2
        target_x = start_x + 100
        target_y = start_y

        print(f"Dragging from ({start_x}, {start_y}) to ({target_x}, {target_y}) via touch / pointer...")
        # Pointer / touch down
        page.mouse.move(start_x, start_y)
        page.mouse.down()
        for i in range(1, 11):
            cur_x = start_x + (target_x - start_x) * (i / 10)
            page.mouse.move(cur_x, target_y)
            time.sleep(0.05)
        page.mouse.up()
        time.sleep(0.5)

        h3_after = h3.bounding_box()
        after_x = h3_after['x'] + h3_after['width'] / 2
        print(f"Handle 3 after drag: {after_x} (delta: {after_x - start_x}px, requested: 100px)")

        browser.close()

if __name__ == '__main__':
    run()
