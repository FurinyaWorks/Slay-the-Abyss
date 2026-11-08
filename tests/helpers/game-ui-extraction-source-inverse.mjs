// Leaf test-only boundary for one complete reviewed Host extraction. No historical
// owner imports this through production, and old source epochs perform no I/O.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,existsSync,realpathSync,rmSync} from 'node:fs';
import {join,relative,isAbsolute} from 'node:path';
import {preCoreLifecycleSource,coreLifecycleReader} from './core-lifecycle-source-inverse.mjs';
const normalize=s=>s.replaceAll('\r\n','\n');
const hash=s=>createHash('sha256').update(s).digest('hex');
const tokens=s=>s.replace(/"(?:\\.|[^"\\])*"|[ \t\r\n]+/g,t=>t.startsWith('"')?t:'');
const bytes=normalize(readFileSync(new URL('./game-ui-extraction-source-layer.json',import.meta.url),'utf8'));
assert.equal(hash(bytes),'b4d40fde943210b406acad1e296922af487066f301fcadb500374baf37771eb9','complete GameUI extraction source witness');
export const gameUiExtractionProof=JSON.parse(bytes);
const proof=gameUiExtractionProof;
for(const b of Object.values(proof.files))Object.freeze(b);
Object.freeze(proof.files);Object.freeze(proof);
export const gameUiExtractionAddedPaths=Object.freeze(['overlays','view','run','lifecycle','input'].map(name=>'src/lua/abyss_game_ui_'+name+'.lua'));
assert.equal(proof.schemaVersion,1);
assert.deepEqual(Object.keys(proof.files),['src/lua/abyss_game_ui.lua','config/architecture.json',...gameUiExtractionAddedPaths]);
for(const [path,b]of Object.entries(proof.files)){
 assert.match(b.afterSha256,/^[a-f0-9]{64}$/);
 if(gameUiExtractionAddedPaths.includes(path))assert.equal(b.beforeSource,null);
 else assert.equal(hash(b.beforeSource),b.beforeSha256,'complete pre-extraction source: '+path);
}
assert.equal(proof.files['src/lua/abyss_game_ui.lua'].beforeSha256,'165e2ad1180cab9daf5321b46d1f87fe9c34ed6ebbcd3c3a8b495d23974e0933');
const readLive=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
// Strict outer da6 epoch. Keep every older archive and oracle untouched. Only
// these complete files may expose the same 311 byte strings to linked readers.
const nativePageEpoch={
 'config/architecture.json':{
  after:'d5960c10973c9df9de5759519b8ce901e912aaef482403b481842068698342d1',
  before:'0e75d9e1f08cfb7738215b9a31cce141f03cc2469077bce0db3376fe1f446a9c',
  blob:'d572702dc8966a1770c1c6dab67ef947e563afb8',
  hunks:[['    "abyss_ui_profile": "platform",\n    "abyss_native_pages": "ui",\n','']],
 },
 'src/lua/abyss_game_ui.lua':{
  after:'757b84d15424fe567a635cddede31708bee98dd51fc9cc8683904a02c2c6db5d',
  before:'76a6a648d8a1090572adb98a1b2d49d52b3911a9f48f40c578ea683a6a31984b',
  blob:'b83d10b2473adf2795f67e44adaa167661fe4f0a',
  hunks:[['    local refreshPageVisibility = View.refreshPageVisibility(menu,self,suspendBattle,child,refreshMapResources,platform.nativePageLifecycle==true)\n',
   '    local refreshPageVisibility = View.refreshPageVisibility(menu,self,suspendBattle,child,refreshMapResources)\n']],
 },
 'src/lua/abyss_game_ui_view.lua':{
  after:'08f021ddfc7856f8de998c4af079927025fa03c469443f82232933de002bb105',
  before:'edd045e7a13a1bac5af2669c1cd682cb45d928edbda45d1b8af4d055a0850b89',
  blob:'f1310d11e0d8b1475439386ab18701dc49298da2',
  hunks:[["local NativePages=require('abyss_native_pages')\n",''],
   ['function M.refreshPageVisibility(menu,self,suspendBattle,child,refreshMapResources,nativePageLifecycle)\n    local syncNative=nativePageLifecycle==true and NativePages.new(child,self) or nil\n    return function(run,inMenu,deckOpen,potionOpen,blocked)\n            if syncNative then syncNative(run) end\n',
    'function M.refreshPageVisibility(menu,self,suspendBattle,child,refreshMapResources)\n    return function(run,inMenu,deckOpen,potionOpen,blocked)\n']],
 },
};
const nativePageRawReaders=new WeakMap();
function nativePageIdentity(path,source){
 const b=nativePageEpoch[path];if(!b||typeof source!=='string')return false;
 if(hash(normalize(source))===b.after)return true;
 if(path!=='config/architecture.json')return false;
 try{
  const formatted=JSON.stringify(JSON.parse(source),null,2)+'\n';
  return tokens(source)===tokens(formatted)&&hash(formatted)==='be5d71bdf62beef6f138c4ba380cebcdbac98570d4aafd9826ed10410c3b7d8d';
 }catch{return false;}
}
export function preNativePageSource(path,source,{readSource=readLive}={}){
 if(!nativePageIdentity(path,source))return source;
 readSource=nativePageRawReaders.get(readSource)??readSource;
 let linked;
 try{
  linked=Object.fromEntries(Object.entries(nativePageEpoch).map(([p,b])=>{
   const value=normalize(readSource(p));
   assert.equal(hash(value),b.after,'complete native-page linked owner: '+p);return [p,value];
  }));
 }catch{return source;}
 const b=nativePageEpoch[path];let previous=linked[path];
 for(const [after,before]of b.hunks){
  assert.equal(previous.split(after).length,2,'one exact native-page source delta: '+path);
  previous=previous.replace(after,before);
 }
 assert.equal(hash(previous),b.before,'all bytes outside native-page deltas remain unchanged: '+path);
 assert.equal(createHash('sha1').update('blob '+Buffer.byteLength(previous)+'\0'+previous).digest('hex'),b.blob,'independent311 Git blob: '+path);
 return previous;
}
function nativePageReader(readSource){
 if(typeof readSource!=='function')return readSource;
 if(nativePageRawReaders.has(readSource))return readSource;
 const reader=p=>preNativePageSource(p,readSource(p),{readSource});
 nativePageRawReaders.set(reader,readSource);return reader;
}
const rawReaders=new WeakMap();
const requiredArchitectureKeys=gameUiExtractionAddedPaths.map(path=>'"'+path.split('/').at(-1).slice(0,-4)+'"');
function identity(path,source){
 if(typeof source!=='string')return false;
 const b=proof.files[path];if(!b)return false;
 if(path!=='config/architecture.json')return hash(normalize(source))===b.afterSha256;
 // Exact bytes already certify the complete current config. Historical epochs
 // cannot match its strict unescaped tokens if any required owner name is absent.
 if(requiredArchitectureKeys.some(key=>!source.includes(key)))return false;
 if(hash(normalize(source))===b.afterSha256)return true;
 try{
  const formatted=JSON.stringify(JSON.parse(source),null,2)+'\n';
  return tokens(source)===tokens(formatted)&&hash(formatted)===b.afterTokenSha256;
 }catch{return false;}
}
function validate(readSource){
 assert.equal(typeof readSource,'function','GameUI extraction linked reader must be a function');
 readSource=rawReaders.get(readSource)??readSource;
 for(const path of Object.keys(proof.files)){
  const source=readSource(path);
  assert.ok(identity(path,source),'reviewed GameUI extraction linked owner: '+path);
 }
}
export function preGameUiExtractionSource(path,source,{readSource=readLive}={}){
 readSource=rawReaders.get(readSource)??readSource;
 source=preNativePageSource(path,source,{readSource});
 readSource=nativePageReader(readSource);
 source=preCoreLifecycleSource(path,source,{readSource});
 // Reject path/type/hash/token drift before reading any detached owner.
 if(!identity(path,source))return source;
 validate(coreLifecycleReader(readSource));
 return proof.files[path].beforeSource;
}
export function gameUiExtractionReader(readSource=readLive){
 assert.equal(typeof readSource,'function','GameUI extraction linked reader must be a function');
 if(rawReaders.has(readSource))return readSource;
 const reader=path=>preGameUiExtractionSource(path,readSource(path),{readSource});
 rawReaders.set(reader,readSource);
 return reader;
}
const inside=(root,target)=>{const rel=relative(root,target);return !!rel&&!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..\\')&&!rel.startsWith('../');};
export function prepareGameUiExtractionModuleRetirement(directory,{sourceRoot=process.cwd()}={}){
 const destination=realpathSync.native(directory),source=realpathSync.native(sourceRoot);
 // Historical materializers create real copies under sourceRoot/build so they
 // inherit installed dependencies. Protect live code/owners, not all descendants.
 assert.ok(destination!==source&&!inside(destination,source),'GameUI extraction retirement requires an isolated historical destination');
 const liveDirectories=new Set(),liveOwners=new Set();
 function targets(){
  assert.equal(realpathSync.native(directory),destination,'GameUI extraction retirement destination changed after preparation');
  const lua=join(source,'src/lua');if(existsSync(lua))liveDirectories.add(realpathSync.native(lua));
  for(const path of gameUiExtractionAddedPaths){
   const owner=join(source,path);if(existsSync(owner))liveOwners.add(realpathSync.native(owner));
  }
  assert.ok([...liveDirectories].every(root=>destination!==root&&!inside(root,destination)&&!inside(destination,root)),
   'GameUI extraction retirement requires an isolated historical destination');
  const result=[];
  for(const path of gameUiExtractionAddedPaths){
   const target=join(directory,path);if(!existsSync(target))continue;
   const actual=realpathSync.native(target);
   assert.ok(inside(destination,actual)&&!liveOwners.has(actual)
    &&![...liveDirectories].some(root=>actual===root||inside(root,actual)),
    'GameUI extraction retirement target aliases source: '+path);
   const current=readFileSync(actual,'utf8');
   const historical=preNativePageSource(path,current,{readSource:p=>readFileSync(join(source,p),'utf8')});
   assert.ok(identity(path,historical),'reviewed GameUI extraction retirement module: '+path);
   result.push(actual);
  }
  return result;
 }
 targets();
 return ()=>{const verified=targets();for(const target of verified)rmSync(target);};
}
