import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {statusRules} from './mechanics.mjs';import {starterRelic,starterIds} from './battle.mjs';import {fullStarterProbe,compileRuntimeProbe} from './runtime-bridge.mjs';import {toLua,buildLuaData} from '../../../scripts/build-lua-data.mjs';import {runLua} from '../../../scripts/test-lua.mjs';
test('real Lua starter + relic harness, both faces, four turns and fixed block',()=>{
 buildLuaData();const p=fullStarterProbe(),defs=[p.definition,p.finisher,...['KQ001','KQ002'].map(id=>compileRuntimeProbe(id))];const dir=mkdtempSync(join(tmpdir(),'kq-relic-')),file=join(dir,'test.lua');writeFileSync(file,`
package.path='experiments/characters/keqing/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local R=require('runtime-resource-probe');local L=require('resource-lifecycle');local C=require('abyss_combat');local D=require('abyss_data')
local defs=${toLua(defs)};local contract=${toLua(p.contract)};local ids=${toLua(starterIds)}
local constants={bonusPerHit=${statusRules.infusion.bonusPerHit},relicBlock=${starterRelic.effect.amount}}
local function eq(a,b)assert(a==b,tostring(a)..' ~= '..tostring(b))end
local function uid(s,id)for _,c in ipairs(s.hand)do if c.cardId==id then return c.uid end end end
-- Harness only: external reducer events are explicitly dispatched after paid play.
local function play(s,r,u,id,target)
 local event='none'
 if id=='KQ003'then event=r.wedgeUntil and 'recast'or'setup'
 elseif id=='KQ004'and r.wedgeUntil then event='detonate'end
 local n,why=R.play(s,u,target);if not n then return nil,r,why end
 local next,fx=L.resolved(r,s.turn,id~='KQ002',event)
 eq(n.keqingResourceProbe.infusion,next.infusion);eq(n.keqingResourceProbe.wedgeUntil,next.wedgeUntil)
 for _,e in ipairs(fx)do C.block(n,n.player,e.value,e.fixed)end
 return n,next,nil,#fx
end
for _,up in ipairs({false,true})do for _,enabled in ipairs({false,true})do
 local counts={KQ001=0,KQ002=0,KQ003=0,KQ004=0}
 for seed=1,3 do
  local deck={};for _,id in ipairs(ids)do deck[#deck+1]={cardId=id,upgraded=up}end
  local s=R.new(D,defs,contract,{deck=deck,enemies={'jaw_worm'},seed=seed})
  s.player.hp=999;s.player.maxHp=999;s.enemies[1].hp=999;s.enemies[1].maxHp=999
  local r=L.new(enabled,constants);local relicTriggers=0
  for turn=1,4 do
   for _,id in ipairs({'KQ003','KQ004','KQ002','KQ001','KQ003'})do
    local u=uid(s,id)
    if u and s.energy>=1 then
     local oldEnergy=s.energy;local n,nr,why,triggers=play(s,r,u,id,1)
     assert(n,why);eq(s.energy,oldEnergy);eq(n.energy,oldEnergy-1)
     s,r=n,nr;relicTriggers=relicTriggers+triggers;counts[id]=counts[id]+1
    end
   end
   r=L.ownerEnd(r,s.turn);s=assert(R.endTurn(s))
   eq(s.keqingResourceProbe.infusion,r.infusion);eq(s.keqingResourceProbe.wedgeUntil,r.wedgeUntil)
   eq(#s.hand+#s.draw+#s.discard+#s.exhaust,10)
  end
  eq(relicTriggers,enabled and 1 or 0)
 end
 for _,n in pairs(counts)do assert(n>0)end
 -- The relic's +4 is fixed, not amplified by Dexterity or reduced by Frail.
 local s=R.new(D,defs,contract,{deck={{cardId='KQ003',upgraded=up}},enemies={'jaw_worm'},seed=4})
 s.player.statuses.dexterity=10;s.player.statuses.frail=1
 local r=L.new(enabled,constants);local no,unchanged,why=play(s,r,uid(s,'KQ003'),'KQ003',99)
 eq(no,nil);eq(unchanged,r);eq(why,'invalid_target');eq(r.relicUsed,false)
 local a,b=play(s,r,uid(s,'KQ003'),'KQ003',1);eq(a.player.block,enabled and 4 or 0);eq(s.player.block,0)
end end
print('STARTER_RELIC_HARNESS_PASS')
`);try{const r=runLua(file,{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/STARTER_RELIC_HARNESS_PASS/);}finally{rmSync(dir,{recursive:true,force:true});}
});
