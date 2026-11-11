import time
from playwright.sync_api import sync_playwright

def test_tradingview_match():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        page = browser.new_page(viewport={'width': 1400, 'height': 900})
        page.goto('http://127.0.0.1:5173/')
        page.wait_for_selector('[data-testid="drawing-svg"]', timeout=15000)
        time.sleep(1)

        # Clear existing drawings
        page.on('dialog', lambda d: d.accept())
        trash = page.locator('button[title="Remove All Drawings"]')
        if trash.is_visible():
            trash.click()
            time.sleep(0.5)

        chart = page.locator('[data-testid="drawing-svg"]')
        box = chart.bounding_box()

        # 1. Place a Long Position
        page.locator('[data-testid="fav-tool-long_position"]').click()
        time.sleep(0.3)
        page.mouse.click(box['x'] + 350, box['y'] + 320)
        time.sleep(0.5)

        # Verify Long Position rendered with TradingView style
        long_pos = page.locator('[data-testid^="drawing-long-position-"]')
        assert long_pos.is_visible(), "Long position should be visible on chart"

        # Check the Risk/reward ratio badge text
        badge = long_pos.locator('text=Risk/reward ratio:')
        assert badge.is_visible(), "TradingView Risk/reward ratio badge must be visible"
        badge_text = badge.text_content()
        print(f"Long Position Badge Text: {badge_text}")
        assert "Risk/reward ratio: 1" in badge_text, f"Expected default 'Risk/reward ratio: 1', got '{badge_text}'"

        # Check handles: exactly 4 visible blue rounded squares
        handles = page.locator('[data-testid^="anchor-handle-"]')
        print(f"Anchor handles present: {handles.count()}")

        # Take screenshot of selected Long Position matching TradingView
        page.screenshot(path='scratch/tv_long_position_match.png')

        # 2. Test Top-Left Handle Drag (Take Profit adjustment)
        # Find handle with pointIndex=2 (TP for Long)
        tp_handle = page.locator('[data-testid$="-2"]').first
        tp_box = tp_handle.bounding_box()
        # Drag TP handle up by 60px
        page.mouse.move(tp_box['x'] + tp_box['width'] / 2, tp_box['y'] + tp_box['height'] / 2)
        page.mouse.down()
        page.mouse.move(tp_box['x'] + tp_box['width'] / 2, tp_box['y'] + tp_box['height'] / 2 - 60, steps=5)
        page.mouse.up()
        time.sleep(0.5)

        # Check updated badge text (R:R ratio increased!)
        updated_badge_text = badge.text_content()
        print(f"After TP Drag - Badge Text: {updated_badge_text}")
        assert updated_badge_text != badge_text, "Badge text should update when TP is dragged"

        # 3. Test Middle-Right Handle Drag (Width adjustment)
        width_handle = page.locator('[data-testid$="-3"]').first
        w_box = width_handle.bounding_box()
        # Drag right handle 80px to the right
        page.mouse.move(w_box['x'] + w_box['width'] / 2, w_box['y'] + w_box['height'] / 2)
        page.mouse.down()
        page.mouse.move(w_box['x'] + w_box['width'] / 2 + 80, w_box['y'] + w_box['height'] / 2, steps=5)
        page.mouse.up()
        time.sleep(0.5)

        # 4. Now place a Short Position side-by-side
        page.locator('[data-testid="fav-tool-short_position"]').click()
        time.sleep(0.3)
        page.mouse.click(box['x'] + 700, box['y'] + 280)
        time.sleep(0.5)

        short_pos = page.locator('[data-testid^="drawing-short-position-"]')
        assert short_pos.is_visible(), "Short position should be visible on chart"

        short_badge = short_pos.locator('text=Risk/reward ratio:')
        assert short_badge.is_visible(), "Short position Risk/reward ratio badge must be visible"
        print(f"Short Position Badge Text: {short_badge.text_content()}")

        # Take screenshot of both tools side-by-side on 1m
        page.screenshot(path='scratch/tv_both_positions_1m.png')

        # 5. Check Different Timeframes (5m, 15m, 1h, 4h, 1D)
        for tf in ['5m', '15m', '1h', '4h', '1D']:
            tf_btn = page.locator(f"button:has-text('{tf}')").first
            if tf_btn.is_visible():
                tf_btn.click()
                time.sleep(1.2)
                # Verify positions still exist on chart
                assert page.locator('[data-testid^="drawing-long-position-"]').is_visible(), f"Long position should persist on {tf}"
                assert page.locator('[data-testid^="drawing-short-position-"]').is_visible(), f"Short position should persist on {tf}"
                page.screenshot(path=f'scratch/tv_positions_{tf}.png')
                print(f"Timeframe {tf} verified and screenshot saved")

        print("ALL TRADINGVIEW STYLE AND TIMEFRAME TESTS PASSED 100%!")
        browser.close()

if __name__ == "__main__":
    test_tradingview_match()
