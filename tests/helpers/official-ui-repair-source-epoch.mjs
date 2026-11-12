// Exact additive identity for the reviewed mobile/HUD repair; old archives stay immutable.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const bytes=readFileSync(new URL('./official-ui-repair-source-epoch.json.gz',import.meta.url));
assert.equal(hash(bytes),'7acca01bc985f6bb6bea90361374f360d7ef3e746583bd8a8da7c459951f0765');
export const officialUiRepairProof=JSON.parse(gunzipSync(bytes));
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
for(const row of Object.values(officialUiRepairProof.files))for(const b of [row.current,row.before])assert.equal(hash(b.source),b.sha256);
freeze(officialUiRepairProof);
export function preOfficialUiRepairSource(path,source){
 const row=Object.hasOwn(officialUiRepairProof.files,path)?officialUiRepairProof.files[path]:null;
 return row&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===row.current.sha256?row.before.source:source;
}
export function extendOfficialUiRepairEpoch(prior){
 const current={...prior.proof.current};
 for(const [p,row]of Object.entries(officialUiRepairProof.files))if(Object.hasOwn(current,p)){
  assert.deepEqual(current[p],row.before,'repair predecessor: '+p);current[p]=row.current;
 }
 const targets={...prior.proof.targets,officialUiRepairPrior:{commit:officialUiRepairProof.base,files:prior.proof.current}};
 const owners=Object.keys(current).filter(p=>Object.values(targets).some(t=>t.files[p]?.sha256!==current[p]?.sha256));
 return createSourceEpochProjector(freeze({...prior.proof,currentCommitRole:'exact reviewed official mobile/HUD repair',current,targets,owners}),{allowConfigLayout:true,reuseFrozenInput:true});
}
