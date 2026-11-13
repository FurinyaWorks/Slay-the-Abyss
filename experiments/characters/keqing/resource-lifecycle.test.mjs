import {statusRules} from './mechanics.mjs';import {starterRelic} from './battle.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';import {runLua} from '../../../scripts/test-lua.mjs';
test('pure lifecycle, one-shot relic intent, queued owner-end and input isolation',()=>{
 const dir=mkdtempSync(join(tmpdir(),'kq-lifecycle-')),file=join(dir,'test.lua');writeFileSync(file,`
package.path='experiments/characters/keqing/?.lua;'..package.path
local R=require('resource-lifecycle')
local constants={bonusPerHit=${statusRules.infusion.bonusPerHit},relicBlock=${starterRelic.effect.amount}}
local function eq(a,b)assert(a==b,tostring(a)..' ~= '..tostring(b))end
for _,enabled in ipairs({false,true})do
 local r=R.new(enabled,constants);local a,e=R.resolved(r,1,true,'setup')
 eq(r.wedgeUntil,nil);eq(r.relicUsed,false);eq(a.wedgeUntil,2);eq(#e,enabled and 1 or 0)
 if enabled then eq(e[1].op,'block');eq(e[1].value,4);eq(e[1].fixed,true)end
 local b=R.resolved(a,1,true,'recast');eq(b.infusion,2);eq(b.wedgeUntil,nil)
 local snap=R.attackSnapshot(b);eq(snap.bonusPerHit,2);snap.bonusPerHit=99;eq(b.infusion,2)
 local c=R.resolved(b,1,false,'none');eq(c.infusion,2)
 c,e=R.resolved(c,1,true,'setup');eq(c.infusion,1);eq(#e,0)
 local d=R.ownerEnd(c,1);eq(d.infusion,0);eq(d.wedgeUntil,2);eq(c.infusion,1)
 local f=R.ownerEnd(d,2);eq(f.wedgeUntil,nil);eq(f.relicUsed,enabled)
 local g=R.resolved(c,1,true,'detonate');eq(g.infusion,0);eq(g.wedgeUntil,nil)
 local ok=pcall(R.resolved,r,1,true,'recast');eq(ok,false);eq(r.infusion,0)
 for _,field in ipairs({'infusion','relicEnabled','relicUsed','wedgeUntil'})do
  local bad=R.new(enabled,constants);bad[field]='false';ok=pcall(R.ownerEnd,bad,1);eq(ok,false);eq(bad[field],'false')
 end
end
print('LIFECYCLE_PASS')
`);try{const r=runLua(file,{timeout:30000});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/LIFECYCLE_PASS/);}finally{rmSync(dir,{recursive:true,force:true});}
});
