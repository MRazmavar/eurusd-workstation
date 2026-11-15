from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 850})
    page.goto('http://localhost:5173')
    page.wait_for_timeout(2000)
    page.locator('[data-testid="topbar-replay-btn"]').click()
    page.wait_for_timeout(1000)
    
    res = page.evaluate('''() => {
        const badge = document.querySelector('[data-testid^="news-badge-"]');
        let el = badge;
        const res = [];
        while (el) {
            res.push({
                tag: el.tagName,
                cls: el.className,
                rect: el.getBoundingClientRect()
            });
            el = el.parentElement;
        }
        return res;
    }''')
    for r in res:
        print(f"{r['tag']} (cls={r['cls'][:40]}): top={r['rect']['top']}, bottom={r['rect']['bottom']}, height={r['rect']['height']}")
    browser.close()
