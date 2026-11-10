// Proposal only. No authorization cache; callers retain the original epoch proofs.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {types} from 'node:util';
const normalize=s=>s.replaceAll('\r\n','\n');
const hash=s=>createHash('sha256').update(s).digest('hex');
// Only pure computations over complete immutable strings are memoized. Readers,
// owner authorization and projection results never enter these bounded caches.
function cacheStringCalculation(calculate){
 const cache=new Map(),limit=2*1024*1024;let retained=0;
 return source=>{
  if(cache.has(source))return cache.get(source);
  const result=calculate(source);
  if(source.length<=limit){
   while(cache.size>=256||retained+source.length>limit){
    const first=cache.keys().next().value;retained-=first.length;cache.delete(first);
   }
   cache.set(source,result);retained+=source.length;
  }
  return result;
 };
}
const sourceHash=cacheStringCalculation(source=>hash(normalize(source)));
// Input layout permission never applies to linked raw owners. Preserve every
// token, including string escapes, key order and duplicates, without reserialization.
const tokens=s=>s.replace(/"(?:\\.|[^"\\])*"|[ \t\r\n]+/g,t=>t.startsWith('"')?t:'');
function configLayoutMatcher(current){
 const currentTokens=tokens(current);
 return cacheStringCalculation(source=>{
 // Whitespace inside a number or keyword is not JSON layout. Parsing is only
 // a syntax gate; the original token text still decides identity.
 try{JSON.parse(source);}catch{return false;}
 return tokens(source)===currentTokens;
 });
}
const validPath=p=>p==='config/architecture.json'||/^src\/lua\/[A-Za-z0-9_-]+\.lua$/.test(p);
function freeze(value){if(value&&typeof value==='object'){for(const v of Object.values(value))freeze(v);Object.freeze(value);}return value;}
function validateBinding(binding){
 if(binding===null)return;
 assert.equal(typeof binding?.source,'string','source identity text');
 assert.equal(normalize(binding.source),binding.source,'source identity LF');
 assert.equal(hash(binding.source),binding.sha256,'source identity SHA256');
 if(binding.gitBlob)assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.source)}\0`).update(binding.source).digest('hex'),binding.gitBlob,'source identity Git blob');
}
// Preserve the old JSON conversion for non-JSON inputs. For ordinary proof data,
// copy containers without serializing their large immutable source strings.
// Like JSON, duplicate aliased containers; neither path retains input objects.
function cloneProof(input){
 const seen=new WeakSet(),active=new WeakSet();
 function plain(value){
  if(value===null||typeof value==='string'||typeof value==='boolean')return true;
  if(typeof value==='number')return Number.isFinite(value)&&!Object.is(value,-0);
  if(typeof value!=='object'||types.isProxy(value))return false;
  if(active.has(value))return false;
  if(seen.has(value))return true;
  const array=Array.isArray(value),prototype=Object.getPrototypeOf(value);
  if(array?prototype!==Array.prototype:prototype!==Object.prototype&&prototype!==null)return false;
  if('toJSON' in value)return false;
  const keys=Object.keys(value);
  if(array&&(keys.length!==value.length||keys.some((key,index)=>key!==String(index))))return false;
  active.add(value);
  for(const key of keys){
   const descriptor=Object.getOwnPropertyDescriptor(value,key);
   if(!Object.hasOwn(descriptor,'value')||!plain(descriptor.value))return false;
  }
  active.delete(value);seen.add(value);return true;
 }
 function copy(value){
  if(value===null||typeof value!=='object')return value;
  if(Array.isArray(value)){
   const result=[];
   for(let index=0;index<value.length;index++)Object.defineProperty(result,index,{value:copy(value[index]),enumerable:true,writable:true,configurable:true});
   return result;
  }
  return Object.fromEntries(Object.keys(value).map(key=>[key,copy(value[key])]));
 }
 return plain(input)?copy(input):JSON.parse(JSON.stringify(input));
}
export function createSourceEpochProjector(input,{root=process.cwd(),allowConfigLayout=false}={}){
 // Clone once to prevent the caller changing proof data after validation.
 const proof=cloneProof(input);
 assert.equal(proof.schemaVersion,1);assert.equal(proof.normalization,'LF');
 assert.match(proof.currentCommit,/^[a-f0-9]{40}$/);
 assert(Array.isArray(proof.owners));assert.equal(new Set(proof.owners).size,proof.owners.length,'unique owners');
 for(const [path,binding]of Object.entries(proof.current)){assert(validPath(path),'source path');validateBinding(binding);}
 for(const owner of proof.owners){assert(validPath(owner),'owner path');assert(Object.hasOwn(proof.current,owner),'owner current identity');}
 for(const [name,target]of Object.entries(proof.targets)){
  assert(/^[A-Za-z0-9_-]+$/.test(name),'target name');assert.match(target.commit,/^[a-f0-9]{40}$/);
  assert.deepEqual(Object.keys(target.files).sort(),Object.keys(proof.current).sort(),'complete target path set');
  for(const [path,binding]of Object.entries(target.files)){
   validateBinding(binding);
   if(binding?.sha256!==proof.current[path]?.sha256)assert(proof.owners.includes(path),'changed source closure');
  }
 }
 freeze(proof);
 const sameConfigLayout=allowConfigLayout&&proof.current['config/architecture.json']
  ?configLayoutMatcher(proof.current['config/architecture.json'].source):()=>false;
 const readers=new WeakMap(),readLive=path=>{
  try{return readFileSync(resolve(root,path),'utf8');}catch(error){if(error.code==='ENOENT')return null;throw error;}
 };
 function requireTarget(target){assert(Object.hasOwn(proof.targets,target),'unknown source target');return proof.targets[target];}
 function rawReader(reader){return readers.get(reader)?.raw??reader;}
 function preCombinedSource(path,source,{target,readSource=readLive}={}){
  const destination=requireTarget(target),current=proof.current[path],before=destination.files[path];
  // New witnesses are retained here; retirement belongs to a separate checked
  // materializer. Unknown/original/foreign bytes never authorize owner reads.
  if(typeof source!=='string'||!current||!before||current.sha256===before.sha256||(sourceHash(source)!==current.sha256&&(!allowConfigLayout||path!=='config/architecture.json'||!sameConfigLayout(source))))return source;
  assert.equal(typeof readSource,'function','linked owner reader');readSource=rawReader(readSource);
  for(const owner of proof.owners){
   let actual;try{actual=readSource(owner);}catch(error){assert.fail('combined linked owner missing: '+owner+': '+String(error?.message??error));}
   const binding=proof.current[owner];
   assert(binding===null?actual===null||actual===undefined:typeof actual==='string'&&sourceHash(actual)===binding.sha256,'combined linked owner identity: '+owner);
  }
  return before.source;
 }
 function combinedReader(readSource=readLive,target){
  requireTarget(target);assert.equal(typeof readSource,'function','linked owner reader');
  const prior=readers.get(readSource);if(prior?.target===target)return readSource;
  const raw=rawReader(readSource),reader=path=>preCombinedSource(path,raw(path),{target,readSource:raw});
  readers.set(reader,{raw,target});return reader;
 }
 return Object.freeze({proof,preCombinedSource,combinedReader,readerTarget:reader=>readers.get(reader)?.target});
}
