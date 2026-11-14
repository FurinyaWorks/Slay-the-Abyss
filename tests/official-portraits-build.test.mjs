import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gameLayout} from '../scripts/game-ui-layout.mjs';

const modulePath=new URL('../scripts/official-portraits.mjs',import.meta.url);
test('V25 inventory counts the actual independent selection and result source instances',async t=>{
 const {writePortraitModule,portraitRuntimeInventory,portraitInventory}=await import(modulePath);
 const dir=mkdtempSync(join(tmpdir(),'abyss-v25-portrait-inventory-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 writePortraitModule(dir,{v25BattleChrome:true});
 const actual=portraitRuntimeInventory(dir),expected=portraitInventory({},{budget:false,v25:true});
 assert.deepEqual(actual,expected);
 for(const key of ['battle133','battle133-selection','battle133-result']){
  assert.equal(actual.assets.find(row=>row.asset==='traveler-geo/portraits/'+key)?.images,4315);
 }
 assert.equal(actual.assets.filter(row=>row.asset.endsWith('-result')).length,1);
});

test('official shared selection inventory requires the explicit producer schema and rejects unmarked historical modules',async t=>{
 const {writePortraitModule,portraitRuntimeInventory,portraitModule}=await import(modulePath);
 const dir=mkdtempSync(join(tmpdir(),'abyss-official-selection-schema-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const source=writePortraitModule(dir,{officialAssets:true});
 assert.match(source,/^selectionUses='battleApprovedIdle',?$/m,'new producer declares the same approved battle source');
 const actual=portraitRuntimeInventory(dir);
 assert.equal(actual.selectionUses,'battleApprovedIdle');
 assert.equal(actual.assets.find(row=>row.asset==='traveler-geo/idle-approved-v1-selection-crop').images,7303);
 assert.equal(actual.assets.some(row=>row.asset.includes('temporary-pixel')),false);
 const file=join(dir,portraitModule+'.lua');
 for(const [invalid,error] of [
  [source.replace(/^selectionUses='battleApprovedIdle',?\r?\n/m,''),/selection schema.*pinned producer/i],
  [source.replace("selectionUses='battleApprovedIdle'","selectionUses='battle133'"),/selection schema.*pinned producer/i],
  [source.replace(/^battleApprovedIdle=.*\r?\n/m,''),/battle idle differs/],
  [source.replace("selectionUses='battleApprovedIdle'","selectionUses='battleApprovedIdle',\nselectionUses='battleApprovedIdle'"),/selection schema.*pinned producer/i],
  [source.replace(/^selectionProfile=.*\r?\n/m,''),/selection crop schema.*pinned producer/i],
 ]){
  writeFileSync(file,invalid);
  assert.throws(()=>portraitRuntimeInventory(dir),error,
   'historical or ambiguous source must not be relabelled as the shared approved idle');
 }
 writePortraitModule(dir);assert.doesNotThrow(()=>portraitRuntimeInventory(dir),'legacy remains independently readable');
 writePortraitModule(dir,{v25BattleChrome:true});
 assert.equal(portraitRuntimeInventory(dir).assets.find(row=>row.asset==='traveler-geo/portraits/battle133-selection').images,4315);
 const battleOnly=writePortraitModule(dir,{officialAssets:true,selectionAvatar:false,battlePortrait:true});
 assert.doesNotMatch(battleOnly,/^selectionUses=/m);
  assert.equal(portraitRuntimeInventory(dir).assets.find(row=>row.asset==='traveler-geo/idle-approved-v1').images,7303);
});
test('native selection budget changes only selection art and preserves the frozen battle literal',async t=>{
 const {writePortraitModule,selectionBudget,portraitRuntimeInventory}=await import(modulePath);
 const dir=mkdtempSync(join(tmpdir(),'abyss-selection-budget-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 writeFileSync(join(dir,'art-render-v2.json'),'{}');
 const pack=selectionBudget();assert.equal(pack.assets.avatar96.count,457);assert.equal(pack.assets.selection133.count,1940);
 const source=writePortraitModule(dir);
 const original=readFileSync('art/characters/traveler-geo/portraits/battle133/runtime-no-snapshot.lua','utf8');
 const block=original.slice(original.indexOf('local ROOT = '),original.indexOf('\nlocal created = {}'));
 assert(source.includes(block),'battle must keep every original row');
 assert.match(source,/selection133=/);assert.equal(portraitRuntimeInventory(dir).peakDynamicControls,6901,'lowpolyHero replaces the unused selection133 instance');
});
test('portrait builder adds dedicated thumbnail, selection and battle hosts without changing existing controls',async()=>{
 assert(existsSync(modulePath),'portrait helper must implement actual asset integration');
 const {attachOfficialPortraits}=await import(modulePath);
 const layout={controls:[{name:'stage',kind:'container',children:gameLayout().controls}]};
 const before=structuredClone(layout),templates=[];attachOfficialPortraits(layout,templates);
 const stage=layout.controls[0],panel=stage.children.find(c=>c.name==='characterPanel');
 const traveler=panel.children.find(c=>c.name==='traveler'),host=traveler.children.find(c=>c.name==='officialAvatar');
 assert(host);assert.equal(host.kind,'container');assert.equal(host.visible,false);assert.deepEqual(host.children,[]);
 assert.deepEqual(host.size,[96,96]);
 const bust=traveler.children.find(c=>c.name==='hit').children[0].children.find(c=>c.name==='bust');
 assert.deepEqual(host.scale,[bust.size[0]/96,bust.size[0]/96]);assert.ok(bust.size[0]>=64,'avatar fills a real card, not a 32px chip');
 assert.deepEqual(host.position,bust.position);assert.equal(traveler.children.filter(c=>c.name==='officialAvatar').length,1);
 const hero=stage.children.find(c=>c.name==='battlePanel').children.find(c=>c.name==='hero');
 const figure=hero.children.find(c=>c.name==='officialFigure');assert(figure);assert.equal(figure.visible,false);
 assert.equal(hero.children.indexOf(figure),hero.children.findIndex(c=>c.name==='portrait')+1);
 assert.deepEqual(figure.size,[133,133]);assert.deepEqual(figure.scale,[(400/3)/133,(400/3)/133]);
 const details=panel.children.find(c=>c.name==='details'),selection=details.children.find(c=>c.name==='officialSelectionFigure');
 const frame=details.children.find(c=>c.name==='portraitFrame');assert(selection);assert.equal(selection.visible,false);
 assert.deepEqual(selection.position,[frame.position[0],frame.position[1]-(frame.size[1]-frame.size[0])/2]);
 assert.deepEqual(selection.scale,[frame.size[0]/133,frame.size[0]/133]);
 details.children=details.children.filter(c=>c!==selection);
 traveler.children=traveler.children.filter(c=>c!==host);hero.children=hero.children.filter(c=>c!==figure);
 assert.deepEqual(layout,before,'no existing input, HUD or fallback may be changed by attaching hosts');
 assert.equal(templates.length,0,'parent supplies shared image/container templates, no private duplicate');
});

test('candidate binding rejects placeholders and extracts frozen byte-identical ROOT/ELEMENTS blocks',async t=>{
 assert(existsSync(modulePath),'portrait helper missing');
 const {writePortraitModule,bindPortraitTemplates,portraitModule,portraitInputs,portraitRuntimeInventory}=await import(modulePath);
 const dir=mkdtempSync(join(tmpdir(),'abyss-portrait-build-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 assert.throws(()=>bindPortraitTemplates(dir,{image:{templateIndex:0},container:{templateIndex:88}}),/templateIndex/);
 assert.throws(()=>bindPortraitTemplates(dir,{image:{imageId:100001},container:{templateIndex:88}}),/templateIndex/);
 const source=bindPortraitTemplates(dir,{image:{templateIndex:77},container:{templateIndex:88}});
 assert.equal(readFileSync(join(dir,portraitModule+'.lua'),'utf8'),source);
 for(const kind of ['avatar96','battle133']){
  const path=`art/characters/traveler-geo/portraits/${kind}/runtime-no-snapshot.lua`;
  const original=readFileSync(path,'utf8');
  const block=original.slice(original.indexOf('local ROOT = '),original.indexOf('\nlocal created = {}'));
  assert(source.includes(block),'real original literal bytes are consumed, not recreated');
  assert(portraitInputs.includes(path));assert(portraitInputs.includes(path.replace('runtime-no-snapshot.lua','native-art.json')));
 }
 assert(!source.includes('function OnStart'),'must not retain synchronous original creation path');
 assert(source.includes(readFileSync('art/characters/traveler-geo/portraits/avatar96/LICENSE-runtime-MIT.txt','utf8')),'candidate runtime must carry the upstream permission notice');
 assert.throws(()=>writePortraitModule(dir,{imageTemplateIndex:100001,containerTemplateIndex:88}),/templateIndex/);
 const inventory=portraitRuntimeInventory(dir);assert.equal(inventory.batchSize,64);assert.equal(inventory.peakDynamicControls,11340,'full avatar/battle plus lowpolyHero selection');
 assert.equal(inventory.maxDirectDynamicChildren,60);assert.equal(inventory.officialCapacity,'not_measured');
});
