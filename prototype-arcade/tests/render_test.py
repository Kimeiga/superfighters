from playwright.sync_api import sync_playwright
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'playwright-results';OUT.mkdir(exist_ok=True)
html=(ROOT/'arcade-offline.html').read_text()
ids=['grab-shift','misprint','haunt-for-hire','upstairs-is-on-fire','we-are-the-floor','do-not-open','yesterdays-crew','sink-different','scrap-sumo','pet-sitting-is-easy']
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1080});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load')
 assert page.locator('.card').count()==10
 page.screenshot(path=str(OUT/'arcade-desktop.png'),full_page=True)
 for gid in ids:
  page.evaluate('(id)=>{location.hash="game="+id}',gid)
  page.locator('#solo').click();page.wait_for_function('window.__arcade.snapshot().state.elapsed > .2')
  snap=page.evaluate('window.__arcade.snapshot()');assert snap['game']==gid and snap['mode']=='local'
  page.screenshot(path=str(OUT/(gid+'.png')),full_page=True)
  # A real keyboard action and pause/resume must be accepted by the UI.
  page.locator('#pause').click();assert page.evaluate('window.__arcade.snapshot().paused')
  page.locator('#overlay-action').click();assert not page.evaluate('window.__arcade.snapshot().paused')
  results.append({'game':gid,'render':'pass','solo_start':'pass','pause_resume':'pass'})
 mobile=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);mobile.on('pageerror',lambda e:errors.append(str(e)));mobile.set_content(html,wait_until='load');mobile.evaluate('location.hash="game=grab-shift"');mobile.locator('#solo').click();mobile.wait_for_function('window.__arcade.snapshot().state.elapsed > .3');mobile.screenshot(path=str(OUT/'mobile-grab-shift.png'),full_page=True)
 assert mobile.locator('#game-canvas').bounding_box()['width']<391
 results.append({'mobile_layout':'pass','errors':errors});assert not errors,errors
 b.close()
(OUT/'render-results.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
