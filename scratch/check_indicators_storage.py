from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page()
    page.goto('http://localhost:5173')
    page.wait_for_timeout(1000)
    saved = page.evaluate('() => localStorage.getItem("eurusd_saved_indicators")')
    print('Current localStorage eurusd_saved_indicators:', saved)
    browser.close()
