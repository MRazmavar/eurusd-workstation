import json
from playwright.sync_api import sync_playwright

def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        
        # ============================================================
        # TEST 1: LEGACY MIGRATION ON DESKTOP
        # Simulate browser that had the old default indicators saved in localStorage
        # ============================================================
        context = browser.new_context(viewport={'width': 1400, 'height': 850})
        page = context.new_page()
        page.goto('http://localhost:5173')
        page.wait_for_timeout(1000)
        
        # Inject old legacy localStorage with SMA, EMA, RSI all visible
        legacy_indicators = [
            {"id": "ind_sessions", "type": "SESSIONS", "name": "Forex Sessions", "color": "#8b5cf6", "visible": True, "isOverlay": True, "params": {}},
            {"id": "ind_sma20", "type": "SMA", "name": "SMA (20)", "color": "#2962ff", "visible": True, "isOverlay": True, "params": {"period": 20}},
            {"id": "ind_ema50", "type": "EMA", "name": "EMA (50)", "color": "#ff9800", "visible": True, "isOverlay": True, "params": {"period": 50}},
            {"id": "ind_rsi", "type": "RSI", "name": "RSI (14)", "color": "#ab47bc", "visible": True, "isOverlay": False, "params": {"period": 14}}
        ]
        legacy_json = json.dumps(legacy_indicators)
        page.evaluate(f'''() => {{
            localStorage.removeItem("eurusd_indicators_cleaned_v2");
            localStorage.setItem("eurusd_saved_indicators", JSON.stringify({legacy_json}));
        }}''')
        
        # Reload page to trigger migration
        page.reload()
        page.wait_for_timeout(2500)
        
        # Verify localStorage has been migrated
        migrated_indicators = page.evaluate('() => JSON.parse(localStorage.getItem("eurusd_saved_indicators"))')
        print("Migrated indicators in localStorage:", [(i['id'], i['type'], i['visible']) for i in migrated_indicators])
        
        # SESSIONS should be visible: True
        sessions_ind = next(i for i in migrated_indicators if i['type'] == 'SESSIONS')
        assert sessions_ind['visible'] is True, "Sessions must remain auto-activated by default"
        
        # No SMA, EMA, RSI should be visible
        for ind in migrated_indicators:
            if ind['type'] != 'SESSIONS':
                assert ind['visible'] is False, f"Indicator {ind['name']} should NOT be active!"
                
        # Check TopBar buttons
        sessions_btn = page.locator('[data-testid="topbar-sessions-btn"]')
        assert sessions_btn.is_visible(), "Sessions button should be visible"
        sessions_text = sessions_btn.text_content() or ''
        print("Sessions button text:", sessions_text)
        assert 'ON' in sessions_text, f"Sessions button should show ON, got: {sessions_text}"
        
        # Check that NO oscillator panels (like RSI) are rendered
        sub_panels = page.locator('div.border-t.border-\\[\\#2a2e39\\].bg-\\[\\#131722\\].z-10')
        assert sub_panels.count() == 0, "No oscillator sub-panels (like RSI) should be visible"
        print(">>> SUCCESS: No oscillator panels auto-activated on initial open!")
        
        page.screenshot(path='C:/Users/moham/.gemini/antigravity/scratch/eurusd-workstation/scratch/clean_open_only_sessions.png')
        print("Captured scratch/clean_open_only_sessions.png")
        
        # ============================================================
        # TEST 2: "UNLESS I TURN IT OFF" - SESSIONS PERSISTENCE
        # ============================================================
        # Turn OFF sessions
        sessions_btn.click()
        page.wait_for_timeout(800)
        sessions_text_after_off = sessions_btn.text_content() or ''
        print("Sessions button text after toggle:", sessions_text_after_off)
        assert 'OFF' in sessions_text_after_off, f"Sessions button should show OFF, got: {sessions_text_after_off}"
        
        # Reload page to verify persistence
        page.reload()
        page.wait_for_timeout(2500)
        
        sessions_btn_reloaded = page.locator('[data-testid="topbar-sessions-btn"]')
        sessions_text_reloaded = sessions_btn_reloaded.text_content() or ''
        print("Sessions button text after reload:", sessions_text_reloaded)
        assert 'OFF' in sessions_text_reloaded, f"Sessions button should REMAIN OFF after reload, got: {sessions_text_reloaded}"
        print(">>> SUCCESS: Sessions turned OFF persisted across reload ('unless i turn it off')!")
        
        page.screenshot(path='C:/Users/moham/.gemini/antigravity/scratch/eurusd-workstation/scratch/sessions_turned_off_persists.png')
        print("Captured scratch/sessions_turned_off_persists.png")
        
        # Turn sessions back ON
        sessions_btn_reloaded.click()
        page.wait_for_timeout(800)
        page.reload()
        page.wait_for_timeout(2500)
        sessions_btn_on = page.locator('[data-testid="topbar-sessions-btn"]')
        assert 'ON' in (sessions_btn_on.text_content() or ''), "Sessions should be ON after turning back on"
        print(">>> SUCCESS: Sessions turned back ON persisted across reload!")
        
        # ============================================================
        # TEST 3: USER ADDS AN INDICATOR INTENTIONALLY
        # ============================================================
        # Open Indicators modal
        indicators_btn = page.locator('button:has-text("Indicators")').first
        indicators_btn.click()
        page.wait_for_timeout(600)
        
        modal = page.locator('[data-testid="close-indicators-modal"]')
        assert modal.is_visible(), "Indicators modal should be open"
        
        # Click on Moving Average (SMA 20) under Available Indicators
        sma_option = page.locator('div:has-text("Moving Average (SMA 20)")').last
        sma_option.click()
        page.wait_for_timeout(500)
        
        # Close modal
        modal.click()
        page.wait_for_timeout(800)
        
        # Indicators count badge should now show 1
        ind_badge = page.locator('button:has-text("Indicators") span.bg-\\[\\#2962ff\\]')
        assert ind_badge.is_visible(), "Indicators count badge should be visible after user added SMA 20"
        print("Indicator count badge:", ind_badge.text_content())
        assert ind_badge.text_content() == '1', f"Expected 1 indicator, got: {ind_badge.text_content()}"
        
        # Reload page to verify user-added indicator persists
        page.reload()
        page.wait_for_timeout(2500)
        ind_badge_after_reload = page.locator('button:has-text("Indicators") span.bg-\\[\\#2962ff\\]')
        assert ind_badge_after_reload.is_visible(), "User-added indicator must persist across reload!"
        print(">>> SUCCESS: User-added indicator persisted across reload!")
        
        # Clean up: remove the user-added indicator
        indicators_btn_re = page.locator('button:has-text("Indicators")').first
        indicators_btn_re.click()
        page.wait_for_timeout(500)
        trash_btn = page.locator('button[title="Remove"]').first
        trash_btn.click()
        page.wait_for_timeout(500)
        page.locator('[data-testid="close-indicators-modal"]').click()
        page.wait_for_timeout(500)
        
        page.reload()
        page.wait_for_timeout(2000)
        page.close()
        context.close()
        
        # ============================================================
        # TEST 4: FRESH OPEN (PHONE / LOCAL NETWORK / NEW DEVICE)
        # Verify when opening with completely clean localStorage:
        # ONLY Sessions is active; no other indicators are active.
        # ============================================================
        mobile_context = browser.new_context(viewport={'width': 390, 'height': 844})
        mobile_page = mobile_context.new_page()
        # Ensure fresh localStorage
        mobile_page.goto('http://localhost:5173')
        mobile_page.wait_for_timeout(1000)
        mobile_page.evaluate('() => localStorage.clear()')
        mobile_page.reload()
        mobile_page.wait_for_timeout(2500)
        
        fresh_indicators = mobile_page.evaluate('() => JSON.parse(localStorage.getItem("eurusd_saved_indicators"))')
        print("Fresh open indicators in localStorage:", [(i['id'], i['type'], i['visible']) for i in fresh_indicators])
        assert len(fresh_indicators) == 1, f"Expected exactly 1 default indicator (Sessions), got {len(fresh_indicators)}"
        assert fresh_indicators[0]['type'] == 'SESSIONS', "Only SESSIONS should be in default indicators"
        assert fresh_indicators[0]['visible'] is True, "SESSIONS must be auto-active on fresh open"
        
        # Open mobile drawer to check Sessions toggle
        mobile_page.locator('[data-testid="topbar-mobile-menu-btn"]').click()
        mobile_page.wait_for_timeout(500)
        
        # Check sessions button shows ON in mobile drawer
        drawer_sessions_btn = mobile_page.locator('[data-testid="mobile-drawer-sessions-toggle"]')
        assert drawer_sessions_btn.is_visible(), "Market Sessions toggle should be visible in mobile drawer"
        assert 'ON' in (drawer_sessions_btn.text_content() or ''), f"Market Sessions should be ON by default in mobile drawer, got {drawer_sessions_btn.text_content()}"
        
        # Check technical indicators shows 0
        drawer_ind_badge = mobile_page.locator('button:has-text("Technical Indicators") span.bg-\\[\\#2962ff\\]')
        print("Mobile drawer technical indicators count:", drawer_ind_badge.text_content())
        assert drawer_ind_badge.text_content() == '0', f"Expected 0 technical indicators, got: {drawer_ind_badge.text_content()}"
        print(">>> SUCCESS: Fresh mobile view has 0 technical indicators and Sessions ON!")
        
        mobile_page.screenshot(path='C:/Users/moham/.gemini/antigravity/scratch/eurusd-workstation/scratch/mobile_clean_indicators_verified.png')
        print("Captured scratch/mobile_clean_indicators_verified.png")
        
        mobile_page.close()
        mobile_context.close()
        browser.close()
        print("\n=========================================")
        print("ALL INDICATOR PERSISTENCE TESTS PASSED 100%!")
        print("=========================================")

if __name__ == '__main__':
    run_tests()
