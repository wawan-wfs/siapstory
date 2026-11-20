import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader'])
  for name,w,h in [('desktop',1440,900),('mobile',390,844)]:
   page=await browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
   errors=[]
   page.on('pageerror',lambda err:errors.append(str(err)))
   try:
    resp=await page.goto('http://127.0.0.1:8765/',wait_until='domcontentloaded',timeout=25000)
    await page.wait_for_timeout(1000)
    await page.screenshot(path=f'/mnt/data/siapstory-v6-{name}.png',full_page=False)
    a=await page.evaluate('''() => ({status:document.readyState,title:document.title, scrollWidth:document.documentElement.scrollWidth, innerWidth:innerWidth, director:window.__storySiapDirector?.chapters,bodyHeight:document.body.scrollHeight,heroColor:getComputedStyle(document.querySelector('.hero')).backgroundColor})''')
    await page.evaluate('window.scrollTo(0,document.querySelector("#portal").offsetTop + innerHeight * .85)')
    await page.wait_for_timeout(450)
    b=await page.evaluate('''() => ({scroll:scrollY,portalProgress:document.querySelector('#portal')?.style.getPropertyValue('--act'),worldRGB:document.documentElement.style.getPropertyValue('--world-rgb'),phase:document.querySelector('#portalPhase')?.textContent})''')
    await page.screenshot(path=f'/mnt/data/siapstory-v6-{name}-portal.png',full_page=False)
    await page.evaluate('window.scrollTo(0,document.querySelector("#koleksi").offsetTop + 250)')
    await page.wait_for_timeout(450)
    c=await page.evaluate('''() => ({progress:window.__storySiapDirector?.progress,world:document.getElementById('continuumStage')?.style.opacity,collection:document.querySelector('#koleksi')?.style.getPropertyValue('--director-progress')})''')
    print(name,resp.status if resp else None,json.dumps(a),json.dumps(b),json.dumps(c),'errors',errors[:8])
   except Exception as e:
    print(name,'error:',repr(e),'js-errors:',errors)
   await page.close()
  await browser.close()
asyncio.run(main())
