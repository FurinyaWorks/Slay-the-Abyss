import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createSourceEpochProjector} from './source-epoch-runtime.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const compressed=readFileSync(new URL('./source-epoch.json.gz',import.meta.url));
assert.equal(hash(compressed),'2085260a5aabde4476411172eb0b2e6fd3afcaa991a3cafc52f3ab0e98755c73','combined compressed manifest identity');
const bytes=gunzipSync(compressed);
assert.equal(hash(bytes),'f6c4654f177d66fcf00a1d348507c043e855213cdb85634df0a7060ff0fdb06e','combined complete manifest identity');
const packed=JSON.parse(bytes);assert.equal(packed.schemaVersion,2);
const expand=files=>Object.fromEntries(Object.entries(files).map(([p,k])=>{assert(k===null||Object.hasOwn(packed.bindings,k),'manifest binding');return [p,k===null?null:packed.bindings[k]];}));
const proof={schemaVersion:1,normalization:packed.normalization,currentCommit:packed.currentCommit,owners:packed.owners,current:expand(packed.current),targets:Object.fromEntries(Object.entries(packed.targets).map(([name,t])=>[name,{commit:t.commit,files:expand(t.files)}]))};
// Authenticate every changed owner across all admitted epochs on every call.
// Unchanged linked owners retain their original epoch's fresh validation;
// the complete production tree is independently authenticated by the live test.
proof.owners=packed.owners.filter(path=>Object.values(proof.targets).some(target=>target.files[path]?.sha256!==proof.current[path]?.sha256));
export const sourceEpoch=createSourceEpochProjector(proof);
