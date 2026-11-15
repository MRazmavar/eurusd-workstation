import time
from playwright.sync_api import sync_playwright

def inspect():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        page = browser.new_page(viewport={"width": 1400, "height": 900})
        
        # Navigate
        page.goto("http://127.0.0.1:5173/")
        page.wait_for_selector('[data-testid="drawing-svg"]', timeout=15000)
        time.sleep(2)

        # Execute a market trade
        exec_btn = page.locator("button:has-text('BUY EURUSD'), button:has-text('SELL EURUSD')").first
        if exec_btn.is_visible():
            print(f"Found execute button: {exec_btn.inner_text()}")
            exec_btn.click()
            time.sleep(1)

        # Check floating trade control panel
        trade_panel = page.locator("[data-testid='floating-trade-control-panel']")
        print(f"Floating trade control panel visible: {trade_panel.is_visible()}")
        if trade_panel.is_visible():
            box = trade_panel.bounding_box()
            print(f"Floating trade control panel position: {box}")

        # Check on-chart trade layer
        open_trades_layer = page.locator("[data-testid='open-trades-layer']")
        print(f"Open trades layer visible: {open_trades_layer.is_visible()}")

        # Take screenshot with active trade
        page.screenshot(path="scratch/ui_state_active_trade.png")

        browser.close()

if __name__ == "__main__":
    inspect()
