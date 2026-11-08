// Exact three-owner Watcher capability epoch. Frozen bytes are never authorization.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=s=>createHash('sha256').update(s).digest('hex');
const normalize=s=>s.replaceAll('\r\n','\n');
const archive=readFileSync(new URL('../fixtures/watcher-actor-before.json.gz',import.meta.url));
assert.equal(hash(archive),'47f5750ba3ed1f804a18eb992b0944cb5adbd4ab5c43f1c4cf60827247c1af5e');
const bytes=gunzipSync(archive);
assert.equal(hash(bytes),'e584aa3fb65bc8441c5034cfb9e546e52923618a22bdc473485a09029ca670fe');
const before=JSON.parse(bytes);
const identities={
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
  "afterSha256": "1029141b94ce57d2a44b306174e8201afc85b372825af0546b69a46b61750c88"
 }
};
assert.deepEqual(Object.keys(before),Object.keys(identities));
for(const [path,binding]of Object.entries(identities)){
 assert.equal(before[path],normalize(before[path]));
 assert.equal(hash(before[path]),binding.beforeSha256,'complete frozen Watcher owner: '+path);
 Object.freeze(binding);
}
export const watcherActorSourceProof=Object.freeze(identities);
const readLive=p=>readFileSync(p,'utf8'),rawReaders=new WeakMap();
const matches=(path,source)=>typeof source==='string'&&Object.hasOwn(identities,path)&&hash(normalize(source))===identities[path].afterSha256;
export function preWatcherActorSource(path,source,{readSource=readLive}={}){
 if(!matches(path,source))return source;
 readSource=rawReaders.get(readSource)??readSource;
 assert.equal(typeof readSource,'function','Watcher linked reader must be a function');
 for(const owner of Object.keys(identities)){
  let current;try{current=readSource(owner);}catch(error){assert.fail('Watcher linked owner missing: '+owner+': '+String(error?.message??error));}
  assert(matches(owner,current),'Watcher linked owner identity: '+owner);
 }
 return before[path];
}
export function watcherActorReader(readSource=readLive){
 assert.equal(typeof readSource,'function','Watcher linked reader must be a function');
 if(rawReaders.has(readSource))return readSource;
 const reader=path=>preWatcherActorSource(path,readSource(path),{readSource});
 rawReaders.set(reader,readSource);return reader;
}
