import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://127.0.0.1:5173')
    page.wait_for_selector('[data-testid="drawing-svg"]', timeout=15000)
    time.sleep(1)

    short_btn = page.locator('[data-testid="fav-tool-short_position"]')
    print('short_btn visible:', short_btn.is_visible())
    short_btn.click()
    time.sleep(0.5)

    chart = page.locator('[data-testid="drawing-svg"]')
    box = chart.bounding_box()
    print('chart box:', box)
    page.mouse.click(box['x'] + 500, box['y'] + 300)
    time.sleep(1)

    short_drawings = page.locator('g[data-testid^="drawing-short-position-"]')
    print('short drawings count:', short_drawings.count())
    page.screenshot(path='test_short_debug.png')
    browser.close()
