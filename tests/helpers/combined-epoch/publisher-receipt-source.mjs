// Exact complete publisher receipt sources. Never an inventory or runtime override.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=value=>createHash('sha256').update(value).digest('hex');
const raw=readFileSync(new URL('./publisher-receipt-source.json.gz',import.meta.url));
assert.equal(hash(raw),'0677fd05eff8db85aeb518fcb2b495cb4269a07c75e2e941e7d1da14dc16f56c','publisher receipt raw gzip');
const unpacked=gunzipSync(raw);assert.equal(hash(unpacked),'8507eda14c3a5d149ecbaf09c854ac96ad3cde2014f91e82eb943103cf04c763','publisher receipt complete proof');
const proof=JSON.parse(unpacked);
const keys=(value,expected)=>{assert(value&&typeof value==='object'&&!Array.isArray(value));assert.deepEqual(Object.keys(value).sort(),[...expected].sort());};
keys(proof,['schemaVersion','files']);assert.equal(proof.schemaVersion,1);
keys(proof.files,['scripts/publish-full-quality.mjs','tests/full-quality.test.mjs']);
for(const row of Object.values(proof.files)){
 keys(row,['before','after']);
 for(const record of Object.values(row)){
  keys(record,['source','sha256','gitBlob']);assert.equal(typeof record.source,'string');assert(!record.source.includes('\r'));
  assert.equal(hash(record.source),record.sha256,'complete publisher receipt source');
  const bytes=Buffer.from(record.source);assert.equal(createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex'),record.gitBlob);
 }
 assert.notEqual(row.before.sha256,row.after.sha256);
}
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const publisherReceiptProof=freeze(proof);
export function prePublisherReceiptSource(path,source,view){
 if(view!=='pr620'||typeof source!=='string'||!Object.hasOwn(proof.files,path))return source;
 const row=proof.files[path];
 return source.replaceAll('\r\n','\n')===row.after.source?row.before.source:source;
}
