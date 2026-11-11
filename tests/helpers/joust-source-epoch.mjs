// Exact Joust outer source identity. Existing historical archives remain frozen.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const bytes=readFileSync(new URL('./joust-source-epoch.json.gz',import.meta.url));
assert.equal(hash(bytes),'fa0c3a6e28217ca6c5c7731c399f911cb6008b84c2c6d1afa5f3c042dee47a0d','Joust compressed identity');
const text=gunzipSync(bytes);assert.equal(hash(text),'236802c5f9f26580beb8096f7887b8b4f9291d3cb3b5b3b6e57db4faa80a901e','Joust complete identity');
const archive=JSON.parse(text);
assert.equal(archive.schemaVersion,1);
assert.equal(archive.path,'src/lua/abyss_joust_event.lua');
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
for(const row of [archive.before,archive.current]){
 assert.equal(hash(row.source),row.sha256);assert.equal(row.source.replaceAll('\r\n','\n'),row.source);
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(row.source)}\0`).update(row.source).digest('hex'),row.gitBlob);
}
freeze(archive);
export const joustSourceProof=archive;
export function extendJoustEpoch(prior){
 assert.deepEqual(archive.before,prior.proof.current[archive.path],'Joust complete predecessor identity');
 const current={...prior.proof.current,[archive.path]:archive.current};
 const proof=freeze({...prior.proof,currentTreeCommitted:false,
  currentCommitRole:'composed Joust source identity; not a committed historical corpus',
  joustCollectedBaseCommit:archive.baseCommit,current,
  owners:[...new Set([...prior.proof.owners,archive.path])],
  targets:{...prior.proof.targets,joustPrior:{commit:archive.baseCommit,files:prior.proof.current}}});
 return createSourceEpochProjector(proof,{allowConfigLayout:true,reuseFrozenInput:true});
}
