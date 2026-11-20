import asyncio
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  page=await b.new_page(viewport={'width':800,'height':600})
  try:
   await page.set_content('<!doctype html><html><body><h1>Hello preview</h1><div id="x">test</div></body></html>')
   print(await page.title(),await page.locator('#x').inner_text())
   await page.screenshot(path='/mnt/data/test-setcontent.png')
  except Exception as e: print(str(e))
  await b.close()
asyncio.run(main())
