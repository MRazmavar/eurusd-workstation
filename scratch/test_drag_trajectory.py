import time
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://127.0.0.1:5173')
    page.wait_for_selector('[data-testid="drawing-svg"]', timeout=15000)
    time.sleep(1)

    # Test coordinate transformer from inside page
    results = page.evaluate('''() => {
        // Find chart container transformer
        const svg = document.querySelector('[data-testid="drawing-svg"]');
        // Let's place a drawing and check its updates during drag
        return "Ready";
    }''')

    # Let's place a Long Position and drag Handle 3 in detail
    chart = page.locator('[data-testid="drawing-svg"]')
    box = chart.bounding_box()

    page.locator('[data-testid="fav-tool-long_position"]').click()
    time.sleep(0.3)
    page.mouse.click(box['x'] + 300, box['y'] + 250)
    time.sleep(1)

    drawing = page.locator('g[data-testid^="drawing-long-position-"]').first
    draw_id = drawing.get_attribute("data-testid").replace("drawing-long-position-", "")
    h3 = page.locator(f'[data-testid="anchor-handle-{draw_id}-3"]')
    h3_box = h3.bounding_box()

    # Move mouse to handle 3 and hold down
    page.mouse.move(h3_box['x'] + 9, h3_box['y'] + 9)
    page.mouse.down()

    trajectory = []
    # Drag to right in steps of 20px
    for dx in range(20, 300, 40):
        target_mouse_x = h3_box['x'] + 9 + dx
        page.mouse.move(target_mouse_x, h3_box['y'] + 9)
        time.sleep(0.05)
        cur_h3 = h3.bounding_box()
        trajectory.append({
            'mouse_x': target_mouse_x,
            'handle_x': cur_h3['x'] + 9,
            'diff': round(target_mouse_x - (cur_h3['x'] + 9), 1)
        })

    page.mouse.up()

    print("Trajectory results:")
    for t in trajectory:
        print(t)

    browser.close()
