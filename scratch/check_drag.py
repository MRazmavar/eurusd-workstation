from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://127.0.0.1:5173')
    page.wait_for_timeout(3000)
    page.locator("[data-testid='on-chart-setup-btn']").click()
    page.wait_for_timeout(1000)

    res1 = page.evaluate("() => window.backtestingEngine ? window.backtestingEngine.getActiveTradeSetup() : null")
    print('Before drag activeSetup:', res1)

    profit_zone = page.locator("[data-testid='on-chart-setup-profit-zone']")
    box = profit_zone.bounding_box()
    sx = box['x'] + box['width'] / 2
    sy = box['y'] + box['height'] / 2
    print(f"Profit zone center: ({sx}, {sy})")
    page.mouse.move(sx, sy)
    page.mouse.down()
    page.mouse.move(sx - 150, sy, steps=10)
    page.mouse.up()
    page.wait_for_timeout(500)

    res2 = page.evaluate("() => window.backtestingEngine ? window.backtestingEngine.getActiveTradeSetup() : null")
    print('After drag activeSetup:', res2)

    box2 = profit_zone.bounding_box()
    print('Box before:', box)
    print('Box after:', box2)
    browser.close()
