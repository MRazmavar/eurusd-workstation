import time
from playwright.sync_api import sync_playwright

def test_no_unwanted_chart_movement():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        print("[1] Opening EUR/USD Workstation...")
        page.goto("http://127.0.0.1:5173")
        page.wait_for_selector(".tv-lightweight-charts, canvas", timeout=15000)
        time.sleep(2)

        # Activate Replay mode
        print("[2] Activating Bar Replay mode...")
        page.locator("button[data-testid='topbar-replay-btn']").click()
        time.sleep(1)

        # Get initial range after entering replay
        init_range = page.evaluate("""() => {
            const chart = window.__EURUSD_CHART__;
            return chart ? chart.timeScale().getVisibleLogicalRange() : null;
        }""")
        print(f"[*] Initial Replay Range: {init_range}")

        # User scrolls/pans 60 bars to the left to inspect past price action
        print("[3] User pans chart 60 bars to the left to examine historical structure...")
        page.evaluate("""() => {
            const chart = window.__EURUSD_CHART__;
            if (chart) {
                const cur = chart.timeScale().getVisibleLogicalRange();
                if (cur) {
                    chart.timeScale().setVisibleLogicalRange({
                        from: cur.from - 60,
                        to: cur.to - 60
                    });
                }
            }
        }""")
        time.sleep(0.5)

        user_panned_range = page.evaluate("""() => {
            const chart = window.__EURUSD_CHART__;
            return chart ? chart.timeScale().getVisibleLogicalRange() : null;
        }""")
        print(f"[*] User Panned Range: {user_panned_range}")

        # Step forward 5 times
        print("[4] Stepping forward 5 candles (Next Candle button)...")
        step_btn = page.locator("button[title*='Step Forward']").first
        for i in range(5):
            step_btn.click()
            time.sleep(0.1)
        time.sleep(0.5)

        range_after_steps = page.evaluate("""() => {
            const chart = window.__EURUSD_CHART__;
            return chart ? chart.timeScale().getVisibleLogicalRange() : null;
        }""")
        print(f"[*] Range After 5 Steps Forward: {range_after_steps}")

        assert range_after_steps["from"] == user_panned_range["from"], f"Chart moved by itself! From: {range_after_steps['from']} != {user_panned_range['from']}"
        assert range_after_steps["to"] == user_panned_range["to"], f"Chart moved by itself! To: {range_after_steps['to']} != {user_panned_range['to']}"
        print("[+] Verified: Next Candle does NOT move or yank the chart!")

        # Now test Play / Pause
        print("[5] Playing bars for 1 second...")
        play_btn = page.locator("button[title*='Play']").first
        play_btn.click()
        time.sleep(1.2)
        # Pause
        pause_btn = page.locator("button[title*='Pause']").first
        pause_btn.click()
        time.sleep(0.5)

        range_after_play = page.evaluate("""() => {
            const chart = window.__EURUSD_CHART__;
            return chart ? chart.timeScale().getVisibleLogicalRange() : null;
        }""")
        print(f"[*] Range After Play/Pause: {range_after_play}")

        assert range_after_play["from"] == user_panned_range["from"], f"Chart moved by itself during Play! From: {range_after_play['from']} != {user_panned_range['from']}"
        assert range_after_play["to"] == user_panned_range["to"], f"Chart moved by itself during Play! To: {range_after_play['to']} != {user_panned_range['to']}"
        print("[+] Verified: Play button does NOT move or yank the chart!")

        # Step Backward
        print("[6] Stepping backward (-1 candle)...")
        step_back_btn = page.locator("button[title*='Step Back']").first
        step_back_btn.click()
        time.sleep(0.5)

        range_after_back = page.evaluate("""() => {
            const chart = window.__EURUSD_CHART__;
            return chart ? chart.timeScale().getVisibleLogicalRange() : null;
        }""")
        print(f"[*] Range After Step Back: {range_after_back} (expected near {range_after_play['from']})")
        # Ensure it stayed in user's historical pan view (near 800) and did NOT jump back to current candle (930+)
        assert abs(range_after_back["from"] - range_after_play["from"]) <= 2, f"Chart jumped to candle head! {range_after_back}"
        assert range_after_back["from"] < 850, f"Chart jumped forward to replay head! {range_after_back}"
        print("[+] Verified: Step Back does NOT move or yank the chart!")

        # Toggle an indicator
        print("[7] Toggling sessions indicator button...")
        sessions_btn = page.locator("button[data-testid='topbar-sessions-btn']")
        sessions_btn.click()
        time.sleep(0.3)
        sessions_btn.click()
        time.sleep(0.5)

        range_after_btn = page.evaluate("""() => {
            const chart = window.__EURUSD_CHART__;
            return chart ? chart.timeScale().getVisibleLogicalRange() : null;
        }""")
        print(f"[*] Range After Button Click: {range_after_btn} vs Previous: {range_after_back}")
        assert range_after_btn["from"] == range_after_back["from"], f"Chart moved during indicator button click! {range_after_btn} vs {range_after_back}"
        print("[+] Verified: Other toolbar buttons do NOT move or yank the chart!")

        # Capture screenshot artifact
        screenshot_path = "C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/workstation_user_controls_chart_replay_verified.png"
        page.screenshot(path=screenshot_path)
        print(f"[8] Saved screenshot artifact to {screenshot_path}")

        browser.close()
        print("[SUCCESS] Chart never moves by itself during replay or button interactions! User has 100% manual control.")

if __name__ == "__main__":
    test_no_unwanted_chart_movement()
