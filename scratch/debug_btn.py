import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="chrome", headless=True)
        page = await browser.new_page(viewport={"width": 1400, "height": 900})
        # Clear storage first
        await page.goto("http://localhost:5173/")
        await page.evaluate("localStorage.clear()")
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(3000)

        info = await page.evaluate("""() => {
            const btn = document.querySelector('[data-testid="scroll-to-recent-btn"]');
            return {
                btnExists: !!btn,
                localStorageRange: localStorage.getItem('eurusd_logical_range_1h')
            };
        }""")
        print("Initial state after clear:", info)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
