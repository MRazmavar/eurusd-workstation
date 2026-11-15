from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://127.0.0.1:5173')
    page.wait_for_timeout(3000)

    # Listen to console and network
    page.on("console", lambda msg: print(f"[CONSOLE {msg.type}] {msg.text}"))
    page.on("requestfailed", lambda req: print(f"[REQ FAILED] {req.url} {req.failure}"))
    page.on("response", lambda resp: print(f"[RESP] {resp.url} {resp.status}") if 'candles' in resp.url else None)

    # Switch to 4h
    print(">>> 1. Switching to 4h...")
    page.evaluate("""() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent && b.textContent.trim() === '4h');
        if (btn) btn.click();
    }""")
    page.wait_for_timeout(2000)

    # Check candles count
    candles_count = page.evaluate("""() => {
        return window.replayEngine ? window.replayEngine.getVisibleCandles().length : null;
    }""")
    print("Visible candles on 4h:", candles_count)

    # Open Jump to Date modal
    print(">>> 2. Opening Jump to Date...")
    page.click("button:has-text('Jump to Date')")
    page.wait_for_timeout(1000)

    # Screenshot modal
    page.screenshot(path="C:/Users/moham/.gemini/antigravity/scratch/eurusd-workstation/scratch/jump_modal.png")

    # Set date to 2023-05-15
    date_input = page.locator("input[type='date']")
    if date_input.count() > 0:
        print("Date input found, filling 2023-05-15...")
        date_input.fill("2023-05-15")
        page.wait_for_timeout(500)
        # Click Jump / Confirm button in modal
        jump_confirm = page.locator("button:has-text('Jump to Date & Time')")
        if jump_confirm.count() == 0:
            jump_confirm = page.locator("button:has-text('Jump')")
        print(f"Jump button count: {jump_confirm.count()}")
        jump_confirm.first.click()
        page.wait_for_timeout(3000)

        # Check what happened
        res = page.evaluate("""() => {
            const candles = window.replayEngine ? window.replayEngine.getVisibleCandles() : [];
            return {
                candlesCount: candles.length,
                firstCandle: candles[0] ? new Date(candles[0].time * 1000).toISOString() : null,
                lastCandle: candles[candles.length - 1] ? new Date(candles[candles.length - 1].time * 1000).toISOString() : null
            };
        }""")
        print("After Jump:", res)
        page.screenshot(path="C:/Users/moham/.gemini/antigravity/scratch/eurusd-workstation/scratch/after_jump_4h.png")

    browser.close()
