import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    page = browser.new_page(viewport={'width': 1366, 'height': 768})

    import urllib.request
    try:
        req = urllib.request.Request('http://127.0.0.1:8008/api/drawings', method='DELETE')
        urllib.request.urlopen(req)
    except Exception:
        pass

    page.goto('http://127.0.0.1:5173')
    page.wait_for_selector('div.tv-lightweight-charts', timeout=10000)
    time.sleep(2)

    page.locator('button[data-testid="tool-group-trading"]').first.click()
    time.sleep(0.5)

    chart = page.locator('div.tv-lightweight-charts')
    box = chart.bounding_box()
    center_x = box['x'] + box['width'] * 0.5
    center_y = box['y'] + box['height'] * 0.5
    page.mouse.click(center_x, center_y)
    time.sleep(1)

    # Check drawing object
    drawings = page.evaluate("() => window.__all_drawings || []")
    print("Initial drawings:", drawings)

    # Check handle 1
    sl_handle = page.locator('circle[data-testid$="-1"]')
    print("Handle 1 count:", sl_handle.count())
    sl_box = sl_handle.first.bounding_box()
    print("Handle 1 box:", sl_box)
    print("Chart center_y:", center_y)

    # Move above center_y
    page.mouse.move(sl_box['x'] + sl_box['width']/2, sl_box['y'] + sl_box['height']/2)
    page.mouse.down()
    for step in range(1, 11):
        curr_y = sl_box['y'] + (center_y - 100 - sl_box['y']) * (step / 10)
        page.mouse.move(sl_box['x'] + sl_box['width']/2, curr_y)
        time.sleep(0.05)
    page.mouse.up()
    time.sleep(1)

    types = page.evaluate("() => Array.from(document.querySelectorAll('g[data-testid^=\"drawing-\"]')).map(el => el.getAttribute('data-testid'))")
    print("Drawings after drag up:", types)

    browser.close()
