// Exact outer CI identities. Old archives and execution budgets remain untouched.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deepFreezeSourceProof} from './pure-source-projection-cache.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const bytes=readFileSync(new URL('./joust-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(bytes),'12bcdf820c12b4aa5abc94ee5eaca48962c536cd0c77f604ca8a632c8828839b','Joust CI archive identity');
export const joustCiProof=deepFreezeSourceProof(JSON.parse(gunzipSync(bytes)));
for(const row of Object.values(joustCiProof.files)){
 assert.equal(hash(row.beforeSource),row.beforeSha256);
 assert.equal(hash(row.afterSource),row.afterSha256);
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(row.beforeSource)}\0`).update(row.beforeSource).digest('hex'),row.beforeGitBlob);
}
export function preJoustCiSource(path,source){
 const row=Object.hasOwn(joustCiProof.files,path)?joustCiProof.files[path]:null;
 return row&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===row.afterSha256?row.beforeSource:source;
}
