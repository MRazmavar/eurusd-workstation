import time
from playwright.sync_api import sync_playwright

def test_chart_scroll_behavior():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        page.goto("http://127.0.0.1:5173")
        page.wait_for_selector(".tv-lightweight-charts, canvas", timeout=15000)
        time.sleep(2)

        # Activate Replay mode
        page.locator("button[data-testid='topbar-replay-btn']").click()
        time.sleep(1)

        # Get initial visible range
        range1 = page.evaluate("""() => {
            const chart = window.__EURUSD_CHART__;
            return chart ? chart.timeScale().getVisibleLogicalRange() : null;
        }""")
        print("[1] Initial Replay Range:", range1)

        # User pans/scrolls the chart to look back in history
        # Let's pan by 50 bars to the left
        page.evaluate("""() => {
            const chart = window.__EURUSD_CHART__;
            if (chart) {
                const cur = chart.timeScale().getVisibleLogicalRange();
                if (cur) {
                    chart.timeScale().setVisibleLogicalRange({
                        from: cur.from - 50,
                        to: cur.to - 50
                    });
                }
            }
        }""")
        time.sleep(0.5)

        panned_range = page.evaluate("""() => {
            const chart = window.__EURUSD_CHART__;
            return chart ? chart.timeScale().getVisibleLogicalRange() : null;
        }""")
        print("[2] User Panned Range (looking at earlier candles):", panned_range)

        # Now click Step Forward button
        print("[3] Clicking Step Forward button...")
        step_btn = page.locator("button[title*='Step Forward']").first
        step_btn.click()
        time.sleep(0.8)

        range_after_step = page.evaluate("""() => {
            const chart = window.__EURUSD_CHART__;
            return chart ? chart.timeScale().getVisibleLogicalRange() : null;
        }""")
        print("[4] Range After Step Forward:", range_after_step)

        browser.close()

if __name__ == "__main__":
    test_chart_scroll_behavior()
