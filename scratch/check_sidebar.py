from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://127.0.0.1:5173/')
    page.wait_for_selector('[data-testid="drawing-svg"]')
    
    order_tab = page.locator('[data-testid="sidebar-tab-order"]')
    if order_tab.is_visible():
        print("Clicking order tab...")
        order_tab.click()
        page.wait_for_timeout(500)

    buy_btn = page.locator("button:has-text('Place Simulated')").first
    if buy_btn.is_visible():
        print(f"Clicking {buy_btn.inner_text()}...")
        buy_btn.click()
        page.wait_for_timeout(1000)

        trade_panel = page.locator("[data-testid='floating-trade-control-panel']")
        print("Floating trade panel visible:", trade_panel.is_visible())
        if trade_panel.is_visible():
            print("Box:", trade_panel.bounding_box())

        page.screenshot(path="scratch/trade_placed_verified.png")

    browser.close()
