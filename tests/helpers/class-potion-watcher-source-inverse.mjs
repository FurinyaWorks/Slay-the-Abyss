// Exact combined six-owner epoch. Every projection revalidates all live owners.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {preClassPotionOrbSource,classPotionOrbSourceProof} from './class-potion-orb-source-inverse.mjs';
import {preWatcherActorSource,watcherActorSourceProof} from './watcher-actor-source-inverse.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const normalize=s=>s.replaceAll('\r\n','\n');
const archive=readFileSync(new URL('../fixtures/class-potion-watcher-before.json.gz',import.meta.url));
assert.equal(hash(archive),'3d119313edd5f75f5c2cba056a96cba8a66504f8eca6c0473b6170b62395de5a');
const bytes=gunzipSync(archive);
assert.equal(hash(bytes),'2b33c15098cad629eb57e0925a17fbc2787225807775025ab7f213ee97079e71');
const {before,standaloneArchitecture}=JSON.parse(bytes);
const identities={
 "src/lua/abyss_class_potions.lua": {
  "beforeSha256": "ae68080730c0286280b04fdebb95e95e2415021873264e6628eb9bc2bddfb3b9",
  "afterSha256": "4cb57fc32fef1c086c5ee726008ce016fcb85b0f5b1c60a3c69a7a34180fd5b9"
 },
 "src/lua/abyss_card_actions.lua": {
  "beforeSha256": "a89ef438e2f28f366fda05676b0724f5eac59c3447621d1253050b3105424578",
  "afterSha256": "8248d11eb5ab15c46763ef722b72aff3ac5dbde2c5e6b4da7b3103f5066ae4f4"
 },
 "src/lua/abyss_combat_effect_dispatch.lua": {
  "beforeSha256": "02fdbcf79108fb702d6e9508a989e12f2eb296e59d8a181ebe3ed80435aa269d",
  "afterSha256": "5bf02c9a8800e10abed38f7718f62f77c150ff6739132bf57a4127846d1d0ca7"
 },
 "src/lua/abyss_watcher_attack_cards.lua": {
  "beforeSha256": "c6adcaf2a4c88988e7e957104a4812c9cefcd67a9740a2290cd73b9e3aa2d38e",
  "afterSha256": "f34c4b292fa104724b98a05324ed931448ee21d9cf58ca946c8e33f6b22b4f00"
 },
 "src/lua/abyss_combat_queued_play.lua": {
  "beforeSha256": "ee51b70a7afbb8584b86dfd32477a9a9a29338128393f68a03065dcbd1b62ad7",
  "afterSha256": "8cdb95b829af4572932daa356ca0456a385c5cad5afb7950da2f2b47a5152d15"
 },
 "config/architecture.json": {
  "beforeSha256": "0e75d9e1f08cfb7738215b9a31cce141f03cc2469077bce0db3376fe1f446a9c",
  "afterSha256": "eedbc5648d98b9ac7b3b2e4b4a668e51b3e5a71151345a287bc3f85504a56624"
 }
};
assert.deepEqual(Object.keys(before),Object.keys(identities));
for(const [path,binding]of Object.entries(identities)){
 assert.equal(before[path],normalize(before[path]));
 assert.equal(hash(before[path]),binding.beforeSha256,'complete frozen combined owner: '+path);
 const original=classPotionOrbSourceProof[path]??watcherActorSourceProof[path];
 assert.equal(binding.beforeSha256,original.beforeSha256);
 if(path!=='config/architecture.json')assert.equal(binding.afterSha256,original.afterSha256);
 Object.freeze(binding);
}
for(const [epoch,proof]of [['potion',classPotionOrbSourceProof],['watcher',watcherActorSourceProof]])assert.equal(hash(standaloneArchitecture[epoch]),proof['config/architecture.json'].afterSha256);
export const standaloneArchitectureSource=Object.freeze(standaloneArchitecture);
export const classPotionWatcherSourceProof=Object.freeze(identities);
const readLive=p=>readFileSync(p,'utf8'),rawReaders=new WeakMap();
const matches=(path,source)=>typeof source==='string'&&Object.hasOwn(identities,path)&&hash(normalize(source))===identities[path].afterSha256;
export function preClassPotionWatcherSource(path,source,{readSource=readLive}={}){
 if(!matches(path,source))return source;
 readSource=rawReaders.get(readSource)??readSource;
 assert.equal(typeof readSource,'function','combined linked reader must be a function');
 for(const owner of Object.keys(identities)){
  let current;try{current=readSource(owner);}catch(error){assert.fail('combined linked owner missing: '+owner+': '+String(error?.message??error));}
  assert(matches(owner,current),'combined linked owner identity: '+owner);
 }
 return before[path];
}
// Preserve both independently frozen historical branches. Unknown/drifted config
// never authorizes a combined projection; the six-owner verifier rejects it.
export function preIntegratedCapabilitySource(path,source,{readSource=readLive}={}){
 readSource=rawReaders.get(readSource)??readSource;
 // Standalone config bytes are valid entry tokens too, but never bypass the
 // opposite owners: they must still match the complete six-owner epoch.
 const standaloneConfig=path==='config/architecture.json'&&typeof source==='string'&&[classPotionOrbSourceProof,watcherActorSourceProof].some(proof=>hash(normalize(source))===proof[path].afterSha256);
 if(matches(path,source)||standaloneConfig){
  assert.equal(typeof readSource,'function','combined linked reader must be a function');
  let config;try{config=readSource('config/architecture.json');}catch(error){assert.fail('combined linked owner missing: config/architecture.json: '+String(error?.message??error));}
  if(standaloneConfig||typeof config==='string'){
   const digest=hash(normalize(standaloneConfig?source:config));
   for(const [proof,project]of [[classPotionOrbSourceProof,preClassPotionOrbSource],[watcherActorSourceProof,preWatcherActorSource]]){
    if(digest!==proof['config/architecture.json'].afterSha256)continue;
    for(const owner of Object.keys(identities)){
     let current;try{current=readSource(owner);}catch(error){assert.fail('combined linked owner missing: '+owner+': '+String(error?.message??error));}
     const expected=proof[owner]?.afterSha256??identities[owner].beforeSha256;
     assert(typeof current==='string'&&hash(normalize(current))===expected,'combined linked owner identity: '+owner);
    }
    return project(path,source,{readSource});
   }
  }
  return preClassPotionWatcherSource(path,source,{readSource});
 }
 return source;
}
export function classPotionWatcherReader(readSource=readLive){
 assert.equal(typeof readSource,'function','combined linked reader must be a function');
 if(rawReaders.has(readSource))return readSource;
 const reader=path=>preIntegratedCapabilitySource(path,readSource(path),{readSource});
 rawReaders.set(reader,readSource);return reader;
}
