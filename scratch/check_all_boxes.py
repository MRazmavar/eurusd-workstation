from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://127.0.0.1:5173')
    page.wait_for_timeout(3000)
    page.locator("[data-testid='on-chart-setup-btn']").click()
    page.wait_for_timeout(1000)

    for name in ['on-chart-setup-profit-zone', 'on-chart-setup-risk-zone', 'on-chart-setup-entry', 'on-chart-setup-sl', 'on-chart-setup-tp']:
        loc = page.locator(f"[data-testid='{name}']")
        if loc.count() > 0:
            print(f"{name}: {loc.bounding_box()}")
    browser.close()
