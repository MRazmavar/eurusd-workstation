from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://127.0.0.1:5173/')
    page.wait_for_selector('[data-testid="drawing-svg"]')
    page.wait_for_timeout(1000)

    fav_toolbar = page.locator("[data-testid='favorites-toolbar']")
    print("Favorites toolbar box:", fav_toolbar.bounding_box())

    long_btn = page.locator("[data-testid='fav-tool-long_position']")
    short_btn = page.locator("[data-testid='fav-tool-short_position']")

    print("Long button outerHTML:", long_btn.evaluate("el => el.outerHTML"))
    print("Short button outerHTML:", short_btn.evaluate("el => el.outerHTML"))

    # Screenshot of favorites toolbar
    fav_toolbar.screenshot(path="scratch/favorites_toolbar_crop.png")

    browser.close()
