#!/usr/bin/env python3
"""Actual Chromium interactions without navigating forbidden local URLs.

Use set_content with the fully self-contained HTML. Browser has no network access;
this validates real DOM, canvas, click paths, layout and screenshot output.
"""
import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'柚希-双击直接体验.html').read_text(encoding='utf-8')
QA=ROOT/'assets'/'qa-v11'
QA.mkdir(exist_ok=True)

async def run():
    browser_path=os.environ.get('CHROMIUM_BIN','/usr/bin/chromium')
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,executable_path=browser_path,
            args=['--no-sandbox','--disable-dev-shm-usage'])
        counts=[]
        for width,height,label in [(1440,900,'desktop'),(1366,768,'laptop'),(390,844,'mobile')]:
            page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1,accept_downloads=True)
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            await page.set_content(HTML,wait_until='load',timeout=30000)
            await page.locator('#rigCanvas:not(.hidden)').wait_for(timeout=10000)
            await page.wait_for_timeout(350)
            assert not errors,(label,errors)
            assert await page.locator('#portraitFallback.hidden').count()==1
            assert await page.locator('#sendButton').is_enabled()
            scroll=await page.evaluate('({viewport:innerWidth, body:document.documentElement.scrollWidth})')
            assert scroll['body']<=scroll['viewport']+2,(label,scroll)
            await page.screenshot(path=str(QA/f'yuzuki-v11-{label}.png'),full_page=True)
            await page.locator('[data-emotion="shy"]').click()
            assert '害羞' in (await page.locator('#emotionReadout').inner_text())
            await page.locator('#chatInput').fill('你真可爱')
            await page.locator('#sendButton').click()
            await page.locator('.bubble.bot').last.wait_for(timeout=10000)
            await page.wait_for_timeout(600)
            assert await page.locator('.bubble').count()==3,(label,'unexpected bubble count')
            assert '谢谢你' in (await page.locator('.bubble.bot').last.inner_text())
            assert '害羞' in (await page.locator('#emotionReadout').inner_text())
            await page.locator('#helpButton').click()
            assert await page.locator('#aboutDialog').is_visible()
            await page.locator('#aboutClose').click()
            assert not await page.locator('#aboutDialog').is_visible()
            if label=='desktop':
                async with page.expect_download(timeout=10000) as download_info:
                    await page.locator('#captureButton').click()
                download=await download_info.value
                assert download.suggested_filename=='柚希-此刻.png',download.suggested_filename
                path=QA/'yuzuki-export-v11.png'
                await download.save_as(str(path))
                assert path.stat().st_size>30000,path.stat().st_size
            assert not errors,(label,errors)
            counts.append(f'{label} {width}×{height}: canvas, chat, emotion, dialog, screenshot OK')
            await page.close()
        await browser.close()
    print('\n'.join(counts))
    print('PASS: 3 real Chromium viewport/interaction checks')

if __name__=='__main__':asyncio.run(run())
