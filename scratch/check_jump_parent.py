from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 850})
    page.goto('http://localhost:5173')
    page.wait_for_timeout(2000)
    page.locator('[data-testid="topbar-replay-btn"]').click()
    page.wait_for_timeout(1000)
    
    parents = page.evaluate('''() => {
        const btn = document.querySelector('[data-testid="jump-to-bar-btn"]');
        if (!btn) return 'btn not found';
        const chain = [];
        let curr = btn;
        while (curr) {
            chain.push({
                tag: curr.tagName,
                className: curr.className,
                id: curr.id,
                rect: {
                    top: curr.getBoundingClientRect().top,
                    bottom: curr.getBoundingClientRect().bottom,
                    left: curr.getBoundingClientRect().left,
                    right: curr.getBoundingClientRect().right,
                    height: curr.getBoundingClientRect().height
                }
            });
            curr = curr.parentElement;
        }
        return chain;
    }''')
    for p_elem in parents:
        print(p_elem['tag'], 'class:', p_elem['className'][:70], 'rect:', p_elem['rect'])
    browser.close()
