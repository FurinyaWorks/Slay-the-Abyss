import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readdirSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {buildUI} from '../scripts/build-ui.mjs';
import {buildLuaData,luaString,toLua} from '../scripts/build-lua-data.mjs';
const require=createRequire(import.meta.url);

test('actual official Neow writer keeps measured one-line choices, structured ink, transactions and state restoration',t=>{
 const tmp=resolve('.artifacts/test-tmp');mkdirSync(tmp,{recursive:true});
 const out=mkdtempSync(join(tmp,'sts-neow-'));t.after(()=>rmSync(out,{recursive:true,force:true}));
 buildLuaData('data',join(out,'abyss_data.lua'));buildUI(out,undefined,{officialAssets:true});
 const tree=JSON.parse(readFileSync(join(out,'game-ui.json'))),theme=JSON.parse(readFileSync(join(out,'official-assets-theme.json')));
 const descendants=n=>[n,...(n.children??n.controls??[]).flatMap(descendants)];
 const story=descendants(tree).find(n=>n.name==='v25EventParchment');assert(story);
 const field=story.children.find(n=>n.name==='field'),hud=theme.officialAssets.battleHud;
 assert.equal(field.position[1]+field.size[1]/2,hud.y-hud.height/2,'ordinary event field must start exactly below the shared HUD');
 assert.equal(field.position[1]-field.size[1]/2,-theme.canvas.base[1]/2,'ordinary event field must reach the canvas bottom');
 const ordinaryArt=descendants(tree).find(n=>n.name==='eventView').children.find(n=>n.name==='art');
 assert.equal(ordinaryArt.image,theme.icon.eventArt.default,'initial ordinary art must also be a real sprite');
 assert.equal(ordinaryArt.opacity,1,'event illustrations must not inherit the question-mark watermark opacity');
 assert.equal(ordinaryArt.colour,theme.layout.nativeNode.event.reference.figureInk,'initial event art and runtime must share the full-colour tint token');
 assert(ordinaryArt.size.every(v=>v>=250&&v<410),'readable event art must fill its well without crossing the border');
 const modules=readdirSync(out).filter(f=>f.endsWith('.lua')).map(f=>f.slice(0,-4));
 const script=`
local generated=${luaString(out.replaceAll('\\','/'))}
package.path=generated..'/?.lua;src/lua/?.lua'
for _,name in ipairs(${toLua(modules)})do package.preload[name]=assert(loadfile(generated..'/'..name..'.lua'))end
local F=dofile('tests/lua/support/game_ui_fixture.lua')
local Run=require('abyss_run');local Map=require('abyss_map');local NodeUI=require('abyss_node_ui')
local C=F.Combat;local n=F.Theme.layout.nativeNode.event.neow;local tokens=n.stsChoice
assert(tokens,'actual official generated theme must include the measured style')
local function find(list,name)
 for _,s in ipairs(list)do if s.name==name then return s end;local r=find(s.children or {},name);if r then return r end end
end
local r=Run.new(F.Data,'42');local m=Map.generate(r.data,'42');assert(F.Nodes.beginNeow(r,m,{bossCount=0}))
local host=F.control({name='fixture',children={assert(find(F.Layout,'nodePanel'))}})
local root=host:GetChild('nodePanel')
local ui=NodeUI.new(root,r,m,F.Presentation,'click',function()end,{imageSource='static',
 textAlignments={horizontal={Left='Left',Middle='Middle'},vertical={Top='Top',Middle='Middle'}},
 cursorEvents={CursorEnter='enter',CursorExit='exit',CursorDown='down',CursorUp='up',CursorEndDrag='endDrag'},
 color=function(red,green,blue,alpha)return{r=red,g=green,b=blue,a=alpha}end})
ui:setVisible(true)
local event=root:GetChild('eventView');local function row(i)return event:GetChild('option'..i)end
local function visibleBody(i)
 local b=row(i);assert(b.visible and b:GetChild('stsNeowChrome').visible)
 assert(math.abs(b.sizeDeltaY-59*2/3)<.00001,'old tall panel returned at runtime')
 assert(b:GetChild('hit').sizeDeltaY>=44,'visible body cannot shrink native hit')
 assert(not b:GetChild('title').visible and not b:GetChild('description').visible,'old separate title/description returned')
 for _,name in ipairs({'v25BaseMaterial','v25StateChrome','v25Corner0_0','v25Corner0_1','v25Corner1_0','v25Corner1_1'})do
  assert(not b:GetChild(name).visible,'ordinary event material leaked over Neow: '..name)
 end
 for _,s in ipairs({'border','normal','hover','pressed','disabled','selected'})do assert(not b:GetChild(s).visible,'legacy material revived '..s)end
 assert(b:GetChild('stsNeowText').visible)
 return b:GetChild('stsNeowText').text
end
assert(visibleBody(1)=='[ 继续 ]')
assert(event:GetChild('body').horizontalAlignment=='Middle' and event:GetChild('body').verticalAlignment=='Middle','Neow must restore centered speech after the generic left/top text skin')
assert(row(1):GetChild('hit').click());assert(r.nodeFlow.event.stage=='neow_blessing')
for i=1,2 do local text=visibleBody(i);assert(not text:find('恩赐',1,true));assert(text:find('<color=#7FFF00>',1,true))end
assert(math.abs(row(1).y-row(2).y-79*2/3)<.00001,'measured row pitch changed')
local before=C.copy(r);local hit=row(2):GetChild('hit')
hit.listeners.enter({touchId=11});visibleBody(2)
hit.listeners.down({touchId=11});visibleBody(2)
hit.listeners.up({touchId=11});assert(hit.click({touchId=11}));assert(r.hp==88 and r.maxHp==88)
assert(r.nodeFlow.event.stage=='neow_result' and visibleBody(1)=='[ 启程 ]')
-- Formatting never changes the actual Neow transaction or source RNG.
local expected=C.copy(before);assert(F.Nodes.chooseEvent(expected,'reward_2'))
local function same(a,b)
 if type(a)~=type(b)then return false end;if type(a)~='table'then return a==b end
 for k,v in pairs(a)do if not same(v,b[k])then return false end end;for k in pairs(b)do if a[k]==nil then return false end end;return true
end
assert(same(r,expected),'style changed Neow transaction')
-- Inspect only: explicitly controlled structured offers and description schema.
local Neow=require('abyss_neow');local options=Neow.options;local disableFirst=false
local descriptions={'获得100金币；增加最大生命8。','失去所有金币；获得一件随机稀有遗物。',
 '失去初始遗物，获得一件随机首领遗物。','未识别的新格式 / 保留全部文字。'}
r.nodeFlow.event.stage='neow_blessing';r.nodeFlow.event.rewards={
 {type='HUNDRED_GOLD',drawback='NONE'},{type='ONE_RARE_RELIC',drawback='NO_GOLD'},
 {type='BOSS_RELIC',drawback='NONE'},{type='ONE_RARE_RELIC',drawback='NO_GOLD'}}
Neow.options=function(_,e)
 if e.stage~='neow_blessing'then return options(r,e)end
 local rows={};for i=1,4 do rows[i]={choice='reward_'..i,title='恩赐'..i,description=descriptions[i],enabled=not(disableFirst and i==1)}end;return rows
end
ui:render()
local none=visibleBody(1);assert(none:find('<color=#7FFF00>获得100金币；增加最大生命8</color>',1,true));assert(not none:find('#FF6563',1,true))
local trade=visibleBody(2);assert(trade:find('<color=#FF6563>失去所有金币</color>',1,true));assert(trade:find('<color=#7FFF00>获得一件随机稀有遗物</color>',1,true))
local boss=visibleBody(3);assert(boss:find('<color=#FF6563>失去初始遗物</color>',1,true));assert(boss:find('<color=#7FFF00>获得一件随机首领遗物</color>',1,true))
assert(visibleBody(4)=='[ 未识别的新格式 / 保留全部文字 ]','unknown format cannot guess semantic colours or lose copy')
disableFirst=true;ui:render()
assert(not visibleBody(1):find('<color=',1,true),'disabled choice cannot keep bright reward markup')
local disabled=row(1):GetChild('stsNeowText').fontColor
assert(disabled.r==tokens.disabledInk.r and disabled.g==tokens.disabledInk.g and disabled.b==tokens.disabledInk.b)
assert(not row(1):GetChild('hit').click(),'disabled choice cannot execute')
Neow.options=options
-- A reused ordinary room restores its approved compact event writer and skin.
local Rooms=dofile('tests/helpers/act2_event_ui.lua')
local ordinary,ordinaryMap=Rooms.fixture('big_fish');ui.run,ui.map=ordinary,ordinaryMap
ui:render();assert(not row(1):GetChild('stsNeowChrome').visible);assert(not row(1):GetChild('stsNeowText').visible)
assert(event:GetChild('body').horizontalAlignment=='Left' and event:GetChild('body').verticalAlignment=='Top','ordinary paragraph must restore left/top alignment')
assert(row(1):GetChild('title').visible and not row(1):GetChild('description').visible)
assert(row(1):GetChild('v25BaseMaterial').visible and row(1):GetChild('v25StateChrome').visible)
assert(event:GetChild('plateBorder'):GetChild('v25EventParchment').visible)
assert(not event:GetChild('caption').visible)
assert(event:GetChild('art').imageId==F.Theme.icon.eventArt.big_fish,'big fish must use its actual food illustration')
assert(event:GetChild('art').imageColor.a==255,'event art must remain full colour')
local fishArt=F.Theme.icon.eventArt.big_fish;F.Theme.icon.eventArt.big_fish=nil;ui:render()
assert(event:GetChild('art').imageId==F.Theme.icon.eventArt.default,'unlisted event must fall back to real parchment, not a question mark')
F.Theme.icon.eventArt.big_fish=fishArt;ui:render()
local lab,labMap=Rooms.fixture('lab');ui.run,ui.map=lab,labMap;ui:render()
assert(event:GetChild('name').text=='实验室')
assert(event:GetChild('art').imageId==F.Theme.icon.eventArt.lab,'reused event must replace the previous room illustration')
assert(ui:press('eventView/option1'));assert(lab.nodeFlow.event.stage=='potion_rewards')
assert(row(4).visible and not row(4):GetChild('description').visible,'all three potions plus leave must remain reachable')
assert(row(1):GetChild('title').text:find('药水',1,true),'actual potion choice missing')
assert(event:GetChild('body').x==225 and event:GetChild('body').y==58,'ordinary body must use its approved column')
ui.notice=event:GetChild('body').text;ui:render()
assert(root:GetChild('notice').text=='','story instruction was duplicated above the event')
ui.notice='受控错误';ui.failed=true;ui:render()
assert(root:GetChild('notice').text=='受控错误','deduplication must retain transaction failures')
ui.failed=false;ui.notice='';ui:render()
local labBefore=C.copy(lab);local first=require('abyss_act1_events').options(lab,lab.nodeFlow.event)[1]
assert(first and first.enabled)
assert(ui:press('eventView/option1'))
local labExpected=C.copy(labBefore);assert(F.Nodes.chooseEvent(labExpected,first.choice))
assert(same(lab,labExpected),'new event presentation changed potion or RNG transactions')
ui.run,ui.map=r,m;ui:render()
assert(not event:GetChild('art').visible,'ordinary event art must not leak into Neow')
assert(event:GetChild('body').horizontalAlignment=='Middle' and event:GetChild('body').verticalAlignment=='Middle','reused Neow speech must center again after ordinary event')
print('STS_NEOW_RUNTIME_PASS')
`;
 const result=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),'-e',script],
  {cwd:process.cwd(),encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024,env:{...process.env,LUA_INIT:'',LUA_INIT_5_3:''}});
 assert.equal(result.status,0,result.stdout+result.stderr+String(result.error??''));
 assert.match(result.stdout,/STS_NEOW_RUNTIME_PASS/);
});
