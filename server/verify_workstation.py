"""
Comprehensive End-to-End Verification Script for EUR/USD Workstation.
"""
from playwright.sync_api import sync_playwright
import time
import os

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        page = browser.new_page(viewport={'width': 1600, 'height': 900})
        page.goto('http://127.0.0.1:5173', timeout=15000)
        page.wait_for_timeout(3000)

        # 1. Place a simulated trade
        print('[1] Placing a simulated trade...')
        order_btn = page.locator('button:has-text("Place Simulated BUY Order")')
        order_btn.click()
        page.wait_for_timeout(1000)

        # Check Open Positions
        page.locator('button:has-text("Open Positions")').click()
        page.wait_for_timeout(500)
        rows = page.locator('table tr')
        print(f'     Positions table rows count: {rows.count()}')

        # 2. Activate Bar Replay Mode
        print('[2] Activating Bar Replay mode...')
        page.locator('button:has-text("Bar Replay")').click()
        page.wait_for_timeout(1000)

        replay_bar = page.locator('text=BAR REPLAY ACTIVE')
        print(f'     Replay active visible: {replay_bar.is_visible()}')

        # Step forward 5 candles twice
        print('[3] Stepping forward in replay...')
        step_btn = page.locator('button[title*="Advance 5 Candles"]')
        step_btn.click()
        page.wait_for_timeout(800)
        step_btn.click()
        page.wait_for_timeout(800)

        # 3. Draw a trendline
        print('[4] Drawing trendline on chart...')
        trend_tool = page.locator('button[title="Trend Lines"]')
        trend_tool.click()
        page.wait_for_timeout(500)

        svg = page.locator('svg.cursor-crosshair')
        box = svg.bounding_box()
        if box:
            page.mouse.move(box['x'] + 250, box['y'] + 250)
            page.mouse.down()
            page.mouse.move(box['x'] + 500, box['y'] + 180)
            page.mouse.up()
            page.wait_for_timeout(1000)

        # Check Object Tree
        print('[5] Checking Object Tree...')
        page.locator('button:has-text("Objects")').click()
        page.wait_for_timeout(500)
        obj_count = page.locator('text=Trendline').count()
        print(f'     Trendline in object tree: {obj_count}')

        # 4. Switch Timeframe to 15m
        print('[6] Testing Timeframe switch to 15m...')
        page.locator('button:has-text("15m")').click()
        page.wait_for_timeout(2500)

        # 5. Open Indicators Modal
        print('[7] Opening Indicators Modal...')
        page.locator('button:has-text("Indicators")').click()
        page.wait_for_timeout(800)
        
        # Take Screenshot of verified workstation
        out_dir = r'C:\Users\moham\.gemini\antigravity\brain\7a304e26-ed66-4949-8d2a-5874b8c819e9'
        shot_path = os.path.join(out_dir, 'workstation_replay_and_drawing.png')
        page.screenshot(path=shot_path)
        print(f'[8] Verified screenshot saved to: {shot_path}')

        browser.close()

if __name__ == '__main__':
    run_test()
