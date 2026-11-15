import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://127.0.0.1:5173')
    page.wait_for_selector('[data-testid="drawing-svg"]', timeout=15000)
    time.sleep(1)

    chart = page.locator('[data-testid="drawing-svg"]')
    box = chart.bounding_box()

    # Click on the chart at x=500, y=250
    click_x = box['x'] + 500
    click_y = box['y'] + 250

    # Inspect what mouse.time and timeToX give
    info = page.evaluate('''(pt) => {
        const svg = document.querySelector('[data-testid="drawing-svg"]');
        // Let's get magnet snap info or transformer info if accessible
        return {
            windowWidth: window.innerWidth,
        };
    }''', {'x': 500, 'y': 250})
    print("Info:", info)
    browser.close()
