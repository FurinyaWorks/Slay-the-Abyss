// Exact additive battle continuation over the integrated joint UI tree.
import assert from 'node:assert/strict';
import {preOfficialUiRepairSource} from './official-ui-repair-source-epoch.mjs';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const bytes=readFileSync(new URL('./battle-queue-source-epoch.json.gz',import.meta.url));
assert.equal(hash(bytes),'e82f3c47155271784ed25d87abcf19306e7a752fe1cb5aab5f3d269d26fdd42d');
export const battleQueueProof=JSON.parse(gunzipSync(bytes));
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
for(const row of Object.values(battleQueueProof.files))for(const b of Object.values(row))assert.equal(hash(b.source),b.sha256);
freeze(battleQueueProof);
export function preBattleQueueSource(path,source){
 source=preOfficialUiRepairSource(path,source);
 const row=Object.hasOwn(battleQueueProof.files,path)?battleQueueProof.files[path]:null;
 return row&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===row.current.sha256?row.before.source:source;
}
export function extendBattleQueueEpoch(prior){
 const current={...prior.proof.current};
 for(const [p,row]of Object.entries(battleQueueProof.files))if(Object.hasOwn(current,p)){
  assert.deepEqual(current[p],row.before,'battle integration predecessor: '+p);current[p]=row.current;
 }
 const targets={...prior.proof.targets,battleQueuePrior:{commit:battleQueueProof.base,files:prior.proof.current}};
 const owners=Object.keys(current).filter(p=>Object.values(targets).some(t=>t.files[p]?.sha256!==current[p]?.sha256));
 return createSourceEpochProjector(freeze({...prior.proof,currentCommitRole:'battle continuation over reviewed joint UI; not a historical full tree',current,targets,owners}),{allowConfigLayout:true,reuseFrozenInput:true});
}
