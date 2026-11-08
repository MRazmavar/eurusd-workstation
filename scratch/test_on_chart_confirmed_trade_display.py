"""
Playwright Automated Verification for:
1. On-Chart Confirmed Trade Display:
   - When an order is confirmed, the trade stays permanently visible on the chart canvas.
   - Displays Entry Point horizontal line & interactive badge with direction, lot size, and entry price.
   - Displays Real-Time Profit / Loss (PnL in USD and pips).
   - Displays Stop Loss (SL point) line & badge with exact money loss amount and pip distance.
   - Displays Take Profit (Target point) line & badge with exact money profit amount and pip distance.
   - Allows closing the trade directly from the chart using the on-chart [✕ Close] button.
"""
import sys
import time
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

def main():
    print("====================================================================")
    print("RUNNING AUTOMATED TEST: Confirmed On-Chart Trade & Real-Time PnL Suite")
    print("====================================================================")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, channel="chrome")
        context = browser.new_context(viewport={"width": 1600, "height": 900})
        page = context.new_page()

        print("[Step 1] Navigating to EUR/USD Workstation...")
        page.goto("http://127.0.0.1:5173")
        page.wait_for_selector("canvas", timeout=15000)
        time.sleep(2.0)

        # Ensure Order ticket tab is active
        order_tab = page.locator("[data-testid='sidebar-tab-order']")
        if order_tab.is_visible():
            order_tab.click()
            time.sleep(0.3)

        print("[Step 2] Activating On-Chart Setup...")
        setup_btn = page.locator("[data-testid='on-chart-setup-btn']")
        if "Chart Lines ON" not in setup_btn.inner_text():
            setup_btn.click()
            time.sleep(1.0)

        print("[Step 3] Confirming the trade directly on the chart line...")
        confirm_btn = page.locator("[data-testid='on-chart-confirm-setup-btn']").first
        assert confirm_btn.is_visible(), "Confirm button on on-chart setup line should be visible!"
        confirm_btn.click()
        time.sleep(1.5)

        print("[Step 4] Verifying the confirmed trade remains visible on the chart...")
        # Verify on-chart trade container exists
        entry_badge = page.locator("[data-testid^='on-chart-entry-badge-']").first
        assert entry_badge.is_visible(), "Confirmed trade entry badge MUST remain visible on chart!"
        entry_text = (entry_badge.text_content() or '').strip()
        print(f"  -> Confirmed Trade Entry Badge: '{entry_text}'")
        assert "Lots @" in entry_text or "L @" in entry_text, f"Unexpected entry badge text: '{entry_text}'"
        print("  -> PASSED: Trade Entry line & badge visible on chart after confirmation!")

        # Verify Real-Time PnL display
        pnl_badge = page.locator("[data-testid^='on-chart-pnl-']").first
        assert pnl_badge.is_visible(), "Real-time PnL badge MUST be visible on the chart!"
        pnl_text = (pnl_badge.text_content() or '').strip()
        print(f"  -> Real-Time On-Chart PnL: '{pnl_text}'")
        assert "$" in pnl_text and "p)" in pnl_text, f"Unexpected PnL format: '{pnl_text}'"
        print("  -> PASSED: Real-time money profit/loss and pips displayed on chart!")

        # Verify Stop Loss point line & badge
        sl_badge = page.locator("[data-testid^='on-chart-sl-badge-']").first
        assert sl_badge.is_visible(), "Stop Loss point badge MUST be visible on chart!"
        sl_text = (sl_badge.text_content() or '').strip()
        print(f"  -> Stop Loss Info Badge: '{sl_text}'")
        assert "SL:" in sl_text and "-$" in sl_text, f"Unexpected SL badge format: '{sl_text}'"
        print("  -> PASSED: Stop Loss point with pip distance and money loss displayed on chart!")

        # Verify Take Profit / Target point line & badge
        tp_badge = page.locator("[data-testid^='on-chart-tp-badge-']").first
        assert tp_badge.is_visible(), "Take Profit / Target point badge MUST be visible on chart!"
        tp_text = (tp_badge.text_content() or '').strip()
        print(f"  -> Target Point Info Badge: '{tp_text}'")
        assert "TP:" in tp_text and "+$" in tp_text, f"Unexpected TP badge format: '{tp_text}'"
        print("  -> PASSED: Target point with pip distance and money profit displayed on chart!")

        # Capture verified screenshot of confirmed trade on chart
        screenshot_path = "C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/workstation_on_chart_confirmed_trade_verified.png"
        page.screenshot(path=screenshot_path)
        print(f"  -> Saved confirmed on-chart trade screenshot to: {screenshot_path}")

        print("[Step 5] Testing closing the trade directly from the on-chart close button...")
        testid = entry_badge.get_attribute("data-testid") or ""
        trade_id = testid.replace("on-chart-entry-badge-", "")
        print(f"  -> Target trade ID to close: '{trade_id}'")

        close_btn = page.locator(f"[data-testid='on-chart-close-btn-{trade_id}']")
        assert close_btn.is_visible(), "On-chart [✕ Close] button MUST be visible!"
        close_btn.click(force=True)
        time.sleep(1.0)

        # Verify specific trade badge is no longer active on chart
        assert not close_btn.is_visible(), "On-chart trade close button should disappear once closed!"
        print("  -> PASSED: Position successfully closed directly from on-chart button!")

        # Verify toast
        toast = page.locator("[data-testid='workstation-hud-toast']")
        if toast.is_visible():
            print(f"  -> Toast notification: '{toast.inner_text().strip()}'")

        print("====================================================================")
        print("ALL TESTS PASSED WITH 100% SUCCESS!")
        print("====================================================================")

        browser.close()

if __name__ == "__main__":
    main()
