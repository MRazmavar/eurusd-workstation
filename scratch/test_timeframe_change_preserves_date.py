import time
import datetime
from playwright.sync_api import sync_playwright

def test_timeframe_change_preserves_date():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        print("[1] Navigating to EUR/USD Workstation...")
        page.goto("http://127.0.0.1:5173")
        page.wait_for_selector(".tv-lightweight-charts, canvas", timeout=15000)
        time.sleep(2)

        print("[2] Clicking 'Random Date' in TopBar...")
        random_btn = page.locator("button[data-testid='topbar-random-date-btn']")
        random_btn.wait_for(state="visible", timeout=10000)
        random_btn.click()

        # Wait for historical candles to load and replay to synchronize
        time.sleep(3.5)

        t_initial = page.evaluate("() => window.__replayEngine?.getCurrentTimestamp()")
        assert t_initial is not None and t_initial > 0, f"Replay timestamp invalid: {t_initial}"
        dt_initial = datetime.datetime.fromtimestamp(t_initial, datetime.timezone.utc)
        print(f"[*] Initial Random Date: {dt_initial.isoformat()} (epoch: {t_initial})")

        # Now test switching to 15m
        print("[3] Switching timeframe to 15m...")
        tf_15m_btn = page.locator("button[data-testid='topbar-tf-15m']")
        tf_15m_btn.click()
        time.sleep(3)

        t_15m = page.evaluate("() => window.__replayEngine?.getCurrentTimestamp()")
        assert t_15m is not None, "Timestamp on 15m is None!"
        dt_15m = datetime.datetime.fromtimestamp(t_15m, datetime.timezone.utc)
        diff_15m = abs(t_15m - t_initial)
        print(f"[*] 15m Date: {dt_15m.isoformat()} (epoch: {t_15m}, diff: {diff_15m}s)")
        assert diff_15m <= 3600, f"15m date shifted too far! diff: {diff_15m}s"

        # Switch to 5m
        print("[4] Switching timeframe to 5m...")
        tf_5m_btn = page.locator("button[data-testid='topbar-tf-5m']")
        tf_5m_btn.click()
        time.sleep(3)

        t_5m = page.evaluate("() => window.__replayEngine?.getCurrentTimestamp()")
        assert t_5m is not None, "Timestamp on 5m is None!"
        dt_5m = datetime.datetime.fromtimestamp(t_5m, datetime.timezone.utc)
        diff_5m = abs(t_5m - t_initial)
        print(f"[*] 5m Date: {dt_5m.isoformat()} (epoch: {t_5m}, diff: {diff_5m}s)")
        assert diff_5m <= 3600, f"5m date shifted too far! diff: {diff_5m}s"

        # Switch to 4h
        print("[5] Switching timeframe to 4h...")
        tf_4h_btn = page.locator("button[data-testid='topbar-tf-4h']")
        tf_4h_btn.click()
        time.sleep(3)

        t_4h = page.evaluate("() => window.__replayEngine?.getCurrentTimestamp()")
        assert t_4h is not None, "Timestamp on 4h is None!"
        dt_4h = datetime.datetime.fromtimestamp(t_4h, datetime.timezone.utc)
        diff_4h = abs(t_4h - t_initial)
        print(f"[*] 4h Date: {dt_4h.isoformat()} (epoch: {t_4h}, diff: {diff_4h}s)")
        assert diff_4h <= 14400, f"4h date shifted too far! diff: {diff_4h}s"

        # Switch to 1D
        print("[6] Switching timeframe to 1D...")
        tf_1d_btn = page.locator("button[data-testid='topbar-tf-1D']")
        tf_1d_btn.click()
        time.sleep(3)

        t_1d = page.evaluate("() => window.__replayEngine?.getCurrentTimestamp()")
        assert t_1d is not None, "Timestamp on 1D is None!"
        dt_1d = datetime.datetime.fromtimestamp(t_1d, datetime.timezone.utc)
        diff_1d = abs(t_1d - t_initial)
        print(f"[*] 1D Date: {dt_1d.isoformat()} (epoch: {t_1d}, diff: {diff_1d}s)")
        assert diff_1d <= 86400, f"1D date shifted too far! diff: {diff_1d}s"

        # Switch to 1h
        print("[7] Switching back to 1h...")
        tf_1h_btn = page.locator("button[data-testid='topbar-tf-1h']")
        tf_1h_btn.click()
        time.sleep(3)

        t_1h = page.evaluate("() => window.__replayEngine?.getCurrentTimestamp()")
        diff_1h = abs(t_1h - t_initial)
        print(f"[*] 1h Date: {datetime.datetime.fromtimestamp(t_1h, datetime.timezone.utc).isoformat()} (epoch: {t_1h}, diff: {diff_1h}s)")
        assert diff_1h == 0 or diff_1h <= 3600, f"1h date shifted! diff: {diff_1h}s"

        # Switch to custom 20m via numeric keyboard
        print("[8] Testing Quick Timeframe Jump (20m)...")
        page.keyboard.press("2")
        time.sleep(0.3)
        page.keyboard.press("0")
        time.sleep(0.3)
        page.keyboard.press("Enter")
        time.sleep(3.5)

        t_20m = page.evaluate("() => window.__replayEngine?.getCurrentTimestamp()")
        dt_20m = datetime.datetime.fromtimestamp(t_20m, datetime.timezone.utc)
        diff_20m = abs(t_20m - t_initial)
        print(f"[*] 20m Date: {dt_20m.isoformat()} (epoch: {t_20m}, diff: {diff_20m}s)")
        assert diff_20m <= 3600, f"20m date shifted too far! diff: {diff_20m}s"

        # Step forward in replay
        print("[9] Stepping forward in replay...")
        t_before = page.evaluate("() => window.__replayEngine?.getCurrentTimestamp()")
        page.evaluate("() => window.__replayEngine?.stepForward(5)")
        time.sleep(0.5)
        t_stepped = page.evaluate("() => window.__replayEngine?.getCurrentTimestamp()")
        assert t_stepped > t_before, f"Replay didn't step forward! {t_stepped} <= {t_before}"
        print(f"[*] Stepped forward successfully to: {datetime.datetime.fromtimestamp(t_stepped, datetime.timezone.utc).isoformat()}")

        # Capture screenshot artifact
        screenshot_path = "C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/workstation_timeframe_change_date_preserved.png"
        page.screenshot(path=screenshot_path)
        print(f"[10] Saved screenshot artifact to {screenshot_path}")

        browser.close()
        print("[SUCCESS] All multi-timeframe anchor date preservation tests passed!")

if __name__ == "__main__":
    test_timeframe_change_preserves_date()
