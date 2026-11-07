import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {cameraProjectionSources,prepareCameraProjection,cameraProjectionPoints} from './camera-projection.mjs';
const source=()=>cameraProjectionSources({server:{graphId:10,name:'server'},skill:{graphId:20,name:'skill'},skillId:30});
const js=code=>code.replace(/^import .*$/gm,'').replace(/ as (const|any)/g,'');
test('explicit client sample returns four actual engine inverse projection points with the current sequence',()=>{
 let callback;const samples=[];
 vm.runInNewContext(js(source()[1].code),{g:{characterSkill:()=>({on(_event,fn){callback=fn}})},defineSignal:name=>name});
 callback({}, {getSelfEntity:()=>1,getCustomVariable:()=>({asType:()=>7n}),
  viewportCoordinatesToScreenCoordinates:(u,v)=>({screenX:u*100,screenY:v*100}),
  screenCoordinatesToWorldCoordinates:(x,y,d)=>[x,y,d],split3dVector:p=>({xComponent:p[0],yComponent:p[1],zComponent:p[2]}),
  sendSignalToServerNodeGraph:(...values)=>samples.push(values)});
 assert.deepEqual(samples.map(s=>s.slice(0,3)),[0n,1n,2n,3n].map(point=>['LAB3D_CAMERA_SAMPLE',7n,point]));
 assert.deepEqual(samples.map(s=>s.slice(3)),cameraProjectionPoints.map(([u,v,d])=>[u*100,v*100,d]));
 assert.doesNotMatch(source().map(s=>s.code).join('\n'),/startTimer|teleport|notifyServerNodeGraph|setPlayerCamera|setPlayerCount/);
});
test('server casts only for newer requests and forwards only matching bounded samples',()=>{
 const handlers={},casts=[],sent=[],variables=new Map();let players=[100];
 const owner={on(n,fn){handlers[n]=fn;return owner},onSignal(n,fn){handlers[n]=fn;return owner}};
 vm.runInNewContext(js(source()[0].code),{g:{server:()=>owner},defineSignal:name=>name,CharacterSkillSlot:{Skill2Q:2},TopOfStackSkillDestructionType:{Destroy:0}});
 const f={getSelfEntity:()=>1,getListOfPlayerEntitiesOnTheField:()=>players,getAllCharacterEntitiesOfSpecifiedPlayer:()=>[1],
  getCustomVariable:id=>({asType:()=>variables.get(id)??0n}),setCustomVariable:(id,_key,v)=>variables.set(id,v),
  addCharacterSkill(){},castSkillFromSpecifiedPanelSlot:(...v)=>casts.push(v),sendSignal:(...v)=>sent.push(v)};
 handlers.whenEntityIsCreated({eventSourceEntity:1},f);assert.equal(casts.length,0);
 const request=seq=>handlers.LAB3D_CAMERA_REQUEST({params:{seq}},f);
 request(1n);request(1n);request(0n);assert.deepEqual(casts,[[1,2,false]]);
 const sample=(seq,point)=>handlers.LAB3D_CAMERA_SAMPLE({params:{seq,point,x:1,y:2,z:3}},f);
 sample(0n,0n);sample(1n,4n);assert.equal(sent.length,0);
 sample(1n,0n);assert.deepEqual(sent,[['client:LAB3D_CAMERA',100,1n,0n,1,2,3]]);
 players=[100,200];request(2n);sample(1n,1n);assert.equal(casts.length,1);assert.equal(sent.length,1);
});
test('prepare copies the source, checks both graph budgets, and leaves rules untouched',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'abyss-camera-projection-')),base=join(directory,'base.gil');writeFileSync(base,'fixture');
 const calls=[];let graph=10;
 const result=await prepareCameraProjection({mapPath:base,call:async(name,args)=>{
  calls.push({name,args});assert.notEqual(args.mapPath,base);
  if(name==='scene_add_graph')return {graphId:graph++,name:args.name};
  if(name==='scene_add_skill')return {skillId:30};
  if(name==='write_graphs')return {written:args.graphs.map(g=>({graphId:g.graphId,limits:{nodeCount:10,editorCount:10}}))};
  if(name==='inspect_map')return {graphs:[{id:10,nodeCount:10,editorCount:10},{id:11,nodeCount:10,editorCount:10}]};
  return {};
 }});
 assert.equal(readFileSync(base,'utf8'),'fixture');assert.equal(result.statuses.compile,'passed');assert.equal(result.statuses.playtest,'not_run');
 assert.equal(result.compiledBudget.graphs.length,2);assert.equal(result.graphBudget.graphs.length,2);
 assert.equal(calls.filter(c=>c.name==='scene_add_signal').length,3);
 assert.ok(!calls.some(c=>/playtest|editor_|player_count/.test(c.name)));
});
