import test from'node:test';import assert from'node:assert/strict';import{mkdtempSync,writeFileSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';import{cards}from'./mechanics.mjs';import{fullStarterProbe}from'./runtime-bridge.mjs';import{conditionalAttackProbe}from'./runtime-conditional.mjs';import{toLua,buildLuaData}from'../../../scripts/build-lua-data.mjs';import{runLua}from'../../../scripts/test-lua.mjs';
test('conditional export refuses unknown, sparse and invalid values',()=>{for(const id of ['KQ008','KQ018','KQ025'])for(const change of [c=>c.exhaust=true,c=>c.effects.onExhaust=[],c=>c.effects.base[0].op='unknown',c=>delete c.effects.base[0],c=>c.effects.base[Symbol()]=1]){const d=structuredClone(cards);change(d[id]);assert.throws(()=>conditionalAttackProbe(id,{definitions:d}),/unsupported/);}});
test('actual Lua conditional attacks use pre-card resources and preserve wedge',()=>{
 buildLuaData();const p=fullStarterProbe(),defs=[p.definition,...['KQ008','KQ018','KQ025'].map(id=>conditionalAttackProbe(id))];const dir=mkdtempSync(join(tmpdir(),'kq-conditional-')),file=join(dir,'test.lua');writeFileSync(file,`
package.path='experiments/characters/keqing/?.lua;src/lua/?.lua;build/lua/?.lua;'..package.path
local R=require('runtime-resource-probe');local A=require('runtime-conditional');local D=require('abyss_data')
local defs=${toLua(defs)};local contract=${toLua(p.contract)}
local function eq(a,b)assert(a==b,tostring(a)..' ~= '..tostring(b))end
local function uid(s,id)for _,c in ipairs(s.hand)do if c.cardId==id then return c.uid end end end
for _,id in ipairs({'KQ008','KQ018','KQ025'})do for _,up in ipairs({false,true})do for _,wedge in ipairs({false,true})do for infusion=0,2 do
 local s=R.new(D,defs,contract,{deck={{cardId=id,upgraded=up}},enemies={'jaw_worm'},seed=1})
 s.enemies[1].hp=1000;s.enemies[1].maxHp=1000;s.keqingResourceProbe.infusion=infusion
 if wedge then s.keqingResourceProbe.wedgeUntil=2 end
 local no,why=R.play(s,uid(s,id),1);eq(no,nil);eq(why,'dedicated_conditional_adapter_required')
 local a=assert(A.play(s,uid(s,id),1));local bonus=infusion>0 and 2 or 0;local damage,block
 if id=='KQ008'then damage=(up and(wedge and 11 or 8)or(wedge and 8 or 5))+bonus;block=0
 elseif id=='KQ018'then damage=2*((up and 5 or 4)+bonus);block=infusion==0 and(up and 4 or 3)or 0
 else damage=(up and 13 or 10)+bonus+(infusion>0 and((up and 9 or 7)+bonus)or 0);block=0 end
 eq(a.enemies[1].hp,1000-damage);eq(a.player.block,block);eq(a.energy,id=='KQ025'and 1 or 2)
 eq(a.keqingResourceProbe.infusion,math.max(0,infusion-1));eq(a.keqingResourceProbe.wedgeUntil,wedge and 2 or nil)
 eq(s.energy,3);eq(s.enemies[1].hp,1000);eq(s.keqingResourceProbe.infusion,infusion)
 assert(a.catalog.cards[id].keqingConditional);eq(#a.catalog.cards[id].effects,0)
 no,why=A.play(s,uid(s,id),99);eq(no,nil);eq(why,'invalid_target');eq(s.energy,3)
 s.energy=0;no,why=A.play(s,uid(s,id),1);eq(no,nil);eq(why,'insufficient_energy');eq(s.keqingResourceProbe.infusion,infusion)
end end end end
-- Lethal first segment never redirects the infused second segment to another enemy.
local s=R.new(D,defs,contract,{deck={'KQ025'},enemies={'jaw_worm','jaw_worm'},seed=1})
s.enemies[1].hp=1;s.enemies[2].hp=100;s.keqingResourceProbe.infusion=1
local a=assert(A.play(s,uid(s,'KQ025'),1));eq(a.enemies[1].hp,0);eq(a.enemies[2].hp,100);eq(a.keqingResourceProbe.infusion,0)
print('CONDITIONAL_PROBE_PASS')
`);try{const r=runLua(file,{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/CONDITIONAL_PROBE_PASS/);}finally{rmSync(dir,{recursive:true,force:true});}
});
