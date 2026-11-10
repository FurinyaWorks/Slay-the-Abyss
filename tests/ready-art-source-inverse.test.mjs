import test,{after} from 'node:test';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {historicalTest,historicalInputPath} from './helpers/historical-baseline-inputs.mjs';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,existsSync,rmSync,symlinkSync,renameSync} from 'node:fs';
import {join,dirname,resolve,relative} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {preReadyArtSource as currentProject} from './helpers/ready-art-source-inverse.mjs';
import {sourceEpoch} from './helpers/combined-epoch/source-epoch.mjs';
import {nativeMonsterSourceLayer} from './helpers/epochs/develop/tests/helpers/native-monster-art-source-inverse.mjs';
import {gameUiExtractionProof,preGameUiExtractionSource as frozenGameUi} from './helpers/epochs/develop/tests/helpers/game-ui-extraction-source-inverse.mjs';
import {preNativePageSource} from './helpers/game-ui-extraction-source-inverse.mjs';
import {preRelicQuerySource} from './helpers/relic-query-source-inverse.mjs';
import {preCoreLifecycleSource} from './helpers/core-lifecycle-source-inverse.mjs';
const hash=s=>s===null?null:createHash('sha256').update(s).digest('hex');

// The entry and every relative dependency are the unchanged 98fef Git bytes.
// Reuse authenticated existing files (including frozen epochs); store only the
// four original helpers no longer present. Never import a current facade here.
const repository=fileURLToPath(new URL('..',import.meta.url));
const originalRoot=mkdtempSync(join(tmpdir(),'ready-art-original-helpers-'));
after(()=>rmSync(originalRoot,{recursive:true,force:true}));
function materializeOriginalHelpers(){
 const bytes=readFileSync(new URL('./fixtures/ready-art-original-helper-sources.json',import.meta.url),'utf8');
 assert.equal(hash(bytes),'077e865ca0c6624a9616149977a4cc3428b1cb1abdca33cd3ffe8748cb66bea9','complete original ready-art helper manifest');
 const proof=JSON.parse(bytes);
 assert.equal(proof.sourceCommit,'98fef95d047652aa6a8880241ddff28ef320a484');
 assert.equal(proof.entry,'tests/helpers/ready-art-source-inverse.mjs');
 for(const [path,binding]of Object.entries(proof.files)){
  let content=binding.source===undefined?readFileSync(historicalInputPath(repository,binding.copyFrom)):Buffer.from(binding.source);
  if(!path.endsWith('.gz'))content=Buffer.from(content.toString('utf8').replaceAll('\r\n','\n'));
  assert.equal(hash(content),binding.sha256,'original helper complete bytes: '+path);
  assert.equal(createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex'),binding.gitBlob,'original helper Git blob: '+path);
  const target=historicalInputPath(originalRoot,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,content);
 }
 return pathToFileURL(join(originalRoot,proof.entry));
}
const {preReadyArtSource,readyArtSourceLayer,prepareReadyArtRetirement}=await import(materializeOriginalHelpers());
const {projectArtPerfSource}=await import(pathToFileURL(join(originalRoot,'tests/helpers/art-perf-source-composition.mjs')));

historicalTest('exact ready-art inverse preserves old whole-file identities and exposes any unknown drift',()=>{
 for(const [path,binding] of Object.entries(readyArtSourceLayer.files)){
  const source=projectArtPerfSource(path,readFileSync(path,'utf8'),'art').replaceAll('\r\n','\n');
  assert.equal(hash(source),binding.afterSha256,path);
  const before=preReadyArtSource(path,source);assert.equal(hash(before),binding.beforeSha256,path);
  assert.equal(preReadyArtSource(path,source.replaceAll('\n','\r\n')),before);
  assert.equal(preReadyArtSource(path,source+'\n-- future'),source+'\n-- future');
  assert.equal(preReadyArtSource(path,before),before);
 }
});
historicalTest('ready-art historical retirement checks every owned destination and never mutates live sources',()=>{
 const directory=mkdtempSync(join(tmpdir(),'abyss-ready-art-inverse-'));
 try{
  const path='src/lua/abyss_card_art_runtime.lua',target=join(directory,path),source=readFileSync(path,'utf8');
  mkdirSync(dirname(target),{recursive:true});writeFileSync(target,source+'\n-- future');
  assert.throws(()=>prepareReadyArtRetirement(directory),/unreviewed ready-art/);assert(existsSync(target));
  writeFileSync(target,source);const retire=prepareReadyArtRetirement(directory);assert(existsSync(target));
  retire();assert(!existsSync(target));assert(existsSync(path));
  assert.throws(()=>prepareReadyArtRetirement(process.cwd()),/separate historical/);
 }finally{rmSync(directory,{recursive:true,force:true});}
});

function linkDirectory(t,target,path){
 try{symlinkSync(target,path,process.platform==='win32'?'junction':'dir');return true;}
 catch(error){
  if(!['EPERM','EACCES','ENOTSUP'].includes(error.code))throw error;
  t.skip('directory links unavailable: '+error.code);return false;
 }
}
historicalTest('ready-art retirement validates every added file, tolerates absence and preserves rejected copies',()=>{
 const directory=mkdtempSync(join(tmpdir(),'ready-art-owned-copies-'));
 const paths=Object.entries(readyArtSourceLayer.files).filter(([,binding])=>binding.beforeSha256===null).map(([path])=>path);
 const sources=Object.fromEntries(paths.map(path=>[path,readFileSync(path,'utf8')]));
 try{
  prepareReadyArtRetirement(directory)();
  for(const path of paths){const target=join(directory,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,sources[path]);}
  for(const path of paths){
   const target=join(directory,path),changed=sources[path]+'\n-- unreviewed';writeFileSync(target,changed);
   assert.throws(()=>prepareReadyArtRetirement(directory),/unreviewed ready-art/);
   for(const other of paths)assert(existsSync(join(directory,other)),'rejected preparation never deletes '+other);
   assert.equal(readFileSync(target,'utf8'),changed);writeFileSync(target,sources[path]);
  }
  const cleanup=prepareReadyArtRetirement(directory);
  for(const path of paths)assert(existsSync(join(directory,path)),'preparation preserves '+path);
  cleanup();for(const path of paths){assert(!existsSync(join(directory,path)));assert.equal(readFileSync(path,'utf8'),sources[path]);}
  prepareReadyArtRetirement(directory)();
 }finally{rmSync(directory,{recursive:true,force:true});}
});
historicalTest('ready-art retirement rejects live directory aliases and retargeting before deleting copied modules',t=>{
 const directory=mkdtempSync(join(tmpdir(),'ready-art-retirement-alias-'));
 const path='src/lua/abyss_card_art_runtime.lua',source=readFileSync(path,'utf8'),liveRoot=process.cwd();
 try{
  const alias=join(directory,'alias');if(!linkDirectory(t,liveRoot,alias))return;
  assert.throws(()=>prepareReadyArtRetirement(alias),/separate historical destination/);
  const historical=join(directory,'historical'),target=join(historical,path);
  mkdirSync(dirname(target),{recursive:true});writeFileSync(target,source);
  const cleanup=prepareReadyArtRetirement(historical);
  renameSync(join(historical,'src/lua'),join(historical,'src/saved-lua'));
  if(!linkDirectory(t,join(liveRoot,'src/lua'),join(historical,'src/lua')))return;
  assert.throws(cleanup,/must not escape|never remove a live source/);
  assert.equal(readFileSync(path,'utf8'),source);
  assert.equal(readFileSync(join(historical,'src/saved-lua/abyss_card_art_runtime.lua'),'utf8'),source);
 }finally{rmSync(directory,{recursive:true,force:true});}
});

// Current acceptance uses the real entry and real filesystem reads. Its Host
// and config reach the frozen GameUI intermediate, not the old ready-art epoch.
function observeCurrentReads(callback){
 const originalRead=fs.readFileSync,seen=[];
 let bad=null,mode='good';
 fs.readFileSync=function(file,...options){
  const absolute=file instanceof URL?fileURLToPath(file):resolve(String(file));
  const path=relative(repository,absolute).replaceAll('\\','/');
  if(Object.hasOwn(sourceEpoch.proof.current,path)){
   seen.push(path);
   if(path===bad){
    if(mode==='throw')throw Error('ready-art raw reader sentinel: '+path);
    if(mode==='missing')return undefined;if(mode==='null')return null;
    if(mode==='buffer')return Buffer.from(originalRead.call(this,file,...options));
    if(mode==='changed')return originalRead.call(this,file,...options)+'\n';
   }
  }
  return originalRead.call(this,file,...options);
 };
 syncBuiltinESMExports();
 try{return callback({seen,fault:(path,next)=>{bad=path;mode=next;}});}
 finally{fs.readFileSync=originalRead;syncBuiltinESMExports();}
}
test('current ready-art Host/config retain authenticated intermediate bytes and reread every real raw owner',()=>{
 const paths=['config/architecture.json','src/lua/abyss_game_ui.lua'];
 const current=Object.fromEntries(paths.map(path=>[path,readFileSync(path,'utf8').replaceAll('\r\n','\n')]));
 for(const path of paths){
  const expected=gameUiExtractionProof.files[path];
  assert.equal(hash(expected.beforeSource),expected.beforeSha256);
  assert.notEqual(expected.beforeSha256,readyArtSourceLayer.files[path].beforeSha256,'current intermediate must not masquerade as old ready-art history');
  observeCurrentReads(({seen,fault})=>{
   const check=()=>assert.equal(currentProject(path,current[path]),expected.beforeSource);
   check();const first=[...seen];
   for(const owner of sourceEpoch.proof.owners)assert(first.includes(owner),'fresh current ready-art owner: '+owner);
   seen.length=0;check();assert.deepEqual(seen,first,'warm calls repeat the complete real raw-read sequence');
   for(const owner of sourceEpoch.proof.owners){
    for(const mode of ['changed','missing','null','buffer','throw']){
     seen.length=0;fault(owner,mode);
     for(let repeat=0;repeat<2;repeat++)assert.throws(check,error=>{
      assert.match(error.message,/linked owner/);assert(error.message.includes(owner));
      if(mode==='throw')assert.match(error.message,/ready-art raw reader sentinel/);return true;
     });
     assert(seen.includes(owner));
     if(owner==='config/architecture.json'){fault(null,'good');check();}
    }
    fault(null,'good');check();
   }
  });
 }
});

test('current ready-art leaves unknown and historical Host/config inputs exposed without raw owner reads',()=>{
 for(const path of ['config/architecture.json','src/lua/abyss_game_ui.lua']){
  const source=readFileSync(path,'utf8').replaceAll('\r\n','\n');
  for(const input of [source+'\n-- unknown',source.slice(1),source+source,null,{},gameUiExtractionProof.files[path].beforeSource]){
   observeCurrentReads(({seen})=>{assert.equal(currentProject(path,input),input);assert.deepEqual(seen,[]);});
  }
 }
});

test('current unsupported art-source composition still exposes its exact linked identity mismatch',()=>{
 const path='scripts/card-art-samples.mjs',linked='data/presentation/native-monster-art.json';
 const source=readFileSync(path,'utf8'),actual=hash(readFileSync(linked,'utf8').replaceAll('\r\n','\n'));
 const expected=nativeMonsterSourceLayer.files[linked].afterSha256;
 assert.notEqual(actual,expected,'current metadata is not the original monster-art epoch');
 assert.throws(()=>currentProject(path,source),error=>{
  assert.equal(error.code,'ERR_ASSERTION');
  assert(error.message.startsWith('native monster linked source identity: '+linked));
  assert.equal(error.actual,actual);assert.equal(error.expected,expected);return true;
 });
});

// Keep the older GameUI input epoch an explicit positive contract as well.
// Reconstruct it through authenticated native, query and lifecycle predecessors;
// both old and current admission must restore the same frozen output identities.
test('frozen GameUI Host/config still restore their independent original identities',()=>{
 const nativeRead=path=>preNativePageSource(path,readFileSync(path,'utf8'));
 const queryRead=path=>preRelicQuerySource(path,nativeRead(path),{readSource:nativeRead});
 const inputs=Object.fromEntries(Object.keys(gameUiExtractionProof.files).map(path=>[
  path,preCoreLifecycleSource(path,queryRead(path),{readSource:nativeRead}),
 ]));
 const config='config/architecture.json';
 assert.equal(gameUiExtractionProof.files[config].beforeSha256,'e50c2b19ba16cc334bc438ab3fcceb4b1fba822caf094076325ca7fcaacd6e11');
 for(const path of ['src/lua/abyss_game_ui.lua',config]){
  const binding=gameUiExtractionProof.files[path],seen=[];
  assert.equal(hash(inputs[path]),binding.afterSha256);
  const readSource=owner=>{seen.push(owner);return inputs[owner];};
  for(const source of [inputs[path],inputs[path].replaceAll('\n','\r\n')]){
   seen.length=0;
   const previous=frozenGameUi(path,source,{readSource});
   assert.equal(previous,binding.beforeSource);assert.equal(hash(previous),binding.beforeSha256);
   assert.deepEqual(seen,Object.keys(gameUiExtractionProof.files));
  }
  for(const owner of Object.keys(inputs)){
   assert.throws(()=>frozenGameUi(path,inputs[path],{readSource:p=>inputs[p]+(p===owner?'\n-- drift':'')}),/linked owner/);
  }
 }
});
