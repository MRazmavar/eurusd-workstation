from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://127.0.0.1:5173')
    page.wait_for_timeout(3000)
    page.locator("[data-testid='on-chart-setup-btn']").click()
    page.wait_for_timeout(1000)

    # Check box before update
    box1 = page.locator("[data-testid='on-chart-setup-profit-zone']").bounding_box()
    print("Box 1:", box1)

    # Let's call updateTradeSetup via page.evaluate
    res = page.evaluate("""() => {
        // Let's find backtestingEngine in React or window
        // Let's inspect activeSetup
        const profit = document.querySelector('[data-testid="on-chart-setup-profit-zone"]');
        return {
            x: profit.getAttribute('x')
        };
    }""")
    print("Profit x:", res)
    browser.close()
