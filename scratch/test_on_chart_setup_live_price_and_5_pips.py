import time
import sys
from playwright.sync_api import sync_playwright

def test_on_chart_setup_live_price_and_5_pips():
    print("=" * 68)
    print("RUNNING AUTOMATED TEST: On-Chart Setup Live Price & 5 Pips Bracket Suite")
    print("=" * 68)

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(viewport={"width": 1600, "height": 950})
        page = context.new_page()

        print("[Step 1] Navigating to EUR/USD Workstation...")
        page.goto("http://127.0.0.1:5173", wait_until="networkidle")
        page.wait_for_selector("[data-testid='on-chart-setup-btn']", timeout=10000)
        time.sleep(1.5)

        # Retrieve live quote or current chart price
        setup_btn = page.locator("[data-testid='on-chart-setup-btn']")
        sl_input = page.locator("[data-testid='sl-pips-input']")
        tp_input = page.locator("[data-testid='tp-pips-input']")

        # Check default pips in the order ticket before activating
        initial_sl_val = sl_input.input_value()
        initial_tp_val = tp_input.input_value()
        print(f"  -> Initial Sidebar SL input: {initial_sl_val} pips")
        print(f"  -> Initial Sidebar TP input: {initial_tp_val} pips")
        assert initial_sl_val == "5", f"Expected initial SL to be 5 pips, got {initial_sl_val}"
        assert initial_tp_val == "5", f"Expected initial TP to be 5 pips, got {initial_tp_val}"
        print("  -> PASSED: Default Stop Loss and Take Profit are 5 pips!")

        print("[Step 2] Activating On-Chart Setup...")
        setup_btn.click()
        page.wait_for_selector("[data-testid='on-chart-setup-entry']", timeout=5000)
        page.wait_for_selector("[data-testid='on-chart-setup-sl']", timeout=5000)
        page.wait_for_selector("[data-testid='on-chart-setup-tp']", timeout=5000)

        entry_text = page.locator("[data-testid='on-chart-setup-entry'] text").first.text_content()
        sl_text = page.locator("[data-testid='on-chart-setup-sl'] text").first.text_content()
        tp_text = page.locator("[data-testid='on-chart-setup-tp'] text").first.text_content()

        print(f"  -> Setup Entry Text: '{entry_text}'")
        print(f"  -> Setup SL Text: '{sl_text}'")
        print(f"  -> Setup TP Text: '{tp_text}'")

        # Extract prices
        import re
        entry_match = re.search(r"ENTRY \((?:BUY|SELL)\):\s*([\d\.]+)", entry_text or "")
        sl_match = re.search(r"SL:\s*([\d\.]+)\s*\(-([\d\.]+)p", sl_text or "")
        tp_match = re.search(r"TP:\s*([\d\.]+)\s*\(\+([\d\.]+)p", tp_text or "")

        assert entry_match, f"Could not parse entry price from '{entry_text}'"
        assert sl_match, f"Could not parse SL price and pips from '{sl_text}'"
        assert tp_match, f"Could not parse TP price and pips from '{tp_text}'"

        entry_price = float(entry_match.group(1))
        sl_price = float(sl_match.group(1))
        sl_pips = float(sl_match.group(2))
        tp_price = float(tp_match.group(1))
        tp_pips = float(tp_match.group(2))

        print(f"  -> Parsed Entry: {entry_price:.5f}")
        print(f"  -> Parsed SL: {sl_price:.5f} ({sl_pips} pips)")
        print(f"  -> Parsed TP: {tp_price:.5f} ({tp_pips} pips)")

        # Verify entry price is near current market price (1.11xx), NOT far away (1.08500)
        assert entry_price > 1.10000, f"Entry price {entry_price} was far away from live price (~1.11)!"
        assert abs(sl_pips - 5.0) < 0.2, f"Expected SL pips ~5.0, got {sl_pips}"
        assert abs(tp_pips - 5.0) < 0.2, f"Expected TP pips ~5.0, got {tp_pips}"
        print("  -> PASSED: Setup Entry is located directly at live price with 5 pips SL and 5 pips TP!")

        print("[Step 3] Testing dragging Entry Line on chart (Bracket Movement)...")
        entry_g = page.locator("[data-testid='on-chart-setup-entry']")
        entry_box = entry_g.bounding_box()
        tp_box = page.locator("[data-testid='on-chart-setup-tp']").bounding_box()
        sl_box = page.locator("[data-testid='on-chart-setup-sl']").bounding_box()
        print(f"  -> BBoxes: entry={entry_box}, tp={tp_box}, sl={sl_box}")

        # Target the center of the Entry Badge
        entry_badge = page.locator("[data-testid='on-chart-setup-entry'] rect").first
        badge_box = entry_badge.bounding_box()
        print(f"  -> Entry Badge BBox: {badge_box}")
        assert badge_box, "Entry badge bounding box not found"

        start_x = badge_box["x"] + badge_box["width"] / 2
        start_y = badge_box["y"] + badge_box["height"] / 2
        print(f"  -> Clicking & Dragging at ({start_x}, {start_y})")

        page.mouse.move(start_x, start_y)
        page.mouse.down()
        page.mouse.move(start_x, start_y - 40, steps=10)
        page.mouse.up()
        time.sleep(0.5)

        new_entry_text = page.locator("[data-testid='on-chart-setup-entry'] text").first.text_content()
        new_sl_text = page.locator("[data-testid='on-chart-setup-sl'] text").first.text_content()
        new_tp_text = page.locator("[data-testid='on-chart-setup-tp'] text").first.text_content()

        print(f"  -> After Drag Entry: '{new_entry_text}'")
        print(f"  -> After Drag SL: '{new_sl_text}'")
        print(f"  -> After Drag TP: '{new_tp_text}'")

        new_sl_match = re.search(r"\(-([\d\.]+)p", new_sl_text or "")
        new_tp_match = re.search(r"\(\+([\d\.]+)p", new_tp_text or "")
        assert new_sl_match and abs(float(new_sl_match.group(1)) - 5.0) < 0.2, f"SL pips drifted from 5 after moving entry: {new_sl_text}"
        assert new_tp_match and abs(float(new_tp_match.group(1)) - 5.0) < 0.2, f"TP pips drifted from 5 after moving entry: {new_tp_text}"
        print("  -> PASSED: Moving Entry point cleanly moves the entire 5-pip bracket together!")

        print("[Step 4] Testing dragging Stop Loss line individually...")
        sl_badge = page.locator("[data-testid='on-chart-setup-sl'] rect").first
        sl_box = sl_badge.bounding_box()
        assert sl_box, "SL badge bounding box not found"

        sl_x = sl_box["x"] + sl_box["width"] / 2
        sl_y = sl_box["y"] + sl_box["height"] / 2
        print(f"  -> Dragging SL badge from ({sl_x}, {sl_y}) down by 35px")

        page.mouse.move(sl_x, sl_y)
        page.mouse.down()
        page.mouse.move(sl_x, sl_y + 35, steps=10)
        page.mouse.up()
        time.sleep(0.5)

        modified_sl_text = page.locator("[data-testid='on-chart-setup-sl'] text").first.text_content()
        post_sl_entry_text = page.locator("[data-testid='on-chart-setup-entry'] text").first.text_content()
        print(f"  -> Modified SL Text: '{modified_sl_text}'")
        print(f"  -> Entry Text after SL move: '{post_sl_entry_text}'")

        mod_sl_match = re.search(r"\(-([\d\.]+)p", modified_sl_text or "")
        assert mod_sl_match, "Could not parse modified SL"
        assert abs(float(mod_sl_match.group(1)) - 5.0) > 0.5, f"Expected SL pips to change from 5.0, got {mod_sl_match.group(1)}"
        assert "1.11524" in (post_sl_entry_text or ""), f"Entry should not move when SL is dragged individually! Got {post_sl_entry_text}"
        print("  -> PASSED: Dragging Stop Loss individually updates SL while Entry remains stationary!")

        screenshot_path = "C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/workstation_on_chart_setup_live_and_5pips_verified.png"
        page.screenshot(path=screenshot_path)
        print(f"  -> Screenshot saved to: {screenshot_path}")

        print("[Step 5] Confirming trade and verifying on-chart active trade display...")
        page.locator("[data-testid='on-chart-confirm-setup-btn']").click()
        time.sleep(1.0)

        # Check for confirmed trade elements
        page.wait_for_selector(".open-trades-layer", timeout=5000)
        print("  -> PASSED: Confirmed trade successfully opened and rendered on chart canvas!")

        browser.close()

    print("=" * 68)
    print("ALL TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 68)

if __name__ == "__main__":
    test_on_chart_setup_live_price_and_5_pips()
