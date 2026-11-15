import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://127.0.0.1:5173')
    page.wait_for_selector('[data-testid="drawing-svg"]', timeout=15000)
    time.sleep(1)

    # Clear all drawings
    page.on("dialog", lambda dialog: dialog.accept())
    trash_btn = page.locator('button[title="Remove All Drawings"]')
    if trash_btn.is_visible():
        trash_btn.click()
        time.sleep(0.5)

    chart = page.locator('[data-testid="drawing-svg"]')
    box = chart.bounding_box()

    # Place a Long Position
    long_btn = page.locator('[data-testid="fav-tool-long_position"]')
    long_btn.click()
    time.sleep(0.3)

    click_x = box['x'] + 300
    click_y = box['y'] + 250
    page.mouse.click(click_x, click_y)
    time.sleep(1)

    # Find the right anchor handle (handle 3)
    drawing = page.locator('g[data-testid^="drawing-long-position-"]').first
    draw_id = drawing.get_attribute("data-testid").replace("drawing-long-position-", "")
    h3 = page.locator(f'[data-testid="anchor-handle-{draw_id}-3"]')
    h3_box = h3.bounding_box()
    print(f"Right anchor handle 3 initial box: {h3_box}")

    # Test 1: Drag handle 3 to the right by 100px
    print("\n--- Test 1: Dragging right by 100px ---")
    page.mouse.move(h3_box['x'] + 5, h3_box['y'] + 5)
    page.mouse.down()
    page.mouse.move(h3_box['x'] + 105, h3_box['y'] + 5, steps=10)
    page.mouse.up()
    time.sleep(0.5)
    h3_after_right = h3.bounding_box()
    print(f"After dragging right: {h3_after_right}")

    # Test 2: Drag handle 3 UP by 50px
    print("\n--- Test 2: Dragging handle 3 UP by 50px ---")
    page.mouse.move(h3_after_right['x'] + 5, h3_after_right['y'] + 5)
    page.mouse.down()
    page.mouse.move(h3_after_right['x'] + 5, h3_after_right['y'] - 50, steps=10)
    page.mouse.up()
    time.sleep(0.5)
    h3_after_up = h3.bounding_box()
    print(f"After dragging UP: {h3_after_up}")

    # Test 3: Drag handle 3 to the LEFT past the entry point
    print("\n--- Test 3: Dragging handle 3 to the LEFT past entry ---")
    h0 = page.locator(f'[data-testid="anchor-handle-{draw_id}-0"]')
    h0_box = h0.bounding_box()
    print(f"Left anchor handle 0 (entry) box: {h0_box}")

    page.mouse.move(h3_after_up['x'] + 5, h3_after_up['y'] + 5)
    page.mouse.down()
    # Move to the left of handle 0
    page.mouse.move(h0_box['x'] - 50, h3_after_up['y'] + 5, steps=15)
    page.mouse.up()
    time.sleep(0.5)
    h3_after_left = h3.bounding_box()
    print(f"After dragging LEFT past entry: {h3_after_left}")

    page.screenshot(path='test_drag_h3.png')
    browser.close()
