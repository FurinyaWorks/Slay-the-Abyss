// Test-only complete-source projection for the official battle slice at 5b3e9f11.
// Historical component receipts remain immutable; only complete source identities project.
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
// Additive continuation: retain the immutable 5b3e source archive above.
const alignmentArchive=readFileSync(new URL('./official-battle-alignment-source-epoch.json.gz',import.meta.url));
assert.equal(hash(alignmentArchive),'f834dafca07c62a1b807cbc7df3ae8619f3043a1627b8fb5dee5f464c420d458');
const alignmentBytes=gunzipSync(alignmentArchive);
assert.equal(hash(alignmentBytes),'d50eba8195f5d1ac24ae0d0c150c072a83bd360d868b5299252eed7ac0ee2005');
const alignment=JSON.parse(alignmentBytes);
assert.equal(alignment.schemaVersion,1);assert.equal(alignment.normalization,'LF');
assert.equal(alignment.beforeCommit,proof.afterCommit);
assert.deepEqual(Object.keys(alignment.files).sort(),[...Object.keys(proof.files),'src/lua/abyss_game_ui_input.lua','src/lua/abyss_battle_render_hud.lua'].sort());
for(const [path,binding]of Object.entries(alignment.files)){
 for(const side of ['before','after'])assert.equal(hash(binding[side+'Source']),binding[side+'Sha256']);
 if(Object.hasOwn(proof.files,path))assert.equal(binding.beforeSource,proof.files[path].afterSource);
 Object.freeze(binding);
}
Object.freeze(alignment.files);
export const officialBattleAlignmentSourceProof=Object.freeze(alignment);
// Additive profile-compatibility repair. Earlier archives remain immutable.
const bannerArchive=readFileSync(new URL('./official-banner-source-epoch.json.gz',import.meta.url));
assert.equal(hash(bannerArchive),'3f1f13b24b1fd05e01706937f14e905c7003d193b446b2133e8ec25548e91628');
const bannerBytes=gunzipSync(bannerArchive);assert.equal(hash(bannerBytes),'d7a9276ad6275b23a1f96d0520e143ff2592016e0452771328e126503456ba2d');
const banner=JSON.parse(bannerBytes);
assert.equal(banner.schemaVersion,1);assert.equal(banner.normalization,'LF');
assert.equal(banner.beforeCommit,'20a23f0095ed3f82020f0ccfb13bca3de617ac73');
assert.deepEqual(Object.keys(banner.files),['src/lua/abyss_battle_card_view.lua']);
for(const [path,binding]of Object.entries(banner.files)){
 for(const side of ['before','after'])assert.equal(hash(binding[side+'Source']),binding[side+'Sha256']);
 assert.equal(binding.beforeSource,alignment.files[path].afterSource);
 Object.freeze(binding);
}
Object.freeze(banner.files);
export const officialBannerSourceProof=Object.freeze(banner);
export function preOfficialBattleSource(path,source){
 const repair=Object.hasOwn(banner.files,path)?banner.files[path]:null;
 if(repair&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===repair.afterSha256)
  source=repair.beforeSource;
 const continuation=Object.hasOwn(alignment.files,path)?alignment.files[path]:null;
 if(continuation&&typeof source==='string'&&hash(source.replaceAll('\r\n','\n'))===continuation.afterSha256)
  source=continuation.beforeSource;
 const binding=Object.hasOwn(proof.files,path)?proof.files[path]:null;
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}
