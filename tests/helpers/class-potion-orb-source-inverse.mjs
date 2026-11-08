// Exact four-owner potion capability epoch. Frozen bytes are never authorization.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=s=>createHash('sha256').update(s).digest('hex');
const normalize=s=>s.replaceAll('\r\n','\n');
const archive=readFileSync(new URL('../fixtures/class-potion-orb-before.json.gz',import.meta.url));
assert.equal(hash(archive),'5bd98d551db3dae6b436b20bc9c78d4dc50b0b70442dded20405d792e0bcacc3');
const bytes=gunzipSync(archive);
assert.equal(hash(bytes),'277d5457ec3e5a09be4a96795b87a82403ba950ff3f2e49f077f2e16a4a8838b');
const before=JSON.parse(bytes);
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
 "config/architecture.json": {
  "beforeSha256": "0e75d9e1f08cfb7738215b9a31cce141f03cc2469077bce0db3376fe1f446a9c",
  "afterSha256": "e76b585d9bcb486f3d53059dde1d79a13e46917d5bc8dae4f95638096a706c5e"
 }
};
assert.deepEqual(Object.keys(before),Object.keys(identities));
for(const [path,binding]of Object.entries(identities)){
 assert.equal(before[path],normalize(before[path]));
 assert.equal(hash(before[path]),binding.beforeSha256,'complete frozen potion owner: '+path);
 Object.freeze(binding);
}
export const classPotionOrbSourceProof=Object.freeze(identities);
const readLive=p=>readFileSync(p,'utf8'),rawReaders=new WeakMap();
const matches=(path,source)=>typeof source==='string'&&Object.hasOwn(identities,path)&&hash(normalize(source))===identities[path].afterSha256;
export function preClassPotionOrbSource(path,source,{readSource=readLive}={}){
 if(!matches(path,source))return source;
 readSource=rawReaders.get(readSource)??readSource;
 assert.equal(typeof readSource,'function','potion linked reader must be a function');
 for(const owner of Object.keys(identities)){
  let current;try{current=readSource(owner);}catch(error){assert.fail('potion linked owner missing: '+owner+': '+String(error?.message??error));}
  assert(matches(owner,current),'potion linked owner identity: '+owner);
 }
 return before[path];
}
export function classPotionOrbReader(readSource=readLive){
 assert.equal(typeof readSource,'function','potion linked reader must be a function');
 if(rawReaders.has(readSource))return readSource;
 const reader=path=>preClassPotionOrbSource(path,readSource(path),{readSource});
 rawReaders.set(reader,readSource);return reader;
}
