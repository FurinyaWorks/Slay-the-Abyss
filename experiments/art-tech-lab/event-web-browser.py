"""Exercise the actual Web Simulator page with headless pointer input."""
import json, sys, time, uuid, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

save, destination = sys.argv[1:3]
out = Path(destination); out.mkdir(parents=True, exist_ok=False)
base = 'http://127.0.0.1:4186'
session = sys.argv[3] if len(sys.argv)>3 else 'events-' + uuid.uuid4().hex
request = urllib.request.Request(base + '/editor/api/load-archive',
    data=json.dumps({'sessionId':session,'path':save}).encode(),
    headers={'Content-Type':'application/json'})
started = time.perf_counter()
loaded = json.loads(urllib.request.urlopen(request, timeout=180).read())
assert loaded.get('ok'), loaded
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=r'C:\Users\Administrator\AppData\Local\Google\Chrome\Application\chrome.exe', headless=True)
    page = browser.new_page(viewport={'width':1440,'height':900})
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(base + '/editor/play#' + session, wait_until='domcontentloaded')
    page.locator('#loading').wait_for(state='hidden', timeout=120000)
    assert page.locator('#fatal').is_hidden(), page.locator('#fatal').inner_text()
    def snapshot():
        return page.evaluate('''async sessionId=>{const r=await fetch('/editor/api/play',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId,action:'get',args:{inspect:true}})});const j=await r.json();if(!j.ok)throw Error(j.error);return j.value}''',session)
    def at(s, suffix):
        found=[]
        def walk(n,path=''):
            path += '/' + n['name']
            if path.endswith('/'+suffix):found.append(n)
            for c in n.get('children',[]):walk(c,path)
        for n in s['tree']:walk(n)
        assert len(found)==1,(suffix,len(found))
        return found[0]
    def tap(suffix):
        s=snapshot();n=at(s,suffix);box=n['box'];cv=page.locator('#cv').bounding_box()
        x,y=box['left']+box['width']/2,s['canvasHeight']-box['bottom']-box['height']/2
        if suffix.startswith('eventFixtureNav/'):
            # The inspect box is local to the navigation container. This fixture
            # uses a fixed 1280x720 stage with the nav centred at y=-341.
            case=int(suffix.split('/')[1][4:])
            x,y=(640+(case-4)*143)*s['canvasWidth']/1280,701*s['canvasHeight']/720
        page.mouse.click(cv['x']+x/s['canvasWidth']*cv['width'],cv['y']+y/s['canvasHeight']*cv['height'])
        page.wait_for_timeout(200)
    s=snapshot()
    assert any('EVENT_PREVIEW ready event cleric' in l.get('text','') for l in s['logs']), s['logs'][-8:]
    page.locator('#cv').screenshot(path=str(out/'cleric.png'))
    gold_before=at(s,'nodePanel/gold')['text']
    tap('eventView/option1/hit');paid=snapshot()
    assert at(paid,'nodePanel/gold')['text']!=gold_before,'real healing click did not deduct gold'
    page.locator('#cv').screenshot(path=str(out/'cleric-paid.png'))
    tap('eventFixtureNav/case2/hit');tap('eventView/option1/hit')
    four=snapshot()
    (out/'designer.state.json').write_text(json.dumps(four,ensure_ascii=False),encoding='utf-8')
    for i in range(1,5):assert at(four,'eventView/option'+str(i))['visible']
    page.locator('#cv').screenshot(path=str(out/'designer.png'))
    for case in (3,4,5,6,7):tap('eventFixtureNav/case'+str(case)+'/hit')
    final=snapshot()
    faults=[l for l in final['logs'] if l.get('level')=='lua-error' or 'ABYSS_UI failed' in l.get('text','')]
    assert not faults, faults
    assert not errors, errors
    browser.close()
(out/'web-report.json').write_text(json.dumps({'status':'passed','url':base+'/editor/play#'+session,
    'scope':'Actual Web Simulator page and headless native pointer commands; explicit reset fixtures, no official client/device claim',
    'totalSeconds':time.perf_counter()-started,'goldBefore':gold_before,'goldAfter':at(paid,'nodePanel/gold')['text'],
    'fixtureCases':7,'pageErrors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
print(base+'/editor/play#'+session)
