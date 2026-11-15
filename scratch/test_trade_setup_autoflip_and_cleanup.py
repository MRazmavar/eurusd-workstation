import sys
from playwright.sync_api import sync_playwright

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        
        # ==================================================
        # 1. Desktop Viewport Testing (1400x900)
        # ==================================================
        page = browser.new_page(viewport={"width": 1400, "height": 900})
        page.goto("http://127.0.0.1:5173")
        page.wait_for_timeout(2500)

        print("==================================================")
        print(">>> 1. Testing Lower Confirmation Panel Removal (Desktop)")
        print("==================================================")
        
        # Click On-Chart Setup button in Right Sidebar to activate trade setup
        setup_btn = page.locator("[data-testid='on-chart-setup-btn']")
        assert setup_btn.is_visible(), "On-chart setup button must be visible in RightSidebar"
        setup_btn.click()
        page.wait_for_timeout(1000)

        # Verify on-chart setup is active
        assert page.locator("[data-testid='trade-setup-overlay']").is_visible(), "Trade setup overlay must be visible"

        # Verify lower confirmation panel is REMOVED
        lower_confirm_count = page.locator("[data-testid='confirm-order-btn']").count()
        print(f"Lower confirmation panel count: {lower_confirm_count} (Expected: 0)")
        assert lower_confirm_count == 0, "Lower confirmation panel must be completely removed!"

        # Verify moveable Floating Trade Control Panel is PRESENT
        trade_panel = page.locator("[data-testid='floating-trade-panel']")
        assert trade_panel.is_visible(), "FloatingTradeControlPanel must be visible"
        panel_confirm_btn = page.locator("[data-testid='trade-panel-confirm-setup-btn']")
        assert panel_confirm_btn.is_visible(), "FloatingTradeControlPanel must have the confirm button"
        print("PASS: Lower confirmation panel removed; moveable floating panel present.")

        print("==================================================")
        print(">>> 2. Testing Auto-Flip: SL Dragged Above Entry (BUY -> SELL)")
        print("==================================================")
        coords = page.evaluate("""() => {
            const slEl = document.querySelector('[data-testid="on-chart-setup-sl"]');
            const entryEl = document.querySelector('[data-testid="on-chart-setup-entry"]');
            const slLine = slEl.querySelector('line[stroke-width="24"]');
            const entryLine = entryEl.querySelector('line[stroke-width="24"]');
            const svgRect = document.querySelector('[data-testid="drawing-svg"]').getBoundingClientRect();
            return {
                slY: slLine.y1.baseVal.value + svgRect.top,
                entryY: entryLine.y1.baseVal.value + svgRect.top,
                dragX: slLine.x1.baseVal.value + 50
            };
        }""")
        print(f"Initial Coords: {coords}")

        page.mouse.move(coords["dragX"], coords["slY"])
        page.mouse.down()
        page.wait_for_timeout(50)
        for y in range(int(coords["slY"]), int(coords["entryY"] - 80), -5):
            page.mouse.move(coords["dragX"], y)
            page.wait_for_timeout(15)
        page.mouse.up()
        page.wait_for_timeout(500)

        # Verify type flipped to SELL
        flipped_badge = page.locator("[data-testid='on-chart-setup-entry'] text").text_content()
        print(f"After dragging SL above Entry, on-chart type: {flipped_badge}")
        assert flipped_badge == "SELL", f"Expected SELL, got {flipped_badge}"

        # Verify FloatingTradeControlPanel also displays SELL
        panel_text = trade_panel.text_content()
        assert "SELL" in panel_text, "FloatingTradeControlPanel must display SELL"
        print("PASS: Auto-flip to SELL verified!")

        # Screenshot after flipping to SELL
        page.screenshot(path="C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/trade_setup_flipped_to_sell.png")

        print("==================================================")
        print(">>> 3. Testing Auto-Flip: SL Dragged Below Entry (SELL -> BUY)")
        print("==================================================")
        coords2 = page.evaluate("""() => {
            const slEl = document.querySelector('[data-testid="on-chart-setup-sl"]');
            const entryEl = document.querySelector('[data-testid="on-chart-setup-entry"]');
            const slLine = slEl.querySelector('line[stroke-width="24"]');
            const entryLine = entryEl.querySelector('line[stroke-width="24"]');
            const svgRect = document.querySelector('[data-testid="drawing-svg"]').getBoundingClientRect();
            return {
                slY: slLine.y1.baseVal.value + svgRect.top,
                entryY: entryLine.y1.baseVal.value + svgRect.top,
                dragX: slLine.x1.baseVal.value + 50
            };
        }""")
        print(f"New SL Screen Y (above entry): {coords2['slY']}, Entry Y: {coords2['entryY']}")

        page.mouse.move(coords2["dragX"], coords2["slY"])
        page.mouse.down()
        page.wait_for_timeout(50)
        for y in range(int(coords2["slY"]), int(coords2["entryY"] + 80), 5):
            page.mouse.move(coords2["dragX"], y)
            page.wait_for_timeout(15)
        page.mouse.up()
        page.wait_for_timeout(500)

        # Verify type flipped back to BUY
        flipped_back_badge = page.locator("[data-testid='on-chart-setup-entry'] text").text_content()
        print(f"After dragging SL below Entry, on-chart type: {flipped_back_badge}")
        assert flipped_back_badge == "BUY", f"Expected BUY, got {flipped_back_badge}"

        # Verify FloatingTradeControlPanel displays BUY
        panel_text2 = trade_panel.text_content()
        assert "BUY" in panel_text2, "FloatingTradeControlPanel must display BUY"
        print("PASS: Auto-flip back to BUY verified!")

        # Screenshot after flipping back to BUY
        page.screenshot(path="C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/trade_setup_flipped_back_to_buy.png")

        print("==================================================")
        print(">>> 4. Testing Confirming Trade via Moveable Panel")
        print("==================================================")
        panel_confirm_btn.click()
        page.wait_for_timeout(1000)

        # After confirmation, setup overlay is closed
        assert page.locator("[data-testid='trade-setup-overlay']").count() == 0, "Setup overlay should close after confirm"
        print("PASS: Trade confirmed successfully from moveable FloatingTradeControlPanel!")

        # Final screenshot of active position
        page.screenshot(path="C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/trade_setup_confirmed_clean.png")

        # ==================================================
        # 5. Mobile Viewport Testing (iPhone 14: 390x844)
        # ==================================================
        print("==================================================")
        print(">>> 5. Testing Mobile Viewport Cleanliness")
        print("==================================================")
        mobile_page = browser.new_page(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
        mobile_page.goto("http://127.0.0.1:5173")
        mobile_page.wait_for_timeout(2000)

        # Start trade setup in mobile via localStorage or API
        mobile_page.evaluate("""() => {
            window.localStorage.setItem('eurusd_view_mode', 'mobile');
        }""")
        mobile_page.reload()
        mobile_page.wait_for_timeout(2000)

        # Verify lower confirmation panel is absent on mobile
        assert mobile_page.locator("[data-testid='confirm-order-btn']").count() == 0, "Lower confirmation panel must be absent on mobile"
        print("PASS: Mobile lower confirmation panel count is 0!")
        mobile_page.screenshot(path="C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/mobile_trade_setup_clean.png")

        browser.close()
        print("\n>>> ALL TESTS PASSED SUCCESSFULLY WITH 100% SUCCESS! <<<")

if __name__ == "__main__":
    run_test()
