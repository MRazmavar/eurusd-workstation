from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    page = browser.new_page(viewport={"width": 1400, "height": 900})
    page.goto("http://127.0.0.1:5173")
    page.wait_for_timeout(2000)

    page.locator("[data-testid='on-chart-setup-btn']").click()
    page.wait_for_timeout(1000)

    # Listen to console logs
    page.on("console", lambda msg: print("PAGE LOG:", msg.text))

    # Evaluate exact positions in page
    pos = page.evaluate("""() => {
        const slEl = document.querySelector('[data-testid="on-chart-setup-sl"]');
        const entryEl = document.querySelector('[data-testid="on-chart-setup-entry"]');
        const slLine = slEl.querySelector('line[stroke-width="24"]');
        const entryLine = entryEl.querySelector('line[stroke-width="24"]');
        return {
            slLine: { x1: slLine.x1.baseVal.value, y1: slLine.y1.baseVal.value, x2: slLine.x2.baseVal.value, y2: slLine.y2.baseVal.value },
            entryLine: { x1: entryLine.x1.baseVal.value, y1: entryLine.y1.baseVal.value, x2: entryLine.x2.baseVal.value, y2: entryLine.y2.baseVal.value },
            svgRect: document.querySelector('[data-testid="drawing-svg"]').getBoundingClientRect()
        };
    }""")
    print("Exact SVG positions:", pos)

    browser.close()
