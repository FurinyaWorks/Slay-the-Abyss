import test from'node:test';import assert from'node:assert/strict';import{mkdtempSync,writeFileSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';import{starterResourceProbe}from'./runtime-bridge.mjs';import{toLua}from'../../../scripts/build-lua-data.mjs';import{runLua}from'../../../scripts/test-lua.mjs';
test('pure staged KQ003 plan preserves ordering, bindings and input',()=>{
 const dir=mkdtempSync(join(tmpdir(),'kq-plan-')),file=join(dir,'test.lua');writeFileSync(file,`
package.path='experiments/characters/keqing/?.lua;'..package.path
local P=require('staged-starter-plan');local contract=${toLua(starterResourceProbe().contract)}
local function eq(a,b)assert(a==b,tostring(a)..' ~= '..tostring(b))end
for _,up in ipairs({false,true})do for _,wedge in ipairs({false,true})do for infusion=0,2 do
 local input={turn=7,uid=42,playId=17,upgraded=up,infusion=infusion};if wedge then input.wedgeUntil=8 end
 local p=P.plan(input,contract);eq(input.infusion,infusion);eq(input.wedgeUntil,wedge and 8 or nil)
 eq(p.context.oldInfusion,infusion);eq(p.context.bonusPerHit,infusion>0 and 2 or 0);eq(p.context.pendingNewInfusion,nil)
 eq(#p.actions,wedge and 3 or 2)
 eq(p.actions[1].op,wedge and 'consumeWedge'or'rawDamage')
 eq(p.actions[2].op,wedge and 'rawDamage'or'setWedgeUntil')
 if wedge then eq(p.actions[2].value,up and 11 or 8);eq(p.actions[3].op,'deferInfusion');eq(p.actions[3].value,2)
 else eq(p.actions[1].value,up and 7 or 5);eq(p.actions[2].value,8)end
 for i,a in ipairs(p.actions)do assert(P.validateAction(a,p.binding,i));local ok=pcall(P.validateAction,a,{turn=8,uid=42,playId=17},i);eq(ok,false);ok=pcall(P.validateAction,a,{turn=7,uid=43,playId=17},i);eq(ok,false)end
 local ok=pcall(P.validateAction,p.actions[1],{turn=7,uid=42,playId=18},1);eq(ok,false)
 p.context.oldInfusion=99;eq(input.infusion,infusion)
end end end
for _,bad in ipairs({0,-1,1.5,'',false})do local ok=pcall(P.plan,{turn=1,uid=bad,playId=17,upgraded=false,infusion=0},contract);eq(ok,false)end
local p=P.plan({turn=1,uid='fixture-uid',playId=17,upgraded=false,infusion=0},contract)
p.actions[1].extra=true;eq(pcall(P.validateAction,p.actions[1],p.binding,1),false)
print('STAGED_PLAN_PASS')
`);try{const r=runLua(file,{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/STAGED_PLAN_PASS/);}finally{rmSync(dir,{recursive:true,force:true});}
});
