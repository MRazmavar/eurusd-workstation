"""
Comprehensive Playwright E2E Test & Verification for Mobile View, Device Auto-Recognition, and Cross-Device Responsiveness.
"""
import sys
import os
import time
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = r"C:\Users\moham\.gemini\antigravity\brain\7a304e26-ed66-4949-8d2a-5874b8c819e9"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def test_responsive_mobile_workstation():
    print(">>> Starting Mobile & Cross-Device Responsiveness Verification...")

    with sync_playwright() as p:
        # Launch browser using installed Google Chrome
        browser = p.chromium.launch(channel="chrome", headless=True)

        # -------------------------------------------------------------
        # TEST 1: DESKTOP VIEWPORT (1440x900)
        # -------------------------------------------------------------
        print("\n--- TEST 1: Desktop Viewport (1440x900) ---")
        desktop_context = browser.new_context(viewport={"width": 1440, "height": 900})
        desktop_page = desktop_context.new_page()

        desktop_page.goto("http://localhost:5173", wait_until="networkidle")
        desktop_page.wait_for_timeout(2000)

        # Verify Desktop elements
        mode_btn = desktop_page.locator("[data-testid='topbar-mode-toggle']")
        mode_text = mode_btn.text_content() if mode_btn.count() > 0 else "N/A"
        print(f"Desktop mode button text: {mode_text}")
        assert "Desktop" in mode_text or "Auto" in mode_text, "Expected Desktop mode indicator"

        # Verify Left toolbar & Right sidebar exist on desktop
        assert desktop_page.locator("[data-testid='sidebar-tab-order']").count() > 0, "Right sidebar tab should exist"
        assert desktop_page.locator("[data-testid='dock-tab-analytics']").count() > 0, "Bottom dock should exist"
        assert desktop_page.locator("[data-testid='mobile-bottom-nav']").count() == 0, "Mobile bottom nav should NOT exist on desktop"

        desktop_path = os.path.join(SCREENSHOT_DIR, "desktop_mode_verified.png")
        desktop_page.screenshot(path=desktop_path)
        print(f"Saved: {desktop_path}")
        desktop_context.close()

        # -------------------------------------------------------------
        # TEST 2: MOBILE VIEWPORT AUTO-RECOGNITION (iPhone 14 / Pixel: 390x844)
        # -------------------------------------------------------------
        print("\n--- TEST 2: Mobile Viewport Auto-Recognition (390x844) ---")
        mobile_context = browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
            is_mobile=True,
            has_touch=True
        )
        page = mobile_context.new_page()

        page.goto("http://localhost:5173", wait_until="networkidle")
        page.wait_for_timeout(2000)

        # Verify Mobile Mode detected automatically
        mobile_nav = page.locator("[data-testid='mobile-bottom-nav']")
        assert mobile_nav.count() > 0, "Mobile bottom nav should be rendered on mobile screen!"
        print("PASS: Mobile Bottom Navigation Bar is present.")

        # Check TopBar elements on mobile
        mobile_bid = page.locator("[data-testid='mobile-topbar-bid']")
        if mobile_bid.count() > 0:
            print(f"Live EUR/USD Bid price visible on mobile: {mobile_bid.text_content()}")
        assert page.locator("[data-testid='topbar-mobile-menu-btn']").count() > 0, "Mobile menu hamburger button should be present"

        # Chart should occupy 100% width, sidebars hidden from side
        chart_path = os.path.join(SCREENSHOT_DIR, "mobile_chart_mode_verified.png")
        page.screenshot(path=chart_path)
        print(f"Saved: {chart_path}")

        # -------------------------------------------------------------
        # TEST 3: MOBILE DRAWING TOOLS SHEET
        # -------------------------------------------------------------
        print("\n--- TEST 3: Mobile Drawing Tools Sheet ---")
        page.locator("[data-testid='mobile-nav-tools']").click()
        page.wait_for_timeout(500)

        tools_sheet = page.locator("[data-testid='mobile-tools-sheet']")
        assert tools_sheet.count() > 0, "Mobile tools sheet should open on tap"
        print("PASS: Mobile Tools Sheet opened.")

        # Verify Long Position and Short Position tools are available
        assert page.locator("[data-testid='mobile-tool-item-long_position']").count() > 0, "Long Position tool should be present"
        assert page.locator("[data-testid='mobile-tool-item-short_position']").count() > 0, "Short Position tool should be present"

        tools_path = os.path.join(SCREENSHOT_DIR, "mobile_tools_sheet_verified.png")
        page.screenshot(path=tools_path)
        print(f"Saved: {tools_path}")

        # Select Long Position tool
        page.locator("[data-testid='mobile-tool-item-long_position']").click()
        page.wait_for_timeout(500)
        print("PASS: Long Position tool selected from mobile tools sheet.")

        # -------------------------------------------------------------
        # TEST 4: MOBILE TRADE / ORDER TICKET SHEET
        # -------------------------------------------------------------
        print("\n--- TEST 4: Mobile Trade / Order Ticket Sheet ---")
        page.locator("[data-testid='mobile-nav-trade']").click()
        page.wait_for_timeout(600)

        trade_sheet = page.locator("[data-testid='mobile-trade-sheet']")
        assert trade_sheet.count() > 0, "Mobile trade sheet should open"
        print("PASS: Mobile Trade Sheet opened.")

        trade_path = os.path.join(SCREENSHOT_DIR, "mobile_trade_sheet_verified.png")
        page.screenshot(path=trade_path)
        print(f"Saved: {trade_path}")

        # Place a simulated BUY order
        buy_btn = page.locator("button:has-text('Place Simulated BUY Order'), button:has-text('Place Simulated')")
        if buy_btn.count() > 0:
            buy_btn.first.click()
            page.wait_for_timeout(800)
            print("PASS: Simulated order executed from Mobile Trade Sheet.")

        # If trade sheet still open, close it
        close_trade = page.locator("[data-testid='mobile-sidebar-close-btn']")
        if close_trade.count() > 0 and close_trade.is_visible():
            close_trade.click()
            page.wait_for_timeout(500)

        # -------------------------------------------------------------
        # TEST 5: MOBILE POSITIONS SHEET
        # -------------------------------------------------------------
        print("\n--- TEST 5: Mobile Positions Sheet ---")
        page.locator("[data-testid='mobile-nav-positions']").click()
        page.wait_for_timeout(600)

        dock_sheet = page.locator("[data-testid='mobile-dock-sheet']")
        assert dock_sheet.count() > 0, "Mobile positions dock sheet should open"
        print("PASS: Mobile Positions Sheet opened.")

        positions_path = os.path.join(SCREENSHOT_DIR, "mobile_positions_sheet_verified.png")
        page.screenshot(path=positions_path)
        print(f"Saved: {positions_path}")

        # Return to chart via dock close button
        close_dock = page.locator("[data-testid='mobile-dock-close-btn']")
        if close_dock.count() > 0 and close_dock.is_visible():
            close_dock.click()
            page.wait_for_timeout(500)

        # -------------------------------------------------------------
        # TEST 6: MOBILE DRAWER MENU & MODE SWITCHER
        # -------------------------------------------------------------
        print("\n--- TEST 6: Mobile Drawer Menu & Mode Switcher ---")
        page.locator("[data-testid='topbar-mobile-menu-btn']").click()
        page.wait_for_timeout(600)

        drawer = page.locator("[data-testid='mobile-drawer-content']")
        assert drawer.count() > 0, "Mobile menu drawer should open"
        print("PASS: Mobile Drawer opened.")

        drawer_path = os.path.join(SCREENSHOT_DIR, "mobile_drawer_verified.png")
        page.screenshot(path=drawer_path)
        print(f"Saved: {drawer_path}")

        # Test switching mode to Desktop mode manually from mobile view
        print("Testing manual override: switching to Desktop mode...")
        page.locator("[data-testid='mode-select-desktop']").click()
        page.wait_for_timeout(1000)

        # In desktop mode on the same mobile screen, mobile-bottom-nav should disappear and desktop docks should appear
        assert page.locator("[data-testid='mobile-bottom-nav']").count() == 0, "Mobile nav should disappear in manual desktop mode"
        assert page.locator("[data-testid='sidebar-tab-order']").count() > 0, "Desktop sidebar should render"

        mode_toggle_path = os.path.join(SCREENSHOT_DIR, "mode_toggle_verified.png")
        page.screenshot(path=mode_toggle_path)
        print(f"Saved: {mode_toggle_path}")

        # Switch back to Mobile mode via topbar mode button
        page.locator("[data-testid='topbar-mode-toggle']").click()
        page.wait_for_timeout(1000)
        assert page.locator("[data-testid='mobile-bottom-nav']").count() > 0, "Mobile nav should reappear"
        print("PASS: Toggled back to Mobile mode cleanly.")

        # -------------------------------------------------------------
        # TEST 7: TABLET VIEWPORT (768x1024 - iPad)
        # -------------------------------------------------------------
        print("\n--- TEST 7: Tablet Viewport (768x1024) ---")
        tablet_context = browser.new_context(
            viewport={"width": 768, "height": 1024},
            user_agent="Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
            is_mobile=True,
            has_touch=True
        )
        tablet_page = tablet_context.new_page()
        tablet_page.goto("http://localhost:5173", wait_until="networkidle")
        tablet_page.wait_for_timeout(2000)

        tablet_path = os.path.join(SCREENSHOT_DIR, "tablet_mode_verified.png")
        tablet_page.screenshot(path=tablet_path)
        print(f"Saved: {tablet_path}")
        tablet_context.close()

        mobile_context.close()
        browser.close()

    print("\n>>> ALL RESPONSIVE & MOBILE TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    test_responsive_mobile_workstation()
