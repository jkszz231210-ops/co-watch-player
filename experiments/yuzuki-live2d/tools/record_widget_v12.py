#!/usr/bin/env python3
"""Record actual Chromium iframe playback for the V1.2 floating avatar."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/'assets'/'qa-v12'; QA.mkdir(exist_ok=True)

async def record():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  context=await browser.new_context(viewport={'width':1280,'height':720},device_scale_factor=1,record_video_dir=str(QA),record_video_size={'width':1280,'height':720})
  page=await context.new_page()
  await page.set_content((ROOT/'柚希-网页嵌入演示.html').read_text('utf-8'),wait_until='load')
  await page.frame_locator('iframe').locator('#widgetFallback.hidden').wait_for(state='attached',timeout=20000)
  await page.wait_for_timeout(650)
  for button in ['#compliment','#comfort','#celebrate']:
   await page.locator(button).click()
   await page.wait_for_timeout(1300)
  await page.locator('#toggle').click(); await page.wait_for_timeout(700)
  await page.locator('#toggle').click(); await page.wait_for_timeout(950)
  video=page.video
  await context.close()
  path=Path(await video.path())
  print('REAL_BROWSER_VIDEO',path)
  await browser.close()
if __name__=='__main__':asyncio.run(record())
