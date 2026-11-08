// Proposal only. No authorization cache; callers retain the original epoch proofs.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const normalize=s=>s.replaceAll('\r\n','\n');
const hash=s=>createHash('sha256').update(s).digest('hex');
const validPath=p=>p==='config/architecture.json'||/^src\/lua\/[A-Za-z0-9_-]+\.lua$/.test(p);
function freeze(value){if(value&&typeof value==='object'){for(const v of Object.values(value))freeze(v);Object.freeze(value);}return value;}
function validateBinding(binding){
 if(binding===null)return;
 assert.equal(typeof binding?.source,'string','source identity text');
 assert.equal(normalize(binding.source),binding.source,'source identity LF');
 assert.equal(hash(binding.source),binding.sha256,'source identity SHA256');
 if(binding.gitBlob)assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(binding.source)}\0`).update(binding.source).digest('hex'),binding.gitBlob,'source identity Git blob');
}
export function createSourceEpochProjector(input,{root=process.cwd()}={}){
 // Clone once to prevent the caller changing proof data after validation.
 const proof=JSON.parse(JSON.stringify(input));
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
 const readers=new WeakMap(),readLive=path=>{
  try{return readFileSync(resolve(root,path),'utf8');}catch(error){if(error.code==='ENOENT')return null;throw error;}
 };
 function requireTarget(target){assert(Object.hasOwn(proof.targets,target),'unknown source target');return proof.targets[target];}
 function rawReader(reader){return readers.get(reader)?.raw??reader;}
 function preCombinedSource(path,source,{target,readSource=readLive}={}){
  const destination=requireTarget(target),current=proof.current[path],before=destination.files[path];
  // New witnesses are retained here; retirement belongs to a separate checked
  // materializer. Unknown/original/foreign bytes never authorize owner reads.
  if(typeof source!=='string'||!current||!before||current.sha256===before.sha256||hash(normalize(source))!==current.sha256)return source;
  assert.equal(typeof readSource,'function','linked owner reader');readSource=rawReader(readSource);
  for(const owner of proof.owners){
   let actual;try{actual=readSource(owner);}catch(error){assert.fail('combined linked owner missing: '+owner+': '+String(error?.message??error));}
   const binding=proof.current[owner];
   assert(binding===null?actual===null||actual===undefined:typeof actual==='string'&&hash(normalize(actual))===binding.sha256,'combined linked owner identity: '+owner);
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
