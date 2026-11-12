// Preserve historical scheduling receipts while Full discovers every new test.
import assert from 'node:assert/strict';
import {preOfficialUiRepairSource} from './official-ui-repair-source-epoch.mjs';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
const bytes=readFileSync(new URL('./battle-queue-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(bytes),'4f5966d2b04fbdd564d0455aa318c3947468906581b6fa7a6a8d334f18f44db4');
export const battleQueueCiProof=JSON.parse(gunzipSync(bytes));
for(const row of Object.values(battleQueueCiProof.files))assert.equal(hash(row.current),row.sha256);
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
freeze(battleQueueCiProof);
export function preBattleQueueCiSource(path,source){
 source=preOfficialUiRepairSource(path,source);
 const row=Object.hasOwn(battleQueueCiProof.files,path)?battleQueueCiProof.files[path]:null;
 return row&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===row.sha256?row.before:source;
}
export function preBattleQueueCiInventory(paths){
 const proof=battleQueueCiProof;
 assert.deepEqual([...paths].sort(),[...proof.oldInventory,...Object.keys(proof.added)].sort(),'complete battle continuation inventory');
 for(const [p,sha]of Object.entries(proof.added))assert.equal(hash(preOfficialUiRepairSource(p,readFileSync(p,'utf8')).replaceAll('\r\n','\n')),sha,'battle added source: '+p);
 return [...proof.oldInventory];
}
