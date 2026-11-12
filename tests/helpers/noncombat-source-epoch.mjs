// Exact, committed noncombat continuation. Historical sources remain immutable;
// only complete current bytes may enter the complete predecessor closure.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const bytes=readFileSync(new URL('./noncombat-source-epoch.json.gz',import.meta.url));
assert.equal(hash(bytes),'748b7965ddf39f1e297da92094f1ed865204177ca344aacca7e78a826d78f279','noncombat source archive');
const archive=JSON.parse(gunzipSync(bytes));
export function extendNoncombatEpoch(prior){
 const current={...prior.proof.current};
 for(const [path,row]of Object.entries(archive.files)){
  assert.deepEqual(row.before,prior.proof.current[path],'noncombat complete predecessor: '+path);
  current[path]=row.after;
 }
 const paths=Object.keys(current),complete=files=>Object.fromEntries(paths.map(p=>[p,files[p]??null]));
 const targets=Object.fromEntries(Object.entries(prior.proof.targets).map(([name,target])=>[name,{...target,files:complete(target.files)}]));
 targets.noncombatPrior={commit:archive.beforeCommit,files:complete(prior.proof.current)};
 const owners=paths.filter(p=>Object.values(targets).some(t=>t.files[p]?.sha256!==current[p]?.sha256));
 return createSourceEpochProjector({...prior.proof,currentCommit:archive.afterCommit,
  currentCommitRole:'committed complete noncombat production source slice',currentTreeCommitted:true,
  current,targets,owners},{allowConfigLayout:true});
}
