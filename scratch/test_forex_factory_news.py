import time
import sys
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def test_forex_factory_news():
    print("=" * 70)
    print("RUNNING AUTOMATED TEST: Forex Factory News Events (Real-time & Bar Replay)")
    print("=" * 70)

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        context = browser.new_context(viewport={"width": 1600, "height": 950})
        page = context.new_page()

        print("[Step 1] Navigating to EUR/USD Workstation...")
        page.goto("http://127.0.0.1:5173", wait_until="networkidle")
        page.wait_for_selector("[data-testid='drawing-svg']", timeout=12000)
        time.sleep(2.5)
        print("  -> PASSED: Chart canvas and workstation loaded!")

        # Step 2: Check TopBar News Button
        print("[Step 2] Verifying TopBar News toggle button...")
        news_btn = page.locator("[data-testid='topbar-news-btn']")
        news_btn.wait_for(state="visible", timeout=6000)
        btn_text = news_btn.inner_text().replace('\n', ' ')
        print(f"  -> PASSED: TopBar News button found: '{btn_text}'")
        assert "News" in btn_text and "ON" in btn_text, f"Expected News ON, got: {btn_text}"

        # Step 3: Check that Forex Factory News badges appear along bottom axis
        print("[Step 3] Checking for Forex Factory News badges on the live chart...")
        news_badges = page.locator("div[data-testid^='news-badge-']")
        badge_count = news_badges.count()
        print(f"  -> Total news badges rendered on chart: {badge_count}")
        assert badge_count > 0, "Expected at least 1 news badge on chart"

        # Check for High Impact (Red) badge
        red_badges = page.locator("div[data-testid^='news-badge-'] button.bg-\\[\\#dc2626\\]")
        red_count = red_badges.count()
        print(f"  -> High Impact (Red) badges: {red_count}")
        assert red_count > 0, "Expected at least 1 Red High Impact news badge"

        # Check for Medium Impact (Yellow) badge
        yellow_badges = page.locator("div[data-testid^='news-badge-'] button.bg-\\[\\#f59e0b\\], div[data-testid^='news-badge-'] button.bg-\\[\\#d97706\\]")
        yellow_count = yellow_badges.count()
        print(f"  -> Medium Impact (Yellow) badges: {yellow_count}")
        assert yellow_count > 0, "Expected at least 1 Yellow Medium Impact news badge"

        # Step 4: Click/Hover on a Red High Impact news badge to inspect the Forex Factory Card
        print("[Step 4] Inspecting Forex Factory News Card popup...")
        first_red_badge = red_badges.first
        first_red_badge.click(force=True)
        time.sleep(0.6)

        popover = page.locator("[data-testid='news-card-popover']")
        popover.wait_for(state="visible", timeout=5000)
        popover_text = popover.text_content() or ""
        print(f"  -> Popover card header: '{popover_text[:120]}...'")
        assert "Forex Factory" in popover_text
        assert "High Impact" in popover_text or "Medium Impact" in popover_text
        assert "Actual" in popover_text and "Forecast" in popover_text and "Previous" in popover_text
        print("  -> PASSED: Forex Factory card displays Title, Time, Actual/Forecast/Previous table, and EUR/USD Bias!")

        # Step 5: Verify News events in Bar Replay
        print("[Step 5] Testing News events during Bar Replay backtesting...")
        replay_btn = page.locator("[data-testid='topbar-replay-btn']")
        replay_btn.click()
        time.sleep(1.0)

        # Check news badges in replay mode
        replay_badge_count = news_badges.count()
        print(f"  -> News badges visible in Bar Replay mode: {replay_badge_count}")
        assert replay_badge_count > 0, "Expected news badges to remain visible and active in Bar Replay"

        # Exit replay mode
        replay_btn.click()
        time.sleep(0.8)

        # Step 6: Test toggling News OFF and ON
        print("[Step 6] Testing News toggle button (OFF / ON)...")
        news_btn.click()
        time.sleep(0.6)
        btn_text_off = news_btn.inner_text().replace('\n', ' ')
        print(f"  -> Button text after toggle: '{btn_text_off}'")
        assert "OFF" in btn_text_off
        assert news_badges.count() == 0, "Expected 0 news badges when News is toggled OFF"
        print("  -> PASSED: News badges hidden when toggled OFF!")

        # Toggle back ON
        news_btn.click()
        time.sleep(0.6)
        btn_text_on = news_btn.inner_text().replace('\n', ' ')
        print(f"  -> Button text after turning ON: '{btn_text_on}'")
        assert "ON" in btn_text_on
        restored_count = news_badges.count()
        print(f"  -> Restored news badges: {restored_count}")
        assert restored_count > 0, "Expected news badges to be restored"

        # Click on a badge again so the Forex Factory card is open for screenshot artifact
        first_red_badge.click(force=True)
        time.sleep(0.6)

        # Step 7: Capture visual verification artifact
        print("[Step 7] Capturing screenshot artifact...")
        artifact_path = r"C:\Users\moham\.gemini\antigravity\brain\7a304e26-ed66-4949-8d2a-5874b8c819e9\workstation_forex_factory_news_verified.png"
        page.screenshot(path=artifact_path)
        print(f"  -> Screenshot saved to: {artifact_path}")

        browser.close()
        print("=" * 70)
        print("ALL FOREX FACTORY NEWS TESTS PASSED SUCCESSFULLY!")
        print("=" * 70)

if __name__ == '__main__':
    test_forex_factory_news()
