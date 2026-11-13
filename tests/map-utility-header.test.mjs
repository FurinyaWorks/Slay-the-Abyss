import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { gameLayout } from '../scripts/game-ui-layout.mjs';
import { nativeTheme as theme } from '../scripts/native-ui-theme.mjs';
import { buildLuaData, luaString, toLua } from '../scripts/build-lua-data.mjs';
import { buildUI } from '../scripts/build-ui.mjs';
import { potionSlotVisual } from '../scripts/potion-slot-visual.mjs';
import { runLua } from '../scripts/test-lua.mjs';
const child=(c,n)=>c.children.find(v=>v.name===n);
const entry=n=>child(gameLayout().controls.find(c=>c.name===n),'open');
const states=['normal','hover','pressed','disabled'];

test('deck entry is an STS-style fanned card stack with a same-ink count pip inside the menu-sibling disc',()=>{
  const open=entry('deckEntry'),hit=child(open,'hit');
  assert.equal(hit.kind,'presetButton');assert.equal(hit.focusable,true);
  assert.deepEqual(open.size,[80,48]);
  for(const name of states){
    const state=child(hit,name);
    const cards=['back2','back1','front'].map(n=>child(state,n));
    for(const card of cards){
      assert.equal(card.kind,'container');
      assert.ok(card.size[1]>card.size[0],'card silhouettes are portrait rectangles');
      assert.deepEqual(card.children.map(c=>c.name),['border','plate']);
    }
    assert.ok(cards[0].rotation>cards[1].rotation&&cards[1].rotation>cards[2].rotation,'stack fans out behind the front card');
    assert.equal(state.children.some(c=>c.name==='badge'),false,'no stray dark badge plate');
    for(const c of [...cards,child(state,'ring'),child(state,'count')]){
      const [x,y]=c.position,[w,h]=c.size;
      assert.ok(Math.abs(x)+w/2<=40&&Math.abs(y)+h/2<=24,c.name+' stays inside the 80x48 hit');
    }
    assert.equal(child(state,'deckIcon').image,theme.icon.deck.id);
    assert.equal(child(state,'ring').image,theme.image.disc);
    assert.equal(child(state,'ring').size[0],theme.layout.exitMenu.entryVisual.diameter,'deck disc is the 菜单 sibling');
    assert.equal(child(state,'label').visible,false,'retain only a hidden compatibility caption');
    assert.equal(child(state,'count').kind,'text');
  }
  const host=readFileSync('src/lua/abyss_game_ui.lua','utf8');
  const view=readFileSync('src/lua/abyss_game_ui_view.lua','utf8');
  assert.match(view,/GetChild\('count'\)\.text=run and number\(#run\.deck\)/);
  assert.match(host,/local refreshDeckEntry = View\.refreshDeckEntry\(child,self\)/);
  assert.match(host,/View\.refreshUtilities\(child,self,inCombat,refreshPotionEntry,refreshDeckEntry\)/);
  assert.match(view,/refreshDeckEntry\(run\)/);
});

test('nonbattle potion entry shows readable count and retains passive compatibility silhouettes without new actions',()=>{
  const open=entry('potionEntry'),hit=child(open,'hit');
  assert.equal(open.children.length,1);assert.equal(hit.kind,'presetButton');assert.equal(hit.focusable,true);
  for(const name of states){
    const state=child(hit,name);assert.equal(child(state,'label').visible,true);
    const face=child(state,'entryFace');assert.equal(face.kind,'image');assert.deepEqual(face.size,open.size);
    assert.equal(face.image,theme.image.rect);
    assert.equal(child(state,'label').text.fontSize,theme.font.label);
    assert.equal(child(state,'label').text.minFontSize,theme.font.label);
    assert.equal(state.children.filter(c=>/^slot[1-5]$/.test(c.name)).length,5);
    assert.ok(state.children.every(c=>c.kind==='container'||c.name==='label'||c.name==='entryFace'),'only approved count plate, caption and passive slots');
    for(let i=1;i<=5;i++){
      const slot=child(state,`slot${i}`);
      assert.deepEqual(slot.size,[34.667,34.667]);
      assert.equal(child(slot,'border').image,theme.image.disc);assert.equal(child(slot,'plate').image,theme.image.disc);
      assert.deepEqual(child(slot,'bottle').size,[16,16]);
      assert.equal(child(slot,'bottle').image,theme.icon.potion.fire_potion);
      assert.equal(child(slot,'bottle').visible,false);
      assert.equal(slot.children.some(c=>c.kind==='cursorArea'||c.kind==='presetButton'),false,'slots are not new use buttons');
    }
  }
});

test('real potion header repaint preserves physical capacity and sparse inventory without mutating it',()=>{
  buildLuaData();buildUI();
  const result=runLua('tests/lua/map_utility_header.lua');
  assert.equal(result.status,0,result.stdout+result.stderr);assert.match(result.stdout,/MAP_UTILITY_HEADER_PASS/);
});

test('the real header regression rejects repainting strength potion with the old generic shell ink',()=>{
  buildLuaData();buildUI();
  const source=readFileSync('src/lua/abyss_potion_discard_ui.lua','utf8');
  const current="local colour=(Theme.icon.potionTint or {})[id] or (id=='fire_potion' and Theme.color.potionShell.fire or Theme.color.potionShell.normal).ink";
  assert.equal(source.split(current).length,2,'one exact current potion writer');
  const mutant=source.replace(current,"local colour=id=='strength_potion' and Theme.color.potionShell.normal.ink or "+current.slice('local colour='.length));
  const require=createRequire(import.meta.url);
  const body=`package.path='build/lua/?.lua;src/lua/?.lua;'..package.path
package.preload.abyss_potion_discard_ui=assert(load(${luaString(mutant)},'wrong-potion-tint'))
dofile('tests/lua/map_utility_header.lua')`;
  const result=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),'-e',body],{encoding:'utf8',timeout:30000});
  assert.notEqual(result.status,0,'wrong potion tint must fail the original inventory/paint regression');
  assert.match(result.stdout+result.stderr,/shared current potion tint strength_potion/);
});

test('V25 node and Neow reuse the map physical-slot header and its existing inventory manager',t=>{
  const parent=resolve('.artifacts/test-tmp');mkdirSync(parent,{recursive:true});
  const directory=mkdtempSync(join(parent,'v25-node-potions-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
  buildLuaData('data',join(directory,'abyss_data.lua'));buildUI(directory,undefined,{v25BattleChrome:true});
  const modules=readdirSync(directory).filter(n=>n.endsWith('.lua')).map(n=>n.slice(0,-4));
  const dir=directory.replaceAll('\\','/');
  const source=`package.path=${luaString(dir+'/?.lua;src/lua/?.lua')}
for _,name in ipairs(${toLua(modules)})do package.preload[name]=assert(loadfile(${luaString(dir)}..'/'..name..'.lua'))end
local F=dofile('tests/lua/support/game_ui_fixture.lua')
local Run,Map=require('abyss_run'),require('abyss_map')
local h,root=F.fixture()
assert(h:start());assert(h:selectCharacter('traveler'));assert(h:selectElement('ironclad'));assert(h:confirmCharacter())
-- The general rule fixture has no account history provider. Stage the real
-- opening explicitly instead of inventing naturally earned account history.
assert(F.Nodes.beginNeow(h.run,h.map,{bossCount=0}));h:refresh()
local entry=root:GetChild('potionEntry');local open=entry:GetChild('open');local hit=open:GetChild('hit')
local function checkSlots(capacity)
 assert(entry.visible,'node keeps the existing potion manager visible')
 for _,state in ipairs({'normal','hover','pressed','disabled'})do
  local face=hit:GetChild(state)
  assert(not face:GetChild('label').visible,'V25 node must hide the count-only potion label')
  assert(not face:GetChild('entryFace').visible,'V25 node must hide the black count plate')
  for i=1,5 do
   local slot=face:GetChild('slot'..i)
   assert(slot.visible==(i<=capacity),'physical node capacity mismatch')
   assert(slot:GetChild('bottle').visible==(i<=capacity and h.run.potions[i]~=nil),'sparse physical bottle mismatch')
  end
 end
 assert(open.y==338 and hit.sizeDeltaX==capacity*42,'node and map retain identical header geometry')
end
assert(h.mode=='node' and h.run.nodeFlow.event.id=='neow')
local opening=h.run.nodeFlow;local stage=opening.event.stage;local inventory=h.run.potions
h:refresh();checkSlots(3)
assert(h.run.nodeFlow==opening and opening.event.stage==stage and h.run.potions==inventory,'Neow header painting changed its owner')
for i=1,6 do if h.mode~='node'then break end;assert(h.nodeUI:press('eventView/option1'));h:update(0)end
assert(h.mode=='map');checkSlots(3)
-- Start the existing direct-map fixture for a canonical camp route; do not
-- bypass an opening's completed-map ownership by editing its flow.
h,root=F.fixture();assert(F.start(h))
entry=root:GetChild('potionEntry');open=entry:GetChild('open');hit=open:GetChild('hit')
local routes=dofile('tests/lua/support/map_routes.lua')
local path=routes.to(h.map,function(node)return node.type=='camp'end)
for i=1,#path-1 do assert(Map.choose(h.map,path[i]))end
h.run.floor=h.map.floor;h:refresh();assert(h.mapUI:choose(routes.at(h.map,path[#path]).id))
assert(h.mode=='node');checkSlots(3)
assert(Run.obtainRelic(h.run,'Potion Belt'));h.run.potions={[2]='fire_potion',[5]='block_potion'}
local flow=h.run.nodeFlow;inventory=h.run.potions;local gold,hp=h.run.gold,h.run.hp
h:refresh();checkSlots(5)
assert(hit.click() and h.potionUI.visible,'node keeps the same inventory management click')
assert(h:closePotions());checkSlots(5)
assert(h.run.nodeFlow==flow and h.run.potions==inventory and h.run.gold==gold and h.run.hp==hp,'header/manager navigation mutated the room')
print('V25_NODE_POTION_HEADER_PASS Neow/map/node 3/5 sparse inventory and original manager')`;
  const require=createRequire(import.meta.url);
  const result=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),'-e',source],{encoding:'utf8',maxBuffer:4*1024*1024,
    env:{...process.env,LUA_PATH:dir+'/?.lua;src/lua/?.lua',LUA_INIT:'',LUA_INIT_5_3:''}});
  assert.equal(result.status,0,result.stdout+result.stderr+String(result.error??''));assert.match(result.stdout,/V25_NODE_POTION_HEADER_PASS/);
});

// Main keeps compatibility paths, but they cannot show the rejected solid empty shell.
test('shared slot helper retains hidden Main compatibility paths without mutating inputs',()=>{
  const border={name:'border',kind:'image',position:[0,0],size:[34.667,34.667],image:theme.image.rect,colour:theme.color.gold};
  const plate={name:'plate',kind:'image',position:[0,0],size:[30.667,30.667],image:theme.image.rect,colour:theme.color.panelRaised};
  const children=potionSlotVisual(theme,{border,plate,bottleSize:16,ink:theme.color.goldBright});
  assert.deepEqual(children.slice(0,2),[{...border,image:theme.image.disc,visible:false},{...plate,image:theme.image.disc,visible:false}]);
  assert.deepEqual(children.map(c=>c.name),['border','plate','selectedShell','emptyShell','filledShell','fireShell','bottle']);
  assert.equal(border.image,theme.image.rect);assert.equal(plate.image,theme.image.rect);
});
