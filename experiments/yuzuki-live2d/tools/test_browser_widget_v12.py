#!/usr/bin/env python3
"""Real Chromium test for zero-install widget and embedded host, no local navigation."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/'assets/qa-v12'
QA.mkdir(exist_ok=True)

async def run():
  async with async_playwright() as playwright:
    browser=await playwright.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    for width,height,label in [(1366,768,'desktop'),(390,844,'mobile')]:
      page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
      errors=[]
      page.on('pageerror',lambda e:errors.append(str(e)))
      await page.set_content((ROOT/'柚希-网页嵌入演示.html').read_text('utf-8'),wait_until='load',timeout=45000)
      await page.frame_locator('iframe[title="柚希互动角色"]').locator('#widgetFallback.hidden').wait_for(state='attached',timeout=25000)
      await page.locator('#feedback').get_by_text('柚希已经来到网页啦！').wait_for(timeout=20000)
      assert await page.locator('iframe').count()==1
      await page.screenshot(path=str(QA/f'yuzuki-v12-embed-{label}.png'),full_page=True)
      await page.locator('#compliment').click()
      await page.frame_locator('iframe').locator('#widgetBubble.show').get_by_text('好害羞').wait_for(timeout=5000)
      await page.frame_locator('iframe').locator('#widgetWink').click()
      await page.locator('#toggle').click(); assert await page.locator('.yuzuki-embed-root').is_hidden()
      await page.locator('#toggle').click(); assert await page.locator('.yuzuki-embed-root').is_visible()
      await page.locator('button[aria-label="收起柚希"]').click()
      assert await page.locator('button[aria-label="重新打开柚希"]').is_visible()
      await page.locator('button[aria-label="重新打开柚希"]').click()
      assert await page.locator('.yuzuki-embed-root').is_visible()
      dims=await page.evaluate('({inner:innerWidth,doc:document.documentElement.scrollWidth})')
      assert dims['doc']<=dims['inner']+2,(label,dims)
      assert not errors,(label,errors)
      print(f'PASS embedded widget {label}: visible, ready event, emotion+say, wink, hide/show, no overflow/errors')
      await page.close()
    page=await browser.new_page(viewport={'width':300,'height':430})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await page.set_content((ROOT/'柚希-悬浮挂件.html').read_text('utf-8'),wait_until='load')
    await page.locator('#widgetFallback.hidden').wait_for(state='attached',timeout=20000)
    await page.locator('#widgetHello').click()
    assert await page.locator('#widgetBubble.show').is_visible()
    await page.screenshot(path=str(QA/'yuzuki-v12-widget-alone.png'))
    assert not errors,errors
    print('PASS independent standalone widget: visible canvas, own interaction, no script errors')
    await browser.close()
if __name__=='__main__':asyncio.run(run())
