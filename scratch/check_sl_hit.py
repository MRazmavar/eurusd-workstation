from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    page = browser.new_page(viewport={"width": 1400, "height": 900})
    page.goto("http://127.0.0.1:5173")
    page.wait_for_timeout(2000)

    page.locator("[data-testid='on-chart-setup-btn']").click()
    page.wait_for_timeout(1000)

    page.on("console", lambda msg: print("BROWSER LOG:", msg.text))

    res = page.evaluate("""() => {
        const slEl = document.querySelector('[data-testid="on-chart-setup-sl"]');
        const rect = slEl.getBoundingClientRect();
        const topEl = document.elementFromPoint(rect.left + 50, rect.top + 8);
        return {
            slRect: rect,
            topElTag: topEl ? topEl.tagName : null,
            topElClass: topEl ? topEl.className : null,
            topElTestId: topEl ? topEl.getAttribute('data-testid') : null,
            parentTestId: topEl && topEl.parentElement ? topEl.parentElement.getAttribute('data-testid') : null
        };
    }""")
    print("Hit test on SL handle:", res)
    browser.close()
