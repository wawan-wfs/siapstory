import asyncio,base64,json
from pathlib import Path
from playwright.async_api import async_playwright
p=Path('/mnt/data/siapstory/dist')
html=(p/'index.html').read_text(); css=(p/'landing.css').read_text()
img='data:image/webp;base64,'+base64.b64encode((p/'assets/story-coast.webp').read_bytes()).decode()
html=html.replace('assets/story-coast.webp',img).replace('<link rel="stylesheet" href="landing.css">','<style>'+css+'</style>').replace('<script type="module" src="landing.mjs"></script>','').replace('<script type="module" src="cinematic-v6.mjs"></script>','')
async def main():
 async with async_playwright() as pwr:
  b=await pwr.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
  for name,w,h in [('desktop',1440,900),('mobile',390,844)]:
   page=await b.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
   errors=[]
   page.on('pageerror',lambda err:errors.append(str(err)))
   try:
    await page.set_content(html,wait_until='domcontentloaded')
    await page.add_script_tag(content='(function(){\n'+(Path('/mnt/data/siapstory/dist/landing.mjs')).read_text()+'\n})();')
    await page.add_script_tag(content='(function(){\n'+(Path('/mnt/data/siapstory/dist/cinematic-v6.mjs')).read_text()+'\n})();')
    await page.wait_for_timeout(400)
    await page.screenshot(path=f'/mnt/data/siapstory-v6-{name}.png',full_page=False)
    a=await page.evaluate('''() => ({scrollWidth:document.documentElement.scrollWidth,innerWidth:innerWidth,director:window.__storySiapDirector?.chapters,bodyHeight:document.body.scrollHeight,heroColor:getComputedStyle(document.querySelector('.hero')).backgroundColor})''')
    await page.evaluate('window.scrollTo({top:document.querySelector("#portal").offsetTop + innerHeight * .85,behavior:"instant"})')
    await page.wait_for_timeout(300)
    bdata=await page.evaluate('''() => ({scroll:scrollY,portalProgress:document.querySelector('#portal')?.style.getPropertyValue('--act'),worldRGB:document.documentElement.style.getPropertyValue('--world-rgb'),phase:document.querySelector('#portalPhase')?.textContent})''')
    await page.screenshot(path=f'/mnt/data/siapstory-v6-{name}-portal.png',full_page=False)
    await page.evaluate('window.scrollTo({top:document.querySelector("#koleksi").offsetTop + 250,behavior:"instant"})')
    await page.wait_for_timeout(250)
    c=await page.evaluate('''() => ({progress:window.__storySiapDirector?.progress,world:document.getElementById('continuumStage')?.style.opacity,collection:document.querySelector('#koleksi')?.style.getPropertyValue('--director-progress')})''')
    await page.locator('#motionToggle').click(force=True,timeout=4000)
    await page.wait_for_timeout(200)
    toggle=await page.evaluate('''() => ({off:document.documentElement.classList.contains('motion-off'),stage:getComputedStyle(document.querySelector('.continuum-stage')).display})''')
    print(name,json.dumps(a),json.dumps(bdata),json.dumps(c),'toggle',json.dumps(toggle),'errors',errors[:8])
   except Exception as e: print(name,'error:',repr(e),'js-errors:',errors)
   await page.close()
  await b.close()
asyncio.run(main())
