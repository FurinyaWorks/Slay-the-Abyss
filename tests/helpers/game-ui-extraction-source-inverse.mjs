// Proposal facade: the original epoch module and its oracle are byte-for-byte frozen.
export * from './epochs/develop/tests/helpers/game-ui-extraction-source-inverse.mjs';
import { preGameUiExtractionSource as original } from './epochs/develop/tests/helpers/game-ui-extraction-source-inverse.mjs';
import {sourceEpoch} from './combined-epoch/source-epoch.mjs';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {existsSync,realpathSync,statSync,rmSync} from 'node:fs';
import {join,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {gameUiExtractionProof,gameUiExtractionAddedPaths} from './epochs/develop/tests/helpers/game-ui-extraction-source-inverse.mjs';
const hash=s=>createHash('sha256').update(s.replaceAll('\r\n','\n')).digest('hex');
const live=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
export function preGameUiExtractionSource(path,source,{readSource=live}={}){
 readSource=readers.get(readSource)??readSource;
 if(typeof readSource!=='function'){
  if(typeof source==='string'&&sourceEpoch.proof.current[path]?.sha256===hash(source))
   assert.equal(typeof readSource,'function','GameUI extraction linked reader must be a function');
  return original(path,source,{readSource});
 }
 const projected=sourceEpoch.preCombinedSource(path,source,{target:'develop',readSource});
 return original(path,projected,{readSource:(typeof readSource==='function'?sourceEpoch.combinedReader(readSource,'develop'):readSource)});
}
const readers=new WeakMap();
export function gameUiExtractionReader(readSource=live){
 assert.equal(typeof readSource,'function','GameUI extraction linked reader must be a function');
 if(readers.has(readSource))return readSource;
 const reader=path=>preGameUiExtractionSource(path,readSource(path),{readSource});
 readers.set(reader,readSource);return reader;
}

import {preNativePageSource as nativeOriginal} from './epochs/native/tests/helpers/game-ui-extraction-source-inverse.mjs';
export function preNativePageSource(path,source,{readSource=live}={}){
 const projected=sourceEpoch.preCombinedSource(path,source,{target:'native',readSource});
 return nativeOriginal(path,projected,{readSource:(typeof readSource==='function'?sourceEpoch.combinedReader(readSource,'native'):readSource)});
}

const inside=(root,path)=>{const rel=relative(root,path);return rel!==''&&!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('../')&&!rel.startsWith('..\\');};
// Retire only byte-authenticated copies. The original proof, old source epochs,
// and their read-count contracts are imported unchanged above.
export function prepareGameUiExtractionModuleRetirement(directory,{sourceRoot=process.cwd()}={}){
 const destination=realpathSync.native(directory),source=realpathSync.native(sourceRoot);
 assert(destination!==source&&!inside(destination,source),'GameUI extraction retirement requires an isolated historical destination');
 const directoryIdentity=statSync(destination),initial=new Map(),liveDirectories=new Set(),liveOwners=new Set();
 const raw=path=>readFileSync(join(source,path),'utf8');
 function identity(path,current){
  const expected=gameUiExtractionProof.files[path].afterSha256;
  if(hash(current)===expected)return true;
  // A standalone native epoch retains its exact original three-owner admission.
  const native=nativeOriginal(path,current,{readSource:raw});
  if(hash(native)===expected)return true;
  try{
   const previous=sourceEpoch.preCombinedSource(path,current,{target:'develop',readSource:raw});
   return hash(previous)===expected;
  }catch(error){assert.fail('reviewed GameUI extraction retirement module: '+path+': '+String(error?.message??error));}
 }
 function targets(preparing=false){
  assert.equal(realpathSync.native(directory),destination,'GameUI extraction retirement destination changed after preparation');
  const directoryNow=statSync(destination);
  assert(directoryNow.dev===directoryIdentity.dev&&directoryNow.ino===directoryIdentity.ino,'GameUI extraction retirement destination changed after preparation');
  const lua=join(source,'src/lua');if(existsSync(lua))liveDirectories.add(realpathSync.native(lua));
  for(const path of gameUiExtractionAddedPaths){const owner=join(source,path);if(existsSync(owner))liveOwners.add(realpathSync.native(owner));}
  assert([...liveDirectories].every(root=>destination!==root&&!inside(root,destination)&&!inside(destination,root)),'GameUI extraction retirement requires an isolated historical destination');
  const result=[];
  // Validate every target path and identity before any caller may delete a file.
  for(const path of gameUiExtractionAddedPaths){
   const target=join(directory,path);if(!existsSync(target))continue;
   const actual=realpathSync.native(target),info=statSync(actual);
   assert(inside(destination,actual)&&!liveOwners.has(actual)&&![...liveDirectories].some(root=>actual===root||inside(root,actual)),'GameUI extraction retirement target aliases source: '+path);
   assert.equal(info.nlink,1,'GameUI extraction retirement requires single link: '+path);
   for(const owner of liveOwners){
    let liveInfo;try{liveInfo=statSync(owner);}catch(error){assert.fail('GameUI extraction retirement module source missing: '+owner+': '+String(error?.message??error));}
    assert(info.dev!==liveInfo.dev||info.ino!==liveInfo.ino,'GameUI extraction retirement inode aliases source: '+path);
   }
   if(preparing)initial.set(path,{actual,dev:info.dev,ino:info.ino});
   else{const before=initial.get(path);assert(before&&before.actual===actual&&before.dev===info.dev&&before.ino===info.ino,'GameUI extraction retirement module changed after preparation: '+path);}
   result.push({path,actual});
  }
  for(const {path,actual}of result)assert(identity(path,readFileSync(actual,'utf8')),'reviewed GameUI extraction retirement module: '+path);
  return result.map(row=>row.actual);
 }
 targets(true);
 return ()=>{const verified=targets();for(const target of verified)rmSync(target);};
}
