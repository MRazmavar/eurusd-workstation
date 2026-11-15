import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    page = browser.new_page(viewport={'width': 1366, 'height': 768})

    page.goto('http://127.0.0.1:5173')
    page.wait_for_selector('div.tv-lightweight-charts', timeout=10000)
    time.sleep(2)

    # Inspect current drawings in localStorage or React
    pts = page.evaluate("""() => {
        const str = localStorage.getItem('eurusd_drawings') || localStorage.getItem('drawings');
        return str ? JSON.parse(str) : [];
    }""")
    print("Placed drawings:", pts)
    browser.close()
