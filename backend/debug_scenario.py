import asyncio
from playwright.async_api import async_playwright

async def debug_scenario():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        
        await page.goto("http://localhost:8080/index.html")
        await page.wait_for_timeout(2000)
        
        await page.click("text=Scenarios")
        await page.wait_for_timeout(1000)
        
        await page.evaluate("document.querySelectorAll('.scenario-option')[1].click()")
        await page.evaluate("document.querySelector('button[onclick=\"window.app.runSelectedScenario()\"]').click()")
        await page.wait_for_timeout(1000)
        
        gap = await page.evaluate("document.querySelectorAll('.impact-item__value')[2].innerText")
        print(f"Gap after explicitly clicking the correct button: {gap}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(debug_scenario())
