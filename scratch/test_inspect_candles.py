import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.goto('http://127.0.0.1:5173')
        time.sleep(2.5)
        
        candles_info = page.evaluate("""() => {
            const chart = window.__TEST_CHART__ || {};
            // Let's get candles from DOM or window
            // Where are candles stored?
            return {
                // Let's see if we can inspect candles from React or App
            };
        }""")
        browser.close()

if __name__ == '__main__':
    run()
