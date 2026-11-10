import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {buildUI} from '../scripts/build-ui.mjs';
import {buildLuaData,luaString,toLua} from '../scripts/build-lua-data.mjs';
import {applyV25MapLayout} from '../scripts/v25-map-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';

const require=createRequire(import.meta.url);
function runHost(t,v25,body){
 const parent=resolve('.artifacts/test-tmp');mkdirSync(parent,{recursive:true});
 const directory=mkdtempSync(join(parent,'v25-map-return-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 buildLuaData('data',join(directory,'abyss_data.lua'));buildUI(directory,undefined,{v25BattleChrome:v25});
 const layout=JSON.parse(readFileSync(join(directory,'game-ui.json'),'utf8'));
 if(v25){
  const panel=layout.controls.find(c=>c.name==='stage').children.find(c=>c.name==='mapPanel');
  if(!panel.children.some(c=>c.name==='v25MapPaper'))applyV25MapLayout(layout,nativeTheme);
  writeFileSync(join(directory,'abyss_ui_layout.lua'),'return '+toLua(layout.controls));
 }
 const modules=readdirSync(directory).filter(n=>n.endsWith('.lua')).map(n=>n.slice(0,-4));
 const source=`package.path=${luaString(directory.replaceAll('\\','/')+'/?.lua;src/lua/?.lua')}
for _,name in ipairs(${toLua(modules)})do package.preload[name]=assert(loadfile(${luaString(directory.replaceAll('\\','/'))}..'/'..name..'.lua'))end
local F=dofile('tests/lua/support/game_ui_fixture.lua')
local Run=require('abyss_run')
local cursors={CursorDown='down',CursorUp='up',CursorExit='exit',CursorEndDrag='endDrag'}
local function setup()
 local h,r=F.fixture(nil,nil,nil,cursors);assert(F.start(h))
 assert(h.mode=='map' and h.run.phase=='map','fixture must enter the real initial map')
 local back=r:GetChild('mapPanel'):GetChild('previewBack');return h,r,back,back:GetChild('hit')
end
local function emit(hit,event,id)return assert(hit.listeners[event],event)({touchId=id,GetUIPos=function()return 88,595 end})end
local function tap(hit,id)emit(hit,'down',id);emit(hit,'up',id);return emit(hit,'click',id)end
local function drain(h)
 for _=1,400 do if not h.battleUI.busy and not h.motion.deathReveal then return end;h:update(.05)end
 assert(false,'real feedback failed to finish')
end
${body}
`;
 const run=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),'-e',source],{encoding:'utf8',maxBuffer:2*1024*1024,
  env:{...process.env,LUA_PATH:directory.replaceAll('\\','/')+'/?.lua;./src/lua/?.lua',LUA_PATH_5_3:directory.replaceAll('\\','/')+'/?.lua;./src/lua/?.lua',LUA_INIT:'',LUA_INIT_5_3:''}});
 assert.equal(run.status,0,run.stdout+run.stderr+String(run.error??''));assert.match(run.stdout,/MAP_RETURN_PASS/);
}

test('V25 normal map opens the existing Run menu, blocks overlays and rejects stale map-return pointers',t=>runHost(t,true,`
local h,r,back,hit=setup();local run,map=h.run,h.map
local generation,hp,gold=run.roomGeneration,run.hp,run.gold
assert(back.visible and hit.raycastTarget,'V25 normal map return flag is missing')
assert(tap(hit,1));assert(h.exitOpen and h.menuOpen and r:GetChild('runMenu').visible)
assert(not r:GetChild('exitPanel').visible,'map return opened abandon confirmation')
assert(h.run==run and h.map==map and run.roomGeneration==generation and run.hp==hp and run.gold==gold)
assert(not tap(hit,2),'hidden map return passed through Run menu')
assert(h:closeExit() and back.visible)
-- Every guard executes through the real installed pointer callbacks. Choice,
-- character and settlement flags below are targeted adversarial boundary states.
for _,flag in ipairs({'settlementRequested','settlementBusy','disabled','characterOpen','easterEggOpen','controlsOpen'})do
 h[flag]=true;assert(not tap(hit,3),flag..' allowed map return');h[flag]=false
end
h.choiceUI.visible=true;assert(not tap(hit,4));h.choiceUI.visible=false
h.battleUI.busy=true;assert(not tap(hit,5));h.battleUI.busy=false
emit(hit,'down',6);assert(h:openDeck());assert(not tap(hit,7));assert(h:closeDeck())
emit(hit,'up',6);assert(not emit(hit,'click',6),'deck round trip revived a held return')
assert(h:openPotions());assert(not tap(hit,8));assert(h:closePotions())
assert(tap(hit,9) and h:closeExit(),'fresh pointer failed after overlays')
-- Old map gesture survives neither real room entry nor a legal reward return.
emit(hit,'down',10)
assert(h.mapUI:choose(F.Nodes.available(h.run,h.map)[1].id))
assert(h.mode=='battle' and run.roomGeneration>generation)
h.run.combat=F.Combat.new(F.Data,{deck={'bludgeon'},enemies={'acid_slime_s'}});h:refresh()
h.battleUI:playSlot(1);h.battleUI:playSelected(1);drain(h)
assert(h.run.phase=='reward')
local p=r:GetChild('battlePanel')
if not h.run.rewards.goldClaimed then p:GetChild('goldReward').click()end
p:GetChild('cardReward').click();p:GetChild('skip').click()
if h.run.phase=='reward'then p:GetChild('continue').click()end
assert(h.mode=='map' and h.run.phase=='map','real reward commands did not return to map')
emit(hit,'up',10);assert(not emit(hit,'click',10),'late release opened Run menu after another room')
assert(not h.exitOpen and tap(hit,11));assert(h.run==run and h:closeExit())
-- Route preview keeps its previous non-destructive close operation.
assert(Run.startCombat(h.run,'cultist_solo'));h:refresh();assert(h:openMenu())
assert(tap(r:GetChild('runMenu'):GetChild('map'):GetChild('hit'),12));assert(h.routeOpen)
assert(tap(hit,13));assert(not h.routeOpen and not h.exitOpen and not h.menuOpen and h.mode=='battle')
print('MAP_RETURN_PASS V25 normal, guards, late room pointer, preview')
`));

test('Legacy normal map keeps its old hidden return while route preview still closes',t=>runHost(t,false,`
local h,r,back,hit=setup()
assert(not back.visible and not tap(hit,20) and not h.exitOpen,'Legacy gained a new normal-map action')
local run=h.run
assert(Run.startCombat(h.run,'cultist_solo'));h:refresh();assert(h:openMenu())
assert(tap(r:GetChild('runMenu'):GetChild('map'):GetChild('hit'),21));assert(h.routeOpen and back.visible)
assert(tap(hit,22));assert(h.run==run and not h.exitOpen and not h.routeOpen and h.mode=='battle')
print('MAP_RETURN_PASS Legacy preview only')
`));
