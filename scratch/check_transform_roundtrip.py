import sys
import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1200, 'height': 800})
    page.goto('http://127.0.0.1:5173')
    page.wait_for_selector('[data-testid="drawing-svg"]', timeout=15000)
    time.sleep(1)

    # Place a long position
    page.locator('[data-testid="fav-tool-long_position"]').click()
    svg = page.locator('[data-testid="drawing-svg"]')
    box = svg.bounding_box()
    
    # Click at x=300, y=300
    page.mouse.click(box['x'] + 300, box['y'] + 300)
    time.sleep(1)

    drawing = page.locator('g[data-testid^="drawing-long-position-"]').first
    draw_id = drawing.get_attribute('data-testid').replace('drawing-long-position-', '')
    
    h3 = page.locator(f'[data-testid="anchor-handle-{draw_id}-3"]')
    h3_box = h3.bounding_box()
    print("Initial h3_box:", h3_box, flush=True)

    # Let's test dragging h3 by 50px, 100px, 150px, 200px
    # And check how far h3 actually moves!
    start_x = h3_box['x'] + h3_box['width'] / 2
    start_y = h3_box['y'] + h3_box['height'] / 2

    for delta_x in [50, 100, 150, 200, 250]:
        target_x = start_x + delta_x
        page.mouse.move(start_x, start_y)
        page.mouse.down()
        page.mouse.move(target_x, start_y, steps=10)
        page.mouse.up()
        time.sleep(0.3)

        cur_box = h3.bounding_box()
        cur_x = cur_box['x'] + cur_box['width'] / 2
        actual_delta = cur_x - start_x
        print(f"Target Delta: {delta_x}px -> Actual Delta: {actual_delta:.1f}px (diff: {actual_delta - delta_x:.1f}px)", flush=True)

    browser.close()
