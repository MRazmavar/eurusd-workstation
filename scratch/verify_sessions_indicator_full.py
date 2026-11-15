import time
from playwright.sync_api import sync_playwright

def verify_sessions_indicator_full():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.goto('http://127.0.0.1:5173')
        page.wait_for_selector('[data-testid="drawing-svg"]', timeout=15000)
        time.sleep(2.0)

        # 1. Verify Sessions on 1h (stable over 4 seconds)
        print("1. Verifying Sessions stability on 1h...")
        for i in range(8):
            time.sleep(0.5)
            count = page.evaluate("""() => {
                const blocks = document.querySelectorAll('[data-testid^="session-block-"]');
                return blocks.length;
            }""")
            print(f"   T={i*0.5:.1f}s: visible session blocks = {count}")
            assert count > 0, f"Session blocks vanished at T={i*0.5}s!"

        # Screenshot on 1h
        page.screenshot(path='C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/sessions_stable_1h_verified.png')

        # 2. Toggle Sessions OFF then ON
        print("\n2. Testing Sessions Toggle Button...")
        toggle_btn = page.locator('[data-testid="topbar-sessions-btn"]')
        toggle_btn.click()
        time.sleep(0.5)
        count_off = page.evaluate("() => document.querySelectorAll('[data-testid^=\"session-block-\"]').length")
        print(f"   After clicking OFF: visible blocks = {count_off}")
        assert count_off == 0, "Blocks should be 0 when toggled OFF"

        toggle_btn.click()
        time.sleep(0.5)
        count_on = page.evaluate("() => document.querySelectorAll('[data-testid^=\"session-block-\"]').length")
        print(f"   After clicking ON: visible blocks = {count_on}")
        assert count_on > 0, "Blocks should reappear when toggled ON"

        # 3. Timeframe transition: 1h -> 4h (cleanly hidden, no distorted boxes)
        print("\n3. Testing transition 1h -> 4h...")
        page.evaluate("""() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === '4h');
            if (btn) btn.click();
        }""")
        time.sleep(2.0)
        count_4h = page.evaluate("() => document.querySelectorAll('[data-testid^=\"session-block-\"]').length")
        print(f"   On 4h: visible blocks = {count_4h}")
        assert count_4h == 0, "4h should not show intraday session killzones"
        page.screenshot(path='C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/sessions_clean_4h_verified.png')

        # 4. Timeframe transition: 4h -> 15m (clean, stable restored)
        print("\n4. Testing transition 4h -> 15m...")
        page.evaluate("""() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === '15m');
            if (btn) btn.click();
        }""")
        time.sleep(3.5)
        count_15m = page.evaluate("() => document.querySelectorAll('[data-testid^=\"session-block-\"]').length")
        print(f"   On 15m: visible blocks = {count_15m}")
        assert count_15m > 0, "15m should have visible session blocks"

        # 5. Mobile Viewport Test (390x844)
        print("\n5. Testing Mobile Viewport...")
        mobile_context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            has_touch=True,
            is_mobile=True,
            device_scale_factor=2
        )
        mobile_page = mobile_context.new_page()
        mobile_page.goto('http://127.0.0.1:5173')
        mobile_page.wait_for_selector('[data-testid="drawing-svg"]', timeout=15000)
        time.sleep(2.0)
        
        # Switch to 1h on mobile
        mobile_page.evaluate("""() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === '1h');
            if (btn) btn.click();
        }""")
        time.sleep(1.5)
        m_count = mobile_page.evaluate("() => document.querySelectorAll('[data-testid^=\"session-block-\"]').length")
        print(f"   Mobile 1h visible blocks = {m_count}")
        assert m_count > 0, "Mobile 1h should have visible session blocks"
        mobile_page.screenshot(path='C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/sessions_mobile_verified.png')

        browser.close()
        print("\nAll Sessions Indicator verification tests PASSED successfully!")

if __name__ == '__main__':
    verify_sessions_indicator_full()
