import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=s=>createHash('sha256').update(s).digest('hex');
const bytes=readFileSync(new URL('./sts-style-prior-runtime.json.gz',import.meta.url));
assert.equal(hash(bytes),'10bf3b7d960e4c02ae2d64e26d8d5f16824439b9396949973f08ccec1c9d9330','complete immutable pre-style runtime');
export const stsStylePriorRuntime=JSON.parse(gunzipSync(bytes));
assert.equal(stsStylePriorRuntime.baseCommit,'cb1eac63620b908d880b8a339ab834b1b533dfc1');
for(const [path,row]of Object.entries(stsStylePriorRuntime.files)){
 assert.equal(hash(row.source),row.sha256,path+' original bytes');
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(row.source)}\0`).update(row.source).digest('hex'),row.gitBlob);
}
