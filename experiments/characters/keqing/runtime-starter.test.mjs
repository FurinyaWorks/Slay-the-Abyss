import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {cards} from './mechanics.mjs';import {fullStarterProbe,compileRuntimeProbe} from './runtime-bridge.mjs';
import {toLua,buildLuaData} from '../../../scripts/build-lua-data.mjs';import {runLua} from '../../../scripts/test-lua.mjs';
test('finisher exporter refuses unknown or malformed semantics',()=>{
 for(const mutate of [c=>c.exhaust=true,c=>c.effects.onExhaust=[],c=>c.effects.base[0].hits=3,c=>c.effects.base[1].damage=NaN,c=>c.effects.base[1].damage=1000,c=>c.effects.base[0].target='all',c=>c.effects.base[Symbol()]=1,c=>delete c.effects.base[0]]){const d=structuredClone(cards);mutate(d.KQ004);assert.throws(()=>fullStarterProbe({definitions:d}),/unsupported/);}
});
test('actual Combat full ten-card starter acquisition and conditional finisher',()=>{
 buildLuaData();const p=fullStarterProbe(),defs=[p.definition,p.finisher,...['KQ001','KQ002'].map(id=>compileRuntimeProbe(id))];const dir=mkdtempSync(join(tmpdir(),'kq-starter-')),file=join(dir,'test.lua');
 writeFileSync(file,`
package.path='experiments/characters/keqing/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local R=require('runtime-resource-probe');local C=require('abyss_combat');local D=require('abyss_data')
local defs=${toLua(defs)};local contract=${toLua(p.contract)}
local function eq(a,b)assert(a==b,tostring(a)..' ~= '..tostring(b))end
local function uid(s,id)for _,c in ipairs(s.hand)do if c.cardId==id then return c.uid end end end
for _,up in ipairs({false,true})do for _,wedge in ipairs({false,true})do
 local s=R.new(D,defs,contract,{deck={{cardId='KQ004',upgraded=up}},enemies={'jaw_worm','jaw_worm'},seed=42})
 for _,e in ipairs(s.enemies)do e.hp=100;e.maxHp=100 end
 if wedge then s.keqingResourceProbe.wedgeUntil=2 end
 s.keqingResourceProbe.infusion=2
 local old=C.copy(s);local a=assert(R.play(s,uid(s,'KQ004'),1))
 local hit=up and 7 or 6;local burst=wedge and (up and 8 or 6)or 0
 eq(a.enemies[1].hp,100-2*hit-burst);eq(a.enemies[2].hp,100-burst)
 eq(a.keqingResourceProbe.infusion,1);eq(a.keqingResourceProbe.wedgeUntil,nil)
 eq(s.enemies[1].hp,old.enemies[1].hp);eq(s.energy,3)
 local no,reason=R.play(s,uid(s,'KQ004'),99);eq(no,nil);eq(reason,'invalid_target');eq(s.keqingResourceProbe.infusion,2)
 s.energy=0;no,reason=R.play(s,uid(s,'KQ004'),1);eq(no,nil);eq(reason,'insufficient_energy')
end end
-- No cards injected or draw order changed: run the actual initial 10-card deck.
local counts={KQ001=0,KQ002=0,KQ003=0,KQ004=0};local reachedRelease=false;local reachedBurst=false
for seed=1,12 do
 local s=R.new(D,defs,contract,{deck={'KQ001','KQ001','KQ001','KQ002','KQ002','KQ002','KQ002','KQ003','KQ003','KQ004'},enemies={'jaw_worm'},seed=seed})
 s.enemies[1].hp=999;s.enemies[1].maxHp=999;s.player.hp=999;s.player.maxHp=999
 for turn=1,4 do
  -- Alternating fixed visible priority creates both resource spending branches.
  local order=seed%2==0 and {'KQ003','KQ003','KQ004','KQ002','KQ001'}or {'KQ003','KQ004','KQ002','KQ001'}
  for _,id in ipairs(order)do
   local u=uid(s,id)
   if u and s.energy>=1 then
    if id=='KQ003' and s.keqingResourceProbe.wedgeUntil then reachedRelease=true end
    if id=='KQ004' and s.keqingResourceProbe.wedgeUntil then reachedBurst=true end
    s=assert(R.play(s,u,1));counts[id]=counts[id]+1
   end
  end
  eq(#s.hand+#s.draw+#s.discard+#s.exhaust,10)
  s=assert(R.endTurn(s));eq(#s.hand+#s.draw+#s.discard+#s.exhaust,10)
 end
end
for _,n in pairs(counts)do assert(n>0)end
assert(reachedRelease and reachedBurst)
print('FULL_STARTER_PROBE_PASS')
`);
 try{const r=runLua(file,{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/FULL_STARTER_PROBE_PASS/);}finally{rmSync(dir,{recursive:true,force:true});}
});
