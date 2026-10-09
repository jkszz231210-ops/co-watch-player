#!/usr/bin/env python3
"""Browser QA for v1.5 eyelid sprites, including no-paint-at-rest invariant."""
import asyncio
import base64
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/'assets'/'qa-v15';QA.mkdir(parents=True,exist_ok=True)
HTML=(ROOT/'柚希-双击直接体验.html').read_text('utf-8').replace('<head>','<head><script>window.__YUZUKI_QA__=true;</script>',1)

async def run():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
        for width,height,label in [(1440,900,'desktop'),(390,844,'mobile')]:
            page=await browser.new_page(viewport={'width':width,'height':height},accept_downloads=True)
            errors=[];page.on('pageerror',lambda exc:errors.append(str(exc)))
            await page.set_content(HTML,wait_until='load',timeout=40000)
            await page.locator('#rigCanvas:not(.hidden)').wait_for(timeout=30000)
            await page.evaluate("window.__YUZUKI_DEBUG_RIG.setTestPose({eye:1,mouth:0});")
            await page.wait_for_timeout(180)
            fidelity=await page.evaluate('''() => {
                const rig=window.__YUZUKI_DEBUG_RIG;
                rig.setTestPose({eye:1,mouth:0});rig.draw(performance.now());
                const a=rig.ctx.getImageData(0,0,1024,1536).data;
                const off=document.createElement('canvas');off.width=1024;off.height=1536;
                const c=off.getContext('2d');c.drawImage(rig.parts.portrait_base,0,0);
                const b=c.getImageData(0,0,1024,1536).data;
                let errors=0,maxDelta=0;
                for(const [x0,y0,x1,y1] of [[319,442,489,571],[536,414,713,563]]) {
                  for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++) {
                    const i=(y*1024+x)*4;
                    for(let k=0;k<3;k++){const d=Math.abs(a[i+k]-b[i+k]); if(d>2)errors++;maxDelta=Math.max(d,maxDelta);}
                  }
                }
                return {errors,maxDelta,loaded:rig.parts.blinkAtlas.width};
            }''')
            assert fidelity['errors']==0,(label,fidelity)
            assert fidelity['loaded']==4032,(label,fidelity)
            for eye,state in [(1,'open'),(.60,'partial'),(.35,'nearly-closed'),(0,'closed')]:
                await page.evaluate('(eye)=>{const r=window.__YUZUKI_DEBUG_RIG;r.setTestPose({eye,mouth:0});r.draw(performance.now());}',eye)
                b64=await page.evaluate('document.querySelector("#rigCanvas").toDataURL("image/png").split(",")[1]')
                (QA/f'{label}-{state}.png').write_bytes(base64.b64decode(b64))
            await page.locator('[data-emotion="shy"]').click()
            await page.locator('#chatInput').fill('你今天好可爱')
            await page.locator('#sendButton').click()
            await page.locator('.bubble.bot').last.wait_for(timeout=20000)
            assert not errors,(label,errors)
            await page.screenshot(path=str(QA/f'{label}-chat.png'),full_page=True)
            scroll=await page.evaluate('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth})')
            assert scroll['scrollWidth']<=scroll['width']+3,(label,scroll)
            print(f'{label} {width}x{height}: PASS, original eye pixel difference 0, 21 eyelid frames, chat, viewport')
            await page.close()
        await browser.close()

if __name__=='__main__':asyncio.run(run())
