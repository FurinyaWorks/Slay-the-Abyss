// Exact full-source continuation for the reviewed battle pile slice.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./official-battle-pile-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'2fbf3dba8ff4992cae4eccef2d8c27af70fc7a22c726fa72ece6fe5dfb3a1ccd');
const bytes=gunzipSync(archive);assert.equal(hash(bytes),'5b11a3bd811ee4afd89b8cb678ad129f83fe00a1af02e16e427e7b449efcd4e1');
export const pileSourceProof=JSON.parse(bytes);
for(const r of Object.values(pileSourceProof.files))for(const side of ['before','after']){assert.equal(hash(r[side+'Source']),r[side+'Sha256']);assert.equal(createHash('sha1').update('blob '+Buffer.byteLength(r[side+'Source'])+'\0').update(r[side+'Source']).digest('hex'),r[side+'GitBlobSha1']);}
export function prePileSource(path,source){const r=Object.hasOwn(pileSourceProof.files,path)&&pileSourceProof.files[path];return r&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===r.afterSha256?r.beforeSource:source;}
for(const r of Object.values(pileSourceProof.files))Object.freeze(r);Object.freeze(pileSourceProof.files);Object.freeze(pileSourceProof.unprojectedChanges);Object.freeze(pileSourceProof);
