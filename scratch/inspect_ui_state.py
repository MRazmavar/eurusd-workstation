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

        # Check favorites toolbar
        fav_toolbar = page.locator("[data-testid='favorites-toolbar']")
        fav_visible = fav_toolbar.is_visible()
        print(f"Favorites toolbar visible: {fav_visible}")

        # Check icons in favorites toolbar
        long_fav = page.locator("[data-testid='fav-tool-long_position']")
        short_fav = page.locator("[data-testid='fav-tool-short_position']")
        print(f"Long fav visible: {long_fav.is_visible()}")
        print(f"Short fav visible: {short_fav.is_visible()}")

        # Take screenshot of default state
        page.screenshot(path="scratch/ui_state_default.png")

        # Open Sell order from right sidebar
        sell_btn = page.locator("button:has-text('SELL / SHORT'), button:has-text('SELL'), [data-testid='sell-button']").first
        if sell_btn.is_visible():
            sell_btn.click()
            time.sleep(1)

        # Check floating trade control panel
        trade_panel = page.locator("[data-testid='floating-trade-control-panel']")
        print(f"Floating trade control panel visible: {trade_panel.is_visible()}")
        if trade_panel.is_visible():
            box = trade_panel.bounding_box()
            print(f"Floating trade control panel position: {box}")

        # Take screenshot with active trade
        page.screenshot(path="scratch/ui_state_active_trade.png")

        # Also place a Long Position and Short Position on chart
        long_fav.click()
        time.sleep(0.3)
        page.mouse.click(400, 300)
        time.sleep(0.5)

        short_fav.click()
        time.sleep(0.3)
        page.mouse.click(650, 350)
        time.sleep(0.5)

        # Take screenshot with both positions drawn
        page.screenshot(path="scratch/ui_state_positions_and_trade.png")

        browser.close()

if __name__ == "__main__":
    inspect()
