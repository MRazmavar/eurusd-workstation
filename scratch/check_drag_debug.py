import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    page = browser.new_page(viewport={'width': 1366, 'height': 768})

    page.on('console', lambda msg: print('BROWSER CONSOLE:', msg.text))

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

    # Check handle 1
    sl_handle = page.locator('circle[data-testid$="-1"]')
    sl_box = sl_handle.first.bounding_box()
    print("SL handle bbox:", sl_box)

    # Move from sl_box up by 150px
    page.mouse.move(sl_box['x'] + sl_box['width']/2, sl_box['y'] + sl_box['height']/2)
    page.mouse.down()
    for step in range(1, 15):
        curr_y = sl_box['y'] + sl_box['height']/2 - (step * 10)
        page.mouse.move(sl_box['x'] + sl_box['width']/2, curr_y)
        time.sleep(0.02)
    page.mouse.up()
    time.sleep(1)

    types = page.evaluate("() => Array.from(document.querySelectorAll('g[data-testid^=\"drawing-\"]')).map(el => el.getAttribute('data-testid'))")
    print("Drawings after drag up:", types)

    browser.close()
