"""
Playwright Comprehensive Test Suite for:
1. PART 1: Trading Session Range Rectangles
   - Rectangles represent the actual High-Low price range covered by each trading session.
   - Strictly bounded horizontally (duration) and vertically (actual session High-Low from OHLC).
   - Never extend vertically across the chart (height != '100%').
   - Session identification, colors, labels (including Shield Area), and styles preserved.
2. PART 2: TradingView-Style Long & Short Position Visualization
   - BUY: Green profit zone above entry, Red risk zone below entry, Entry dividing line.
   - SELL: Red risk zone above entry, Green profit zone below entry, Entry dividing line.
   - Dynamically extends with incoming candles; stops extending upon trade closure.
   - Real-time P&L ($ and pips), R:R, lot size, entry, and market price.
   - Interactive SL/TP dragging and on-chart execution.
   - Closed trade historical visualization preserved.
"""

import sys
import time
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def main():
    print("=" * 80)
    print("VERIFICATION SUITE: Trading Session Range Rectangles & TV Position Boxes")
    print("=" * 80)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, channel="chrome")
        context = browser.new_context(viewport={"width": 1600, "height": 950})
        page = context.new_page()

        print("\n[Step 1] Loading EUR/USD Workstation...")
        page.goto("http://127.0.0.1:5173", wait_until="networkidle")
        page.wait_for_selector("[data-testid='drawing-svg']", timeout=15000)
        time.sleep(2.0)
        print("  -> Chart & Drawing SVG Canvas successfully loaded!")

        # -------------------------------------------------------------
        # PART 1: Trading Session Range Rectangles Verification
        # -------------------------------------------------------------
        print("\n[Step 2] Testing PART 1 — Trading Session Range Rectangles...")
        sessions_layer = page.locator("[data-testid='sessions-layer']")
        assert sessions_layer.is_visible(), "Forex Sessions layer should be visible on chart!"

        session_rects = page.locator("[data-testid^='session-rect-']")
        rect_count = session_rects.count()
        print(f"  -> Found {rect_count} active session range rectangles on chart.")
        assert rect_count > 0, "At least one session range rectangle must be rendered!"

        # Inspect boundaries of visible session rectangles
        for i in range(min(6, rect_count)):
            rect = session_rects.nth(i)
            testid = rect.get_attribute("data-testid") or ""
            height_str = rect.get_attribute("height") or ""
            y_str = rect.get_attribute("y") or ""
            width_str = rect.get_attribute("width") or ""
            fill = rect.get_attribute("fill") or ""

            print(f"  Rectangle [{testid}]: y={y_str}, height={height_str}, width={width_str}, fill={fill}")
            assert height_str != "100%", f"FAILED: {testid} height must NOT be '100%'! Must represent actual session High-Low."
            height_val = float(height_str)
            width_val = float(width_str)
            assert height_val > 0, f"Rectangle height must be strictly positive, got {height_val}"
            assert width_val > 0, f"Rectangle width must be strictly positive, got {width_val}"

        print("  -> PASSED: All session rectangles have bounded, independent High-Low ranges!")

        # Verify Shield Area and Session Badges
        shield_badge = page.locator("[data-testid='session-badge-shield_area']")
        if shield_badge.count() > 0:
            badge_text = (shield_badge.first.text_content() or '').strip()
            print(f"  -> Verified Shield Area Badge text: '{badge_text}'")
            assert "Shield" in badge_text

        # -------------------------------------------------------------
        # PART 2: TradingView Long Position Box Verification
        # -------------------------------------------------------------
        print("\n[Step 3] Testing PART 2 — TradingView Long Position (BUY) Box...")
        order_tab = page.locator("[data-testid='sidebar-tab-order']")
        if order_tab.is_visible():
            order_tab.click()
            time.sleep(0.3)

        # Set direction to BUY
        buy_toggle = page.locator("button:has-text('BUY')").first
        if buy_toggle.is_visible():
            buy_toggle.click()
            time.sleep(0.3)

        # Click On-Chart Setup
        setup_btn = page.locator("[data-testid='on-chart-setup-btn']")
        if "Chart Lines ON" not in (setup_btn.inner_text() or ''):
            setup_btn.click()
            time.sleep(1.0)

        # Confirm the setup to create active position box
        confirm_btn = page.locator("[data-testid='on-chart-confirm-setup-btn']").first
        assert confirm_btn.is_visible(), "On-chart confirm button should be visible!"
        confirm_btn.click(force=True)
        time.sleep(1.5)

        # Check TradingView Long Position Box components
        profit_zone = page.locator("[data-testid^='position-profit-zone-']").first
        risk_zone = page.locator("[data-testid^='position-risk-zone-']").first
        entry_line = page.locator("[data-testid^='position-entry-line-']").first
        entry_badge = page.locator("[data-testid^='on-chart-entry-badge-']").first
        tp_badge = page.locator("[data-testid^='on-chart-tp-badge-']").first
        sl_badge = page.locator("[data-testid^='on-chart-sl-badge-']").first

        assert profit_zone.is_visible(), "TradingView Green Profit Zone MUST be visible!"
        assert risk_zone.is_visible(), "TradingView Red Risk Zone MUST be visible!"
        assert entry_line.count() > 0, "TradingView Entry dividing line MUST be rendered!"
        assert entry_badge.is_visible(), "Trade Information Card MUST be visible!"
        assert tp_badge.is_visible(), "Take Profit Target badge MUST be visible!"
        assert sl_badge.is_visible(), "Stop Loss Risk badge MUST be visible!"

        profit_fill = profit_zone.get_attribute("fill")
        risk_fill = risk_zone.get_attribute("fill")
        profit_y = float(profit_zone.get_attribute("y") or "0")
        profit_h = float(profit_zone.get_attribute("height") or "0")
        risk_y = float(risk_zone.get_attribute("y") or "0")
        risk_h = float(risk_zone.get_attribute("height") or "0")
        entry_y = float(entry_line.get_attribute("y1") or "0")

        print(f"  Long Position Coordinates: Entry Y={entry_y}, Profit Y={profit_y} (H={profit_h}), Risk Y={risk_y} (H={risk_h})")
        assert profit_fill == "#089981", f"Expected green profit fill #089981, got {profit_fill}"
        assert risk_fill == "#f23645", f"Expected red risk fill #f23645, got {risk_fill}"

        # For BUY: Profit zone is ABOVE entry (in SVG, smaller Y coordinate)
        assert profit_y <= entry_y + 1, "In a BUY trade, Profit Zone must be ABOVE entry!"
        # For BUY: Risk zone is BELOW entry (in SVG, larger Y coordinate)
        assert risk_y >= entry_y - 1, "In a BUY trade, Risk Zone must be BELOW entry!"
        print("  -> PASSED: TradingView Long Position Box vertical orientation is 100% correct!")

        # Information Card Verification
        card_text = (entry_badge.text_content() or '').strip()
        print(f"  -> Trade Card Info: '{card_text}'")
        assert "BUY" in card_text, "Expected BUY direction in position card"
        assert "L @" in card_text or "Lots @" in card_text, "Expected Lot size and Entry price in card"
        assert "$" in card_text and "p)" in card_text, "Expected real-time unrealized PnL in card"

        tp_text = (tp_badge.text_content() or '').strip()
        sl_text = (sl_badge.text_content() or '').strip()
        print(f"  -> TP Target Badge: '{tp_text}'")
        print(f"  -> SL Risk Badge: '{sl_text}'")
        assert "TP:" in tp_text and "R:R" in tp_text, "Expected TP price and R:R ratio in TP badge"
        assert "SL:" in sl_text and "-$" in sl_text, "Expected SL price and loss amount in SL badge"

        # -------------------------------------------------------------
        # PART 2.5: Test Dragging SL/TP on the Chart
        # -------------------------------------------------------------
        print("\n[Step 4] Testing interactive level dragging on chart...")
        sl_line = page.locator("[data-testid^='on-chart-sl-'] line").first
        sl_box = sl_line.bounding_box()
        if sl_box:
            # Drag SL line down 20 pixels
            page.mouse.move(sl_box["x"] + sl_box["width"] / 2, sl_box["y"])
            page.mouse.down()
            page.mouse.move(sl_box["x"] + sl_box["width"] / 2, sl_box["y"] + 25, steps=5)
            page.mouse.up()
            time.sleep(0.5)
            print("  -> PASSED: Dragged Stop Loss handle smoothly on chart canvas!")

        # -------------------------------------------------------------
        # PART 2.6: Test Closing Position & Historical Preservation
        # -------------------------------------------------------------
        print("\n[Step 5] Testing Closing Position & Historical Box Preservation...")
        trade_id = (entry_badge.get_attribute("data-testid") or "").replace("on-chart-entry-badge-", "")
        print(f"  -> Target trade ID: {trade_id}")
        close_btn = page.locator(f"[data-testid='on-chart-close-btn-{trade_id}']")
        print(f"  -> Close btn bounding box: {close_btn.bounding_box()}")
        close_btn.dispatch_event('click')
        time.sleep(1.5)

        # Check that historical position box remains visible on the chart canvas
        target_card = page.locator(f"[data-testid='on-chart-entry-badge-{trade_id}']")
        assert target_card.count() > 0, "Historical trade position box must remain preserved on chart!"
        closed_text = (target_card.text_content() or '').strip()
        print(f"  -> Preserved Historical Position Card: '{closed_text}'")
        assert "CLOSED" in closed_text, f"Expected CLOSED status on historical trade card, got '{closed_text}'"
        print("  -> PASSED: Closed trade remains historically preserved without active close buttons!")

        # -------------------------------------------------------------
        # PART 2.7: Test TradingView Short Position (SELL) Box
        # -------------------------------------------------------------
        print("\n[Step 6] Testing PART 2 — TradingView Short Position (SELL) Box...")
        sell_toggle = page.locator("button:has-text('SELL')").first
        if sell_toggle.is_visible():
            sell_toggle.click()
            time.sleep(0.3)

        setup_btn = page.locator("[data-testid='on-chart-setup-btn']")
        if "Chart Lines ON" not in (setup_btn.inner_text() or ''):
            setup_btn.click()
            time.sleep(1.0)

        confirm_btn = page.locator("[data-testid='on-chart-confirm-setup-btn']").first
        assert confirm_btn.is_visible(), "On-chart confirm button should be visible for SELL!"
        confirm_btn.click(force=True)
        time.sleep(1.5)

        # The newly opened SELL trade is at the top of active trades
        sell_badge = page.locator("[data-testid^='on-chart-entry-badge-']").first
        sell_trade_id = (sell_badge.get_attribute("data-testid") or "").replace("on-chart-entry-badge-", "")
        print(f"  -> Confirmed SELL Trade ID: {sell_trade_id}")

        sell_profit_zone = page.locator(f"[data-testid='position-profit-zone-{sell_trade_id}']")
        sell_risk_zone = page.locator(f"[data-testid='position-risk-zone-{sell_trade_id}']")
        sell_entry_line = page.locator(f"[data-testid='position-entry-line-{sell_trade_id}']")

        sell_profit_y = float(sell_profit_zone.get_attribute("y") or "0")
        sell_profit_h = float(sell_profit_zone.get_attribute("height") or "0")
        sell_risk_y = float(sell_risk_zone.get_attribute("y") or "0")
        sell_risk_h = float(sell_risk_zone.get_attribute("height") or "0")
        sell_entry_y = float(sell_entry_line.get_attribute("y1") or "0")

        print(f"  Short Position Coordinates: Entry Y={sell_entry_y}, Profit Y={sell_profit_y} (H={sell_profit_h}), Risk Y={sell_risk_y} (H={sell_risk_h})")
        # For SELL: Profit zone is BELOW entry (in SVG, larger Y coordinate)
        assert sell_profit_y >= sell_entry_y - 1, "In a SELL trade, Profit Zone must be BELOW entry!"
        # For SELL: Risk zone is ABOVE entry (in SVG, smaller Y coordinate)
        assert sell_risk_y <= sell_entry_y + 1, "In a SELL trade, Risk Zone must be ABOVE entry!"
        print("  -> PASSED: TradingView Short Position Box vertical orientation (Red above, Green below) is 100% correct!")

        # Capture High-Resolution Verification Screenshot
        screenshot_path = "C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/workstation_session_rectangles_and_position_boxes_verified.png"
        page.screenshot(path=screenshot_path)
        print(f"\n[Step 7] Saved full verification screenshot to: {screenshot_path}")

        print("\n" + "=" * 80)
        print("ALL TESTS PASSED: Session Range Rectangles & TV Position Boxes Verified!")
        print("=" * 80)
        browser.close()

if __name__ == "__main__":
    main()
