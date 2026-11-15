import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://127.0.0.1:5173')
    page.wait_for_selector('[data-testid="drawing-svg"]', timeout=15000)
    time.sleep(1)

    res = page.evaluate('''() => {
        const win = window;
        // Let's test xToTime with various screen X values
        // We can inspect the chart container transformer
        const svg = document.querySelector('[data-testid="drawing-svg"]');
        const rect = svg.getBoundingClientRect();
        return {
            svgWidth: rect.width,
            svgHeight: rect.height,
        };
    }''')
    print("SVG dimensions:", res)
    browser.close()
