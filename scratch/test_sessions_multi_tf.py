import time
from playwright.sync_api import sync_playwright

def test_sessions_across_timeframes():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.goto('http://127.0.0.1:5173')
        page.wait_for_selector('[data-testid="drawing-svg"]', timeout=15000)
        time.sleep(1.0)
        
        # Test each timeframe
        for tf in ['1m', '5m', '15m', '1h', '4h', '1h', '15m']:
            # Select timeframe
            print(f"\n--- Testing Timeframe {tf} ---")
            page.evaluate(f"""(targetTf) => {{
                // Find timeframe button and click it, or call handleTimeframeChange if available
                const tfButtons = Array.from(document.querySelectorAll('button'));
                const btn = tfButtons.find(b => b.innerText.trim() === targetTf);
                if (btn) {{
                    btn.click();
                }}
            }}""", tf)
            
            # Observe over 2.5 seconds
            for step in range(5):
                time.sleep(0.5)
                info = page.evaluate("""() => {
                    const el = document.querySelector('[data-testid="sessions-layer"]');
                    const sessBlocks = document.querySelectorAll('[data-testid^="session-block-"]');
                    const sessBtn = document.querySelector('[data-testid="topbar-sessions-btn"]')?.innerText || '';
                    return {
                        hasLayer: !!el,
                        blockCount: sessBlocks.length,
                        sessBtn: sessBtn.replace(/\\n/g, ' ')
                    };
                }""")
                print(f"  Step {step+1} ({(step+1)*0.5}s): {info}")
                
        # Take verification screenshot on 1h
        page.screenshot(path='C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/sessions_indicator_stably_visible.png')
        print("\nScreenshot saved to sessions_indicator_stably_visible.png")
        browser.close()

if __name__ == '__main__':
    test_sessions_across_timeframes()
