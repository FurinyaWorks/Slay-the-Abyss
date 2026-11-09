// Exact placement epoch only. No timing, budget, concurrency or runtime projection.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=value=>createHash('sha256').update(value).digest('hex');
const bytes=readFileSync(new URL('./windows18-shape-source-epoch.json.gz',import.meta.url));
assert.equal(hash(bytes),'c09d67f4599a7422b9c03dcbdb036248b3081d5d43360b1d1f4be685a8adf866');
export const windows18ShapeProof=Object.freeze(JSON.parse(gunzipSync(bytes)));
assert.equal(hash(windows18ShapeProof.beforeSource),windows18ShapeProof.beforeSha256);
assert.equal(hash(windows18ShapeProof.afterSource),windows18ShapeProof.afterSha256);
export function preWindows18ShapeSource(path,source){
 if(path!==windows18ShapeProof.path||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==windows18ShapeProof.afterSha256)return source;
 return windows18ShapeProof.beforeSource;
}
