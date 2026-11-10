"""Validate the actual full Web Simulator and original shared HUD by pointer."""
import json, sys, time, urllib.request, urllib.error
from pathlib import Path
from playwright.sync_api import sync_playwright

save, destination = sys.argv[1:3]
base = sys.argv[3] if len(sys.argv)>3 else 'http://127.0.0.1:4190'
session = sys.argv[4] if len(sys.argv)>4 else 'event-full-r3'
quick = '--quick' in sys.argv
out = Path(destination); out.mkdir(parents=True, exist_ok=False)
started = time.perf_counter()
request = urllib.request.Request(base+'/editor/api/load-archive', data=json.dumps({'sessionId':session,'path':save}).encode(), headers={'Content-Type':'application/json'})
try:
    loaded = json.loads(urllib.request.urlopen(request, timeout=180).read())
except urllib.error.HTTPError as error:
    detail=error.read().decode()
    (out/'load-error.json').write_text(detail,encoding='utf8')
    raise RuntimeError('Actual Web archive load failed: '+detail) from None
assert loaded.get('ok'), loaded
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=r'C:\Users\Administrator\AppData\Local\Google\Chrome\Application\chrome.exe',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900})
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(base+'/editor/play#'+session,wait_until='domcontentloaded')
    page.locator('#loading').wait_for(state='hidden',timeout=180000)
    fatal=page.locator('#fatal')
    if not fatal.is_hidden():
        (out/'fatal.txt').write_text(fatal.inner_text(),encoding='utf8')
        raise RuntimeError('Actual Web Simulator failed: '+fatal.inner_text())
    # Use the actual Simulator device selector. inspect.box does not include
    # the stage's extra scaling at a non-reference canvas, so the old compact
    # pointer formula is valid only on the real 1280x720 preset.
    page.locator('#deviceSel').select_option('mobile-16-9')
    page.wait_for_timeout(500)
    def snapshot():
        return page.evaluate('''async sessionId=>{const response=await fetch('/editor/api/play',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId,action:'get',args:{inspect:true}})});const result=await response.json();if(!result.ok)throw Error(result.error);const v=result.value;const trim=n=>({name:n.name,visible:n.visible,text:n.text,box:n.box,children:(n.children||[]).map(trim)});return {tree:v.tree.map(trim),logs:v.logs,canvasWidth:v.canvasWidth,canvasHeight:v.canvasHeight}}''',session)
    def at(state,suffix):
        found=[]
        def walk(node,path=''):
            path+='/'+node['name']
            if path.endswith('/'+suffix):found.append(node)
            for child in node.get('children',[]):walk(child,path)
        for root in state['tree']:walk(root)
        assert len(found)==1,(suffix,len(found))
        return found[0]
    def tap(suffix):
        state=snapshot();node=at(state,suffix);box=node['box'];canvas=page.locator('#cv').bounding_box();print('POINTER '+suffix,flush=True)
        x=box['left']+box['width']/2
        y=state['canvasHeight']-box['bottom']-box['height']/2
        if suffix.startswith('eventFixtureNav/'):
            case=int(suffix.split('/')[1][4:]);x=(640+(case-4)*143)*state['canvasWidth']/1280;y=701*state['canvasHeight']/720
        page.mouse.click(canvas['x']+x/state['canvasWidth']*canvas['width'],canvas['y']+y/state['canvasHeight']*canvas['height'])
        page.wait_for_timeout(1000)
    state=snapshot()
    deadline=time.perf_counter()+60
    while not any('EVENT_FULL_WEB ready event cleric' in line.get('text','') for line in state['logs']):
        assert time.perf_counter()<deadline, state['logs'][-8:]
        page.wait_for_timeout(200);state=snapshot()
    for owner in ['nodePanel','potionEntry','deckEntry','exitEntry']:
        assert at(state,'stage/'+owner)['visible'],owner+' is not visible'
    for index in range(1,4):
        assert at(state,'potionEntry/open/hit/normal/slot'+str(index))['visible'],'shared physical potion slot missing'
    assert not at(state,'potionEntry/open/hit/normal/entryFace')['visible'],'black count plate returned'
    assert not at(state,'potionEntry/open/hit/normal/label')['visible'],'count-only caption returned'
    if not quick:
        (out/'initial.state.json').write_text(json.dumps(state,ensure_ascii=False),encoding='utf8')
        page.locator('#cv').screenshot(path=str(out/'full-room-hud.png'))
    tap('potionEntry/open/hit');opened=snapshot()
    assert at(opened,'stage/potionPanel')['visible'],'real shared potion manager did not open'
    if not quick:page.locator('#cv').screenshot(path=str(out/'potion-manager.png'))
    tap('potionPanel/cancel/hit');closed=snapshot()
    assert not at(closed,'stage/potionPanel')['visible'] and at(closed,'stage/nodePanel')['visible']
    gold_before=at(closed,'nodePanel/gold')['text']
    tap('eventView/option1/hit');paid=snapshot();gold_after=at(paid,'nodePanel/gold')['text']
    assert gold_before=='120' and gold_after=='85',(gold_before,gold_after)
    if not quick:page.locator('#cv').screenshot(path=str(out/'cleric-paid.png'))
    tap('nodePanel/confirm/hit');returned=snapshot()
    assert at(returned,'stage/mapPanel')['visible'] and not at(returned,'stage/nodePanel')['visible'],'real Continue did not return to the map'
    if not quick:
        tap('eventFixtureNav/case2/hit');tap('eventView/option1/hit');four=snapshot()
        for index in range(1,5):assert at(four,'eventView/option'+str(index))['visible']
        for case in [3,4,5]:tap('eventFixtureNav/case'+str(case)+'/hit')
    tap('eventFixtureNav/case6/hit');tap('treasureView/chest/hit');page.wait_for_timeout(1500)
    chest=snapshot();assert at(chest,'treasureView/rewardItem1')['visible'],'enhanced full GameUI chest rewards missing'
    if not quick:tap('eventFixtureNav/case7/hit')
    final=snapshot()
    faults=[line for line in final['logs'] if line.get('level')=='lua-error' or 'ABYSS_UI failed' in line.get('text','')]
    assert not faults,faults
    assert not errors,errors
    browser.close()
(out/'web-report.json').write_text(json.dumps({'status':'passed','url':base+'/editor/play#'+session,'scope':'Actual full GameUI on Web Simulator with native pointer input; explicit reset fixtures; no official client/device claim','runtimeRequested':'existing Node v24.18.0','totalSeconds':time.perf_counter()-started,'goldBefore':gold_before,'goldAfter':gold_after,'fixtureCases':2 if quick else 7,'sharedPotionSlots':3,'potionManagerPointerOpened':True,'returnedToMap':True,'enhancedChestRewardsVisible':True,'pageErrors':errors},ensure_ascii=False,indent=2),encoding='utf8')
print(base+'/editor/play#'+session)
