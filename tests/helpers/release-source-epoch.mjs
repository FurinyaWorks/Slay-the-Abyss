// Exact current-version continuation; all earlier source views stay immutable.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
export function extendReleaseSourceEpoch(original){
 const bytes=readFileSync(new URL('./release-source-epoch.json.gz',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'7825732447122bb4325db3d27d29896881350c0c1560565b16cdb0ceb5ca7ba9');
 const patch=JSON.parse(gunzipSync(bytes)),prior=original.proof;
 assert.equal(patch.schemaVersion,1);
 assert.equal(patch.baseCommit,'b427ac7ce8c947b06e1f27ae1625a26bc2f80270');
 assert.equal(patch.currentCommit,'0eac1d3c2f69cfcd865dae0d5657b449c2fc2d59');
 assert.deepEqual(patch.inventoryBefore,Object.keys(prior.current).sort());
 assert.deepEqual(Object.keys(patch.before).sort(),Object.keys(patch.current).sort());
 for(const [path,row]of Object.entries(patch.before))assert.deepEqual(row,prior.current[path]??null,'exact release predecessor: '+path);
 const current={...prior.current,...patch.current},paths=Object.keys(current).sort();
 assert.deepEqual(paths,patch.inventoryAfter,'complete release production inventory');
 const pad=files=>Object.fromEntries(paths.map(path=>[path,files[path]??null]));
 const targets=Object.fromEntries(Object.entries(prior.targets).map(([name,row])=>[name,{...row,files:pad(row.files)}]));
 assert(!Object.hasOwn(targets,'releasePrior'));targets.releasePrior={commit:patch.baseCommit,files:pad(prior.current)};
 const owners=paths.filter(path=>Object.values(targets).some(row=>row.files[path]?.sha256!==current[path]?.sha256));
 return createSourceEpochProjector({...prior,currentCommit:patch.currentCommit,currentTreeCommitted:false,
  currentCommitRole:'exact single-protagonist release integration sources',current,targets,owners},{allowConfigLayout:true});
}
