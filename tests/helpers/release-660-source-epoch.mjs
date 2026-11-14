// Exact current-version continuation; all earlier source views stay immutable.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export function extendRelease660SourceEpoch(original){
 const bytes=readFileSync(new URL('./release-660-source-epoch.json.gz',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'7d1fb1fdf78a68f8e78cea8b5918e80d8f2aab6e0d78499e324281499a3606fc');
 const patch=JSON.parse(gunzipSync(bytes)),prior=original.proof;
 assert.equal(patch.schemaVersion,1);
 assert.equal(patch.baseCommit,'d4ed094e882f433650dfb4d0cbe2686388e4b684');
 assert.equal(patch.currentCommit,'e6245114f5ca25818551d1cdbade30dd5ed42848');
 assert.equal(patch.normalization,'LF');
 assert.equal(prior.currentCommit,patch.baseCommit,'exact release660 predecessor commit');
 assert.deepEqual(patch.inventoryBefore,Object.keys(prior.current).sort());
 assert.deepEqual(Object.keys(patch.before).sort(),Object.keys(patch.current).sort());
 for(const [path,row]of Object.entries(patch.before))assert.deepEqual(row,prior.current[path]??null,'exact release predecessor: '+path);
 const current={...prior.current,...patch.current},paths=Object.keys(current).sort();
 assert.deepEqual(paths,patch.inventoryAfter,'complete release production inventory');
 const pad=files=>Object.fromEntries(paths.map(path=>[path,files[path]??null]));
 const targets=Object.fromEntries(Object.entries(prior.targets).map(([name,row])=>[name,{...row,files:pad(row.files)}]));
 assert(!Object.hasOwn(targets,'release660Prior'));targets.release660Prior={commit:patch.baseCommit,files:pad(prior.current)};
 const owners=paths.filter(path=>Object.values(targets).some(row=>row.files[path]?.sha256!==current[path]?.sha256));
 return createSourceEpochProjector(freeze({...prior,currentCommit:patch.currentCommit,currentTreeCommitted:false,
  currentCommitRole:'exact committed combined PR660/661 and reviewed repairs production sources',current,targets,owners}),{allowConfigLayout:true,reuseFrozenInput:true});
}
