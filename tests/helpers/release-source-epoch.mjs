// Exact current-version continuation; all earlier source views stay immutable.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export function extendReleaseSourceEpoch(original){
 const bytes=readFileSync(new URL('./release-source-epoch.json.gz',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'f2d206e64071ec45826bef6eb3e71aa03454ec2aae8dfa0cb15c7067d6174938');
 const patch=JSON.parse(gunzipSync(bytes)),prior=original.proof;
 assert.equal(patch.schemaVersion,1);
 assert.equal(patch.baseCommit,'0cf2008fa4f5086ac3b2b84b71753b84e7a37962');
 assert.equal(patch.currentCommit,'9098a8844900a887931e32aa78ac617ee1a894df');
 assert.deepEqual(patch.inventoryBefore,Object.keys(prior.current).sort());
 assert.deepEqual(Object.keys(patch.before).sort(),Object.keys(patch.current).sort());
 for(const [path,row]of Object.entries(patch.before))assert.deepEqual(row,prior.current[path]??null,'exact release predecessor: '+path);
 const current={...prior.current,...patch.current},paths=Object.keys(current).sort();
 assert.deepEqual(paths,patch.inventoryAfter,'complete release production inventory');
 const pad=files=>Object.fromEntries(paths.map(path=>[path,files[path]??null]));
 const targets=Object.fromEntries(Object.entries(prior.targets).map(([name,row])=>[name,{...row,files:pad(row.files)}]));
 assert(!Object.hasOwn(targets,'releasePrior'));targets.releasePrior={commit:patch.baseCommit,files:pad(prior.current)};
 for(const [name,view]of Object.entries(patch.views)){
  assert(['selectionReviewed','transitionReviewed','releaseReviewed'].includes(name));assert(!Object.hasOwn(targets,name));
  assert.deepEqual(Object.keys(view.files),paths,'complete reviewed input production inventory');
  targets[name]=view;
 }
 const owners=paths.filter(path=>Object.values(targets).some(row=>row.files[path]?.sha256!==current[path]?.sha256));
 return createSourceEpochProjector(freeze({...prior,currentCommit:patch.currentCommit,currentTreeCommitted:false,
  currentCommitRole:'exact single-protagonist release integration sources',current,targets,owners}),{allowConfigLayout:true,reuseFrozenInput:true});
}
