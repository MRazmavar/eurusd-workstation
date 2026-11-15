from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://127.0.0.1:5173')
    page.wait_for_timeout(3000)

    # Switch to 1D
    print("Switching to 1D...")
    page.evaluate("""() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn1D = btns.find(b => b.textContent && b.textContent.trim() === '1D');
        if (btn1D) btn1D.click();
    }""")
    page.wait_for_timeout(2000)

    # Now switch to 5m
    print("Switching to 5m...")
    page.evaluate("""() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent && b.textContent.trim() === '5m');
        if (btn) btn.click();
    }""")

    page.wait_for_timeout(40)
    rects = page.evaluate("""() => {
        const els = Array.from(document.querySelectorAll('[data-testid^="session-rect-"]'));
        return els.map(el => ({
            id: el.getAttribute('data-testid'),
            x: el.getAttribute('x'),
            y: el.getAttribute('y'),
            w: el.getAttribute('width'),
            h: el.getAttribute('height')
        }));
    }""")
    print(f"Immediately at +40ms, session rects count: {len(rects)}")
    for r in rects:
        print(r)

    browser.close()
