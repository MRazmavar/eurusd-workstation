from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    
    # 1. Mobile viewport
    page = browser.new_page(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    page.goto("http://127.0.0.1:5173")
    page.wait_for_timeout(2000)
    btn_count = page.locator("[data-testid='floating-switch-to-mobile-btn']").count()
    print("Floating button count in mobile:", btn_count)
    assert btn_count == 0, "Floating button should not exist!"

    # 2. Desktop mode on mobile device
    page.evaluate('window.localStorage.setItem("eurusd_view_mode", "desktop")')
    page.reload()
    page.wait_for_timeout(2000)
    btn_count_desktop = page.locator("[data-testid='floating-switch-to-mobile-btn']").count()
    print("Floating button count in desktop mode on phone:", btn_count_desktop)
    assert btn_count_desktop == 0, "Floating button should not exist in desktop mode either!"

    # 3. Desktop viewport
    page_desktop = browser.new_page(viewport={"width": 1400, "height": 900})
    page_desktop.goto("http://127.0.0.1:5173")
    page_desktop.wait_for_timeout(2000)
    btn_count_pc = page_desktop.locator("[data-testid='floating-switch-to-mobile-btn']").count()
    print("Floating button count on PC:", btn_count_pc)
    assert btn_count_pc == 0, "Floating button should not exist on PC!"
    
    # Screenshot of bottom right clean
    page_desktop.screenshot(path="C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/bottom_right_clean.png")
    page.screenshot(path="C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/mobile_view_clean_no_floating.png")
    browser.close()
    print(">>> VERIFICATION PASSED: Floating switch-to-mobile button is completely removed! <<<")
