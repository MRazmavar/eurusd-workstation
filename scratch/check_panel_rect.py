from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://127.0.0.1:5173/')
    page.wait_for_selector('[data-testid="drawing-svg"]')
    page.wait_for_timeout(1000)

    panel = page.locator("[data-testid='floating-trade-panel']")
    print("Floating trade panel visible:", panel.is_visible())
    print("Bounding box:", panel.bounding_box())
    print("Text in panel:", panel.inner_text())

    # Take screenshot of the panel
    panel.screenshot(path="scratch/floating_trade_panel_crop.png")
    page.screenshot(path="scratch/full_screen_trade_panel.png")

    browser.close()
