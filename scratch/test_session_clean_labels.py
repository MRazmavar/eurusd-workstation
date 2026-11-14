import os
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = r"C:\Users\moham\.gemini\antigravity\brain\7a304e26-ed66-4949-8d2a-5874b8c819e9"

def test_session_clean_labels():
    print(">>> Testing Clean Session Labels on Main Window...")
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_page(viewport={"width": 1400, "height": 900})
        page.goto("http://localhost:5173", wait_until="networkidle")
        page.wait_for_timeout(2500)

        # Check sessions layer
        sessions_layer = page.locator("[data-testid='sessions-layer']")
        assert sessions_layer.count() > 0, "Sessions layer should exist"

        # Check badges content
        badges = page.locator("[data-testid^='session-badge-']")
        count = badges.count()
        print(f"Total session badges found on chart: {count}")

        badge_texts = []
        for i in range(count):
            txt = badges.nth(i).locator("text").text_content()
            badge_texts.append(txt)
            print(f"Badge {i} text: '{txt}'")

        # Verify that badges contain only the first letters: 'S', 'A', 'F', 'L', 'NY'
        valid_letters = {'S', 'A', 'F', 'L', 'NY'}
        for txt in badge_texts:
            clean_txt = txt.strip()
            assert clean_txt in valid_letters, f"Badge text '{clean_txt}' should only be one of {valid_letters}"

        print("PASS: All session badges render ONLY first letters: S, A, F, L, NY!")

        # Verify no old full labels exist in the session badges
        for txt in badge_texts:
            assert "Frankfurt (1h)" not in txt
            assert "Asia Session" not in txt
            assert "Shield Area" not in txt
            assert "London (1h)" not in txt
            assert "NY Open (1h)" not in txt

        print("PASS: Full session names completely removed from chart badges.")

        # Take full chart screenshot
        full_path = os.path.join(SCREENSHOT_DIR, "clean_sessions_first_letters_verified.png")
        page.screenshot(path=full_path)
        print(f"Saved: {full_path}")

        # Crop a session box to compare directly with user attachment
        frankfurt_block = page.locator("[data-testid='session-block-frankfurt_1h']")
        if frankfurt_block.count() > 0:
            box = frankfurt_block.first.bounding_box()
            if box:
                crop_path = os.path.join(SCREENSHOT_DIR, "frankfurt_session_crop.png")
                page.screenshot(
                    path=crop_path,
                    clip={
                        "x": max(0, box["x"] - 20),
                        "y": max(0, box["y"] - 20),
                        "width": min(1400, box["width"] + 50),
                        "height": min(900, box["height"] + 40),
                    }
                )
                print(f"Saved Frankfurt crop: {crop_path}")

        browser.close()

if __name__ == "__main__":
    test_session_clean_labels()
