import test from'node:test';import assert from'node:assert/strict';import{mkdtempSync,writeFileSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';import{cards}from'./mechanics.mjs';import{fullStarterProbe,compileRuntimeProbe}from'./runtime-bridge.mjs';import{firstCardProbe}from'./runtime-first-card.mjs';import{toLua,buildLuaData}from'../../../scripts/build-lua-data.mjs';import{runLua}from'../../../scripts/test-lua.mjs';
test('first card export rejects altered trigger and extras',()=>{for(const f of[c=>c.exhaust=true,c=>c.effects.onExhaust=[],c=>c.effects.base[1].firstOnly=false,c=>delete c.effects.base[0],c=>c.effects.base[Symbol()]=1]){const d=structuredClone(cards);f(d.KQ047);assert.throws(()=>firstCardProbe({definitions:d}),/unsupported/);}});
test('real turn play history gates draw and resets through actual endTurn',()=>{
 buildLuaData();const p=fullStarterProbe(),defs=[p.definition,compileRuntimeProbe('KQ002'),firstCardProbe()];const dir=mkdtempSync(join(tmpdir(),'kq-first-')),file=join(dir,'test.lua');writeFileSync(file,`
package.path='experiments/characters/keqing/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local R=require('runtime-resource-probe');local A=require('runtime-first-card');local C=require('abyss_combat');local D=require('abyss_data');local H=dofile('tests/helpers/act2_event_relics.lua');local eq,same=H.eq,H.same
local defs=${toLua(defs)};local contract=${toLua(p.contract)}
local function find(s,id)for _,c in ipairs(s.hand)do if c.cardId==id then return c.uid end end end
local function fresh(up)
 for seed=1,30 do local deck={'KQ002','KQ002'};for i=1,8 do deck[#deck+1]={cardId='KQ047',upgraded=up}end
 local s=R.new(D,defs,contract,{deck=deck,enemies={'jaw_worm'},seed=seed});if find(s,'KQ002')and find(s,'KQ047')then s.player.hp=999;s.player.maxHp=999;s.enemies[1].hp=999;s.enemies[1].maxHp=999;return s end end;error('missing witness')
end
for _,up in ipairs({false,true})do for _,prior in ipairs({false,true})do for _,locked in ipairs({false,true})do
 local s=fresh(up);if prior then s=assert(R.play(s,find(s,'KQ002'),1))end
 if locked then C.applyEffects(s,{{op='noDrawThisTurn'}},s.player,s.player)end
 local count=#s.hand;local energy=s.energy;local history=#(s.cardsPlayedThisTurn or{});local before=C.copy(s);local uid=find(s,'KQ047')
 local a=assert(A.play(s,uid,1));eq(#a.hand,count-1+((not prior and not locked)and 1 or 0));eq(a.energy,energy-1);eq(#a.cardsPlayedThisTurn,history+1);eq(a.enemies[1].hp,999-(up and 8 or 5));same(s,before)
 local no,why=A.play(s,uid,99);eq(no,nil);eq(why,'invalid_target');same(s,before)
 s.energy=0;before=C.copy(s);no,why=A.play(s,uid,1);eq(no,nil);eq(why,'insufficient_energy');same(s,before)
 local next=R.endTurn(a);eq(#next.cardsPlayedThisTurn,0);local nextUid=assert(find(next,'KQ047'));local size=#next.hand;local out=assert(A.play(next,nextUid,1));eq(#out.hand,size);eq(#out.cardsPlayedThisTurn,1)
end end end
local s=fresh(false);s.cardsPlayedThisTurn={[2]={type='skill'}};eq(pcall(A.play,s,find(s,'KQ047'),1),false);eq(s.energy,3)
print('FIRST_CARD_PASS 8 real opening/locked/prior and next-turn paths')
`);try{const r=runLua(file,{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/FIRST_CARD_PASS/);}finally{rmSync(dir,{recursive:true,force:true});}
});
