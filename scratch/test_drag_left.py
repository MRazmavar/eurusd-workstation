import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://127.0.0.1:5173')
    page.wait_for_selector('[data-testid="drawing-svg"]', timeout=15000)
    time.sleep(1)

    page.on('dialog', lambda d: d.accept())
    trash = page.locator('button[title="Remove All Drawings"]')
    if trash.is_visible():
        trash.click()
        time.sleep(0.5)

    chart = page.locator('[data-testid="drawing-svg"]')
    box = chart.bounding_box()

    page.locator('[data-testid="fav-tool-long_position"]').click()
    time.sleep(0.3)
    page.mouse.click(box['x'] + 500, box['y'] + 250)
    time.sleep(0.5)

    drawing = page.locator('g[data-testid^="drawing-long-position-"]').first
    draw_id = drawing.get_attribute('data-testid').replace('drawing-long-position-', '')
    h3 = page.locator(f'[data-testid="anchor-handle-{draw_id}-3"]')
    h3_box = h3.bounding_box()

    # Drag h3 to the left of entry point: target_x = box['x'] + 200
    target_x = box['x'] + 200
    page.mouse.move(h3_box['x'] + 9, h3_box['y'] + 9)
    page.mouse.down()
    page.mouse.move(target_x, h3_box['y'] + 9, steps=10)
    time.sleep(0.5)
    new_h3 = h3.bounding_box()
    print(f"Target mouse X: {target_x}")
    print(f"Handle X: {new_h3['x'] + 9}")
    print(f"Difference: {target_x - (new_h3['x'] + 9)}")
    page.mouse.up()
    browser.close()
