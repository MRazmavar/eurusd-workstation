import sys
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            is_mobile=True,
            has_touch=True
        )
        page = context.new_page()
        page.goto('http://localhost:5173')
        page.wait_for_timeout(3000)

        # Start trade setup directly
        page.evaluate('''() => {
            window.__test_start = true;
        }''')
        # Click trade tab and on-chart setup
        page.locator('button:has-text("Trade")').first.click()
        page.wait_for_timeout(500)
        page.locator('[data-testid="on-chart-setup-btn"]').click()
        page.wait_for_timeout(500)

        # Close sheet by clicking outside (or switching tab to chart)
        page.locator('button:has-text("Chart")').first.click()
        page.wait_for_timeout(500)

        # Look for trade setup lines
        sl_line = page.locator('[data-testid="on-chart-setup-sl"]')
        print(f"SL Line count: {sl_line.count()}")
        sl_box = sl_line.bounding_box()
        print(f"SL Line box: {sl_box}")

        entry_line = page.locator('[data-testid="on-chart-setup-entry"]')
        print(f"Entry Line box: {entry_line.bounding_box()}")

        tp_line = page.locator('[data-testid="on-chart-setup-tp"]')
        print(f"TP Line box: {tp_line.bounding_box()}")

        # Now try to dispatch touchstart on SL line and touchmove
        # Let's see if SL price changes!
        panel = page.locator('[data-testid="floating-trade-panel"]')
        print(f"Floating panel text before drag:\n{panel.text_content()}")

        # Perform touch drag using CDPSession or page.touchscreen
        if sl_box:
            start_x = sl_box['x'] + sl_box['width'] / 2
            start_y = sl_box['y'] + sl_box['height'] / 2
            print(f"Touching at {start_x}, {start_y}")
            page.touchscreen.tap(start_x, start_y)
            page.wait_for_timeout(200)

        browser.close()

if __name__ == '__main__':
    run()
