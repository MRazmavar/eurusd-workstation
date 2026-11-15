import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.goto('http://127.0.0.1:5173')
        
        for i in range(15):
            res = page.evaluate("""() => {
                const el = document.querySelector('[data-testid="sessions-layer"]');
                const sessBlocks = document.querySelectorAll('[data-testid^="session-block-"]');
                const sessBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sess'))?.innerText;
                const tfBtn = Array.from(document.querySelectorAll('button')).find(b => ['1m', '5m', '15m', '1h', '4h', '1D'].some(t => b.innerText.includes(t)))?.innerText;
                return {
                    hasLayer: !!el,
                    blockCount: sessBlocks.length,
                    btnText: sessBtn,
                    timeframe: tfBtn
                };
            }""")
            print(f"T={i*0.4:.1f}s:", res)
            time.sleep(0.4)
            
        browser.close()

if __name__ == '__main__':
    run()
