import test from'node:test';import assert from'node:assert/strict';import{mkdtempSync,writeFileSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';import{cards}from'./mechanics.mjs';import{starterIds}from'./battle.mjs';import{fullStarterProbe,compileRuntimeProbe}from'./runtime-bridge.mjs';import{wedgeDrawProbe}from'./runtime-wedge-draw.mjs';import{toLua,buildLuaData}from'../../../scripts/build-lua-data.mjs';import{runLua}from'../../../scripts/test-lua.mjs';
test('wedge draw exporter rejects altered effect semantics',()=>{for(const change of [c=>c.exhaust=false,c=>c.effects.base[0].wedgeAmount=4,c=>c.effects.base[0].amount=NaN,c=>c.effects.onExhaust=[],c=>delete c.effects.base[0],c=>c.effects.base[Symbol()]=1]){const d=structuredClone(cards);change(d.KQ031);assert.throws(()=>wedgeDrawProbe({definitions:d}),/unsupported/);}});
test('actual Lua paid wedge draw consumes before draw lock and exhausts once',()=>{
 buildLuaData();const p=fullStarterProbe(),defs=[p.definition,p.finisher,compileRuntimeProbe('KQ001'),compileRuntimeProbe('KQ002'),wedgeDrawProbe()];const dir=mkdtempSync(join(tmpdir(),'kq-wdraw-')),file=join(dir,'test.lua');writeFileSync(file,`
package.path='experiments/characters/keqing/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local R=require('runtime-resource-probe');local A=require('runtime-wedge-draw');local C=require('abyss_combat');local D=require('abyss_data')
local defs=${toLua(defs)};local contract=${toLua(p.contract)};local ids=${toLua(starterIds)}
local function eq(a,b)assert(a==b,tostring(a)..' ~= '..tostring(b))end
local function uid(s)for _,c in ipairs(s.hand)do if c.cardId=='KQ031'then return c.uid end end end
local function create(up)
 local deck={};for _,id in ipairs(ids)do deck[#deck+1]=id end;deck[#deck+1]={cardId='KQ031',upgraded=up}
 for seed=1,32 do local s=R.new(D,defs,contract,{deck=deck,enemies={'jaw_worm'},seed=seed});if uid(s)then return s end end
 error('no opening witness')
end
for _,up in ipairs({false,true})do for _,wedge in ipairs({false,true})do for _,locked in ipairs({false,true})do for _,full in ipairs({false,true})do
 local s=create(up);local u=uid(s);s.keqingResourceProbe.infusion=1
 if wedge then s.keqingResourceProbe.wedgeUntil=2 end
 if full then C.draw(s,5);eq(#s.hand,10)end
 if locked then C.applyEffects(s,{{op='noDrawThisTurn'}},s.player,s.player)end
 local before=#s.hand;local available=#s.draw;local count=wedge and(up and 3 or 2)or 1
 local no,why=R.play(s,u,1);eq(no,nil);eq(why,'dedicated_wedge_draw_adapter_required')
 local a=assert(A.play(s,u));local drawn=locked and 0 or math.min(count,available,11-before)
 eq(#a.hand,before-1+drawn);eq(#a.draw,available-drawn);eq(a.energy,2);eq(a.keqingResourceProbe.infusion,1);eq(a.keqingResourceProbe.wedgeUntil,nil)
 eq(#a.exhaust,1);eq(a.exhaust[1].uid,u);eq(#a.hand+#a.draw+#a.discard+#a.exhaust,11)
 eq(s.energy,3);eq(#s.hand,before);eq(s.keqingResourceProbe.wedgeUntil,wedge and 2 or nil)
 s.energy=0;no,why=A.play(s,u);eq(no,nil);eq(why,'insufficient_energy');eq(s.keqingResourceProbe.wedgeUntil,wedge and 2 or nil);eq(#s.exhaust,0)
 -- Exhausted instance cannot be played twice.
 no,why=A.play(a,u);eq(no,nil);eq(why,'card_not_in_hand')
end end end end
print('WEDGE_DRAW_PROBE_PASS')
`);try{const r=runLua(file,{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/WEDGE_DRAW_PROBE_PASS/);}finally{rmSync(dir,{recursive:true,force:true});}
});
