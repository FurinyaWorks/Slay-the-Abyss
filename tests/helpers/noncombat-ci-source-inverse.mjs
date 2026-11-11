// Pure source compatibility for frozen CI receipts; does not claim the new
// tests or implementation were measured by any historical hosted run.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
const bytes=readFileSync(new URL('./noncombat-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(bytes),'4ec323d272d519731a8e6f8848cb6a3b0985d57b560834fff75062ce856da90c','noncombat CI archive');
const proof=JSON.parse(gunzipSync(bytes));
for(const row of Object.values(proof.files))for(const side of ['before','after']){
 const b=row[side];assert.equal(hash(b.source),b.sha256);
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(b.source)}\0`).update(b.source).digest('hex'),b.gitBlob);
 Object.freeze(b);
}
export const noncombatAddedTests=Object.freeze(Object.keys(proof.added));
export function preNoncombatCiSource(path,source){
 const row=Object.hasOwn(proof.files,path)?proof.files[path]:null;
 return row&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===row.after.sha256?row.before.source:source;
}
export function noncombatPriorInventory(paths){
 const added=noncombatAddedTests;
 assert.deepEqual([...paths].sort(),[...proof.beforeInventory,...added].sort(),'complete noncombat inventory');
 for(const path of added)assert.equal(hash(readFileSync(path,'utf8').replaceAll('\r\n','\n')),proof.added[path],'unmeasured noncombat source: '+path);
 return paths.filter(path=>!added.includes(path));
}
