// Exact current-version continuation; all earlier source views stay immutable.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export function extendReleaseSourceEpoch(original){
 const bytes=readFileSync(new URL('./release-source-epoch.json.gz',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'9164dfcccd0bd32e5cc3918e20a3af7b16c3d546e22aee0bf5e8114bbbca1769');
 const patch=JSON.parse(gunzipSync(bytes)),prior=original.proof;
 assert.equal(patch.schemaVersion,1);
 assert.equal(patch.baseCommit,'0cf2008fa4f5086ac3b2b84b71753b84e7a37962');
 assert.equal(patch.currentCommit,'9bc582488dfa1e78e92dcf212e0610c195454b23');
 assert.deepEqual(patch.inventoryBefore,Object.keys(prior.current).sort());
 assert.deepEqual(Object.keys(patch.before).sort(),Object.keys(patch.current).sort());
 for(const [path,row]of Object.entries(patch.before))assert.deepEqual(row,prior.current[path]??null,'exact release predecessor: '+path);
 const current={...prior.current,...patch.current},paths=Object.keys(current).sort();
 assert.deepEqual(paths,patch.inventoryAfter,'complete release production inventory');
 const pad=files=>Object.fromEntries(paths.map(path=>[path,files[path]??null]));
 const targets=Object.fromEntries(Object.entries(prior.targets).map(([name,row])=>[name,{...row,files:pad(row.files)}]));
 assert(!Object.hasOwn(targets,'releasePrior'));targets.releasePrior={commit:patch.baseCommit,files:pad(prior.current)};
 for(const [name,view]of Object.entries(patch.views)){
  assert(['selectionReviewed','transitionReviewed'].includes(name));assert(!Object.hasOwn(targets,name));
  assert.deepEqual(Object.keys(view.files),paths,'complete reviewed input production inventory');
  targets[name]=view;
 }
 const owners=paths.filter(path=>Object.values(targets).some(row=>row.files[path]?.sha256!==current[path]?.sha256));
 return createSourceEpochProjector(freeze({...prior,currentCommit:patch.currentCommit,currentTreeCommitted:false,
  currentCommitRole:'exact single-protagonist release integration sources',current,targets,owners}),{allowConfigLayout:true,reuseFrozenInput:true});
}
