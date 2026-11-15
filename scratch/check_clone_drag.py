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

    print("Before clone, drawings in DOM:")
    objs = page.evaluate("() => Array.from(document.querySelectorAll('g[data-testid^=\"drawing-object-\"]')).map(el => el.getAttribute('data-testid'))")
    print(objs)

    d_el = page.locator('g[data-testid^="drawing-object-"]').first
    d_box = d_el.bounding_box()
    print("Drawing bbox:", d_box)

    # Click with Ctrl
    from_x = d_box['x'] + d_box['width'] * 0.5
    from_y = d_box['y'] + d_box['height'] * 0.5

    # Check what element is at from_x, from_y
    el_at_pt = page.evaluate(f"() => document.elementFromPoint({from_x}, {from_y})?.outerHTML?.slice(0, 150)")
    print("Element at pointer:", el_at_pt)

    page.keyboard.down('Control')
    page.mouse.move(from_x, from_y)
    page.mouse.down()
    page.mouse.move(from_x + 100, from_y + 50, steps=5)
    page.mouse.up()
    page.keyboard.up('Control')
    time.sleep(1)

    objs_after = page.evaluate("() => Array.from(document.querySelectorAll('g[data-testid^=\"drawing-object-\"]')).map(el => el.getAttribute('data-testid'))")
    print("After clone, drawings in DOM:", objs_after)

    browser.close()
