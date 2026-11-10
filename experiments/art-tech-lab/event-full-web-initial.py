"""Read-only initial full GameUI ready evidence; no pointer or state edits."""
import json,sys,time
from pathlib import Path
from playwright.sync_api import sync_playwright
base,session,destination=sys.argv[1:4]
out=Path(destination);out.mkdir(parents=True,exist_ok=False)
errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=r'C:\Users\Administrator\AppData\Local\Google\Chrome\Application\chrome.exe',headless=True)
 page=browser.new_page(viewport={'width':1440,'height':960})
 page.on('pageerror',lambda error:errors.append(str(error)))
 page.goto(base+'/editor/play#'+session,wait_until='domcontentloaded',timeout=180000)
 page.locator('#loading').wait_for(state='hidden',timeout=180000)
 assert page.locator('#fatal').is_hidden(),page.locator('#fatal').inner_text()
 deadline=time.perf_counter()+90
 while True:
  result=page.evaluate('''async s=>{let r=await fetch('/editor/api/play',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId:s,action:'get',args:{view:true}})});let j=await r.json();if(!j.ok)throw Error(j.error);let v=j.value;return {logs:v.logs,canvasWidth:v.canvasWidth,canvasHeight:v.canvasHeight}}''',session)
  if any('EVENT_FULL_WEB ready event cleric' in line.get('text','') for line in result.get('logs',[])):break
  assert time.perf_counter()<deadline,result
  page.wait_for_timeout(500)
 page.locator('#cv').screenshot(path=str(out/'initial-full-game-ui.png'))
 result.update(url=base+'/editor/play#'+session,status='ready',pointerActions=0,pageErrors=errors,scope='Actual full GameUI Web Simulator initial view only; no device, navigation, potion or run operations')
 (out/'ready.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
 browser.close()
print(result['url'],flush=True)
