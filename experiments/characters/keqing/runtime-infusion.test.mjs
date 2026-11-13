import test from'node:test';import assert from'node:assert/strict';import{mkdtempSync,writeFileSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';import{cards}from'./mechanics.mjs';import{fullStarterProbe}from'./runtime-bridge.mjs';import{infusionExchangeProbe}from'./runtime-infusion.mjs';import{toLua,buildLuaData}from'../../../scripts/build-lua-data.mjs';import{runLua}from'../../../scripts/test-lua.mjs';
test('infusion export requires finite effect and true exhaust',()=>{for(const id of ['KQ021','KQ022'])for(const change of [c=>c.exhaust=false,c=>c.effects.onExhaust=[],c=>c.effects.base[0].op='unknown',c=>delete c.effects.base[0],c=>c.effects.base[Symbol()]=1]){const d=structuredClone(cards);change(d[id]);assert.throws(()=>infusionExchangeProbe(id,{definitions:d}),/unsupported/);}});
test('actual Lua infusion cash/refresh is finite and uses real exhaust zone',()=>{
 buildLuaData();const p=fullStarterProbe(),defs=[p.definition,p.finisher,...['KQ021','KQ022'].map(id=>infusionExchangeProbe(id))];const dir=mkdtempSync(join(tmpdir(),'kq-infusion-')),file=join(dir,'test.lua');writeFileSync(file,`
package.path='experiments/characters/keqing/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local R=require('runtime-resource-probe');local A=require('runtime-infusion');local D=require('abyss_data')
local defs=${toLua(defs)};local contract=${toLua(p.contract)}
local function eq(a,b)assert(a==b,tostring(a)..' ~= '..tostring(b))end
local function uid(s,id)for _,c in ipairs(s.hand)do if c.cardId==id then return c.uid end end end
for _,id in ipairs({'KQ021','KQ022'})do for _,up in ipairs({false,true})do for infusion=0,2 do
 local s=R.new(D,defs,contract,{deck={{cardId=id,upgraded=up}},enemies={'jaw_worm'},seed=1})
 s.keqingResourceProbe.infusion=infusion;s.keqingResourceProbe.wedgeUntil=2
 if id=='KQ021'and infusion==0 then s.player.statuses.dexterity=10 end
 local u=uid(s,id);local no,why=R.play(s,u,1);eq(no,nil);eq(why,'dedicated_infusion_adapter_required')
 local a=assert(A.play(s,u));eq(a.player.block,id=='KQ021'and infusion*(up and 4 or 3)or(up and 9 or 6))
 eq(a.energy,id=='KQ021'and 3 or 1);eq(a.keqingResourceProbe.infusion,id=='KQ021'and 0 or 1)
 eq(a.keqingResourceProbe.wedgeUntil,2);eq(#a.exhaust,1);eq(a.exhaust[1].uid,u);eq(#a.discard,0)
 eq(s.energy,3);eq(s.keqingResourceProbe.infusion,infusion);eq(#s.exhaust,0)
 no,why=A.play(a,u);eq(no,nil);eq(why,'card_not_in_hand')
 for turn=1,3 do a=assert(R.endTurn(a));eq(#a.exhaust,1);eq(#a.hand,0);eq(#a.draw,0);eq(#a.discard,0)end
 if id=='KQ022'then s.energy=1;no,why=A.play(s,u);eq(no,nil);eq(why,'insufficient_energy');eq(s.keqingResourceProbe.infusion,infusion);eq(#s.exhaust,0)end
 -- Malformed original resource cannot be hidden by overwrite to zero/one.
 s.keqingResourceProbe.infusion=0/0;local ok=pcall(A.play,s,u);eq(ok,false);assert(s.keqingResourceProbe.infusion~=s.keqingResourceProbe.infusion)
end end end
-- Real recast supplies two charges; zero-cost cashout consumes all and exhausts.
local s=R.new(D,defs,contract,{deck={'KQ003','KQ003','KQ021'},enemies={'jaw_worm'},seed=1})
s=assert(R.play(s,uid(s,'KQ003'),1));s=assert(R.play(s,uid(s,'KQ003'),1));eq(s.keqingResourceProbe.infusion,2)
s=assert(A.play(s,uid(s,'KQ021')));eq(s.player.block,6);eq(s.energy,1);eq(s.keqingResourceProbe.infusion,0);eq(#s.exhaust,1)
print('INFUSION_PROBE_PASS')
`);try{const r=runLua(file,{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/INFUSION_PROBE_PASS/);}finally{rmSync(dir,{recursive:true,force:true});}
});
