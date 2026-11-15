from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://127.0.0.1:5173')
    page.wait_for_timeout(3000)

    # Inspect xToTime with different x coordinates
    res = page.evaluate("""() => {
        const svg = document.querySelector('[data-testid="drawing-svg"]');
        const rect = svg.getBoundingClientRect();
        // Check if chart is available
        return {
            left: rect.left,
            right: rect.right,
            width: rect.width
        };
    }""")
    print("SVG Rect:", res)
    browser.close()
