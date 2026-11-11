// Pure complete-source views of the bd9fc7ee receipt predecessor; no timing,
// discovery or runtime authorization is cached or replaced here.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
const bytes=readFileSync(new URL('./noncombat-demand-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(bytes),'dc2b5e005f3d074af4e4ec1e1e04d10c6a7faef226f693648b853b0bbbc295c9','noncombat demand CI archive');
const proof=JSON.parse(gunzipSync(bytes));
for(const row of Object.values(proof.files))for(const side of ['before','after']){
 const b=row[side];assert.equal(hash(b.source),b.sha256);
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(b.source)}\0`).update(b.source).digest('hex'),b.gitBlob);
}
export function preNoncombatDemandCiSource(path,source){
 const row=Object.hasOwn(proof.files,path)?proof.files[path]:null;
 return row&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===row.after.sha256?row.before.source:source;
}
