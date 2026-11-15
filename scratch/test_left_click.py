from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://127.0.0.1:5173')
    page.wait_for_timeout(3000)
    page.locator("[data-testid='on-chart-setup-btn']").click()
    page.wait_for_timeout(1000)

    page.on("console", lambda msg: print(f"[CONSOLE] {msg.text}"))

    profit_zone = page.locator("[data-testid='on-chart-setup-profit-zone']")
    box = profit_zone.bounding_box()
    print("Initial box:", box)

    # Click on the left side of the profit zone (away from right badges)
    sx = box['x'] + 20
    sy = box['y'] + box['height'] / 2
    print(f"Clicking at ({sx}, {sy})")
    page.mouse.move(sx, sy)
    page.mouse.down()
    page.mouse.move(sx - 150, sy, steps=5)
    page.wait_for_timeout(300)

    during_drag = page.evaluate("""() => {
        const profit = document.querySelector('[data-testid="on-chart-setup-profit-zone"]');
        return {
            x: profit.getAttribute('x'),
            y: profit.getAttribute('y')
        };
    }""")
    print("During Drag:", during_drag)

    page.mouse.up()
    page.wait_for_timeout(500)

    box2 = profit_zone.bounding_box()
    print("After Drag box:", box2)
    browser.close()
