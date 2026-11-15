from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 850})
    page.goto('http://localhost:5173')
    page.wait_for_timeout(2000)
    
    # Test with min-h-0
    page.evaluate('''() => {
        const el = document.querySelector('.flex-1.relative');
        if (el) el.classList.add('min-h-0');
    }''')
    
    page.locator('[data-testid="topbar-replay-btn"]').click()
    page.wait_for_timeout(1000)
    
    info = page.evaluate('''() => {
        const chartDiv = document.querySelector('.flex-1.relative');
        const badge = document.querySelector('[data-testid^="news-badge-"]');
        const replayBar = document.querySelector('[data-testid="jump-to-bar-btn"]')?.closest('.h-10');
        return {
            chartDiv: chartDiv?.getBoundingClientRect(),
            badge: badge?.getBoundingClientRect(),
            replayBar: replayBar?.getBoundingClientRect()
        };
    }''')
    print('With min-h-0 on flex-1 relative:')
    for k, v in info.items():
        print(f'  {k}: {v}')
    browser.close()
