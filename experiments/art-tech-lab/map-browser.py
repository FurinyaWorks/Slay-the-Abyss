import json,sys,time,urllib.request,uuid
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
session_id='map-'+uuid.uuid4().hex
payload=json.dumps({'sessionId':session_id,'path':sys.argv[2] if len(sys.argv)>2 else '.artifacts/map-baseline/map.save.json'}).encode()
req=urllib.request.Request('http://127.0.0.1:4180/editor/api/load-archive',data=payload,headers={'Content-Type':'application/json'})
response=json.loads(urllib.request.urlopen(req).read());assert response.get('ok'),response
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=r'C:\Users\Administrator\AppData\Local\Google\Chrome\Application\chrome.exe',headless=True)
 page=b.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
 errors=[];network=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('response',lambda r:network.append({'url':r.url,'status':r.status}))
 page.goto('http://127.0.0.1:4180/editor/play#'+session_id,wait_until='domcontentloaded')
 try:page.locator('#loading').wait_for(state='hidden',timeout=45000)
 except Exception as e:errors.append(str(e))
 assert page.locator('#fatal').is_hidden(),page.locator('#fatal').inner_text()
 def snapshot():
  return page.evaluate('''async sessionId=>{const r=await fetch('/editor/api/play',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId,action:'get',args:{inspect:true}})});const j=await r.json();if(!j.ok)throw Error(j.error);return j.value}''',session_id)
 def title(s):
  found=[]
  def walk(n):
   if n.get('name')=='title' and '第一幕' in n.get('text',''):found.append(n['text'])
   for c in n.get('children',[]):walk(c)
  for n in s.get('tree',[]):walk(n)
  assert len(found)==1,found
  return found[0]
 before=snapshot();before_title=title(before)
 page.screenshot(path=str(out/'browser.png'))
 cv=page.locator('#cv');box=cv.bounding_box();x=box['x']+box['width']*520/1600;y=box['y']+box['height']*760/900
 page.mouse.move(x,y);page.mouse.down();page.wait_for_timeout(100);cv.screenshot(path=str(out/'pressed.png'))
 page.mouse.up();page.wait_for_timeout(300);after=snapshot();after_title=title(after)
 assert before_title!=after_title and '1' in after_title,(before_title,after_title)
 cv.screenshot(path=str(out/'selected.png'))
 for i in range(5):page.mouse.click(x,y)
 page.wait_for_timeout(300);final=snapshot();assert title(final)==after_title,'blocked node accepted repeated selection'
 faults=final.get('logs',[]);assert not any(l.get('level')=='lua-error' for l in faults),faults
 assert not errors,errors
 (out/'browser.json').write_text(json.dumps({'status':'passed','errors':errors,'before':before_title,'after':after_title,'repeatClicks':5,'inputPointCanvas':[520,760],'text':page.locator('body').inner_text(),'network':network},ensure_ascii=False,indent=2),encoding='utf8')
 b.close()
