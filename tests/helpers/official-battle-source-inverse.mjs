// Test-only complete-source projection for the official battle slice at 5b3e9f11.
// Historical component receipts and production presentation stay unchanged.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const hash=source=>createHash('sha256').update(source).digest('hex');
const archive=readFileSync(new URL('./official-battle-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'5e74438e077be47b5b176287b6ceeb71e69447fa32ceedf2b0e595c4499d3c80');
const bytes=gunzipSync(archive);
assert.equal(hash(bytes),'97f8660e70ac4b88d23ae4af745c4acd2d4c42e4c5c5da0b7aac9c62a83bc5f2');
const proof=JSON.parse(bytes);
assert.equal(proof.schemaVersion,1);assert.equal(proof.normalization,'LF');
for(const binding of Object.values(proof.files)){
 for(const side of ['before','after'])assert.equal(hash(binding[side+'Source']),binding[side+'Sha256']);
 Object.freeze(binding);
}
Object.freeze(proof.files);
export const officialBattleSourceProof=Object.freeze(proof);
export function preOfficialBattleSource(path,source){
 const binding=Object.hasOwn(proof.files,path)?proof.files[path]:null;
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}
