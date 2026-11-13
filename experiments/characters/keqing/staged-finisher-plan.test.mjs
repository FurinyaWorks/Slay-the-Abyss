import test from'node:test';import assert from'node:assert/strict';import{mkdtempSync,writeFileSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';import{fullStarterProbe}from'./runtime-bridge.mjs';import{toLua}from'../../../scripts/build-lua-data.mjs';import{runLua}from'../../../scripts/test-lua.mjs';
test('finisher gate reads stage-time wedge, preserves binding and raw values',()=>{
 const dir=mkdtempSync(join(tmpdir(),'kq-finisher-')),file=join(dir,'test.lua');writeFileSync(file,`
package.path='experiments/characters/keqing/?.lua;'..package.path
local P=require('staged-finisher-plan');local c=${toLua(fullStarterProbe().contract)}
for _,up in ipairs({false,true})do for _,entry in ipairs({false,true})do for inf=0,2 do
 local input={turn=2,uid=5,playId=9,upgraded=up,infusion=inf,wedgeUntil=entry and 3 or nil};local p=P.plan(input,c)
 assert(#p.actions==3 and p.actions[1].op=='rawTargetHit'and p.actions[2].op=='rawTargetHit');assert(p.actions[1].value==(up and 5 or 4));assert(p.context.bonusPerHit==(inf>0 and 2 or 0))
 assert(#P.gate(p.actions[3],p.binding,nil)==0)
 local out=P.gate(p.actions[3],p.binding,3);assert(out[1].op=='consumeCurrentWedge'and out[2].value==(up and 6 or 4))
 assert(input.wedgeUntil==(entry and 3 or nil));assert(not pcall(P.gate,p.actions[3],{turn=2,uid=5,playId=10},3));assert(not pcall(P.gate,p.actions[3],p.binding,1))
end end end
print('FINISHER_PLAN_PASS')
`);try{const r=runLua(file,{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/FINISHER_PLAN_PASS/);}finally{rmSync(dir,{recursive:true,force:true});}
});
