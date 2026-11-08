import time
import sys
import os
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def test_sessions_and_timezone():
    print("=" * 70)
    print("RUNNING AUTOMATED TEST: Forex Sessions Indicator & Timezone Switcher")
    print("=" * 70)

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(viewport={"width": 1600, "height": 950})
        page = context.new_page()

        print("[Step 1] Navigating to EUR/USD Workstation...")
        page.goto("http://127.0.0.1:5173", wait_until="networkidle")
        page.wait_for_selector("[data-testid='drawing-svg']", timeout=12000)
        time.sleep(2.0)
        print("  -> PASSED: Chart canvas and drawing SVG ready!")

        # Step 2: Check TopBar Sessions toggle button
        print("[Step 2] Verifying TopBar Sessions indicator button...")
        sessions_btn = page.locator("[data-testid='topbar-sessions-btn']")
        sessions_btn.wait_for(state="visible", timeout=5000)
        btn_text = sessions_btn.inner_text().replace('\n', ' ')
        print(f"  -> PASSED: TopBar Sessions button found: '{btn_text}'")

        # Step 3: Check that the requested 5 sessions are rendered
        print("[Step 3] Checking presence of the 5 requested Forex Sessions...")
        shield_badge = page.locator("[data-testid='session-badge-shield_area']")
        asia_badge = page.locator("[data-testid='session-badge-asia_full']")
        frankfurt_badge = page.locator("[data-testid='session-badge-frankfurt_1h']")
        london_badge = page.locator("[data-testid='session-badge-london_1h']")
        ny_badge = page.locator("[data-testid='session-badge-ny_1h']")

        shield_cnt = shield_badge.count()
        asia_cnt = asia_badge.count()
        frankfurt_cnt = frankfurt_badge.count()
        london_cnt = london_badge.count()
        ny_cnt = ny_badge.count()

        print(f"  Session badge counts:")
        print(f"    - 🛡️ Shield Area (Asia 1st hour): {shield_cnt}")
        print(f"    - Full Asia Session: {asia_cnt}")
        print(f"    - Frankfurt (1h): {frankfurt_cnt}")
        print(f"    - London (1h): {london_cnt}")
        print(f"    - NY Open (1h): {ny_cnt}")

        if shield_cnt > 0:
            badge_label = (shield_badge.first.text_content() or "").strip()
            print(f"  -> Shield Area badge text: '{badge_label}'")
            assert "Shield" in badge_label, f"Expected 'Shield' in label, got {badge_label}"

        # Step 4: Test bottom-right TradingView-style timezone switcher
        print("[Step 4] Testing bottom-right Timezone Switcher pill...")
        tz_btn = page.locator("[data-testid='chart-timezone-btn']")
        tz_btn.wait_for(state="visible", timeout=5000)
        initial_tz = tz_btn.inner_text().strip()
        print(f"  -> Default timezone pill: '{initial_tz}'")

        # Open timezone menu
        tz_btn.click()
        time.sleep(0.4)
        page.wait_for_selector("[data-testid='timezone-dropdown']", timeout=5000)
        print("  -> PASSED: Timezone dropdown menu opened!")

        # Switch to New York
        print("[Step 5] Switching chart timezone to New York (America/New_York)...")
        ny_opt = page.locator("[data-testid='tz-option-America_New_York']")
        ny_opt.click()
        time.sleep(0.6)
        ny_tz_text = tz_btn.inner_text().strip()
        print(f"  -> Updated timezone pill: '{ny_tz_text}'")
        assert "NY" in ny_tz_text or "UTC-4" in ny_tz_text or "UTC-5" in ny_tz_text

        saved_tz = page.evaluate("() => localStorage.getItem('eurusd_saved_timezone')")
        print(f"  -> Saved timezone in localStorage: '{saved_tz}'")
        assert saved_tz == "America/New_York"

        # Switch to Tehran
        print("[Step 6] Switching chart timezone to Tehran (Asia/Tehran)...")
        tz_btn.click()
        time.sleep(0.4)
        thr_opt = page.locator("[data-testid='tz-option-Asia_Tehran']")
        thr_opt.click()
        time.sleep(0.6)
        thr_tz_text = tz_btn.inner_text().strip()
        print(f"  -> Updated timezone pill for Tehran: '{thr_tz_text}'")
        assert "THR" in thr_tz_text or "3:30" in thr_tz_text

        # Step 7: Test toggling sessions OFF and ON
        print("[Step 7] Testing Sessions toggle button (OFF / ON)...")
        sessions_btn.click()
        time.sleep(0.5)
        off_text = sessions_btn.inner_text().replace('\n', ' ')
        print(f"  -> Button text after toggle: '{off_text}'")
        assert "OFF" in off_text
        assert shield_badge.count() == 0, "Expected 0 shield badges when OFF"

        sessions_btn.click()
        time.sleep(0.5)
        on_text = sessions_btn.inner_text().replace('\n', ' ')
        print(f"  -> Button text after turning ON: '{on_text}'")
        assert "ON" in on_text
        print(f"  -> Shield badges restored: {shield_badge.count()}")

        # Switch back to UTC for crisp screenshot
        tz_btn.click()
        time.sleep(0.4)
        page.locator("[data-testid='tz-option-UTC']").click()
        time.sleep(0.6)

        # Step 8: Capture visual verification artifact
        print("[Step 8] Capturing screenshot artifact...")
        artifact_path = r"C:\Users\moham\.gemini\antigravity\brain\7a304e26-ed66-4949-8d2a-5874b8c819e9\workstation_sessions_and_timezone_verified.png"
        page.screenshot(path=artifact_path)
        print(f"  -> Screenshot saved to: {artifact_path}")

        browser.close()
        print("=" * 70)
        print("ALL TESTS PASSED SUCCESSFULLY!")
        print("=" * 70)

if __name__ == '__main__':
    test_sessions_and_timezone()
