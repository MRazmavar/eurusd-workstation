from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://127.0.0.1:5173/')
    page.wait_for_selector('[data-testid="drawing-svg"]')
    page.wait_for_timeout(1000)

    # Check all elements with testid
    all_testids = page.evaluate("() => Array.from(document.querySelectorAll('[data-testid]')).map(el => el.getAttribute('data-testid'))")
    trade_testids = [t for t in all_testids if 'trade' in t or 'panel' in t]
    print("Trade testids on load:", trade_testids)

    # Let's inspect position of floating-trade-control-panel if present
    panel = page.locator("[data-testid='floating-trade-control-panel']")
    count = panel.count()
    print("Panel count:", count)
    if count > 0:
        print("Panel visible:", panel.is_visible())
        print("Panel bounding box:", panel.bounding_box())
        print("Panel style:", panel.get_attribute("style"))
        print("Panel class:", panel.get_attribute("class"))

    browser.close()
