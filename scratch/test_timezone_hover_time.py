import time
from playwright.sync_api import sync_playwright

def test_timezone_hover_time():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        print("[1] Navigating to EUR/USD Workstation...")
        page.goto("http://127.0.0.1:5173")
        page.wait_for_selector(".tv-lightweight-charts, canvas", timeout=15000)
        time.sleep(2)

        # Ensure timezone is UTC initially
        print("[2] Selecting UTC timezone...")
        tz_btn = page.locator("button[data-testid='chart-timezone-btn']")
        tz_btn.click()
        time.sleep(0.3)
        page.locator("button[data-testid='tz-option-UTC']").click()
        time.sleep(0.5)

        # Move mouse over center of chart canvas to hover a candle
        chart_box = page.locator(".tv-lightweight-charts canvas").first.bounding_box()
        hover_x = chart_box["x"] + chart_box["width"] * 0.5
        hover_y = chart_box["y"] + chart_box["height"] * 0.5
        page.mouse.move(hover_x, hover_y)
        time.sleep(0.5)

        # Read time from legend and crosshair time badge in UTC
        legend_time_utc = page.locator("[data-testid='legend-candle-time']").inner_text()
        badge_time_utc = page.locator("[data-testid='crosshair-time-badge'] text").text_content()
        print(f"[*] UTC Legend Time: '{legend_time_utc}' | Crosshair Badge: '{badge_time_utc}'")

        # Now switch timezone to Asia/Tehran (UTC+3:30)
        print("[3] Switching timezone to Asia/Tehran (UTC+3:30)...")
        tz_btn.click()
        time.sleep(0.3)
        page.locator("button[data-testid='tz-option-Asia_Tehran']").click()
        time.sleep(0.8)

        # Move mouse slightly to refresh hover
        page.mouse.move(hover_x + 1, hover_y)
        time.sleep(0.5)

        legend_time_thr = page.locator("[data-testid='legend-candle-time']").inner_text()
        badge_time_thr = page.locator("[data-testid='crosshair-time-badge'] text").text_content()
        print(f"[*] Tehran Legend Time: '{legend_time_thr}' | Crosshair Badge: '{badge_time_thr}'")

        assert legend_time_thr != legend_time_utc, f"Legend time did not change after timezone switch! {legend_time_thr}"
        assert badge_time_thr != badge_time_utc, f"Crosshair badge time did not change after timezone switch! {badge_time_thr}"

        # Now switch timezone to America/New_York (UTC-4)
        print("[4] Switching timezone to America/New_York (UTC-4)...")
        tz_btn.click()
        time.sleep(0.3)
        page.locator("button[data-testid='tz-option-America_New_York']").click()
        time.sleep(0.8)

        page.mouse.move(hover_x + 2, hover_y)
        time.sleep(0.5)

        legend_time_ny = page.locator("[data-testid='legend-candle-time']").inner_text()
        badge_time_ny = page.locator("[data-testid='crosshair-time-badge'] text").text_content()
        print(f"[*] New York Legend Time: '{legend_time_ny}' | Crosshair Badge: '{badge_time_ny}'")

        assert legend_time_ny != legend_time_thr, f"NY Legend time did not change from Tehran! {legend_time_ny}"
        assert badge_time_ny != badge_time_thr, f"NY Crosshair badge did not change from Tehran! {badge_time_ny}"

        # Capture screenshot artifact
        screenshot_path = "C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/workstation_timezone_candle_hover_time_verified.png"
        page.screenshot(path=screenshot_path)
        print(f"[5] Saved screenshot artifact to {screenshot_path}")

        browser.close()
        print("[SUCCESS] Timezone candle hover time dynamically updates across all timezones!")

if __name__ == "__main__":
    test_timezone_hover_time()
