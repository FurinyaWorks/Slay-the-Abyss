// Exact outer CI epoch; no historical cost or receipt is rewritten.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./map-emerald-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'32696fe1c2c4428fb5890e4621f86118ba054d2ca7296a75c13bb6b53099551d');
const bytes=gunzipSync(archive);assert.equal(hash(bytes),'f53758023daa157a178190df5743ca65938743cbf8630d5e3eed5f7ce00fcffc');
const proof=JSON.parse(bytes);
for(const binding of Object.values(proof.files))assert.equal(hash(binding.beforeSource),binding.beforeSha256);
function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
export const emeraldMapCiProof=freeze(proof);
export const emeraldMapPlanningKey=proof.planningKey,emeraldMapPlanningFloor=proof.planningFloor;
export function preEmeraldMapCiSource(path,source){
 const binding=Object.hasOwn(proof.files,path)?proof.files[path]:null;
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}
