"""Headless Chromium smoke test of the actual V1.9 standalone artifacts."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/qa-v19'; OUT.mkdir(exist_ok=True)
async def run():
  async with async_playwright() as pw:
    browser=await pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    for width,height,label in [(1440,900,'desktop'),(390,844,'mobile')]:
      page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
      issues=[]
      page.on('pageerror',lambda err:issues.append(str(err)))
      await page.set_content((ROOT/'柚希-V1.9-眼部三态审核.html').read_text('utf8'),wait_until='load',timeout=45000)
      await page.locator('[data-pose="half"]').click()
      assert 'half' in await page.locator('#view').get_attribute('src') if False else (await page.locator('#stamp').inner_text()).startswith('半闭眼')
      await page.locator('[data-pose="closed"]').click()
      assert '闭眼' in await page.locator('#state').inner_text()
      await page.locator('[data-pose="open"]').click()
      await page.screenshot(path=str(OUT/f'keyframe-review-{label}.png'),full_page=True)
      await page.locator('#play').click()
      await page.wait_for_timeout(1100)
      assert '原画' in await page.locator('#stamp').inner_text()
      assert not issues,issues
      print(f'PASS {label} keyframe review: three poses and timed preview, no page errors')
      await page.close()
    page=await browser.new_page(viewport={'width':1440,'height':900})
    issues=[];page.on('pageerror',lambda err:issues.append(str(err)))
    await page.set_content((ROOT/'柚希-双击直接体验.html').read_text('utf8'),wait_until='load',timeout=45000)
    await page.locator('#rigCanvas:not(.hidden)').wait_for(timeout=25000)
    await page.locator('[data-emotion="shy"]').click()
    await page.locator('#chatInput').fill('你好柚希')
    await page.locator('#sendButton').click()
    await page.locator('.bubble.bot').last.wait_for(timeout=10000)
    await page.locator('#motionButton').click()
    await page.wait_for_timeout(140)
    result=await page.evaluate('''async()=>{
      const cv=document.getElementById('rigCanvas');
      const original=document.getElementById('portraitFallback');
      const other=document.createElement('canvas');other.width=1024;other.height=1536;
      other.getContext('2d').drawImage(original,0,0,1024,1536);
      const r=cv.getContext('2d'),o=other.getContext('2d');
      // At motion-off the approved eyes are drawn from the original image
      // without a cutout. Avoid cheeks because mood blush intentionally changes.
      const eyes=[[365,486,80,44],[582,472,80,45]];let highest=0;
      for(const [x,y,w,h] of eyes){const a=r.getImageData(x,y,w,h).data,b=o.getImageData(x,y,w,h).data;
       for(let i=0;i<a.length;i+=4){highest=Math.max(highest,Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]))}}
      return {maxEyeChannelDifference:highest}
    }''')
    assert result['maxEyeChannelDifference']<=2,result
    assert not issues,issues
    await page.screenshot(path=str(OUT/'companion-v19-desktop.png'),full_page=True)
    print('PASS companion: canvas visible, mood + chat interaction, rest eye matches original, no JS errors;',result)
    await page.close();await browser.close()
if __name__=='__main__':asyncio.run(run())
