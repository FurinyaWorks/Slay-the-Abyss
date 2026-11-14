import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readdirSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {buildLuaData,luaString} from '../scripts/build-lua-data.mjs';
import {buildUI} from '../scripts/build-ui.mjs';
const require=createRequire(import.meta.url);
function lua(body){
 const result=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),'-e',body],{encoding:'utf8',timeout:60000,maxBuffer:2*1024*1024});
 assert.equal(result.status,0,result.stdout+result.stderr+String(result.error??''));
 assert.match(result.stdout,/PAGE_REVEAL_PASS/);
}
test('one reveal gate rejects pending, stale epochs, reentry and failures; ready publishes only after another scheduler turn',()=>{
 lua(`package.path='src/lua/?.lua;'..package.path
local Gate=require('abyss_page_reveal');local ready=false;local failure;local callback;local shown
local cover={SetVisible=function(_,v)shown=v end,SetAsLastSibling=function()end,GetChild=function()return nil end}
local g=Gate.new(cover,function(i)if callback then local f=callback;callback=nil;f()end;return ready,failure end)
local a={page='menuPanel',run={}};local b={page='battlePanel',run={}}
assert(g:request(a)and shown and g:covered())
for i=1,10 do assert(not g:step(a)and g:covered())end
ready=true;assert(not g:step(a)and shown and g.state=='ready')
assert(g:step(a)and not shown and not g:covered())
g:request(b);ready=false;assert(not g:step(b)and shown)
ready=true;assert(not g:step(b));g:request(a);assert(not g:step(a)and shown,'old epoch cannot reveal another page')
callback=function()g:request(b)end;assert(not g:step(a)and shown,'reentrant intent invalidates ready')
failure='asset rejected';assert(not g:step(b)and g:covered()and g.error=='asset rejected')
failure=nil;assert(not g:step(b));assert(g:step(b))
local owner={mode='node',run={phase='node',nodeFlow={event={stage='neow_blessing'}}},nodeUI={mode='normal'}}
local intro=Gate.intent(owner);g:request(intro);assert(not g:step(intro));assert(g:step(intro))
owner.run.nodeFlow.event.stage='neow_card_reward';ready=false
local reward=Gate.intent(owner);assert(g:request(reward)and g:covered(),'same-flow event stage left old page exposed')
assert(not g:step(reward));owner.nodeUI.mode='picker';owner.nodeUI.picker='neow_card'
local picker=Gate.intent(owner);assert(g:request(picker)and g:covered(),'same-flow picker did not acquire cover')
ready=true;assert(not g:step(picker));assert(g:step(picker))
local ticket=g.epoch;owner.run.combat={hand={1},turn=1};owner.mode='battle';owner.run.phase='combat'
local fight=Gate.intent(owner);g:request(fight);g:step(fight);g:step(fight);ticket=g.epoch
owner.run.combat.hand={2,3};owner.run.combat.turn=2
assert(not g:request(Gate.intent(owner))and g.epoch==ticket,'ordinary combat changes unnecessarily re-covered the page')
print('PAGE_REVEAL_PASS')`);
});
test('real generated Host keeps preparation running behind cover, blocks old pointer and navigation actions, and exposes exit recovery',t=>{
 const base=resolve('.artifacts/test-tmp');mkdirSync(base,{recursive:true});const out=mkdtempSync(join(base,'page-reveal-'));t.after(()=>rmSync(out,{recursive:true,force:true}));
 buildLuaData('data',join(out,'abyss_data.lua'));buildUI(out,undefined,{officialAssets:true});
 const modules=readdirSync(out).filter(n=>n.endsWith('.lua')).map(n=>n.slice(0,-4));
 const preloads=modules.map(n=>`package.preload[${luaString(n)}]=assert(loadfile(${luaString(join(out,n+'.lua').replaceAll('\\','/'))}))`).join('\n');
 lua(`package.path='src/lua/?.lua;tests/lua/?.lua;'..package.path
${preloads}
local G=require('abyss_game_ui');local make=G.new;local prepared=false;local calls=0;local focus;local controllerMode=false
local extraReady,sourcePage,textureRuntime
G.new=function(root,data,presentation,event,p)
 p.presentationReady=function(intent)calls=calls+1;if extraReady then return extraReady(intent)end;return prepared end
 p.presentationPage=function(page)sourcePage=page;require('abyss_card_art_runtime').setPresentationPage(page);if textureRuntime then textureRuntime:setPresentationPage(page)end end
 p.controllerApi={events={Confirm='navConfirm',Cancel='navCancel'},directions={Left='left',Right='right'},modes={Specified='specified'},isController=function()return controllerMode end,getFocus=function()return focus end,setFocus=function(v)focus=v end}
 return make(root,data,presentation,event,p)
end
local F=dofile('tests/lua/support/game_ui_fixture.lua');local host,root=F.fixture(nil,function()return true end)
local reveal=host.pageReveal;local cover=root:GetChild('pageReveal');local start=root:GetChild('menuPanel'):GetChild('start'):GetChild('hit')
assert(reveal and reveal:covered()and cover.visible)
assert(require('abyss_controller').pointerBlocked(host.controller),'keyboard/mouse manager must honor preparation')
assert(not start.click()and not host.characterOpen,'old page click reached rules during preparation')
assert(cover:GetChild('cancel'):GetChild('hit').click()and host.exitOpen,'recovery menu inaccessible')
assert(root:GetChild('runMenu').visible and host.controller.scope=='exit')
assert(root:GetChild('runMenu'):GetChild('resume'):GetChild('hit').click()and not host.exitOpen,'recovery menu cannot return')
controllerMode=true;host:syncController()
local cancel=cover:GetChild('cancel'):GetChild('hit')
assert(focus==cancel and not start.navigationListeners.navConfirm(),'blocked controller action reached old page')
assert(cancel.navigationListeners.navConfirm()and host.exitOpen,'controller cannot reach recovery menu')
controllerMode=false;host.controller:tick()
assert(root:GetChild('runMenu'):GetChild('resume'):GetChild('hit').click()and not host.exitOpen)
local intent=require('abyss_page_reveal').intent(host)
host:update(1/60);assert(not reveal:step(intent)and calls>0 and cover.visible)
prepared=true;assert(not reveal:step(intent)and cover.visible);assert(reveal:step(intent));host:refresh()
assert(not cover.visible and not require('abyss_controller').pointerBlocked(host.controller))
local epoch=reveal.epoch
for i=1,20 do host:update(1/60);reveal:step(require('abyss_page_reveal').intent(host));host:refresh();assert(not reveal:covered()and reveal.epoch==epoch,'idle frame restarted cover')end
local updateBattle=host.battleUI.update;local ruleUpdates=0
host.battleUI.update=function()ruleUpdates=ruleUpdates+1 end
host.run={phase='combat',elapsedSeconds=0};host.mode='battle';prepared=false
reveal:request(require('abyss_page_reveal').intent(host));host:update(1/60)
assert(ruleUpdates==0 and host.run.elapsedSeconds==0,'preparation advanced combat or charged load time')
host.battleUI.update=updateBattle;host.run=nil;host.mode='menu';prepared=true
reveal:request(require('abyss_page_reveal').intent(host));reveal:step(require('abyss_page_reveal').intent(host));reveal:step(require('abyss_page_reveal').intent(host));host:refresh()
assert(start.click()and host.characterOpen and reveal:covered(),'new page did not acquire a fresh cover')
assert(not host:openDeck(),'public deck action bypassed preparation')
for i=1,3 do host:update(1/60);reveal:step(require('abyss_page_reveal').intent(host));host:refresh()end
assert(F.confirmStart(host))
for i=1,4 do host:update(1/60);reveal:step(require('abyss_page_reveal').intent(host));host:refresh()end
assert(host:openDeck())
for i=1,4 do host:update(1/60);reveal:step(require('abyss_page_reveal').intent(host));host:refresh()end
local deckEpoch=reveal.epoch;local deckGeneration=host.deckUI.generation
for i=1,20 do host:update(1/60);reveal:step(require('abyss_page_reveal').intent(host));host:refresh()
 assert(not reveal:covered()and reveal.epoch==deckEpoch and host.deckUI.generation==deckGeneration,'idle deck generation repeatedly covered page')end
assert(host:closeDeck());assert(require('abyss_run').startCombat(host.run,'cultist_solo'));host:refresh()
for i=1,3 do host:update(1/60);reveal:step(require('abyss_page_reveal').intent(host));host:refresh()end
local battleEpoch=reveal.epoch;local played=false
for _,card in ipairs(host.run.combat.hand)do if F.Combat.canPlay(host.run.combat,card.uid,1)then
 assert(require('abyss_run').play(host.run,card.uid,1));played=true;break end end
assert(played);host:refresh()
assert(not reveal:covered()and reveal.epoch==battleEpoch,'an ordinary real combat play restarted page reveal')
-- Opening a choice paints first, before the Host observes choice.visible. Its
-- actual asynchronous leases must already have the explicit choice owner.
local function native()return setmetatable({alive=true},{__index=function()return function()return true end end})end
local Art=require('abyss_card_art_runtime');Art.configure({instantiate=function()return native()end,destroy=function(c)c.alive=false end,imageTemplateIndex=1,containerTemplateIndex=2})
textureRuntime=require('abyss_v25_texture_runtime').new({imageTemplateId=1,groupTemplateId=2,textures={[101]={width=1,height=1,count=1,drawCount=1,blocks='0000000000010001ffffffff'}}},{
 instantiate=function()return native()end,destroy=function(c)c.alive=false end,
 createController=function()local phase='building';return{begin=function()return true end,step=function()phase='ready'end,status=function()return{phase=phase}end}end})
local choiceFaces,battleFaces,pools,metadata={},{},{},{}
for i=1,10 do choiceFaces[root:GetChild('choicePanel'):GetChild('card'..i):GetChild('face')]=true
 local card=root:GetChild('battlePanel'):GetChild('card'..i);if card then battleFaces[card]=true end end
local Display=require('abyss_card_display');local write=Display.writeNativeArt
Display.writeNativeArt=function(face,definition,raw,p,fallback,identity)
 if not choiceFaces[face]and not battleFaces[face]then return write(face,definition,raw,p,fallback,identity)end
 local wanted=choiceFaces[face]and 'choicePanel'or'battlePanel';assert(sourcePage==wanted,'first native art lease received the wrong page owner')
 pools[face]=pools[face]or native();metadata[definition.id]=metadata[definition.id]or{cardId=definition.id,slots={{}}}
 textureRuntime:surfaceApi().instantiate(101,face)
 return Art.request(face,pools[face],metadata[definition.id],p,fallback,identity,function()return true end)
end
extraReady=function(intent)local ok,why=Art.presentationReady(intent.page);if not ok then return false,why end;return textureRuntime:presentationReady(intent.page)end
local uids={};for _,card in ipairs(host.run.combat.hand)do uids[#uids+1]=card.uid end
host:refresh();assert(not Art.presentationReady('battlePanel'),'battle native-art owner missing')
host.run.combat.pendingDiscard={token='page-reveal-choice',turn=host.run.combat.turn,count=1,handUids=uids}
host:refresh();assert(host.choiceUI.visible and reveal:covered())
assert(not Art.presentationReady('choicePanel'),'first choice native-art owner missing')
assert(not textureRuntime:presentationReady('choicePanel')and not textureRuntime:presentationReady('battlePanel'))
assert(not reveal:step(require('abyss_page_reveal').intent(host)),'empty choice readiness skipped first leases')
Art.update();textureRuntime:update();assert(not reveal:step(require('abyss_page_reveal').intent(host)));assert(reveal:step(require('abyss_page_reveal').intent(host)))
host:refresh();local choiceEpoch=reveal.epoch;local generation=host.choiceUI.generation
for i=1,10 do host:refresh();host:update(1/60);reveal:step(require('abyss_page_reveal').intent(host));assert(not reveal:covered()and reveal.epoch==choiceEpoch,'choice idle refresh restarted cover')end
assert(host.choiceUI.generation==generation,'idle refresh unexpectedly changed choice input generation')
assert(host.choiceUI:select(1));host:refresh()
assert(host.choiceUI.generation>generation and reveal.epoch==choiceEpoch and not reveal:covered(),'choice selection input generation unnecessarily restarted cover')
Display.writeNativeArt=write
print('PAGE_REVEAL_PASS')`);
});
test('art and texture readiness uses explicit lease page owners, rejects missing ownership and ignores unrelated pages',()=>{
 lua(`package.path='src/lua/?.lua;'..package.path
local function native()return setmetatable({alive=true},{__index=function(_,key)return function()return true end end})end
local Art=require('abyss_card_art_runtime')
local api={instantiate=function()return native()end,destroy=function(c)c.alive=false end,imageTemplateIndex=1,containerTemplateIndex=2}
Art.configure(api);Art.setPresentationPage('battlePanel')
local box,pool,fallback=native(),native(),native()
local metadata={cardId='probe',slots={{}}}
assert(not Art.request(box,pool,metadata,{},fallback,1,function()return true end))
assert(not Art.presentationReady('battlePanel'));assert(Art.presentationReady('nodePanel'))
Art.update();assert(Art.presentationReady('battlePanel'))
Art.configure(api);assert(not Art.request(native(),native(),metadata,{},native(),2,function()return true end))
local ok,reason=Art.presentationReady('nodePanel');assert(not ok and reason:find('UNAVAILABLE',1,true))
local Texture=require('abyss_v25_texture_runtime')
local runtime=Texture.new({imageTemplateId=1,groupTemplateId=2,textures={[101]={width=1,height=1,count=1,drawCount=1,blocks='0000000000010001ffffffff'}}},{
 instantiate=function()return native()end,destroy=function(c)c.alive=false end,
 createController=function()local phase='building';return{begin=function()return true end,step=function()phase='ready'end,status=function()return{phase=phase}end}end})
runtime:setPresentationPage('battlePanel');assert(runtime:surfaceApi().instantiate(101,native()))
assert(not runtime:presentationReady('battlePanel'));assert(runtime:presentationReady('nodePanel'))
runtime:update();assert(runtime:presentationReady('battlePanel'))
runtime:setPresentationPage(nil);assert(runtime:surfaceApi().instantiate(101,native()))
local ready,why=runtime:presentationReady('nodePanel');assert(not ready and why:find('UNAVAILABLE',1,true))
local broken=Texture.new({imageTemplateId=1,groupTemplateId=2,textures={[101]={width=1,height=1,count=1,drawCount=1,blocks='0000000000010001ffffffff'}}},{
 instantiate=function()error('allocation rejected')end,destroy=function(c)c.alive=false end})
assert(not broken:surfaceApi().instantiate(101,native()));assert(broken:status().roots==0)
local valid,reason=broken:presentationReady('choicePanel');assert(not valid and reason:find('UNAVAILABLE',1,true),'retired unknown-owner allocation failure was forgotten')
print('PAGE_REVEAL_PASS')`);
});

test('covered preparation pauses real Match resolution and all node rule clocks, then resumes one committed reward',t=>{
 const base=resolve('.artifacts/test-tmp');mkdirSync(base,{recursive:true});const out=mkdtempSync(join(base,'page-reveal-match-'));t.after(()=>rmSync(out,{recursive:true,force:true}));
 buildLuaData('data',join(out,'abyss_data.lua'));buildUI(out,undefined,{officialAssets:true});
 const preloads=readdirSync(out).filter(n=>n.endsWith('.lua')).map(file=>`package.preload[${luaString(file.slice(0,-4))}]=assert(loadfile(${luaString(join(out,file).replaceAll('\\','/'))}))`).join('\n');
 lua(`package.path='src/lua/?.lua;tests/lua/?.lua;'..package.path
${preloads}
local H=dofile('tests/helpers/act2_event_ui.lua');local create=H.control
H.control=function(spec,parent)local c=create(spec,parent)
 function c:GetChildren()local list={};for _,v in pairs(self.children)do list[#list+1]=v end;return list end
 function c:SetLocalRotation(x,y,z)self.localRotationX=x;self.localRotationY=y;self.localRotationZ=z end
 return c end
local run,map=H.fixture('match_game');local node,get,shown,click=H.setup(run,map)
assert(click('eventView/option1'));assert(click('eventView/option1'))
local pair
for i,a in ipairs(run.nodeFlow.event.board)do
 for j,b in ipairs(run.nodeFlow.event.board)do if i<j and a.cardId==b.cardId then pair={i,j};break end end
 if pair then break end
end
assert(pair);assert(click('pickerView/forgeGrid/card'..pair[1]));assert(click('pickerView/forgeGrid/card'..pair[2]))
local deck,attempts=#run.deck,run.nodeFlow.event.attemptsLeft
local covered=true;local ruleCalls=0;local preparations=0;local battleCalls=0
local host={run=run,mode='node',nodeUI=node,deckUI={update=function()preparations=preparations+1 end},mapUI={update=function()end},
 battleUI={update=function()battleCalls=battleCalls+1 end},
 pageReveal={covered=function()return covered end},paintArtLoading=function()end,animate=function()end,syncController=function()end}
local original=node.update;node.update=function(self,dt)ruleCalls=ruleCalls+1;return original(self,dt)end
local update=require('abyss_game_ui_lifecycle').update(host,nil,{},function()return false end,function()end,{})
local before=H.snapshot(run)
for i=1,3 do assert(update(host,2))end
H.same(run,before);assert(ruleCalls==0 and battleCalls==0 and preparations==3,'covered update reached a rule/interaction clock')
covered=false;update(host,0)
assert(#run.deck==deck and run.nodeFlow.event.attemptsLeft==attempts,'covered wall time leaked into Match resolve')
update(host,0.05);assert(#run.deck==deck and run.nodeFlow.event.attemptsLeft==attempts,'normal Match wait was skipped')
update(host,2)
assert(#run.deck==deck+1 and run.nodeFlow.event.attemptsLeft==attempts-1,'revealed Match did not resume one transaction')
update(host,2)
assert(#run.deck==deck+1 and run.nodeFlow.event.attemptsLeft==attempts-1,'Match reward committed twice')
assert(run.elapsedSeconds>0 and ruleCalls==4 and battleCalls==4)
print('PAGE_REVEAL_PASS')`);
});
