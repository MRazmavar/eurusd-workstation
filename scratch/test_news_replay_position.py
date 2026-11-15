from playwright.sync_api import sync_playwright

def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        
        # ==========================================
        # TEST 1: DESKTOP MODE
        # ==========================================
        page = browser.new_page(viewport={'width': 1400, 'height': 850})
        page.goto('http://localhost:5173')
        page.wait_for_timeout(2500)
        
        # 1. Normal mode (Replay inactive)
        badges_container = page.locator('[data-testid="news-badges-container"]')
        assert badges_container.is_visible(), "News badges container should be visible"
        cls_normal = badges_container.get_attribute('class') or ''
        print("Normal badges container classes:", cls_normal)
        assert 'bottom-6' in cls_normal, f"Expected 'bottom-6' in normal mode, got: {cls_normal}"
        
        first_badge = page.locator('[data-testid^="news-badge-"]').first
        first_badge.wait_for(state='visible', timeout=5000)
        normal_badge_box = first_badge.bounding_box()
        print(f"Normal Badge 0 Bounding Box: {normal_badge_box}")
        
        # Click badge to test normal popover position
        first_badge.locator('button').click(force=True)
        page.wait_for_timeout(500)
        popover = page.locator('[data-testid="news-card-popover"]')
        assert popover.is_visible(), "Popover card should be visible"
        popover_style_normal = popover.get_attribute('style') or ''
        print("Normal popover style:", popover_style_normal)
        assert 'bottom: 50px' in popover_style_normal, f"Expected bottom: 50px, got: {popover_style_normal}"
        
        page.screenshot(path='C:/Users/moham/.gemini/antigravity/scratch/eurusd-workstation/scratch/news_normal_verified.png')
        print("Captured scratch/news_normal_verified.png")
        
        # Close popover
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
        
        # 2. Activate Backtesting Replay mode
        replay_btn = page.locator('[data-testid="topbar-replay-btn"]')
        replay_btn.click()
        page.wait_for_timeout(1000)
        
        # Check badges container in replay mode
        cls_replay = badges_container.get_attribute('class') or ''
        print("Replay badges container classes:", cls_replay)
        assert 'bottom-12' in cls_replay, f"Expected 'bottom-12' in replay mode, got: {cls_replay}"
        
        replay_badge_box = first_badge.bounding_box()
        print(f"Replay Badge 0 Bounding Box: {replay_badge_box}")
        
        # Verify Jump to Bar & Jump to Date positions
        jump_to_bar = page.locator('[data-testid="jump-to-bar-btn"]')
        jump_to_date = page.locator('[data-testid="jump-to-date-btn"]')
        assert jump_to_bar.is_visible(), "Jump to Bar button should be visible in Replay mode"
        assert jump_to_date.is_visible(), "Jump to Date button should be visible in Replay mode"
        
        bar_box = jump_to_bar.bounding_box()
        date_box = jump_to_date.bounding_box()
        print(f"Jump to Bar Box: {bar_box}")
        print(f"Jump to Date Box: {date_box}")
        
        # Key validation: Badge bottom must be ABOVE the backtest toolbar buttons (bar_box['y'])
        badge_bottom = replay_badge_box['y'] + replay_badge_box['height']
        bar_top = bar_box['y']
        assert badge_bottom <= bar_top, (
            f"Badge bottom ({badge_bottom}) must be above Jump to Bar top ({bar_top})!"
        )
        print(">>> SUCCESS: News badge is COMPLETELY ABOVE backtest buttons! Zero overlap!")
        
        # Click badge in replay mode to verify popover elevation
        first_badge.locator('button').click(force=True)
        page.wait_for_timeout(500)
        assert popover.is_visible(), "Popover card should be visible in replay mode"
        popover_style_replay = popover.get_attribute('style') or ''
        print("Replay popover style:", popover_style_replay)
        assert 'bottom: 88px' in popover_style_replay, f"Expected bottom: 88px, got: {popover_style_replay}"
        
        popover_box = popover.bounding_box()
        print(f"Replay Popover Box: {popover_box}")
        assert popover_box['y'] + popover_box['height'] <= bar_top + 100, "Popover bottom must be positioned cleanly!"
        
        page.screenshot(path='C:/Users/moham/.gemini/antigravity/scratch/eurusd-workstation/scratch/news_replay_active_verified.png')
        print("Captured scratch/news_replay_active_verified.png")
        
        # 3. Exit replay mode and verify return to original position
        exit_btn = page.locator('button:has-text("Exit")').first
        exit_btn.click()
        page.wait_for_timeout(1000)
        cls_exited = badges_container.get_attribute('class') or ''
        print("Exited replay badges container classes:", cls_exited)
        assert 'bottom-6' in cls_exited, f"Expected return to 'bottom-6', got: {cls_exited}"
        print(">>> SUCCESS: Returned to original position upon exiting replay!")
        page.close()
        
        # ==========================================
        # TEST 2: MOBILE VIEW (iPhone 14: 390x844)
        # ==========================================
        mobile_page = browser.new_page(viewport={'width': 390, 'height': 844})
        mobile_page.goto('http://localhost:5173')
        mobile_page.wait_for_timeout(2500)
        
        m_badges_container = mobile_page.locator('[data-testid="news-badges-container"]')
        assert m_badges_container.is_visible(), "Mobile news badges container should be visible"
        m_cls_normal = m_badges_container.get_attribute('class') or ''
        print("Mobile normal badges container classes:", m_cls_normal)
        assert 'bottom-7' in m_cls_normal, f"Expected 'bottom-7' in mobile normal mode, got: {m_cls_normal}"
        
        # Bottom nav check
        m_nav = mobile_page.locator('[data-testid="mobile-bottom-nav"]')
        assert m_nav.is_visible(), "Mobile bottom nav should be visible"
        
        m_badge = mobile_page.locator('[data-testid^="news-badge-"]').first
        m_badge_box = m_badge.bounding_box()
        m_nav_box = m_nav.bounding_box()
        print(f"Mobile Badge Box: {m_badge_box}")
        print(f"Mobile Nav Box: {m_nav_box}")
        assert (m_badge_box['y'] + m_badge_box['height']) <= m_nav_box['y'] + 1, "Mobile badge must sit above mobile bottom nav!"
        
        mobile_page.screenshot(path='C:/Users/moham/.gemini/antigravity/scratch/eurusd-workstation/scratch/news_mobile_verified.png')
        print("Captured scratch/news_mobile_verified.png")
        
        # Activate Replay on Mobile directly via mobile TopBar replay button
        m_replay_btn = mobile_page.locator('[data-testid="topbar-replay-btn"]')
        m_replay_btn.click()
        mobile_page.wait_for_timeout(1000)
        
        # Check mobile replay bar at top
        m_replay_bar = mobile_page.locator('[data-testid="mobile-replay-bar"]')
        assert m_replay_bar.is_visible(), "Mobile replay bar should be visible"
        
        # Check badges container in mobile replay mode
        m_cls_replay = m_badges_container.get_attribute('class') or ''
        print("Mobile replay badges container classes:", m_cls_replay)
        assert 'bottom-12' in m_cls_replay, f"Expected 'bottom-12' in mobile replay mode, got: {m_cls_replay}"
        
        mobile_page.screenshot(path='C:/Users/moham/.gemini/antigravity/scratch/eurusd-workstation/scratch/news_mobile_replay_verified.png')
        print("Captured scratch/news_mobile_replay_verified.png")
        
        mobile_page.close()
        browser.close()
        print("ALL TESTS PASSED WITH 100% SUCCESS!")

if __name__ == '__main__':
    run_tests()
