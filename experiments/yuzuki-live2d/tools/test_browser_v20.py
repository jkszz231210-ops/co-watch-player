"""Actual Chromium smoke tests for V2.0 review + companion + standalone widget."""
from pathlib import Path
import asyncio
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/qa-v20';OUT.mkdir(parents=True,exist_ok=True)
async def run():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  for w,h,label in [(1440,900,'desktop'),(390,844,'mobile')]:
   page=await browser.new_page(viewport={'width':w,'height':h})
   errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
   await page.set_content((ROOT/'柚希-V2.0-眨眼成品审核.html').read_text('utf8'),wait_until='load',timeout=45000)
   await page.locator('[data-pose="50"]').click()
   await page.wait_for_timeout(80)
   assert '50%' in await page.locator('#status').inner_text()
   await page.screenshot(path=str(OUT/f'eye-review-{label}.png'),full_page=True)
   await page.locator('[data-pose="0"]').click()
   assert '0%' in await page.locator('#status').inner_text()
   await page.locator('#play').click();await page.wait_for_timeout(3450)
   assert not errs,errs
   print(f'PASS V2.0 offline eye review {w}x{h}: 0/50 frames, animation, no JS error')
   await page.close()
  page=await browser.new_page(viewport={'width':1440,'height':900})
  errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
  await page.set_content((ROOT/'柚希-双击直接体验.html').read_text('utf8'),wait_until='load',timeout=45000)
  await page.locator('#rigCanvas:not(.hidden)').wait_for(timeout=30000)
  await page.locator('[data-emotion="shy"]').click()
  await page.locator('#chatInput').fill('你好柚希')
  await page.locator('#sendButton').click();await page.locator('.bubble.bot').last.wait_for(timeout=15000)
  await page.screenshot(path=str(OUT/'companion-desktop.png'),full_page=True)
  assert not errs,errs
  print('PASS companion: canvas displays, mood and chat respond, no JS errors')
  await page.close()
  page=await browser.new_page(viewport={'width':390,'height':844})
  errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
  await page.set_content((ROOT/'柚希-悬浮挂件.html').read_text('utf8'),wait_until='load',timeout=45000)
  await page.wait_for_timeout(900)
  assert not errs,errs
  print('PASS standalone widget mobile: no JS errors')
  await page.close();await browser.close()
if __name__=='__main__':asyncio.run(run())
