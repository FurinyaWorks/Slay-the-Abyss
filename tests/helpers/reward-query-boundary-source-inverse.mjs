// Exact three-consumer outer epoch. Immutable source bytes are not permission:
// every projection rereads all three consumers and the complete configuration.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const normalize=s=>s.replaceAll('\r\n','\n');
const hash=s=>createHash('sha256').update(s).digest('hex');
const bytes=normalize(readFileSync(new URL('./reward-query-boundary-before.json',import.meta.url),'utf8'));
assert.equal(hash(bytes),'c8992ee4eec90d23fb6b923dd0017b1707abee1d0ac0ed5e7c3d6c2824dd08e8','complete reward query boundary source proof');
export const rewardQueryBoundaryProof=JSON.parse(bytes);
assert.equal(rewardQueryBoundaryProof.schemaVersion,1);
assert.equal(rewardQueryBoundaryProof.revision,'d8a57cae2a867200ca8e588abc0d368e6cdb3799');
assert.equal(rewardQueryBoundaryProof.normalization,'LF');
const files=rewardQueryBoundaryProof.files;
assert.deepEqual(Object.keys(files),['src/lua/abyss_relic_card_rewards.lua','src/lua/abyss_relic_choices.lua','src/lua/abyss_relic_pending.lua','config/architecture.json']);
for(const [path,file]of Object.entries(files)){
 assert.equal(file.beforeSource,normalize(file.beforeSource));
 assert.equal(hash(file.beforeSource),file.beforeSha256,'complete reward boundary before source: '+path);
 assert.equal(createHash('sha1').update('blob '+Buffer.byteLength(file.beforeSource)+'\0'+file.beforeSource).digest('hex'),file.beforeGitBlob,'independent d8 Git blob: '+path);
 Object.freeze(file);
}
Object.freeze(files);Object.freeze(rewardQueryBoundaryProof);
const readLive=p=>readFileSync(p,'utf8'),rawReaders=new WeakMap();
const identity=(path,source)=>typeof source==='string'&&Object.hasOwn(files,path)&&hash(normalize(source))===files[path].afterSha256;
const tokens=s=>s.replace(/"(?:\\.|[^"\\])*"|[ \t\r\n]+/g,t=>t.startsWith('"')?t:'');
function inputIdentity(path,source){
 if(identity(path,source))return true;
 if(path!=='config/architecture.json'||typeof source!=='string'||!source.includes('"reward-query-consumer-boundary"'))return false;
 try{
  const formatted=JSON.stringify(JSON.parse(source),null,2)+'\n';
  return tokens(source)===tokens(formatted)&&hash(formatted)===files[path].afterTokenSha256;
 }catch{return false;}
}
export function preRewardQueryBoundarySource(path,source,{readSource=readLive}={}){
 if(!inputIdentity(path,source))return source;
 assert.equal(typeof readSource,'function','reward query boundary linked reader must be a function');
 readSource=rawReaders.get(readSource)??readSource;
 for(const linked of Object.keys(files)){
  let current;try{current=readSource(linked);}catch(error){assert.fail('reward query boundary linked owner missing: '+linked+': '+String(error?.message??error));}
  assert(identity(linked,current),'reward query boundary linked owner identity: '+linked);
 }
 return files[path].beforeSource;
}
export function rewardQueryBoundaryReader(readSource=readLive){
 assert.equal(typeof readSource,'function','reward query boundary linked reader must be a function');
 if(rawReaders.has(readSource))return readSource;
 const reader=path=>preRewardQueryBoundarySource(path,readSource(path),{readSource});
 rawReaders.set(reader,readSource);return reader;
}
