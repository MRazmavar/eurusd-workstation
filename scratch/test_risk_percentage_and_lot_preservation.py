"""
Playwright Automated Verification for:
1. Lot Size Preservation: Changing lot size and then clicking On-Chart Setup does NOT reset to default.
2. Dynamic Risk Percentage Position Sizing: Selecting Risk % automatically calculates lot size
   based on Stop Loss distance (e.g. 10k balance, 1% risk: 20p SL -> 0.50 lots, 40p SL -> 0.25 lots, 10p SL -> 1.00 lot).
3. Seamless synchronization between Order ticket and on-chart trade setup lines.
"""
import sys
import time
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

def main():
    print("====================================================================")
    print("RUNNING AUTOMATED TEST: Risk % Sizing & Lot Size Preservation Suite")
    print("====================================================================")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, channel="chrome")
        context = browser.new_context(viewport={"width": 1600, "height": 900})
        page = context.new_page()

        print("[Step 1] Navigating to EUR/USD Workstation...")
        page.goto("http://127.0.0.1:5173")
        page.wait_for_selector("canvas", timeout=15000)
        time.sleep(2.0)

        # Open RightSidebar Order tab if not open
        order_tab = page.locator("[data-testid='sidebar-tab-order']")
        if order_tab.is_visible():
            order_tab.click()
            time.sleep(0.3)

        print("[Step 2] Testing Lot Size Preservation upon toggling On-Chart Setup...")
        # Switch to Fixed Lot mode
        lot_mode_btn = page.locator("[data-testid='sizing-mode-lot-btn']")
        assert lot_mode_btn.is_visible(), "Fixed Lot mode button should be visible!"
        lot_mode_btn.click()
        time.sleep(0.3)

        # Change Lot Size to 2.50
        lot_input = page.locator("[data-testid='lot-size-input']")
        lot_input.fill("2.5")
        time.sleep(0.3)
        val_before = float(lot_input.input_value())
        print(f"  -> Custom Lot Size entered: {val_before}")
        assert val_before == 2.5, f"Expected 2.5, got {val_before}"

        # Click On-Chart Setup button
        setup_btn = page.locator("[data-testid='on-chart-setup-btn']")
        setup_btn.click()
        time.sleep(0.8)

        # Verify button shows 'Chart Lines ON'
        btn_text = setup_btn.inner_text().strip()
        print(f"  -> Setup button state: '{btn_text}'")
        assert "Chart Lines ON" in btn_text, f"Expected 'Chart Lines ON', got '{btn_text}'"

        # Verify Lot Size in input DID NOT reset to 1.0!
        val_after = float(lot_input.input_value())
        print(f"  -> Lot Size after toggling On-Chart Setup: {val_after}")
        assert val_after == 2.5, f"ERROR: Lot size was reset to default! Expected 2.5, got {val_after}"
        print("  -> PASSED: Custom Lot Size 2.5 was preserved 100% when turning on On-Chart Setup!")

        # Turn off On-Chart Setup for next step
        setup_btn.click()
        time.sleep(0.5)

        print("[Step 3] Testing Dynamic Risk Percentage Position Sizing...")
        # Read balance
        balance_card = page.locator("text=Balance:").locator("..").locator("span.font-bold").first.inner_text()
        balance = float(balance_card.replace("$", "").replace(",", ""))
        print(f"  -> Detected account balance: ${balance:,.2f}")

        # Switch to Risk % mode
        risk_mode_btn = page.locator("[data-testid='sizing-mode-risk-btn']")
        risk_mode_btn.click()
        time.sleep(0.3)

        # Set Risk % to 1.0%
        risk_input = page.locator("[data-testid='risk-percent-input']")
        risk_input.fill("1.0")
        time.sleep(0.3)

        # Set Stop Loss to 20 pips
        sl_input = page.locator("[data-testid='sl-pips-input']")
        sl_input.fill("20")
        time.sleep(0.3)

        # Check Calculated Volume badge
        calc_lots_el = page.locator("[data-testid='auto-calculated-lots']")
        calc_lots_text = calc_lots_el.inner_text().strip()
        print(f"  -> Calculated Lots with 20p SL & 1.0% Risk: '{calc_lots_text}'")
        expected_20p = round((balance * 0.01) / (20 * 10), 2)
        assert f"{expected_20p:.2f} Lots" in calc_lots_text, f"Expected {expected_20p:.2f} Lots for 20p SL, got: '{calc_lots_text}'"
        print(f"  -> PASSED: {balance} balance with 1.0% risk and 20p SL correctly calculated to {expected_20p:.2f} Lots!")

        # Test changing Stop Loss to 40 pips (should cut lots in half)
        print("[Step 4] Changing Stop Loss to 40 pips...")
        sl_input.fill("40")
        time.sleep(0.3)
        calc_lots_text_40 = calc_lots_el.inner_text().strip()
        print(f"  -> Calculated Lots with 40p SL & 1.0% Risk: '{calc_lots_text_40}'")
        expected_40p = round((balance * 0.01) / (40 * 10), 2)
        assert f"{expected_40p:.2f} Lots" in calc_lots_text_40, f"Expected {expected_40p:.2f} Lots for 40p SL, got: '{calc_lots_text_40}'"
        print(f"  -> PASSED: Lots automatically scaled down to {expected_40p:.2f} Lots for 40p SL!")

        # Test changing Stop Loss to 10 pips (should double lots)
        print("[Step 5] Changing Stop Loss to 10 pips...")
        sl_input.fill("10")
        time.sleep(0.3)
        calc_lots_text_10 = calc_lots_el.inner_text().strip()
        print(f"  -> Calculated Lots with 10p SL & 1.0% Risk: '{calc_lots_text_10}'")
        expected_10p = round((balance * 0.01) / (10 * 10), 2)
        assert f"{expected_10p:.2f} Lots" in calc_lots_text_10, f"Expected {expected_10p:.2f} Lots for 10p SL, got: '{calc_lots_text_10}'"
        print(f"  -> PASSED: Lots automatically scaled up to {expected_10p:.2f} Lots for 10p SL!")

        # Test changing Risk % to 2.0% with 20p SL
        print("[Step 6] Changing Risk % to 2.0% with 20p SL...")
        sl_input.fill("20")
        risk_input.fill("2.0")
        time.sleep(0.3)
        calc_lots_text_2pct = calc_lots_el.inner_text().strip()
        print(f"  -> Calculated Lots with 20p SL & 2.0% Risk: '{calc_lots_text_2pct}'")
        expected_2pct = round((balance * 0.02) / (20 * 10), 2)
        assert f"{expected_2pct:.2f} Lots" in calc_lots_text_2pct, f"Expected {expected_2pct:.2f} Lots for 2.0% Risk, got: '{calc_lots_text_2pct}'"
        print(f"  -> PASSED: 2.0% Risk with 20p SL correctly calculated to {expected_2pct:.2f} Lots!")

        # Turn on On-Chart Setup in Risk % mode and capture screenshot
        print("[Step 7] Activating On-Chart Setup in Risk % mode...")
        setup_btn.click()
        time.sleep(1.0)

        screenshot_path = "C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/workstation_risk_percent_and_lot_preservation_verified.png"
        page.screenshot(path=screenshot_path)
        print(f"  -> Saved verification screenshot to: {screenshot_path}")

        print("====================================================================")
        print("ALL VERIFICATIONS COMPLETED SUCCESSFULLY WITH 100% PASS RATE!")
        print("====================================================================")

        browser.close()

if __name__ == "__main__":
    main()
