import time
from playwright.sync_api import sync_playwright

def test_1m_sessions():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.goto('http://127.0.0.1:5173')
        page.wait_for_selector('[data-testid="drawing-svg"]', timeout=15000)
        time.sleep(1.0)
        
        # Switch to 5m
        page.evaluate("""() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === '5m');
            if (btn) btn.click();
        }""")
        time.sleep(1.5)
        
        # Check computed session blocks
        blocks_data = page.evaluate("""() => {
            // Pan chart backwards by dragging chart area left-to-right
            const chartArea = document.querySelector('[data-testid="drawing-svg"]');
            const rect = chartArea.getBoundingClientRect();
            return {
                layer: !!document.querySelector('[data-testid="sessions-layer"]'),
                renderedCount: document.querySelectorAll('[data-testid^="session-block-"]').length
            };
        }""")
        print("5m Before drag:", blocks_data)
        
        # Drag chart to pan back in time (drag right)
        chart_el = page.locator('[data-testid="drawing-svg"]')
        box = chart_el.bounding_box()
        page.mouse.move(box['x'] + 300, box['y'] + 300)
        page.mouse.down()
        page.mouse.move(box['x'] + 900, box['y'] + 300, steps=10)
        page.mouse.up()
        time.sleep(0.5)
        
        blocks_after = page.evaluate("""() => {
            return {
                layer: !!document.querySelector('[data-testid="sessions-layer"]'),
                renderedCount: document.querySelectorAll('[data-testid^="session-block-"]').length
            };
        }""")
        print("5m After drag:", blocks_after)
        
        # Take screenshot of 5m sessions
        page.screenshot(path='C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/sessions_5m_panned.png')
        browser.close()

if __name__ == '__main__':
    test_1m_sessions()
