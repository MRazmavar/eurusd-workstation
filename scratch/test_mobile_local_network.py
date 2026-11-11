import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    # Simulate a mobile device viewport (e.g. iPhone / Android: 390x844 or tablet: 768x1024 or full responsive)
    page = browser.new_page(viewport={'width': 412, 'height': 915})
    page.goto('http://192.168.100.28:5173/')
    page.wait_for_selector('[data-testid="drawing-svg"]', timeout=15000)
    time.sleep(2)

    page.screenshot(path='scratch/mobile_local_network_verified.png')
    print("Mobile local network screenshot captured successfully!")

    browser.close()
