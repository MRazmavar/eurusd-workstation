import time
from playwright.sync_api import sync_playwright

def test_bottom_panel_touch_and_physical_slider():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        # 1. Test Mobile (390x844) Viewport
        context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            has_touch=True,
            is_mobile=True,
            device_scale_factor=2
        )
        page = context.new_page()
        page.goto('http://127.0.0.1:5173')
        page.wait_for_selector('[data-testid="drawing-svg"]', timeout=15000)
        time.sleep(1.5)

        # Tap 'Analytics' tab on mobile bottom navigation to open mobile bottom dock sheet
        analytics_tab = page.locator('[data-testid="mobile-nav-analytics"]')
        assert analytics_tab.is_visible(), "Mobile nav analytics tab must be visible"
        analytics_tab.click()
        time.sleep(1)

        header_scroll = page.locator('[data-testid="bottom-panel-header-scroll"]')
        assert header_scroll.is_visible(), "Bottom panel header scroll container must be visible"

        # Check physical slider bar is rendered on mobile
        slider_bar = page.locator('[data-testid="bottom-panel-slider-bar"]')
        assert slider_bar.is_visible(), "Physical slider bar must be visible on mobile where tabs overflow 390px!"

        slider_input = page.locator('[data-testid="bottom-panel-physical-slider"]')
        assert slider_input.is_visible(), "Physical range slider input must be visible!"

        scroll_left_btn = page.locator('[data-testid="bottom-panel-scroll-left"]')
        scroll_right_btn = page.locator('[data-testid="bottom-panel-scroll-right"]')
        assert scroll_left_btn.is_visible() and scroll_right_btn.is_visible(), "Chevron scroll buttons must be visible!"

        # Initial scrollLeft should be 0
        initial_scroll = page.evaluate('''(el) => el.scrollLeft''', header_scroll.element_handle())
        print(f"Mobile initial dock header scrollLeft: {initial_scroll}px", flush=True)
        assert initial_scroll == 0

        # Click right chevron button
        print("Clicking right chevron button to scroll...", flush=True)
        scroll_right_btn.click()
        time.sleep(0.5)

        scroll_after_chevron = page.evaluate('''(el) => el.scrollLeft''', header_scroll.element_handle())
        print(f"Dock header scrollLeft after right chevron click: {scroll_after_chevron}px", flush=True)
        assert scroll_after_chevron > 0, "Right chevron click must scroll the header horizontally!"

        # Test physical slider dragging / value change
        max_scroll = float(slider_input.get_attribute('max') or '200')
        print(f"Physical slider max scroll: {max_scroll}px", flush=True)
        assert max_scroll > 50, "Max scroll should reflect the full overflow difference"

        # Set slider to max using React property descriptor
        page.evaluate(f'''() => {{
            const slider = document.querySelector('[data-testid="bottom-panel-physical-slider"]');
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            nativeInputValueSetter.call(slider, {int(max_scroll)});
            slider.dispatchEvent(new Event('input', {{ bubbles: true }}));
            slider.dispatchEvent(new Event('change', {{ bubbles: true }}));
        }}''')
        time.sleep(0.4)

        scroll_after_slider = page.evaluate('''(el) => el.scrollLeft''', header_scroll.element_handle())
        print(f"Dock header scrollLeft after physical slider moved to max: {scroll_after_slider}px", flush=True)
        assert scroll_after_slider >= max_scroll - 5, "Moving physical slider must scroll header to the end!"

        # Verify that Balance and Net PnL are now visible
        balance_btn = page.locator('[data-testid="bottom-panel-balance-edit-btn"]')
        assert balance_btn.is_visible(), "Balance edit button must be visible when scrolled to the right!"

        # Screenshot mobile bottom panel with physical slider
        mobile_screenshot = r"C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/bottom_panel_mobile_slider_verified.png"
        page.screenshot(path=mobile_screenshot)
        print(f"Saved mobile screenshot: {mobile_screenshot}", flush=True)

        # 2. Test Mouse Drag-to-Scroll on Desktop (800x700: desktop dock rendered, tabs overflow 720px)
        desktop_page = browser.new_page(viewport={'width': 800, 'height': 700})
        desktop_page.goto('http://127.0.0.1:5173')
        desktop_page.wait_for_selector('[data-testid="bottom-panel-header-scroll"]', timeout=15000)
        time.sleep(1.5)

        desk_header = desktop_page.locator('[data-testid="bottom-panel-header-scroll"]')
        desk_box = desk_header.bounding_box()

        # Mouse down and drag left to scroll right
        start_x = desk_box['x'] + desk_box['width'] - 50
        start_y = desk_box['y'] + desk_box['height'] / 2
        target_x = start_x - 120

        print(f"Testing desktop mouse drag-to-scroll from {start_x} to {target_x}...", flush=True)
        desktop_page.mouse.move(start_x, start_y)
        desktop_page.mouse.down()
        for i in range(1, 11):
            cur_x = start_x + (target_x - start_x) * (i / 10)
            desktop_page.mouse.move(cur_x, start_y)
            time.sleep(0.02)
        desktop_page.mouse.up()
        time.sleep(0.5)

        desk_scroll = desktop_page.evaluate('''(el) => el.scrollLeft''', desk_header.element_handle())
        print(f"Desktop dock header scrollLeft after mouse drag: {desk_scroll}px", flush=True)
        assert desk_scroll > 0, "Mouse dragging directly on the header must scroll horizontally!"

        # Screenshot desktop bottom panel
        desktop_screenshot = r"C:/Users/moham/.gemini/antigravity/brain/7a304e26-ed66-4949-8d2a-5874b8c819e9/bottom_panel_desktop_slider_verified.png"
        desktop_page.screenshot(path=desktop_screenshot)
        print(f"Saved desktop screenshot: {desktop_screenshot}", flush=True)

        browser.close()
        print("\nALL BOTTOM PANEL TOUCH AND PHYSICAL SLIDER TESTS PASSED WITH 100% SUCCESS!")

if __name__ == '__main__':
    test_bottom_panel_touch_and_physical_slider()
