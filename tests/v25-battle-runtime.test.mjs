import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readdirSync,rmSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {buildUI} from '../scripts/build-ui.mjs';
import {buildLuaData,luaString,toLua} from '../scripts/build-lua-data.mjs';

const require=createRequire(import.meta.url);

test('isolated V25 build runs energy transitions, layered button refresh and pile/reward input in the real Lua Host',t=>{
 const temporaryRoot=resolve('.artifacts/test-tmp');mkdirSync(temporaryRoot,{recursive:true});
 const directory=mkdtempSync(join(temporaryRoot,'v25-runtime-'));
 t.after(()=>rmSync(directory,{recursive:true,force:true}));
 buildLuaData('data',join(directory,'abyss_data.lua'));
 buildUI(directory,undefined,{v25BattleChrome:true});
 const generated=readdirSync(directory).filter(name=>name.endsWith('.lua')).map(name=>name.slice(0,-4));
 assert(generated.includes('abyss_ui_layout')&&generated.includes('abyss_data'));
 const layout=JSON.parse(readFileSync(join(directory,'game-ui.json'),'utf8'));
 const stage=layout.controls.find(c=>c.name==='stage'),battle=stage.children.find(c=>c.name==='battlePanel');
 assert(battle.children.find(c=>c.name==='energyIcon').children.some(c=>c.name==='v25Chrome'));
 const script=`
local generated=${luaString(directory.replaceAll('\\','/'))}
package.path=generated..'/?.lua;src/lua/?.lua'
-- Support fixtures prepend their legacy search paths. preload every module
-- from this build so none can silently resolve to shared build/lua instead.
for _,name in ipairs(${toLua(generated)})do
 package.preload[name]=assert(loadfile(generated..'/'..name..'.lua'))
end
local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
local h,u,p,event,tap,drain,deck,root=H.setup({'defend','defend','defend','defend','defend','defend'},{'cultist'})
local icon=p:GetChild('energyIcon')
assert(icon:GetChild('v25Chrome'),'isolated V25 layout did not reach Host')
local function energy(expected)
 h:refresh()
 assert(h.run.combat.energy==expected,'unexpected rule energy')
 assert(p:GetChild('energy').text==tostring(expected)..'/3','live energy text stale')
 assert(icon:GetChild('valueShadow').text==p:GetChild('energy').text,'shadow text stale')
 assert(icon:GetChild('light').visible==(expected>0),'charged light stale')
 local expectedColor=expected>0 and H.F.Theme.layout.energy.faceColour or H.F.Theme.color.energyEmpty
 local actual=icon:GetChild('face').imageColor
 assert(actual.r==expectedColor.r and actual.g==expectedColor.g and actual.b==expectedColor.b,'energy face tint stale')
end
energy(3)
for index=1,3 do
 tap('card1',10+index);tap('playArea',10+index);drain();energy(3-index)
end
tap('endTurn',20);drain();energy(3)
assert(h.run.combat.turn==2,'real enemy turn did not complete')
print('V25_RUNTIME_ENERGY_PASS')

local button,chrome=p:GetChild('endTurn'),{}
for _,state in ipairs({'normal','hover','pressed','disabled'})do
 chrome[state]=assert(button:GetChild(state):GetChild('v25Chrome'))
end
-- Exercise production's caption-capable button writer on the actual Host's
-- controls; endTurn normal refresh itself supplies no replacement caption.
local details=require('abyss_battle_details').install({}, {}, {}, {
 child=function(name)return assert(p:GetChild(name))end,
 tint=function(control,value)control.imageColor=value end,
 ink=function(control,value)control.fontColor=value end,
})
for _,enabled in ipairs({true,false,true})do
 details.button('endTurn',enabled,false,enabled and '结束回合' or '等待行动')
 for _,state in ipairs({'normal','hover','pressed','disabled'})do
  local part=button:GetChild(state)
  assert(part:GetChild('v25Chrome')==chrome[state],'state chrome replaced')
  assert(part:GetChild('label').text==(enabled and '结束回合' or '等待行动'),'caption writer lost state label')
  for _,name in ipairs({'plate','plateLeft','plateRight'})do assert(not part:GetChild(name).visible,'compatibility plate reactivated')end
 end
end
h:refresh()
assert(button.interactable)
for _,state in ipairs({'normal','hover','pressed','disabled'})do
 for _,name in ipairs({'plate','plateLeft','plateRight'})do assert(not button:GetChild(state):GetChild(name).visible)end
end
print('V25_RUNTIME_BUTTON_PASS')

for _,kind in ipairs({'draw','discard'})do
 local hit=p:GetChild(kind..'Icon'):GetChild('hit')
 local turn,available=h.run.combat.turn,h.run.combat.energy
 assert(hit.visible and hit.raycastTarget and hit.click({touchId=30}))
 h:update(0)
 assert(h.deckUI.visible and h.deckUI.pileKind==kind and not u.active)
 assert(root:GetChild('deckPanel'):GetChild('grid').itemCount==#h.run.combat[kind])
 u:endTurn();assert(h.run.combat.turn==turn and h.run.combat.energy==available,'modal allowed rule command')
 assert(root:GetChild('deckPanel'):GetChild('close'):GetChild('hit').click({touchId=30}))
 assert(not h.deckUI.visible and u.active and hit.visible and hit.raycastTarget)
end
tap('card1',31);tap('playArea',31);drain();energy(2)

local win,view,panel,ev,play,finish,deckToggle,winRoot=H.setup({'bludgeon'},{'acid_slime_s'})
play('card1',40);play('enemy1',40);finish()
assert(win.run.phase=='reward','real card did not reach reward')
assert(not panel:GetChild('energyIcon').visible and not panel:GetChild('endTurn').visible)
for _,kind in ipairs({'draw','discard'})do
 local hit=panel:GetChild(kind..'Icon'):GetChild('hit')
 assert(not hit.visible and not hit.click({touchId=41}) and not win.deckUI.visible,'reward retained pile input')
end
assert(panel:GetChild('rewardList').visible and panel:GetChild('cardReward').interactable)
panel:GetChild('cardReward').click()
assert(panel:GetChild('rewardStage').visible and not panel:GetChild('rewardList').visible,'reward card entry lost')
deckToggle()
assert(view.active and panel:GetChild('rewardStage').visible,'deck return lost reward input')
print('V25_RUNTIME_PILES_REWARD_PASS')
`;
 const result=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),'-e',script],{
  cwd:process.cwd(),encoding:'utf8',maxBuffer:2*1024*1024,timeout:30000,
  env:{...process.env,LUA_PATH:`${directory.replaceAll('\\','/')}/?.lua;./src/lua/?.lua`,LUA_PATH_5_3:`${directory.replaceAll('\\','/')}/?.lua;./src/lua/?.lua`,LUA_INIT:'',LUA_INIT_5_3:''},
 });
 assert.equal(result.status,0,result.stdout+result.stderr+String(result.error??''));
 for(const marker of ['ENERGY','BUTTON','PILES_REWARD'])assert.match(result.stdout,new RegExp(`V25_RUNTIME_${marker}_PASS`));
});
