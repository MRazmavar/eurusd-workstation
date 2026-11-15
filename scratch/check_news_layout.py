from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 850})
    page.goto('http://localhost:5173')
    page.wait_for_timeout(2500)
    
    # Check news toggle
    news_btn = page.locator('[data-testid="topbar-news-toggle-btn"]')
    print('News toggle visible:', news_btn.is_visible())
    
    badges = page.locator('[data-testid^="news-badge-"]')
    print('Badge count before replay:', badges.count())
    for i in range(min(3, badges.count())):
        print(f'Badge {i} box:', badges.nth(i).bounding_box())
        
    chart_container = page.locator('[data-testid="chart-viewport"]')
    if chart_container.count() == 0:
        # Check by class or tag
        print('Chart box:', page.locator('div.flex-1.flex.flex-col.relative.overflow-hidden').first.bounding_box())
        
    replay_btn = page.locator('[data-testid="topbar-replay-btn"]')
    print('Replay btn visible:', replay_btn.is_visible())
    replay_btn.click()
    page.wait_for_timeout(1000)
    
    print('Badge count after replay:', badges.count())
    for i in range(min(3, badges.count())):
        print(f'Replay Badge {i} box:', badges.nth(i).bounding_box())
        
    jump_btn = page.locator('[data-testid="jump-to-bar-btn"]')
    print('Jump to bar btn count:', jump_btn.count())
    if jump_btn.count() > 0:
        print('Jump to bar box:', jump_btn.bounding_box())
        
    dock = page.locator('div.bg-\\[\\#131722\\].border-t.border-\\[\\#2a2e39\\]')
    if dock.count() > 0:
        print('Bottom dock box:', dock.first.bounding_box())
        
    page.screenshot(path='C:/Users/moham/.gemini/antigravity/scratch/eurusd-workstation/scratch/debug_replay_news.png')
    browser.close()
