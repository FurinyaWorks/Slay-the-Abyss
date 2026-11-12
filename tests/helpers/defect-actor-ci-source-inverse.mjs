import {preCloseoutCiSource,closeoutInventory,closeoutRead} from './closeout-ci-source.mjs';
// Exact CI receipt source/inventory epoch. No historical archive or live gameplay owner is rewritten.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./defect-actor-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'c7962302aa0363004b6d4c8e6afcb5a27431bf47b2eac2f2d3fdc2463566d638');
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const proof=freeze(JSON.parse(gunzipSync(archive)));
assert.equal(proof.schemaVersion,1);
for(const row of Object.values(proof.files))assert.equal(hash(row.beforeSource),row.beforeSha256);
export const defectActorPlanningKey='tests/defect-actor-boundary.test.mjs';
export const defectActorPlanningFloor=Object.freeze(proof.floor);
export const defectActorCiProof=proof;
export function preDefectActorCiSource(path,source){
 const row=Object.hasOwn(proof.files,path)?proof.files[path]:null;
 if(row)source=preCloseoutCiSource(path,source,'pr618');
 return row&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===row.afterSha256?row.beforeSource:source;
}
export function preDefectActorCiInventory(paths){
 paths=closeoutInventory(paths,'pr618');
 assert.deepEqual([...paths].sort(),proof.currentInventory,'complete Defect Actor current inventory');
 for(const [path,sha]of Object.entries(proof.added))assert.equal(hash(preCloseoutCiSource(path,readFileSync(path,'utf8'),'pr618').replaceAll('\r\n','\n')),sha,'added inventory source: '+path);
 return [...proof.beforeInventory];
}
