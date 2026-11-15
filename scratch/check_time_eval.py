from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://127.0.0.1:5173')
    page.wait_for_timeout(3000)

    # Let's inspect transformer.xToTime at different x coordinates
    res = page.evaluate("""() => {
        // Find chart or transformer
        // Let's call coordinateToTime on chart's timeScale
        const svg = document.querySelector('[data-testid="drawing-svg"]');
        return {
            svgWidth: svg ? svg.clientWidth : null
        };
    }""")
    print("SVG width:", res)
    browser.close()
