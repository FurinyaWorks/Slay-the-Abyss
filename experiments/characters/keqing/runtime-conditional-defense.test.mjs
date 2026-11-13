import test from'node:test';import assert from'node:assert/strict';import{mkdtempSync,writeFileSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';import{cards}from'./mechanics.mjs';import{fullStarterProbe}from'./runtime-bridge.mjs';import{conditionalCardProbe}from'./runtime-conditional.mjs';import{toLua,buildLuaData}from'../../../scripts/build-lua-data.mjs';import{runLua}from'../../../scripts/test-lua.mjs';
test('conditional defenses reject malformed or unsupported fields',()=>{for(const id of ['KQ020','KQ035','KQ036','KQ067'])for(const change of [c=>c.exhaust=true,c=>c.effects.onExhaust=[],c=>c.effects.base[1].amount=NaN,c=>c.effects.base[1].op='unknown',c=>delete c.effects.base[0]]){const d=structuredClone(cards);change(d[id]);assert.throws(()=>conditionalCardProbe(id,{definitions:d}),/unsupported/);}});
test('actual Lua conditional defense counts live enemies and pre-card last infusion',()=>{
 buildLuaData();const p=fullStarterProbe(),defs=[p.definition,...['KQ020','KQ035','KQ036','KQ067'].map(id=>conditionalCardProbe(id))];const dir=mkdtempSync(join(tmpdir(),'kq-cdef-')),file=join(dir,'test.lua');writeFileSync(file,`
package.path='experiments/characters/keqing/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local R=require('runtime-resource-probe');local A=require('runtime-conditional');local D=require('abyss_data')
local defs=${toLua(defs)};local contract=${toLua(p.contract)}
local function eq(a,b)assert(a==b,tostring(a)..' ~= '..tostring(b))end
local function uid(s,id)for _,c in ipairs(s.hand)do if c.cardId==id then return c.uid end end end
local cases={{alive=1,inf=0,wedge=false},{alive=2,inf=1,wedge=false},{alive=4,inf=2,wedge=true},{alive=1,inf=0,wedge=true}}
for _,id in ipairs({'KQ020','KQ035','KQ036','KQ067'})do for _,up in ipairs({false,true})do for _,case in ipairs(cases)do
 local enemies={'jaw_worm'};for i=1,case.alive do enemies[#enemies+1]='jaw_worm'end
 local s=R.new(D,defs,contract,{deck={{cardId=id,upgraded=up}},enemies=enemies,seed=1})
 for _,e in ipairs(s.enemies)do e.hp=100;e.maxHp=100 end;s.enemies[1].hp=0
 s.keqingResourceProbe.infusion=case.inf;if case.wedge then s.keqingResourceProbe.wedgeUntil=2 end
 local u=uid(s,id);local a=assert(A.play(s,u,2));local block
 if id=='KQ020'then block=case.inf==1 and 4 or 0;eq(a.enemies[2].hp,100-(up and 10 or 7)-(case.inf>0 and 2 or 0));eq(a.keqingResourceProbe.infusion,math.max(0,case.inf-1))
 elseif id=='KQ035'then block=(up and 7 or 4)+math.min(case.alive,3)
 elseif id=='KQ036'then block=(up and 8 or 5)+(case.inf==0 and not case.wedge and 3 or 0)
 else block=(up and 7 or 4)+(case.alive==1 and 3 or 0)end
 eq(a.player.block,block);eq(a.energy,2);eq(s.energy,3);eq(s.player.block,0)
 if id~='KQ020'then eq(a.keqingResourceProbe.infusion,case.inf);eq(a.enemies[2].hp,100)end
 eq(a.keqingResourceProbe.wedgeUntil,case.wedge and 2 or nil)
 assert(a.catalog.cards[id].keqingConditional);eq(#a.catalog.cards[id].effects,0)
 s.energy=0;local no,why=A.play(s,u,2);eq(no,nil);eq(why,'insufficient_energy');eq(s.keqingResourceProbe.infusion,case.inf)
end end end
print('CONDITIONAL_DEFENSE_PASS')
`);try{const r=runLua(file,{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/CONDITIONAL_DEFENSE_PASS/);}finally{rmSync(dir,{recursive:true,force:true});}
});
