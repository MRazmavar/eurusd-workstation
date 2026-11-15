import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('console', lambda msg: print(f"[CONSOLE {msg.type}] {msg.text}"))
        
        page.goto('http://127.0.0.1:5173')
        
        # Inject diagnostic observer
        time.sleep(1.0)
        diag = page.evaluate("""() => {
            // Check candles array and calculate avgStep
            const win = window;
            return {
                timeframe: localStorage.getItem('eurusd_saved_timeframe'),
                indicators: localStorage.getItem('eurusd_saved_indicators'),
            };
        }""")
        print("DIAG:", diag)
        time.sleep(2.0)
        browser.close()

if __name__ == '__main__':
    run()
