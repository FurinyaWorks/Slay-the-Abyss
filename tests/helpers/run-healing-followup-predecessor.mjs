// Successor-only outer layer. Published RunHealing archive/inverse/contract are immutable.
import {readFileSync as diskRead,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {preRunHealingCiSource as publishedInverse} from './run-healing-ci-source-inverse.mjs';
import {discoverJs,partition} from '../../scripts/ci-shards.mjs';
export {readdirSync,discoverJs};
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=diskRead(new URL('./run-healing-followup-epoch.json.gz',import.meta.url));
// Archive digest is pinned by the reproducible builder after final input capture.
const expectedArchive='90cecab9d1459637a095ca74f6d4fba0ff047b036c197f5eee842abb7cf9dfef';
assert.equal(hash(archive),expectedArchive);
function deepFreeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))deepFreeze(child);Object.freeze(value);}return value;}
export const successorProof=deepFreeze(JSON.parse(gunzipSync(archive)));
for(const binding of Object.values(successorProof.files)){assert.equal(hash(binding.beforeSource),binding.beforeSha256);assert.equal(hash(binding.afterSource),binding.afterSha256);}
export function preSuccessorSource(path,source){const binding=Object.hasOwn(successorProof.files,path)?successorProof.files[path]:null;if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;return binding.beforeSource;}
export function preRunHealingCiSource(path,source){return publishedInverse(path,preSuccessorSource(path,source));}
export function readFileSync(path,encoding){const value=diskRead(path,encoding),text=typeof value==='string'?value:value.toString('utf8'),prior=preSuccessorSource(path,text);return typeof value==='string'?prior:prior===text?value:Buffer.from(prior);}
export const timings=deepFreeze(JSON.parse(successorProof.files['scripts/ci-test-timings.json'].beforeSource));
export const jsPlanningWeights=(files,platform)=>Object.fromEntries(files.map(file=>[file,Math.max(timings.js[platform][file]??timings.unknownJsMs,timings.jsPlanning.localLowerBounds[file]?.durationMs??0)]));
export const jsShard=(files,value,platform)=>partition(files,value,jsPlanningWeights(files,platform),timings.unknownJsMs,Array.from({length:Number(value.split('/')[1])},(_,i)=>i===0?timings.initialMs[platform][0]:0));
