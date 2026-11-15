from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://127.0.0.1:5173/')
    page.wait_for_selector('[data-testid="drawing-svg"]')
    page.locator('[data-testid="sidebar-tab-order"]').click()
    page.wait_for_timeout(500)
    html = page.locator("button:has-text('Place Simulated')").evaluate("el => el.outerHTML")
    print("Submit button outerHTML:", html)
    # Click it and wait for network or state
    page.locator("button:has-text('Place Simulated')").click()
    page.wait_for_timeout(1500)
    panel = page.locator("[data-testid='floating-trade-control-panel']")
    print("Is panel visible now?", panel.is_visible())
    if panel.is_visible():
        print("Panel bounding box:", panel.bounding_box())
    page.screenshot(path="scratch/after_place_simulated.png")
    browser.close()
