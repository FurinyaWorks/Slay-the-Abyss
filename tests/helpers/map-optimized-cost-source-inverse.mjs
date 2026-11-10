// Compose an exact outer epoch without broadening either historical reader.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {preEmeraldCostSource as originalPreEmeraldCostSource} from './map-emerald-cost-source-inverse.mjs';
export {emeraldCostBeforeSource} from './map-emerald-cost-source-inverse.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./map-optimized-cost-before.json.gz',import.meta.url));
assert.equal(hash(archive),'0b9a61d7652926ecab3521121ea7707af6690f20351792caa0c318af078b3028');
export const optimizedCostBeforeSource=gunzipSync(archive).toString('utf8');
const bytes=readFileSync(new URL('../fixtures/map-optimized-cost-registration.json',import.meta.url));
assert.equal(hash(bytes),'f6b003db290df79a7a4a98095586e6a3546619450432ddbd1031f17cf2d0a7dd');
function freeze(value){if(value&&typeof value==='object'){for(const item of Object.values(value))freeze(item);Object.freeze(value);}return value;}
export const optimizedCostRegistration=freeze(JSON.parse(bytes));
assert.equal(hash(optimizedCostBeforeSource),optimizedCostRegistration.beforeTimingSha256);
export function preOptimizedEmeraldCostSource(path,source){
 if(path!=='scripts/ci-test-timings.json'||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==optimizedCostRegistration.afterTimingSha256)return source;
 return optimizedCostBeforeSource;
}
export function preEmeraldCostSource(path,source){
 return originalPreEmeraldCostSource(path,preOptimizedEmeraldCostSource(path,source));
}
