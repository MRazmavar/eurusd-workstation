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

    handles_info = page.evaluate("""() => {
        const circles = Array.from(document.querySelectorAll('circle[data-testid^="anchor-handle-"]'));
        return circles.map(c => ({
            id: c.getAttribute('data-testid'),
            cx: c.getAttribute('cx'),
            cy: c.getAttribute('cy'),
            r: c.getAttribute('r')
        }));
    }""")
    for h in handles_info:
        print(h)

    browser.close()
