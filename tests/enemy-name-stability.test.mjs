import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readdirSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {buildUI} from '../scripts/build-ui.mjs';
import {buildLuaData,luaString,toLua} from '../scripts/build-lua-data.mjs';
const require=createRequire(import.meta.url);

test('enemy name fade preserves its domain across long frames, target changes and native render reentry',t=>{
 const base=resolve('.artifacts/test-tmp');mkdirSync(base,{recursive:true});
 const directory=mkdtempSync(join(base,'enemy-name-stability-'));
 t.after(()=>rmSync(directory,{recursive:true,force:true}));
 buildUI(directory,undefined,{v25BattleChrome:true});
 buildLuaData('data',join(directory,'abyss_data.lua'));
 const modules=readdirSync(directory).filter(n=>n.endsWith('.lua')).map(n=>n.slice(0,-4));
 const source=`
local generated=${luaString(directory.replaceAll('\\','/'))}
package.path=generated..'/?.lua;src/lua/?.lua'
for _,name in ipairs(${toLua(modules)})do package.preload[name]=assert(loadfile(generated..'/'..name..'.lua'))end
local View=require('abyss_battle_enemy_view')
local function finite(value)return value==value and value>-math.huge and value<math.huge end
local function close(a,b)assert(math.abs(a-b)<1e-10,tostring(a)..' != '..tostring(b))end
for _,dt in ipairs({0,1/60,.5,1,4,225,1e308})do
 local timer,alpha,y=View.nameStep(1,1,dt,false,false,1)
 assert(timer>=0 and timer<=1 and alpha>=0 and alpha<=1,'fade left its legal state domain at dt='..dt)
 assert(finite(y)and y>=-8.00000001 and y<=.00000001,'name geometry escaped its source range')
end
local timer,alpha=1,1
for _=1,60 do timer,alpha=View.nameStep(timer,alpha,1/60,false,false,1)end
local largeTimer,largeAlpha=View.nameStep(1,1,1,false,false,1)
close(timer,largeTimer);close(alpha,largeAlpha)
assert(math.abs(alpha-(1-3/60)^60)<.004,'ordinary 60FPS response changed materially')
close(alpha,math.exp(-3))
for _,dt in ipairs({.5,1,4})do
 timer,alpha=1,1
 for _=1,20 do
  local old=alpha;timer,alpha=View.nameStep(timer,alpha,dt,false,false,1)
  assert(alpha<=old and alpha>=0,'long-frame fade oscillated')
 end
 assert(timer==0 and alpha==0,'fade never completed')
end
local blockedTimer,blockedAlpha,blockedY=View.nameStep(1,.6,225,false,true,1)
assert(blockedTimer==0 and blockedAlpha==.6 and blockedY==nil,'blocked names advanced or drew')
local shownTimer,shownAlpha,shownY=View.nameStep(0,0,225,true,false,1)
assert(shownTimer==1 and shownAlpha==1);close(shownY,-8)
local _,dimAlpha=View.nameStep(1,1,0,false,false,.5);close(dimAlpha,.5)
print('ENEMY_NAME_DOMAIN_PASS')

local H=dofile('tests/lua/support/battle_gesture_fixture.lua')
local mx,my=-10000,-10000
local h,u,p,event,tap,drain,deck,root=H.setup(nil,{'cultist','cultist'},{position=function()return mx,my end})
local battle=h.run.combat;local hp,turn,energy=battle.player.hp,battle.turn,battle.energy
local controls={};local writes=0;local reentered=false
for index=1,2 do
 local name=H.F.actorControl(p,'enemy'..index):GetChild('name');controls[index]=name
 local original=name.SetAnchoredPosition
 name.SetAnchoredPosition=function(self,x,y)
  assert(finite(x)and finite(y),'native SetAnchoredPosition received a nonfinite coordinate')
  writes=writes+1
  if not reentered then reentered=true;u:render()end
  return original(self,x,y)
 end
end
local function hover(index)
 local g=View.geometry(battle.enemies[index]);mx,my=640+g.hitX,360+g.hitY
 h:update(1/60);assert(controls[index].visible,'target hover did not reveal its name')
 assert(controls[index].fontColor.a==255,'target hover did not reveal full opacity')
end
for _,dt in ipairs({.5,1,4,225})do
 hover(1);hover(2);mx,my=-10000,-10000
 for _=1,8 do h:update(dt)end
 for _,name in ipairs(controls)do
  assert(not name.visible,'expired name stayed visible')
  assert(name.fontColor.a==0,'expired name alpha was not zero')
 end
end
assert(reentered and writes>0,'real native setter and render reentry were not exercised')
assert(battle==h.run.combat and hp==battle.player.hp and turn==battle.turn and energy==battle.energy,'presentation changed combat rules')
print('ENEMY_NAME_REAL_HOST_PASS')
`;
 const result=spawnSync(process.execPath,[require.resolve('fengari-node-cli/src/lua-cli.js'),'-e',source],{
  cwd:process.cwd(),encoding:'utf8',maxBuffer:2*1024*1024,timeout:30000,
  env:{...process.env,LUA_INIT:'',LUA_INIT_5_3:''},
 });
 assert.equal(result.status,0,result.stdout+result.stderr+String(result.error??''));
 assert.match(result.stdout,/ENEMY_NAME_DOMAIN_PASS/);
 assert.match(result.stdout,/ENEMY_NAME_REAL_HOST_PASS/);
});
