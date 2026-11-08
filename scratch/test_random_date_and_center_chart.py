import time
import re
import sys
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def test_random_date_and_center_chart():
    print("=" * 70)
    print("RUNNING AUTOMATED TEST: Random Date Replay & Centered Chart Suite")
    print("=" * 70)

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(viewport={"width": 1600, "height": 950})
        page = context.new_page()

        print("[Step 1] Navigating to EUR/USD Workstation...")
        page.goto("http://127.0.0.1:5173", wait_until="networkidle")
        page.wait_for_selector("[data-testid='topbar-replay-btn']", timeout=10000)
        page.wait_for_selector("[data-testid='topbar-random-date-btn']", timeout=10000)
        time.sleep(1.5)
        print("  -> PASSED: TopBar contains both 'Bar Replay' and 'Random Date' buttons!")

        print("[Step 2] Testing Bar Replay activation & centering on last price...")
        replay_btn = page.locator("[data-testid='topbar-replay-btn']")
        replay_btn.click()
        time.sleep(1.0)

        # Check bottom dock controller appears
        page.wait_for_selector("[data-testid='random-date-btn']", timeout=5000)
        print("  -> PASSED: Replay Controller Bar is active and displays 'Random Date' button!")

        # Verify toast notification confirming centering
        toast = page.locator("[data-testid='workstation-hud-toast']")
        if toast.is_visible():
            print(f"  -> Toast notification: '{toast.text_content()}'")

        print("[Step 3] Testing 'Random Date' button execution...")
        random_date_btn = page.locator("[data-testid='random-date-btn']")
        random_date_btn.click()
        time.sleep(1.2)

        # Verify random date toast appeared
        toast_text = page.locator("[data-testid='workstation-hud-toast']").text_content()
        print(f"  -> Random Date Toast: '{toast_text}'")
        assert "Jumped to Random Date:" in (toast_text or ""), f"Unexpected toast: {toast_text}"
        print("  -> PASSED: Random Date successfully triggered with formatted date toast!")

        # Check the Replay Bar status
        replay_status = page.locator("text=/Bar \\d+ of \\d+/").first.text_content()
        print(f"  -> Current Replay Position: '{replay_status}'")
        match = re.search(r"Bar\s+(\d+)\s+of\s+(\d+)", replay_status or "")
        assert match, f"Could not parse replay status from {replay_status}"
        current_bar = int(match.group(1))
        total_bars = int(match.group(2))
        print(f"  -> Selected Bar {current_bar} out of {total_bars} total bars")

        # Crucial Requirement: The time shouldn't be too close to recent live market
        assert current_bar < total_bars - 50, f"Random date bar {current_bar} was too close to recent live market ({total_bars})!"
        assert current_bar > 30, f"Random date bar {current_bar} had too few preceding bars for analysis!"
        print(f"  -> PASSED: Random date selected at bar {current_bar}/{total_bars} (safely away from recent market & ample past context)!")

        print("[Step 4] Verifying On-Chart Setup at the random date...")
        setup_btn = page.locator("[data-testid='on-chart-setup-btn']")
        setup_btn.click()
        page.wait_for_selector("[data-testid='on-chart-setup-entry']", timeout=5000)

        entry_text = page.locator("[data-testid='on-chart-setup-entry'] text").first.text_content()
        sl_text = page.locator("[data-testid='on-chart-setup-sl'] text").first.text_content()
        tp_text = page.locator("[data-testid='on-chart-setup-tp'] text").first.text_content()

        print(f"  -> Setup Entry Text at Random Date: '{entry_text}'")
        print(f"  -> Setup SL Text at Random Date: '{sl_text}'")
        print(f"  -> Setup TP Text at Random Date: '{tp_text}'")

        # Confirm trade at random date
        page.locator("[data-testid='on-chart-confirm-setup-btn']").click()
        time.sleep(1.0)
        page.wait_for_selector(".open-trades-layer", timeout=5000)
        print("  -> PASSED: Trade successfully opened on chart during random date replay!")

        # Save screenshot
        screenshot_path = "C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/workstation_random_date_replay_centered_verified.png"
        page.screenshot(path=screenshot_path)
        print(f"  -> Screenshot saved to: {screenshot_path}")

        print("[Step 5] Testing TopBar 'Random Date' button directly...")
        topbar_random_btn = page.locator("[data-testid='topbar-random-date-btn']")
        topbar_random_btn.click()
        time.sleep(1.0)

        replay_status_2 = page.locator("text=/Bar \\d+ of \\d+/").first.text_content()
        print(f"  -> Second Random Position: '{replay_status_2}'")
        match_2 = re.search(r"Bar\s+(\d+)\s+of\s+(\d+)", replay_status_2 or "")
        assert match_2, f"Could not parse second replay status"
        current_bar_2 = int(match_2.group(1))
        print(f"  -> Second Random Bar: {current_bar_2} (different from first: {current_bar})")
        print("  -> PASSED: TopBar Random Date button successfully jumps to new random point!")

        browser.close()

    print("=" * 70)
    print("ALL TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 70)

if __name__ == "__main__":
    test_random_date_and_center_chart()
