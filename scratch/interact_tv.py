import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1600, 'height': 1000})
    page.goto('https://www.tradingview.com/chart/OowSyETN/?symbol=OANDA%3AEURUSD', timeout=60000)
    page.wait_for_timeout(6000)

    # Dismiss cookie banner if present
    try:
        accept_btn = page.locator("button:has-text('Accept all')").first
        if accept_btn.is_visible():
            accept_btn.click()
            page.wait_for_timeout(1000)
    except:
        pass

    # The position box is around x=600 to 750, y=100 to 300
    # Let's click at x=650, y=200 to select it!
    page.mouse.click(650, 200)
    page.wait_for_timeout(1000)
    page.screenshot(path='scratch/tv_selected_1.png')

    # Also let's try clicking at x=620, y=210
    page.mouse.click(620, 210)
    page.wait_for_timeout(500)
    page.screenshot(path='scratch/tv_selected_2.png')

    # Also let's try double clicking or hovering over it
    page.mouse.move(620, 210)
    page.wait_for_timeout(500)
    page.screenshot(path='scratch/tv_hover.png')

    browser.close()
