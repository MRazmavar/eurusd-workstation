from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://127.0.0.1:5173/')
    page.wait_for_selector('[data-testid="drawing-svg"]')
    page.locator('[data-testid="sidebar-tab-order"]').click()
    page.wait_for_timeout(500)
    page.locator("button:has-text('Place Simulated')").click()
    page.wait_for_timeout(1000)

    trades = page.evaluate("() => localStorage.getItem('eurusd_trades')")
    print("Trades in localStorage:", trades)
    browser.close()
