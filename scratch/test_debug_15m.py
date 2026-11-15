import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.on('console', lambda msg: print(f"[{msg.type}] {msg.text}"))
        page.goto('http://127.0.0.1:5173')
        time.sleep(2.0)
        
        # Click 4h
        page.evaluate("() => Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === '4h')?.click()")
        time.sleep(2.0)
        
        # Click 15m
        page.evaluate("() => Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === '15m')?.click()")
        time.sleep(3.0)
        
        info = page.evaluate("""() => {
            const el = document.querySelector('[data-testid="sessions-layer"]');
            const blocks = document.querySelectorAll('[data-testid^="session-block-"]');
            return {
                hasLayer: !!el,
                blockCount: blocks.length,
                timeframe: localStorage.getItem('eurusd_saved_timeframe')
            };
        }""")
        print("15m INFO:", info)
        browser.close()

if __name__ == '__main__':
    run()
