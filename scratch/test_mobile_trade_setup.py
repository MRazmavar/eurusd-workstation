import sys
import os
import time
from playwright.sync_api import sync_playwright

def run_mobile_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        # Emulate iPhone 14 (390x844) with touch enabled
        context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
            is_mobile=True,
            has_touch=True
        )
        page = context.new_page()

        console_logs = []
        page.on("console", lambda msg: console_logs.append(msg.text))

        print("[1] Navigating to http://localhost:5173 on mobile viewport...")
        page.goto('http://localhost:5173')
        page.wait_for_timeout(3000)

        # 1. Tap mobile bottom nav "Trade" tab
        print("[2] Opening mobile Trade ticket...")
        trade_nav_btn = page.locator('[data-testid="mobile-nav-trade"]')
        assert trade_nav_btn.is_visible(), "Mobile nav trade button should be visible"
        trade_nav_btn.click()
        page.wait_for_timeout(800)

        # Verify trade sheet is open
        trade_sheet = page.locator('[data-testid="mobile-trade-sheet"]')
        assert trade_sheet.is_visible(), "Mobile trade sheet should open"

        # 2. Tap "On-Chart Setup" button
        print("[3] Tapping On-Chart Setup button inside mobile ticket...")
        on_chart_btn = page.locator('[data-testid="on-chart-setup-btn"]')
        assert on_chart_btn.is_visible(), "On-chart setup button should be visible inside sheet"
        on_chart_btn.click()
        page.wait_for_timeout(800)

        # Verify that the trade sheet automatically closed!
        assert not trade_sheet.is_visible(), "Mobile trade sheet MUST automatically close when On-Chart Setup is tapped!"
        print("  -> PASSED: Mobile trade sheet auto-closed, chart is directly visible!")

        # 3. Verify on-chart trade setup overlay is visible
        setup_overlay = page.locator('[data-testid="trade-setup-overlay"]')
        assert setup_overlay.is_visible(), "On-chart trade setup overlay should be visible on chart"
        overlay_box = setup_overlay.bounding_box()
        print(f"  -> On-chart setup overlay box: {overlay_box}")

        # 4. Verify Floating Trade Control Panel is docked within screen bounds
        panel = page.locator('[data-testid="floating-trade-panel"]')
        assert panel.is_visible(), "Floating trade panel should be visible"
        panel_box = panel.bounding_box()
        print(f"  -> Floating panel box: {panel_box}")
        assert panel_box['x'] >= 0 and panel_box['x'] + panel_box['width'] <= 400, "Panel should be within horizontal bounds"
        assert panel_box['y'] >= 0 and panel_box['y'] + panel_box['height'] <= 844, "Panel should be within vertical bounds"
        assert panel_box['y'] + panel_box['height'] <= 790, "Panel should not hide behind MobileBottomNav (which starts ~784px)"
        print("  -> PASSED: Floating panel positioned cleanly within visible screen bounds!")

        # Take screenshot of mobile on-chart setup
        page.screenshot(path='scratch/mobile_trade_setup_initial.png')

        # 5. Test touch drag on SL line to test auto-flip
        sl_line = page.locator('[data-testid="on-chart-setup-sl"]')
        assert sl_line.is_visible(), "SL line should be visible"
        sl_box = sl_line.bounding_box()
        print(f"  -> SL line initial box: {sl_box}")

        entry_line = page.locator('[data-testid="on-chart-setup-entry"]')
        entry_box = entry_line.bounding_box()
        print(f"  -> Entry line initial box: {entry_box}")

        # Get initial order type and SL text
        panel_text_initial = panel.text_content()
        print(f"  -> Panel initial text:\n{panel_text_initial.strip()}")
        assert "BUY" in panel_text_initial, "Initial setup should be BUY"

        # Touch drag SL line: on screen, higher price is lower Y coordinate!
        # If we drag SL above Entry (i.e. to a lower Y coordinate than entry_box['y'] - 30):
        target_drag_y = entry_box['y'] - 40
        start_touch_x = sl_box['x'] + sl_box['width'] / 2
        start_touch_y = sl_box['y'] + sl_box['height'] / 2

        print(f"[4] Simulating touch drag of SL line from ({start_touch_x}, {start_touch_y}) to ({start_touch_x}, {target_drag_y})...")

        # Emulate touch gestures using CDP session for precise touchmove dispatch
        cdp = context.new_cdp_session(page)
        cdp.send("Input.dispatchTouchEvent", {
            "type": "touchStart",
            "touchPoints": [{"x": start_touch_x, "y": start_touch_y, "id": 1}]
        })
        time.sleep(0.05)

        # Move touch points across entry line
        steps = 5
        for i in range(1, steps + 1):
            cur_y = start_touch_y + (target_drag_y - start_touch_y) * (i / steps)
            cdp.send("Input.dispatchTouchEvent", {
                "type": "touchMove",
                "touchPoints": [{"x": start_touch_x, "y": cur_y, "id": 1}]
            })
            time.sleep(0.05)

        cdp.send("Input.dispatchTouchEvent", {
            "type": "touchEnd",
            "touchPoints": []
        })
        page.wait_for_timeout(500)

        # Verify auto-flip to SELL!
        panel_text_after_sl = panel.text_content()
        print(f"  -> Panel text after dragging SL above Entry:\n{panel_text_after_sl.strip()}")
        assert "SELL" in panel_text_after_sl, "Setup should have auto-flipped to SELL when SL moved above Entry!"
        print("  -> PASSED: Auto-flip to SELL via touch drag verified!")

        # Take screenshot of auto-flipped setup
        page.screenshot(path='scratch/mobile_trade_setup_flipped_sell.png')

        # 6. Test minimizing Floating Trade Control Panel on mobile
        print("[5] Testing panel minimize toggle...")
        minimize_btn = page.locator('[title="Minimize"]')
        assert minimize_btn.is_visible(), "Minimize chevron button should be visible"
        minimize_btn.click()
        page.wait_for_timeout(400)

        # Verify quick confirm button appears in minimized header
        quick_confirm_btn = page.locator('[data-testid="trade-panel-minimized-confirm-btn"]')
        assert quick_confirm_btn.is_visible(), "Quick confirm button should be visible in minimized mobile header"
        minimized_box = panel.bounding_box()
        print(f"  -> Minimized panel height: {minimized_box['height']}px (compact and unobstructed!)")
        assert minimized_box['height'] < 50, "Minimized panel height should be under 50px"

        page.screenshot(path='scratch/mobile_trade_setup_minimized.png')

        # 7. Expand panel again
        expand_btn = page.locator('[title="Expand"]')
        expand_btn.click()
        page.wait_for_timeout(400)

        # 8. Confirm Order on mobile
        print("[6] Confirming order via floating trade panel...")
        confirm_btn = page.locator('[data-testid="trade-panel-confirm-setup-btn"]')
        assert confirm_btn.is_visible(), "Confirm setup button should be visible"
        confirm_btn.click()
        page.wait_for_timeout(1000)

        # Verify trade executed: setup overlay should now be gone, and active trade line should be present
        assert not setup_overlay.is_visible(), "Trade setup overlay should be cleared after order confirmation"

        panel_after_confirm = page.locator('[data-testid="floating-trade-panel"]')
        print(f"  -> Panel text after order confirmation:\n{panel_after_confirm.text_content().strip()}")
        assert "SELL" in panel_after_confirm.text_content() or "BUY" in panel_after_confirm.text_content(), "Panel should now track confirmed trade"

        page.screenshot(path='scratch/mobile_trade_confirmed.png')
        print("  -> PASSED: Trade successfully executed from mobile on-chart setup!")

        browser.close()
        print("\nALL MOBILE ON-CHART TRADE SETUP TESTS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    run_mobile_test()
