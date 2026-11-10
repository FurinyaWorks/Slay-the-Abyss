// Complete matching base modules for older three-argument Actor death replays.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {luaString} from '../../scripts/build-lua-data.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const compressed=readFileSync(new URL('./stasis-replay-before.json.gz',import.meta.url));
assert.equal(hash(compressed),'a226cdbcd712c545b1b8befb262f909b200fb97f7a4dfc271af4f119d98c6290');
const bytes=gunzipSync(compressed);assert.equal(hash(bytes),'57d1e414e4f103c12e0348e1eedd0707a6b3f09fd1410905e7cc894ac13a336f');
export const stasisReplayBefore=JSON.parse(bytes);
assert.equal(stasisReplayBefore.revision,'4a51905537fa223e5df4e5ee475152c8a6629af5');
assert.deepEqual(Object.keys(stasisReplayBefore.files),['abyss_act2_powers','abyss_act2_stasis']);
for(const [name,file]of Object.entries(stasisReplayBefore.files)){
 assert.equal(file.path,'src/lua/'+name+'.lua');assert.equal(hash(file.source),file.sha256);
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(file.source)}\0`).update(file.source).digest('hex'),file.gitBlob);
 Object.freeze(file);
}
Object.freeze(stasisReplayBefore.files);Object.freeze(stasisReplayBefore);
export function priorStasisReplayPrelude(){
 return Object.entries(stasisReplayBefore.files).map(([name,file])=>`package.preload[${luaString(name)}]=assert(load(${luaString(file.source)},${luaString('@'+file.path)}));`).join('');
}
