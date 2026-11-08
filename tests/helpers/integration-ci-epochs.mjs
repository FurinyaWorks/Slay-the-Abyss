// Immutable original slice inputs; never a current gameplay or CI pass claim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {partition} from '../../scripts/ci-shards.mjs';
const bytes=readFileSync(new URL('../fixtures/integration-ci-epochs.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(bytes).digest('hex'),'542755e50f64d062f3d407114a58d9b429add0d8bd667b7430ef2b0fc5cf5532');
const epochs=JSON.parse(gunzipSync(bytes));
export function ciEpoch(name){
 const e=epochs[name];assert.ok(e,'unknown historical CI epoch');
 const readBytes=p=>{assert.ok(Object.hasOwn(e.files,p),'missing historical input '+p);const v=e.files[p];return typeof v==='string'?Buffer.from(v):Buffer.from(v.base64,'base64');};
 const read=p=>readBytes(p).toString('utf8').replaceAll('\r\n','\n');
 const timings=JSON.parse(read('scripts/ci-test-timings.json'));
 const jsPlanningWeights=(files,platform)=>Object.fromEntries(files.map(file=>[file,Math.max(timings.js[platform][file]??timings.unknownJsMs,timings.jsPlanning.localLowerBounds[file]?.durationMs??0)]));
 const jsShard=(files,value,platform)=>partition(files,value,jsPlanningWeights(files,platform),timings.unknownJsMs,Array.from({length:Number(value.split('/')[1])},(_,i)=>i===0?timings.initialMs[platform][0]:0));
 return {sha:e.sha,read,timings,discoverJs:()=>[...e.js],lua:[...e.lua],jsPlanningWeights,jsShard,
  readFileSync:(p,encoding)=>encoding?read(p):readBytes(p),
  readdirSync:p=>p==='tests/lua'?e.lua.map(p=>p.split('/').at(-1)):p==='src/lua'?Object.keys(e.files).filter(p=>/^src\/lua\/[^/]+\.lua$/.test(p)).map(p=>p.split('/').at(-1)):assert.fail('unsupported historical directory '+p)};
}
