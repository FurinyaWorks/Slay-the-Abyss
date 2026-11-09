// Exact placement epoch only. No timing, budget, concurrency or runtime projection.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=value=>createHash('sha256').update(value).digest('hex');
const bytes=readFileSync(new URL('./posix15-shape-source-epoch.json.gz',import.meta.url));
assert.equal(hash(bytes),'9f75ddcfc0b6b5ef19c1750efab7d7a5360d9da4825a93de3c9cfe9e702e9b06');
export const posix15ShapeProof=Object.freeze(JSON.parse(gunzipSync(bytes)));
assert.equal(hash(posix15ShapeProof.beforeSource),posix15ShapeProof.beforeSha256);
assert.equal(hash(posix15ShapeProof.afterSource),posix15ShapeProof.afterSha256);
export function prePosix15ShapeSource(path,source){
 if(path!==posix15ShapeProof.path||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==posix15ShapeProof.afterSha256)return source;
 return posix15ShapeProof.beforeSource;
}
