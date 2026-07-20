import asyncio
import os
from playwright.async_api import async_playwright

artifact_dir = "/Users/abrarahammad/.gemini/antigravity-ide/brain/05c3c7c6-f937-4de9-a55a-9d7dd7e193ab"

async def take_screenshots():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        
        await page.goto("http://localhost:8080/index.html")
        await page.wait_for_timeout(2000)
        
        # 1. Command Center (Map)
        print("Capturing Command Center...")
        await page.screenshot(path=os.path.join(artifact_dir, "mirsad_view_command_center.png"))
        
        # Function to expand scrolling containers
        async def expand_view():
            await page.add_style_tag(content="""
                .app-shell { height: auto !important; min-height: 100vh; overflow: visible !important; }
                .main-content { overflow: visible !important; }
                .view-panel { overflow: visible !important; }
                .risk-intel, .scenario-view__controls, .scenario-view__results, .procurement-view, .reserves-view {
                    overflow: visible !important;
                    height: auto !important;
                }
            """)
        
        await expand_view()
        
        # 2. Risk Intelligence
        print("Capturing Risk Intelligence...")
        await page.click("text=Risk Intelligence")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=os.path.join(artifact_dir, "mirsad_view_risk_intel.png"), full_page=True)
        
        # 3. Scenarios
        print("Capturing Scenarios...")
        await page.click("text=Scenarios")
        await page.wait_for_timeout(1000)
        await page.evaluate("document.querySelectorAll('.scenario-option')[0].click()")
        await page.click("text=Run Simulation")
        await page.wait_for_timeout(1500)
        await page.screenshot(path=os.path.join(artifact_dir, "mirsad_view_scenarios.png"), full_page=True)
        
        # 4. Procurement
        print("Capturing Procurement...")
        await page.click("text=Procurement")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=os.path.join(artifact_dir, "mirsad_view_procurement.png"), full_page=True)
        
        # 5. Reserves
        print("Capturing Reserves...")
        await page.click("text=Reserves")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=os.path.join(artifact_dir, "mirsad_view_reserves.png"), full_page=True)
        
        await browser.close()
        print("Done.")

if __name__ == "__main__":
    asyncio.run(take_screenshots())
