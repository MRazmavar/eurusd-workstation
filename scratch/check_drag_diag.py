from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://127.0.0.1:5173')
    page.wait_for_timeout(3000)
    page.locator("[data-testid='on-chart-setup-btn']").click()
    page.wait_for_timeout(1000)

    # Let's inspect console logs by listening to console
    page.on("console", lambda msg: print(f"[CONSOLE {msg.type}] {msg.text}"))

    # Let's check mouse coord and timeToX
    diag = page.evaluate("""() => {
        const svg = document.querySelector('[data-testid="drawing-svg"]');
        const profit = document.querySelector('[data-testid="on-chart-setup-profit-zone"]');
        return {
            profitX: profit.getAttribute('x'),
            profitWidth: profit.getAttribute('width'),
            profitY: profit.getAttribute('y')
        };
    }""")
    print("Diag 1:", diag)

    # Trigger a drag
    profit_zone = page.locator("[data-testid='on-chart-setup-profit-zone']")
    box = profit_zone.bounding_box()
    sx = box['x'] + box['width'] / 2
    sy = box['y'] + box['height'] / 2
    page.mouse.move(sx, sy)
    page.mouse.down()
    page.mouse.move(sx - 150, sy, steps=10)
    page.mouse.up()
    page.wait_for_timeout(500)

    diag2 = page.evaluate("""() => {
        const profit = document.querySelector('[data-testid="on-chart-setup-profit-zone"]');
        return {
            profitX: profit.getAttribute('x'),
            profitWidth: profit.getAttribute('width'),
            profitY: profit.getAttribute('y')
        };
    }""")
    print("Diag 2:", diag2)
    browser.close()
