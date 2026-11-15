from playwright.sync_api import sync_playwright
import time, urllib.request

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1366, 'height': 768})
    logs = []
    page.on('console', lambda msg: logs.append(f'{msg.type}: {msg.text}'))
    
    try:
        req = urllib.request.Request('http://127.0.0.1:8008/api/drawings', method='DELETE')
        urllib.request.urlopen(req)
    except Exception:
        pass
        
    page.goto('http://127.0.0.1:5173')
    page.evaluate("() => { localStorage.removeItem('eurusd_drawings'); localStorage.removeItem('drawings'); }")
    page.reload()
    page.wait_for_selector('div.tv-lightweight-charts')
    time.sleep(2)
    
    # Place long position
    page.locator('button[data-testid="tool-group-trading"]').first.click()
    time.sleep(0.5)
    chart = page.locator('div.tv-lightweight-charts')
    box = chart.bounding_box()
    cx = box['x'] + box['width'] * 0.5
    cy = box['y'] + box['height'] * 0.5
    page.mouse.click(cx, cy)
    time.sleep(1)
    
    cnt1 = page.locator('g[data-testid^="drawing-object-"]').count()
    print('Before clone count:', cnt1)
    
    d_body = page.locator('g[data-testid^="drawing-object-"]').first
    dbox = d_body.bounding_box()
    from_x = dbox['x'] + dbox['width'] * 0.3
    from_y = dbox['y'] + dbox['height'] * 0.5
    
    elem_str = page.evaluate('([x, y]) => document.elementFromPoint(x, y)?.outerHTML.substring(0, 100)', [from_x, from_y])
    print('Element at pointer:', elem_str)
    
    page.keyboard.down('Control')
    page.mouse.move(from_x, from_y)
    page.mouse.down()
    page.mouse.move(from_x + 120, from_y + 60, steps=8)
    page.mouse.up()
    page.keyboard.up('Control')
    time.sleep(1)
    
    cnt2 = page.locator('g[data-testid^="drawing-object-"]').count()
    print('After clone count:', cnt2)

    # Press Ctrl+Z
    print('Pressing Ctrl+Z...')
    page.keyboard.press('Control+z')
    time.sleep(1)
    cnt3 = page.locator('g[data-testid^="drawing-object-"]').count()
    print('After Undo count:', cnt3)
    for l in logs:
        if 'warn' in l.lower() or 'error' in l.lower() or 'clone' in l.lower() or 'key' in l.lower():
            print('LOG:', l)
            
    # Print IDs of drawings
    ids = page.evaluate('() => Array.from(document.querySelectorAll("g[data-testid^=\'drawing-object-\']")).map(el => el.getAttribute("data-testid"))')
    print('Rendered drawing IDs:', ids)
    browser.close()
