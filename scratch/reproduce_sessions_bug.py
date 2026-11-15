from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://127.0.0.1:5173')
    page.wait_for_timeout(3000)

    # Let's switch to 4h
    print("Switching to 4h...")
    page.evaluate("""() => {
        // Let's trigger timeframe change to 4h
        const btns = Array.from(document.querySelectorAll('button'));
        const btn4h = btns.find(b => b.textContent && b.textContent.trim() === '4h');
        if (btn4h) btn4h.click();
    }""")
    page.wait_for_timeout(2000)

    # Inspect sessions-layer
    count4h = page.locator("[data-testid='sessions-layer']").count()
    print("Sessions layer count on 4h:", count4h)

    # Now switch to 15m
    print("Switching to 15m...")
    page.evaluate("""() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn15m = btns.find(b => b.textContent && b.textContent.trim() === '15m');
        if (btn15m) btn15m.click();
    }""")
    # Check sessions layer immediately and after a few timeouts
    for ms in [50, 100, 200, 500, 1000]:
        page.wait_for_timeout(ms)
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
        print(f"At +{ms}ms, session rects count: {len(rects)}")
        if rects:
            print("First 3 rects:", rects[:3])
            # Check if any rect width is huge (e.g. > 500)
            huge = [r for r in rects if float(r.get('w', 0)) > 400]
            if huge:
                print(f"!!! FOUND {len(huge)} HUGE RECTS:", huge[:2])
                page.screenshot(path="C:/Users/moham/.gemini/antigravity/scratch/eurusd-workstation/scratch/huge_sessions_reproduced.png")
                break

    browser.close()
