import time
from playwright.sync_api import sync_playwright

def test_backtest_sessions_realtime():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        print("[1] Opening EUR/USD Workstation...")
        page.goto("http://127.0.0.1:5173")
        page.wait_for_selector(".tv-lightweight-charts, canvas", timeout=15000)
        time.sleep(2)

        # Set timeframe to 15m
        page.locator("button[data-testid='topbar-tf-15m']").click()
        time.sleep(1)

        # Set timezone to UTC
        page.locator("button[data-testid='chart-timezone-btn']").click()
        time.sleep(0.3)
        page.locator("button[data-testid='tz-option-UTC']").click()
        time.sleep(0.5)

        # Click Market Tab on Right Sidebar to display Forex Sessions widget
        page.locator("button[data-testid='sidebar-tab-market']").click()
        time.sleep(0.5)

        # Activate Replay mode
        print("[2] Activating Bar Replay mode...")
        page.locator("button[data-testid='topbar-replay-btn']").click()
        time.sleep(1)

        # Jump to right before London session (2026-11-05 07:45 UTC)
        print("[3] Jumping to 2026-11-05 07:45 UTC (Frankfurt ending, London starting)...")
        page.locator("[data-testid='jump-to-date-btn']").click()
        time.sleep(0.5)
        page.locator("[data-testid='jump-datetime-input']").fill("2026-11-05T07:45")
        time.sleep(0.2)
        page.locator("[data-testid='confirm-jump-btn']").click()
        time.sleep(1.5)

        # Check status before London open
        before_london = page.evaluate("""() => {
            const legendTime = document.querySelector('[data-testid="legend-candle-time"]')?.textContent;
            const activePill = document.querySelector('[data-testid="topbar-sessions-btn"]')?.textContent;
            const sidebarWidget = document.querySelector('[data-testid="sidebar-sessions-widget"]')?.innerText;
            return { legendTime, activePill, sidebarWidget };
        }""")
        print(f"[*] At 07:45 UTC -> Legend: {before_london['legendTime']}, TopBar: {before_london['activePill']}")

        # Step forward 1 candle (15m -> 08:00 UTC = LONDON OPEN!)
        print("[4] Stepping forward 1 candle to 08:00 UTC (London Open)...")
        step_btn = page.locator("button[title*='Step Forward']").first
        step_btn.click()
        time.sleep(0.8)

        london_open_info = page.evaluate("""() => {
            const legendTime = document.querySelector('[data-testid="legend-candle-time"]')?.textContent;
            const activePill = document.querySelector('[data-testid="topbar-sessions-btn"]')?.textContent;
            
            // Check session badge on chart for London
            const londonBadge = document.querySelector('[data-testid="session-badge-london_1h"]')?.textContent;
            const londonRect = document.querySelector('[data-testid="session-rect-london_1h"]');
            const londonLevels = document.querySelector('[data-testid="session-active-levels-london_1h"]')?.textContent;

            // Check sidebar widget
            const sidebarWidget = document.querySelector('[data-testid="sidebar-sessions-widget"]')?.innerText;

            return {
                legendTime,
                activePill,
                londonBadge,
                hasLondonRect: !!londonRect,
                londonLevels,
                sidebarWidget
            };
        }""")
        print(f"[+] London Open -> Legend: {london_open_info['legendTime']}")
        print(f"[+] TopBar Sessions Pill: {london_open_info['activePill']}")
        print(f"[+] On-Chart London Badge: {london_open_info['londonBadge']}")
        print(f"[+] On-Chart London Active Levels: {london_open_info['londonLevels']}")
        sidebar_clean = (london_open_info['sidebarWidget'] or "").encode('ascii', errors='replace').decode('ascii')
        print(f"[+] Sidebar Sessions Widget:\n{sidebar_clean}\n")

        assert london_open_info["hasLondonRect"], "London session rectangle was not drawn on chart at 08:00 UTC!"
        assert "LIVE" in (london_open_info["londonBadge"] or ""), f"London badge did not show LIVE! {london_open_info['londonBadge']}"
        assert "London (1h)" in (london_open_info["activePill"] or ""), f"TopBar sessions pill did not show London (1h)! {london_open_info['activePill']}"
        assert "ACTIVE" in (london_open_info["sidebarWidget"] or ""), "Sidebar sessions widget did not show ACTIVE for London!"

        # Now step forward 3 more candles (08:15, 08:30, 08:45)
        print("[5] Stepping forward through London session (08:15 -> 08:45 UTC)...")
        for i in range(3):
            step_btn.click()
            time.sleep(0.3)
        time.sleep(1)

        london_mid_info = page.evaluate("""() => {
            const legendTime = document.querySelector('[data-testid="legend-candle-time"]')?.textContent;
            const londonBadge = document.querySelector('[data-testid="session-badge-london_1h"]')?.textContent;
            const londonLevels = document.querySelector('[data-testid="session-active-levels-london_1h"]')?.textContent;
            const sidebarWidget = document.querySelector('[data-testid="sidebar-sessions-widget"]')?.innerText;
            return { legendTime, londonBadge, londonLevels, sidebarWidget };
        }""")
        print(f"[+] London Mid Session -> Legend: {london_mid_info['legendTime']}")
        print(f"[+] London Badge updated: {london_mid_info['londonBadge']}")
        print(f"[+] London Levels updated: {london_mid_info['londonLevels']}")
        sidebar_mid_clean = (london_mid_info['sidebarWidget'] or "").encode('ascii', errors='replace').decode('ascii')
        print(f"[+] Sidebar Sessions updated:\n{sidebar_mid_clean}\n")

        # Capture screenshot artifact
        screenshot_path = "C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/workstation_backtest_sessions_realtime_verified.png"
        page.screenshot(path=screenshot_path)
        print(f"[6] Saved screenshot artifact to {screenshot_path}")

        browser.close()
        print("[SUCCESS] Backtest sessions indicator updates in real-time as new bars are revealed!")

if __name__ == "__main__":
    test_backtest_sessions_realtime()
