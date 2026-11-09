// Exact recovery adapter; old archives, costs and receipt identities stay frozen.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./warrior-status-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'9f795fcb82c04e09533a08cef4d65577174b3ab6fbe5dff6102b2ea61a460890');
const bytes=gunzipSync(archive);assert.equal(hash(bytes),'4f8c2c7fc05fd4d1cce4c587a4a6093c935673ae8f1e71eb800f59a5e7750807');
export const warriorStatusCiProof=JSON.parse(bytes);
for(const binding of Object.values(warriorStatusCiProof.files))assert.equal(hash(binding.beforeSource),binding.beforeSha256);
export function preWarriorStatusCiSource(path,source){
 const binding=Object.hasOwn(warriorStatusCiProof.files,path)?warriorStatusCiProof.files[path]:null;
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}
