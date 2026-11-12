import test,{after} from 'node:test';
import {historicalTest,historicalInputPath} from './helpers/historical-baseline-inputs.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,symlinkSync,writeFileSync,realpathSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {preArtFeatureSource as currentFeature,preHistoricalArtFeatureSource as currentHistory} from './helpers/art-feature-source-inverse.mjs';
import {projectArtPerfSource as currentArtPerf} from './helpers/art-perf-source-composition.mjs';
import {preReadyArtSource as currentReadyArt} from './helpers/ready-art-source-inverse.mjs';
import {prepareBattleLifeModuleRetirement as currentRetirement} from './helpers/battle-life-source-inverse.mjs';
import {sourceEpoch} from './helpers/combined-epoch/source-epoch.mjs';
import {gameUiExtractionProof} from './helpers/epochs/develop/tests/helpers/game-ui-extraction-source-inverse.mjs';
import {nativeMonsterSourceLayer} from './helpers/epochs/develop/tests/helpers/native-monster-art-source-inverse.mjs';
import {betaSources} from './helpers/beta-integration-source.mjs';
import {round3CatalogProof} from './helpers/epochs/develop/tests/helpers/round3-catalog-source-inverse.mjs';
import {preComponentUiCiSource} from './helpers/component-ui-ci-source-inverse.mjs';

// Execute the exact original 98fef helper closure on the original 98fef inputs.
// The reviewed ready-art manifest supplies 34 files; this extension adds only
// the 24 missing retirement dependencies, reusing 22 and embedding two helpers.
// Neither historical source bodies nor their frozen assertions are rewritten.
const repository=fileURLToPath(new URL('..',import.meta.url));
const originalRoot=mkdtempSync(join(tmpdir(),'art-feature-original-helpers-'));
after(()=>rmSync(originalRoot,{recursive:true,force:true}));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const originalManifests=[
 ['ready-art-original-helper-sources.json','077e865ca0c6624a9616149977a4cc3428b1cb1abdca33cd3ffe8748cb66bea9'],
 ['art-feature-original-helper-sources.json','2d6a8fa255c8a32fcd97a1bc9aad5e62ddf9426ff134263bf4f67773df5dc6a1'],
];
const helperFiles={};
for(const [name,expected]of originalManifests){
 const bytes=readFileSync(new URL('./fixtures/'+name,import.meta.url));
 assert.equal(digest(bytes),expected,'complete original art-feature helper manifest: '+name);
 const manifest=JSON.parse(bytes);
 assert.equal(manifest.schemaVersion,1);
 assert.equal(manifest.sourceCommit,'98fef95d047652aa6a8880241ddff28ef320a484');
 if(name.startsWith('art-feature')){
  assert.equal(manifest.extends,'tests/fixtures/ready-art-original-helper-sources.json');
  assert.equal(manifest.entry,'tests/helpers/battle-life-source-inverse.mjs');
 }
 for(const [path,binding]of Object.entries(manifest.files)){
  assert(!Object.hasOwn(helperFiles,path),'original helpers are reused, never duplicated: '+path);
  helperFiles[path]=binding;
 }
}
function originalHelperInputs(files=helperFiles,readInput=path=>readFileSync(historicalInputPath(repository,path))){
 return Object.fromEntries(Object.entries(files).map(([path,binding])=>{
  historicalInputPath(originalRoot,path);
  assert.notEqual(Object.hasOwn(binding,'source'),Object.hasOwn(binding,'copyFrom'),'one original helper source: '+path);
  let content=binding.source===undefined?readInput(binding.copyFrom):Buffer.from(binding.source);
  if(!path.endsWith('.gz'))content=Buffer.from(content.toString('utf8').replaceAll('\r\n','\n'));
  assert.equal(digest(content),binding.sha256,'original helper complete bytes: '+path);
  assert.equal(createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex'),binding.gitBlob,'original helper Git blob: '+path);
  return [path,content];
 }));
}
for(const [path,content]of Object.entries(originalHelperInputs())){
 const target=historicalInputPath(originalRoot,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,content);
}
const original=name=>import(pathToFileURL(join(originalRoot,'tests/helpers/'+name+'.mjs')));
const {preIntegrationSource}=await original('pr372-integration-source');
const {preRelicArtFeatureCompositionSource}=await original('relic-art-feature-composition');
const {preRelicArtCompositionSource}=await original('relic-art-composition');
const {artFeatureSourceLayer:proof,legacyArtFeatureSourceLayer,preHistoricalArtFeatureSource,artFeatureAddedPaths,preArtFeatureSource,prepareArtFeatureRetirement}=await original('art-feature-source-inverse');
const {artPerfSourceComposition,projectArtPerfSource}=await original('art-perf-source-composition');
const {readyArtSourceLayer,preReadyArtSource}=await original('ready-art-source-inverse');
const {round2UiAddedPaths}=await original('round2-ui-source-inverse');
const {preRound3CatalogSource}=await original('round3-catalog-source-inverse');
const {prepareBattleLifeModuleRetirement}=await original('battle-life-source-inverse');

const read=path=>(proof.files[path]
 ?preIntegrationSource(path,readFileSync(path,'utf8'),'feature379')
 :preRelicArtCompositionSource(path,preRelicArtFeatureCompositionSource(path,readFileSync(path,'utf8'),'artFeature'),'art')).replaceAll('\r\n','\n');
const hash=source=>source===null?null:createHash('sha256').update(source).digest('hex');
const put=(directory,path,source)=>{const target=join(directory,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,source);};
const temporary=()=>mkdtempSync(join(tmpdir(),'abyss-art-feature-inverse-'));

historicalTest('exact feature/fallback inverse binds every current source and restores complete baseline identities',()=>{
 assert.equal(proof.baseCommit,'1bfca6261044b92f8065bb83668c358b0a2627da');
 assert.ok(artFeatureAddedPaths.length>0,'added feature owner is explicitly bound');
 for(const path of ['scripts/native-candidate-ui-cache.mjs','scripts/native-script-inventory.mjs',
  'scripts/native-script-batch.mjs','scripts/art/performance-pack.mjs',
  'art/performance/selection-budget-v1.json','art/performance/background-budget-v1.json']){
  assert.ok(artFeatureAddedPaths.includes(path),'complete merged feature owner is bound: '+path);
 }
 for(const [path,binding]of Object.entries(proof.files)){
  const current=read(path),before=preArtFeatureSource(path,current);
  assert.equal(hash(current),binding.afterSha256,'complete approved current source: '+path);
  assert.equal(hash(before),binding.beforeSha256,'complete pre-feature baseline: '+path);
  assert.equal(preArtFeatureSource(path,current.replaceAll('\n','\r\n')),before,'native CRLF: '+path);
  assert.equal(preArtFeatureSource(path,before),before,'idempotent baseline: '+path);
  assert.equal(before===null,artFeatureAddedPaths.includes(path),'only new source becomes absent: '+path);
  assert.equal(preArtFeatureSource(path,undefined),undefined);
 }
 assert.equal(preArtFeatureSource('src/lua/unregistered.lua','return {}\n'),'return {}\n');
});

historicalTest('unknown, partial, duplicate, cross-path and reordered feature sources remain exposed',()=>{
 const entries=Object.entries(proof.files);
 for(const [path,binding]of entries){
  const current=read(path);
  const mutants=[current+'\n-- future\n',current.slice(1),current+current];
  const lines=current.split('\n'),other=lines.findIndex(line=>line!==lines[0]);
  if(other>0){[lines[0],lines[other]]=[lines[other],lines[0]];mutants.push(lines.join('\n'));}
  for(const hunk of binding.hunks){
   const partial=current.split('\n');partial.splice(hunk.at,hunk.after.length,...hunk.before);
   if(hash(partial.join('\n'))!==binding.beforeSha256)mutants.push(partial.join('\n'));
  }
  const foreign=entries.find(([otherPath])=>otherPath!==path&&read(otherPath)!==current);
  if(foreign)mutants.push(read(foreign[0]));
  for(const mutant of mutants){
   assert.notEqual(hash(mutant),binding.afterSha256);
   assert.equal(preArtFeatureSource(path,mutant),mutant,'no wildcard feature projection: '+path);
   if(hash(mutant)===legacyArtFeatureSourceLayer.files[path]?.afterSha256){
    assert.equal(hash(preHistoricalArtFeatureSource(path,mutant)),legacyArtFeatureSourceLayer.files[path].beforeSha256,'exact reviewed legacy input retains its own inverse');
    continue;
   }
   assert.equal(projectArtPerfSource(path,mutant,'art'),mutant,'unknown stays visible to old art guards: '+path);
   assert.equal(projectArtPerfSource(path,mutant,'perf'),mutant,'unknown stays visible to old performance guards: '+path);
  }
 }
});

historicalTest('recognized feature hosts bind every added owner and reject missing or drifting linked sources',()=>{
 for(const [path,binding]of Object.entries(proof.files)){
  if(binding.beforeSha256===null)continue;
  for(const changed of artFeatureAddedPaths){
   assert.throws(()=>preArtFeatureSource(path,read(path),{readSource:key=>key===changed?readFileSync(key,'utf8')+'\n// drift\n':readFileSync(key,'utf8')}),/linked source drift/);
   assert.throws(()=>preArtFeatureSource(path,read(path),{readSource:key=>{if(key===changed)throw Error('missing');return readFileSync(key,'utf8');}}),/linked source missing/);
   assert.throws(()=>preArtFeatureSource(path,read(path),{readSource:key=>key===changed?null:readFileSync(key,'utf8')}),/complete (?:art-feature|beta) linked source/);
  }
 }
});

historicalTest('feature normalization precedes both frozen art/performance and ready-art source chains',()=>{
 for(const [path,binding]of Object.entries(artPerfSourceComposition.files)){
  const current=read(path),baseline=preRound3CatalogSource(path,preArtFeatureSource(path,current));
  assert.equal(hash(baseline),binding.currentSha256,'old art/performance composition bytes remain immutable: '+path);
  for(const target of ['art','perf']){
   assert.equal(hash(projectArtPerfSource(path,current,target)),binding.targets[target].sha256);
   assert.equal(projectArtPerfSource(path,current,target),projectArtPerfSource(path,baseline,target));
  }
 }
 for(const [path,binding]of Object.entries(readyArtSourceLayer.files)){
  const current=read(path);
  assert.equal(hash(projectArtPerfSource(path,current,'art')),binding.afterSha256,'old ready-art witness remains immutable: '+path);
  assert.equal(hash(preReadyArtSource(path,current)),binding.beforeSha256,'old ready-art inverse still exact: '+path);
 }
});

historicalTest('combined feature and old-module retirement validates all owners before removing any destination',()=>{
 const directory=temporary();
 const paths=[...artFeatureAddedPaths,'src/lua/abyss_card_art_runtime.lua',...round2UiAddedPaths,'src/lua/abyss_combat_catalog.lua'];
 const live=Object.fromEntries(paths.map(path=>[path,read(path)]));
 try{
  for(const path of paths)put(directory,path,live[path]);
  put(directory,'keep.txt','keep');
  for(const changed of paths){
   put(directory,changed,live[changed]+'\n-- unreviewed destination\n');
   assert.throws(()=>prepareBattleLifeModuleRetirement(directory),/unreviewed .* (?:added )?module destination/);
   for(const path of paths)assert.ok(existsSync(join(directory,path)),'no partial cleanup: '+path);
   put(directory,changed,live[changed]);
  }
  const retire=prepareBattleLifeModuleRetirement(directory);
  for(const path of paths)assert.ok(existsSync(join(directory,path)),'preparation never deletes: '+path);
  retire();
  for(const path of paths){assert.equal(existsSync(join(directory,path)),false);assert.equal(read(path),live[path],'live source never changes: '+path);}
  assert.equal(readFileSync(join(directory,'keep.txt'),'utf8'),'keep');
  prepareArtFeatureRetirement(directory)();
 }finally{rmSync(directory,{recursive:true,force:true});}
});

historicalTest('feature retirement revalidates destinations after preparation and before any removal',()=>{
 const directory=temporary();
 try{
  for(const path of artFeatureAddedPaths)put(directory,path,read(path));
  const retire=prepareArtFeatureRetirement(directory),changed=artFeatureAddedPaths.at(-1);
  put(directory,changed,read(changed)+'\n// changed after preparation\n');
  assert.throws(retire,/unreviewed art-feature added module destination/);
  for(const path of artFeatureAddedPaths)assert.ok(existsSync(join(directory,path)),'no destination removed before revalidation');
  put(directory,changed,read(changed));retire();
  for(const path of artFeatureAddedPaths)assert.equal(existsSync(join(directory,path)),false);
 }finally{rmSync(directory,{recursive:true,force:true});}
});

historicalTest('combined retirement revalidates feature and catalog owners before old-module deletions',()=>{
 const directory=temporary(),paths=[...artFeatureAddedPaths,'src/lua/abyss_card_art_runtime.lua',...round2UiAddedPaths,'src/lua/abyss_combat_catalog.lua'];
 try{
  for(const path of paths)put(directory,path,read(path));
  const retire=prepareBattleLifeModuleRetirement(directory);
  for(const changed of [...artFeatureAddedPaths,'src/lua/abyss_combat_catalog.lua']){
   put(directory,changed,read(changed)+'\n// changed after combined preparation\n');
   assert.throws(retire,/unreviewed .* (?:added )?module destination/);
   for(const path of paths)assert.ok(existsSync(join(directory,path)),'no old or new destination removed before feature/catalog revalidation: '+path);
   put(directory,changed,read(changed));
  }
  retire();
  for(const path of paths)assert.equal(existsSync(join(directory,path)),false);
 }finally{rmSync(directory,{recursive:true,force:true});}
});

historicalTest('combined retirement rejects same-byte catalog retargeting before any deletion',()=>{
 const directory=temporary(),catalog='src/lua/abyss_combat_catalog.lua';
 const paths=[...artFeatureAddedPaths,'src/lua/abyss_card_art_runtime.lua',...round2UiAddedPaths,catalog];
 try{
  for(const path of paths)put(directory,path,read(path));
  const retire=prepareBattleLifeModuleRetirement(directory),target=join(directory,catalog),alternate=join(directory,'catalog-copy.lua');
  writeFileSync(alternate,read(catalog));rmSync(target);symlinkSync(alternate,target);
  assert.throws(retire,/catalog module destination changed after preparation/);
  for(const path of paths)assert.ok(existsSync(join(directory,path)),'same-byte retargeting must not remove any owner: '+path);
  assert.equal(readFileSync(alternate,'utf8'),read(catalog));
  assert.equal(readFileSync(target,'utf8'),read(catalog));
 }finally{rmSync(directory,{recursive:true,force:true});}
});

historicalTest('feature retirement rejects live roots and symlink aliases without touching live source',()=>{
 const directory=temporary(),live=Object.fromEntries(Object.keys(proof.files).map(path=>[path,read(path)]));
 try{
  assert.throws(()=>prepareArtFeatureRetirement(process.cwd()),/separate historical destination/);
  const alias=join(directory,'live-alias');symlinkSync(process.cwd(),alias,'dir');
  assert.throws(()=>prepareArtFeatureRetirement(alias),/separate historical destination/);
  const copy=join(directory,'copy');mkdirSync(copy);
  const first=artFeatureAddedPaths[0],parent=first.split('/')[0];
  symlinkSync(join(process.cwd(),parent),join(copy,parent),'dir');
  assert.throws(()=>prepareArtFeatureRetirement(copy),/must not escape|never remove a live source/);
  for(const [path,source]of Object.entries(live))assert.equal(read(path),source,'live source remains byte-identical: '+path);
 }finally{rmSync(directory,{recursive:true,force:true});}
});

// Keep present-day admission separate: these four inputs reach authenticated
// GameUI/develop intermediates, not the original feature beforeSha identities.
const currentTargets=Object.fromEntries([
 ...['config/architecture.json','src/lua/abyss_game_ui.lua'].map(path=>[path,gameUiExtractionProof.files[path].beforeSource]),
 ...['src/lua/abyss_ui.lua','src/lua/abyss_traveler_portraits.lua'].map(path=>[path,sourceEpoch.proof.targets.develop.files[path].source]),
]);
test('current feature and history entries authenticate supported intermediates and freshly read every raw owner',()=>{
 for(const [path,expected]of Object.entries(currentTargets)){
  const current=readFileSync(path,'utf8').replaceAll('\r\n','\n');
  assert.notEqual(hash(expected),proof.files[path].beforeSha256,'a supported intermediate is not original feature history: '+path);
  for(const project of [currentFeature,currentHistory]){
   const seen=[];let bad=null,mode='good';
   const readSource=owner=>{
    seen.push(owner);
    if(owner===bad){
     if(mode==='throw')throw Error('feature raw reader sentinel: '+owner);
     if(mode==='missing')return undefined;if(mode==='null')return null;
     if(mode==='buffer')return Buffer.from(readFileSync(owner));
     if(mode==='changed')return readFileSync(owner,'utf8')+'\n';
    }
    return readFileSync(owner,'utf8');
   };
   const check=()=>assert.equal(project(path,current,{readSource}),expected);
   check();const first=[...seen];
   for(const owner of sourceEpoch.proof.owners)assert(first.includes(owner),'complete dynamic current owner: '+owner);
   seen.length=0;check();assert.deepEqual(seen,first,'warm calls repeat the entire raw read sequence');
   assert.equal(project(path,current.replaceAll('\n','\r\n'),{readSource}),expected,'current CRLF input');
   for(const owner of sourceEpoch.proof.owners){
    for(const fault of ['changed','missing','null','buffer','throw']){
     seen.length=0;bad=owner;mode=fault;
     for(let repeat=0;repeat<2;repeat++)assert.throws(check,error=>{
      assert.equal(error.code,'ERR_ASSERTION');assert.match(error.message,/linked owner/);assert(error.message.includes(owner));
      if(fault==='throw')assert.match(error.message,/feature raw reader sentinel/);return true;
     });
     assert(seen.includes(owner),'the failing raw owner was actually read');
     if(owner==='config/architecture.json'){bad=null;check();}
    }
    bad=null;check();
   }
  }
 }
});

test('current feature entries preserve unsupported input bytes and never use unknown input to authorize raw reads',()=>{
 for(const [path,intermediate]of Object.entries(currentTargets)){
  const source=readFileSync(path,'utf8').replaceAll('\r\n','\n');
  for(const project of [currentFeature,currentHistory]){
   for(const input of [source+'\n-- unknown',source.slice(1),source+source,null,undefined,{},intermediate]){
    const seen=[],readSource=owner=>{seen.push(owner);throw Error('unknown source must not authorize reads');};
    assert.equal(project(path,input,{readSource}),input);assert.deepEqual(seen,[]);
   }
   for(const readSource of [null,{},'not a reader']){
    assert.throws(()=>project(path,source,{readSource}),/GameUI extraction linked reader must be a function/);
    assert.throws(()=>project(path,source+'\n-- unknown',{readSource}),error=>{
     assert.equal(error.code,'ERR_ASSERTION');assert(error.message.startsWith('final M7 linked reader must be a function'));
     assert.equal(error.actual,typeof readSource);assert.equal(error.expected,'function');return true;
    });
   }
  }
 }
});

test('pre-component unsupported feature and art compositions expose their exact linked identities',()=>{
 // The lexical batch guard now differs before the backdrop owner in the
 // pre-component chain. Keep that original rejection, not an identity adapter.
 // The outer admits only a complete known current source, never foreign drift.
 const readSource=path=>preComponentUiCiSource(path,readFileSync(path,'utf8'));
 const featurePath='scripts/art/ready-card-runtime.mjs',featureOwner='scripts/native-script-batch.mjs';
 const featureActual=hash(readFileSync(featureOwner,'utf8').replaceAll('\r\n','\n')),featureExpected=betaSources[featureOwner].sha256;
 assert.notEqual(featureActual,featureExpected);
 for(const project of [currentFeature,currentHistory])assert.throws(()=>project(featurePath,readFileSync(featurePath,'utf8'),{readSource}),error=>{
  assert.equal(error.code,'ERR_ASSERTION');
  assert(error.message.startsWith('unreviewed beta linked owner; linked source drift: '+featureOwner));
  assert.equal(error.actual,featureActual);assert.equal(error.expected,featureExpected);return true;
 });
 const path='scripts/card-art-samples.mjs',owner='data/presentation/native-monster-art.json';
 const source=readFileSync(path,'utf8'),actual=hash(readFileSync(owner,'utf8').replaceAll('\r\n','\n')),expected=nativeMonsterSourceLayer.files[owner].afterSha256;
 assert.notEqual(actual,expected,'current art metadata has no approved full inverse to the original epoch');
 // These older compositions expose no injected-reader seam. Give their actual
 // filesystem readers the same complete pre-component source context instead.
 const cwd=process.cwd(),directory=temporary();
 try{
  for(const file of new Set([...Object.keys(betaSources),...Object.keys(nativeMonsterSourceLayer.files)]))put(directory,file,readSource(file));
  process.chdir(directory);
  for(const project of [source=>currentArtPerf(path,source,'art'),source=>currentArtPerf(path,source,'perf'),source=>currentReadyArt(path,source)]){
   assert.throws(()=>project(source),error=>{
    assert.equal(error.code,'ERR_ASSERTION');assert(error.message.startsWith('native monster linked source identity: '+owner));
    assert.equal(error.actual,actual);assert.equal(error.expected,expected);return true;
   });
  }
 }finally{process.chdir(cwd);rmSync(directory,{recursive:true,force:true});}
});

test('current feature consumers reject the exact first unsupported component-era linked owner',()=>{
 const path='scripts/art/ready-card-runtime.mjs',owner='scripts/native-candidate-ui-cache.mjs';
 const source=readFileSync(path,'utf8'),actual=hash(readFileSync(owner,'utf8').replaceAll('\r\n','\n')),expected=betaSources[owner].sha256;
 assert.notEqual(actual,expected);
 for(const project of [currentFeature,currentHistory])assert.throws(()=>project(path,source),error=>{
  assert.equal(error.code,'ERR_ASSERTION');assert(error.message.startsWith('unreviewed beta linked owner; linked source drift: '+owner));
  assert.equal(error.actual,actual);assert.equal(error.expected,expected);return true;
 });
});

// The current retirement contract also accepts an exact original copy, but its
// stricter catalog guard and realpath error are distinct from the frozen chain.
historicalTest('current combined retirement checks catalog identity before preparation or removal and preserves every owner',()=>{
 const directory=temporary(),catalog='src/lua/abyss_combat_catalog.lua';
 const paths=[...artFeatureAddedPaths,'src/lua/abyss_card_art_runtime.lua',...round2UiAddedPaths,catalog];
 const sources=Object.fromEntries(paths.map(path=>[path,read(path)]));
 const assertAll=()=>{for(const path of paths)assert.ok(existsSync(join(directory,path)),'no current or old owner removed: '+path);};
 const rejectCatalog=(callback,source)=>assert.throws(callback,error=>{
  assert.equal(error.code,'ERR_ASSERTION');assert(error.message.startsWith('complete retirement catalog identity'));
  assert.equal(error.actual,hash(source));assert.equal(error.expected,round3CatalogProof.files[catalog].afterSha256);return true;
 });
 try{
  for(const path of paths)put(directory,path,sources[path]);put(directory,'keep.txt','keep');
  const changed=sources[catalog]+'\n-- current catalog identity drift\n';put(directory,catalog,changed);
  rejectCatalog(()=>currentRetirement(directory),changed);assertAll();
  put(directory,catalog,sources[catalog]);const retire=currentRetirement(directory);assertAll();
  put(directory,catalog,changed);rejectCatalog(retire,changed);assertAll();
  put(directory,catalog,sources[catalog]);
  for(const path of artFeatureAddedPaths){
   put(directory,path,sources[path]+'\n-- changed after preparation\n');
   assert.throws(retire,/unreviewed art-feature added module destination/);assertAll();put(directory,path,sources[path]);
  }
  retire();for(const path of paths){assert(!existsSync(join(directory,path)));assert.equal(read(path),sources[path]);}
  assert.equal(readFileSync(join(directory,'keep.txt'),'utf8'),'keep');currentRetirement(directory)();
 }finally{rmSync(directory,{recursive:true,force:true});}
});

historicalTest('current combined retirement rejects same-byte catalog retargeting before any owner is removed',()=>{
 const directory=temporary(),catalog='src/lua/abyss_combat_catalog.lua';
 const paths=[...artFeatureAddedPaths,'src/lua/abyss_card_art_runtime.lua',...round2UiAddedPaths,catalog];
 try{
  for(const path of paths)put(directory,path,read(path));
  const retire=currentRetirement(directory),target=join(directory,catalog),alternate=join(directory,'catalog-copy.lua'),initial=realpathSync.native(target);
  writeFileSync(alternate,read(catalog));rmSync(target);symlinkSync(alternate,target);
  assert.throws(retire,error=>{
   assert.equal(error.code,'ERR_ASSERTION');assert(error.message.startsWith('retirement target changed'));
   assert.equal(error.actual,realpathSync.native(alternate));assert.equal(error.expected,initial);return true;
  });
  for(const path of paths)assert(existsSync(join(directory,path)),'retargeting cannot remove any owner: '+path);
  assert.equal(readFileSync(alternate,'utf8'),read(catalog));assert.equal(readFileSync(target,'utf8'),read(catalog));
 }finally{rmSync(directory,{recursive:true,force:true});}
});

test('original helper closure rejects changed reused or embedded bytes and wrong provenance',()=>{
 for(const [path,binding]of Object.entries(helperFiles)){
  const files={[path]:binding};
  if(binding.copyFrom){
   assert.throws(()=>originalHelperInputs(files,()=>{throw Error('missing original helper');}),/missing original helper/);
   assert.throws(()=>originalHelperInputs(files,input=>Buffer.concat([readFileSync(historicalInputPath(repository,input)),Buffer.from('\n')])),/original helper complete bytes/);
  }else assert.throws(()=>originalHelperInputs({[path]:{...binding,source:binding.source+'\n'}}),/original helper complete bytes/);
  assert.throws(()=>originalHelperInputs({[path]:{...binding,gitBlob:'0'.repeat(40)}}),/original helper Git blob/);
 }
});
