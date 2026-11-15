from playwright.sync_api import sync_playwright
import time, urllib.request

with sync_playwright() as p:
    device = p.devices['iPhone 14']
    browser = p.chromium.launch(channel='chrome', headless=True)
    context = browser.new_context(**device)
    page = context.new_page()

    try:
        req = urllib.request.Request('http://127.0.0.1:8008/api/drawings', method='DELETE')
        urllib.request.urlopen(req)
    except Exception:
        pass

    page.goto('http://127.0.0.1:5173')
    page.evaluate("() => { localStorage.removeItem('eurusd_drawings'); localStorage.removeItem('drawings'); }")
    page.reload()
    page.wait_for_selector('div.tv-lightweight-charts', timeout=10000)
    time.sleep(2)

    # Open mobile tools sheet
    tools_nav = page.locator('button[data-testid="mobile-nav-tools"]')
    if tools_nav.count() > 0:
        tools_nav.click()
        time.sleep(0.5)

    # Select Short Position
    short_tool = page.locator('[data-testid="mobile-tool-item-short_position"]')
    assert short_tool.count() > 0
    short_tool.click()
    time.sleep(0.5)

    # Tap on chart to place short position
    chart = page.locator('div.tv-lightweight-charts')
    box = chart.bounding_box()
    cx = box['x'] + box['width'] * 0.5
    cy = box['y'] + box['height'] * 0.5
    page.touchscreen.tap(cx, cy)
    time.sleep(1)

    # Click on empty area or deselect to view it cleanly
    page.mouse.click(box['x'] + 20, box['y'] + 50)
    time.sleep(0.5)

    page.screenshot(path='scratch/mobile_short_position_inside_verified.png')
    print('Screenshot saved to scratch/mobile_short_position_inside_verified.png')
    browser.close()
