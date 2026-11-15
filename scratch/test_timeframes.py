import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://127.0.0.1:5173/')
    page.wait_for_selector('[data-testid="drawing-svg"]', timeout=15000)
    time.sleep(1)

    # Clear previous drawings
    page.on('dialog', lambda d: d.accept())
    trash = page.locator('button[title="Remove All Drawings"]')
    if trash.is_visible():
        trash.click()
        time.sleep(0.5)

    chart = page.locator('[data-testid="drawing-svg"]')
    box = chart.bounding_box()

    # Place a Long Position
    page.locator('[data-testid="fav-tool-long_position"]').click()
    time.sleep(0.3)
    page.mouse.click(box['x'] + 400, box['y'] + 250)
    time.sleep(0.5)

    # Capture 1m
    page.screenshot(path='scratch/tf_1m.png')
    print('1m captured')

    # Switch to 5m
    btn_5m = page.locator("button:has-text('5m')").first
    if btn_5m.is_visible():
        btn_5m.click()
        time.sleep(1.5)
        page.screenshot(path='scratch/tf_5m.png')
        print('5m captured')

    # Switch to 15m
    btn_15m = page.locator("button:has-text('15m')").first
    if btn_15m.is_visible():
        btn_15m.click()
        time.sleep(1.5)
        page.screenshot(path='scratch/tf_15m.png')
        print('15m captured')

    # Switch to 1h
    btn_1h = page.locator("button:has-text('1h')").first
    if btn_1h.is_visible():
        btn_1h.click()
        time.sleep(1.5)
        page.screenshot(path='scratch/tf_1h.png')
        print('1h captured')

    browser.close()
