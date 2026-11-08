import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,mkdirSync,writeFileSync,existsSync,linkSync,unlinkSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
const sandbox=process.cwd();
const {sourceEpoch}=await import('./helpers/combined-epoch/source-epoch.mjs');
const proof=sourceEpoch.proof,raw=p=>proof.current[p]?.source??null;
test('fresh authorization covers the complete changed-owner union without caching',()=>{
 const required=Object.keys(proof.current).filter(path=>Object.values(proof.targets).some(target=>target.files[path]?.sha256!==proof.current[path]?.sha256));
 assert.deepEqual([...proof.owners].sort(),required.sort());
});
test('combined epoch authenticates the complete current production tree',()=>{
 const files=['config/architecture.json',...readdirSync('src/lua').filter(p=>p.endsWith('.lua')).map(p=>'src/lua/'+p)].sort();
 assert.deepEqual(files,Object.keys(proof.current).filter(p=>proof.current[p]!==null).sort());
 for(const path of files)assert.equal(readFileSync(path,'utf8').replaceAll('\r\n','\n'),raw(path),path);
});
const cases=[
 ['m7-core-final','preM7FinalSource','develop','abyss_original_v4'],
 ['relic-query','preRelicQuerySource','develop','abyss_inventory'],
 ['core-lifecycle','preCoreLifecycleSource','develop','abyss_actor'],
 ['game-ui-extraction','preGameUiExtractionSource','develop','abyss_game_ui'],
 ['round3-catalog','preRound3CatalogSource','develop','abyss_combat_catalog'],
 ['power-shop','prePowerShopSource','powerShop','abyss_shop'],
 ['session-reward','preSessionRewardSource','sessionReward','abyss_potion_rewards'],
 ['watcher-final-execution','preWatcherExecutionSource','watcher','abyss_watcher_final_cards'],
 ['inventory-responsibilities','preInventoryResponsibilitiesSource','inventory','abyss_inventory'],
 ['act1-choice','preAct1ChoiceSource','act1','abyss_act1_events'],
 ['defect-plan','preDefectPlanSource','defect','abyss_defect_engine_cards'],
 ['colorless-catalog','preColorlessCatalogSource','colorless','abyss_combat_catalog'],
 ['potion-callback','prePotionCallbackSource','potion','abyss_relic_hooks'],
 ['end-turn-responsibilities','preEndTurnResponsibilitiesSource','endTurn','abyss_end_turn_powers'],
 ['actor-presence','preActorPresenceSource','actor','abyss_actor'],
 ['reward-query-boundary','preRewardQueryBoundarySource','reward','abyss_relic_choices'],
];
for(const [file,name,target,module]of cases){
 const exported=await import(`./helpers/${file}-source-inverse.mjs`),fn=exported[name];
 test(`${name}: current source and configuration match original target projection`,()=>{
  const targetRead=p=>proof.targets[target].files[p]?.source??null;
  for(const path of [`src/lua/${module}.lua`,'config/architecture.json']){
   const expected=fn(path,targetRead(path),{readSource:targetRead});
   assert.equal(fn(path,raw(path),{readSource:raw}),expected,path);
  }
 });
 test(`${name}: foreign input stays opaque and performs no linked reads`,()=>{
  const path=`src/lua/${module}.lua`,foreign=raw(path)+'\n';let count=0;
  assert.equal(fn(path,foreign,{readSource(){count++;throw Error('unexpected read');}}),foreign);assert.equal(count,0);
 });
}
test('root combined projection rejects fresh missing/foreign/late-linked drift after success',async()=>{
 const {preRelicQuerySource:fn}=await import('./helpers/relic-query-source-inverse.mjs');
 const path='config/architecture.json',last=proof.owners.at(-1);let corrupt=false,count=0;
 const reader=p=>{count++;return corrupt&&p===last?raw(p)+'\n':raw(p);};
 fn(path,raw(path),{readSource:reader});assert(count>=proof.owners.length);
 corrupt=true;assert.throws(()=>fn(path,raw(path),{readSource:reader}),/linked owner/);
});
test('round3 absent catalog still retires Actor, Potion, and Colorless witnesses',async()=>{
 const {prepareRound3CatalogModuleRetirement:prepare}=await import('./helpers/round3-catalog-source-inverse.mjs');
 const root=mkdtempSync(join(tmpdir(),'retirement-proposal-'));
 const paths=['src/lua/abyss_actor_presence.lua','src/lua/abyss_relic_potion_hooks.lua','src/lua/abyss_colorless_catalog.lua'];
 const liveBefore=Object.fromEntries(paths.map(path=>[path,readFileSync(join(sandbox,path),'utf8')]));
 for(const path of paths){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),raw(path));}
 const retire=prepare(root,{sourceRoot:sandbox});retire();for(const path of paths)assert.equal(existsSync(join(root,path)),false,path);
 for(const path of paths)assert.equal(readFileSync(join(sandbox,path),'utf8'),liveBefore[path],'live source retained');
});
test('round3 present catalog retires all witnesses and rechecks bytes before deletion',async()=>{
 const {prepareRound3CatalogModuleRetirement:prepare}=await import('./helpers/round3-catalog-source-inverse.mjs');
 const paths=['src/lua/abyss_combat_catalog.lua','src/lua/abyss_actor_presence.lua','src/lua/abyss_relic_potion_hooks.lua','src/lua/abyss_colorless_catalog.lua'];
 for(const mutate of [false,true]){
  const root=mkdtempSync(join(tmpdir(),'retirement-present-'));
  for(const path of paths){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),raw(path));}
  const retire=prepare(root,{sourceRoot:sandbox});
  if(mutate){writeFileSync(join(root,paths[0]),raw(paths[0])+'\n');assert.throws(retire,/identity/);for(const path of paths)assert(existsSync(join(root,path)));}
  else{retire();for(const path of paths)assert(!existsSync(join(root,path)));}
 }
});
test('round3 retirement rejects live hardlinks and live source roots',async()=>{
 const {prepareRound3CatalogModuleRetirement:prepare}=await import('./helpers/round3-catalog-source-inverse.mjs');
 assert.throws(()=>prepare(sandbox,{sourceRoot:sandbox}),/separate/);
 const root=mkdtempSync(join(sandbox,'retirement-hardlink-')),path='src/lua/abyss_combat_catalog.lua';mkdirSync(dirname(join(root,path)),{recursive:true});
 linkSync(join(sandbox,path),join(root,path));try{assert.throws(()=>prepare(root,{sourceRoot:sandbox}),/single link|inode/);}finally{unlinkSync(join(root,path));}
});
