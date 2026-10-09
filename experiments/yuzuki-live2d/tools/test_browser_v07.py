#!/usr/bin/env python3
"""Real-browser smoke test; local files, no external requests."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess, time
R=Path(__file__).resolve().parents[1]
p=subprocess.Popen(['python','-m','http.server','5189','--bind','127.0.0.1'],cwd=R/'web',stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
 time.sleep(.8)
 with sync_playwright() as w:
  b=w.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking'])
  page=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:5189/',wait_until='domcontentloaded',timeout=9000)
  page.wait_for_function('!document.querySelector("#faceRigCanvas").classList.contains("hidden")',{ 'timeout':8500 })
  assert page.locator('text=FACE RIG · V0.7').count()>0
  assert page.locator('#faceRigCanvas').is_visible()
  buttons=page.locator('[data-tab]')
  for i in range(buttons.count()):
   if buttons.nth(i).get_attribute('data-tab') in ('parameters','blueprint','motion'):
    buttons.nth(i).click()
  page.locator('[data-look="left"]').click(force=True)
  page.wait_for_timeout(210)
  page.locator('[data-look="right"]').click(force=True)
  page.wait_for_timeout(210)
  page.screenshot(path=str(R/'assets/face-rig/browser-v07-desktop.png'),full_page=True)
  page.locator('[data-look="center"]').click(force=True)
  assert not errors,errors
  print('BROWSER PASS: loaded canvas, gazed left/right, screenshot saved; page exceptions:',len(errors))
  b.close()
finally:
 p.terminate();p.wait(timeout=3)
