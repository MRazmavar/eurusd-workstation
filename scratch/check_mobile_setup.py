import sys
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        # Emulate iPhone 14 / modern mobile viewport (390x844) with touch enabled
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
            is_mobile=True,
            has_touch=True
        )
        page = context.new_page()
        page.goto('http://localhost:5173')
        page.wait_for_timeout(3000)

        # Check mobile bottom nav
        trade_tab = page.locator('button:has-text("Trade")').first
        print(f"Trade tab visible: {trade_tab.is_visible()}")
        trade_tab.click()
        page.wait_for_timeout(1000)

        # Look for on-chart setup button in the trade ticket
        on_chart_btn = page.locator('[data-testid="on-chart-setup-btn"]')
        print(f"On-chart setup button visible: {on_chart_btn.is_visible()}")
        if on_chart_btn.is_visible():
            on_chart_btn.click()
            page.wait_for_timeout(1000)

        # Take screenshot of what user sees right now
        page.screenshot(path='scratch/mobile_after_click_onchart.png')

        # Check if trade sheet is still open
        sheet = page.locator('.fixed.inset-0.z-40')
        print(f"Modal sheet visible: {sheet.is_visible()}")

        # Check if floating panel is visible and where it is
        panel = page.locator('[data-testid="floating-trade-panel"]')
        print(f"Floating panel count: {panel.count()}")
        if panel.count() > 0:
            box = panel.first.bounding_box()
            print(f"Floating panel box: {box}")

        # Check if trade setup overlay is in DOM and where it is
        setup = page.locator('[data-testid="trade-setup-overlay"]')
        print(f"Setup overlay in DOM: {setup.count()}")
        if setup.count() > 0:
            box = setup.first.bounding_box()
            print(f"Setup overlay box: {box}")

        browser.close()

if __name__ == '__main__':
    run()
