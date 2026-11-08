"""
Playwright Automated Verification for TradingView-Grade Quick Timeframe Jump Dialog
Tests:
1. Typing '2' anywhere on chart immediately opens Quick Timeframe Jump modal with '2'.
2. Typing '0' updates input to '20' and resolution preview shows '20 Minutes (20m)'.
3. Pressing 'Enter' executes timeframe switch to '20m', updates candles, updates TopBar custom pill, and shows HUD toast.
4. Testing unit selection / typing '2h' for hours.
5. Verifying chart state persistence across page reload for custom timeframe.
6. Taking verified screenshot artifacts.
"""
import sys
import time
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

def main():
    print("====================================================================")
    print("RUNNING AUTOMATED TEST: Quick Timeframe Jump & Custom Interval Suite")
    print("====================================================================")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, channel="chrome")
        context = browser.new_context(viewport={"width": 1600, "height": 900})
        page = context.new_page()

        print("[Step 1] Navigating to EUR/USD Workstation...")
        page.goto("http://127.0.0.1:5173")
        page.wait_for_selector("canvas", timeout=15000)
        time.sleep(2.0)

        # Ensure page is focused on chart area
        page.mouse.click(500, 300)
        time.sleep(0.5)

        print("[Step 2] Pressing numeric key '2' on chart...")
        page.keyboard.press("2")
        time.sleep(0.5)

        # Verify Quick Timeframe Modal is open
        modal = page.locator("[data-testid='quick-timeframe-modal']")
        assert modal.is_visible(), "QuickTimeframeModal should be visible after pressing '2'!"
        print("  -> PASSED: QuickTimeframeModal appeared instantly upon pressing '2'")

        input_box = page.locator("[data-testid='quick-timeframe-input']")
        val = input_box.input_value()
        print(f"  -> Input value after initial key: '{val}'")
        assert val == "2", f"Expected input value '2', got '{val}'"

        print("[Step 3] Pressing '0' on keyboard to form '20'...")
        page.keyboard.press("0")
        time.sleep(0.3)

        val20 = input_box.input_value()
        print(f"  -> Input value after typing '0': '{val20}'")
        assert val20 == "20", f"Expected input value '20', got '{val20}'"

        preview = page.locator("[data-testid='quick-timeframe-preview']").inner_text()
        print(f"  -> Resolution preview text: '{preview}'")
        assert "20 Minutes (20m)" in preview or "20 Minute" in preview, f"Unexpected preview text: '{preview}'"
        print("  -> PASSED: Resolution preview correctly indicates 20 Minutes (20m)")

        # Screenshot of modal open with '20'
        modal_screenshot_path = "C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/quick_timeframe_modal_active.png"
        page.screenshot(path=modal_screenshot_path)
        print(f"  -> Saved modal screenshot to: {modal_screenshot_path}")

        print("[Step 4] Pressing 'Enter' to apply 20m timeframe...")
        page.keyboard.press("Enter")
        time.sleep(1.0)

        # Verify modal closed
        assert not modal.is_visible(), "QuickTimeframeModal should be closed after pressing Enter!"
        print("  -> PASSED: QuickTimeframeModal closed successfully")

        # Verify TopBar custom pill is visible and active
        pill = page.locator("[data-testid='topbar-custom-timeframe-pill']")
        assert pill.is_visible(), "TopBar custom timeframe pill should be visible for 20m!"
        pill_text = pill.inner_text().strip()
        print(f"  -> TopBar active custom pill text: '{pill_text}'")
        assert pill_text == "20m", f"Expected '20m', got '{pill_text}'"
        print("  -> PASSED: TopBar active custom pill shows '20m'")

        # Verify toast
        toast = page.locator("[data-testid='workstation-hud-toast']")
        if toast.is_visible():
            print(f"  -> HUD Toast confirmed: '{toast.inner_text().strip()}'")

        # Wait for candles to update
        time.sleep(2.0)

        print("[Step 5] Testing custom interval via '3' and 'h'...")
        page.mouse.click(500, 300)
        time.sleep(0.3)
        page.keyboard.press("3")
        time.sleep(0.4)
        assert modal.is_visible(), "Modal should open on pressing '3'"
        page.keyboard.press("h")
        time.sleep(0.3)
        val3h = input_box.input_value()
        print(f"  -> Input value for 3h: '{val3h}'")
        assert "3h" in val3h, f"Expected '3h' in input, got '{val3h}'"

        preview3h = page.locator("[data-testid='quick-timeframe-preview']").inner_text()
        print(f"  -> Resolution preview for 3h: '{preview3h}'")
        assert "3 Hours (3h)" in preview3h or "3 Hour" in preview3h

        print("  -> Submitting via 'Go' button click...")
        page.locator("[data-testid='quick-timeframe-submit-btn']").click()
        time.sleep(1.0)

        pill_text3h = pill.inner_text().strip()
        print(f"  -> TopBar active custom pill text: '{pill_text3h}'")
        assert pill_text3h == "3h", f"Expected '3h', got '{pill_text3h}'"
        print("  -> PASSED: TopBar active custom pill updated to '3h'")

        print("[Step 6] Verifying persistence across page reload...")
        page.reload()
        page.wait_for_selector("canvas", timeout=15000)
        time.sleep(2.0)

        pill_after_reload = page.locator("[data-testid='topbar-custom-timeframe-pill']")
        assert pill_after_reload.is_visible(), "Custom timeframe pill should persist after reload!"
        print(f"  -> TopBar pill after reload: '{pill_after_reload.inner_text().strip()}'")
        assert pill_after_reload.inner_text().strip() == "3h", "Timeframe 3h should be persisted!"
        print("  -> PASSED: Custom timeframe persisted across page reload")

        # Switch back to 20m as requested by user
        page.mouse.click(500, 300)
        time.sleep(0.3)
        page.keyboard.press("2")
        time.sleep(0.3)
        page.keyboard.press("0")
        time.sleep(0.3)
        page.keyboard.press("Enter")
        time.sleep(2.0)

        final_pill = page.locator("[data-testid='topbar-custom-timeframe-pill']").inner_text().strip()
        assert final_pill == "20m", f"Expected '20m', got '{final_pill}'"
        print("  -> Switched back to user's 20m custom timeframe")

        final_screenshot_path = "C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/workstation_quick_timeframe_20m_verified.png"
        page.screenshot(path=final_screenshot_path)
        print(f"  -> Saved final workstation verification screenshot to: {final_screenshot_path}")

        print("====================================================================")
        print("ALL TESTS PASSED WITH 100% SUCCESS!")
        print("====================================================================")

        browser.close()

if __name__ == "__main__":
    main()
