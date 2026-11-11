// Exact single-Lua continuation for official selection preparation on demand.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const bytes=readFileSync(new URL('./noncombat-demand-source-epoch.json.gz',import.meta.url));
assert.equal(hash(bytes),'488a06607e32dd37d078b4a9b0b15adf09c15cd2a2ac0ac2a36536106573c750','noncombat demand source archive');
const archive=JSON.parse(gunzipSync(bytes));
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;};
export function extendNoncombatDemandEpoch(prior){
 const current={...prior.proof.current};
 for(const [path,row]of Object.entries(archive.files)){
  assert.deepEqual(row.before,prior.proof.current[path],'demand complete predecessor: '+path);
  current[path]=row.after;
 }
 const paths=Object.keys(current),complete=files=>Object.fromEntries(paths.map(p=>[p,files[p]??null]));
 const targets=Object.fromEntries(Object.entries(prior.proof.targets).map(([name,t])=>[name,{...t,files:complete(t.files)}]));
 targets.noncombatDemandPrior={commit:archive.beforeCommit,files:complete(prior.proof.current)};
 const owners=paths.filter(p=>Object.values(targets).some(t=>t.files[p]?.sha256!==current[p]?.sha256));
 return createSourceEpochProjector(freeze({...prior.proof,currentCommit:archive.afterCommit,
  currentCommitRole:'committed official portrait-demand production slice',currentTreeCommitted:true,
  current,targets,owners}),{allowConfigLayout:true,reuseFrozenInput:true});
}
