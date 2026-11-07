import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {mkdtempSync,writeFileSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {viewportProbeSources,prepareViewportProbe} from './viewport-probe.mjs';
const source=()=>viewportProbeSources({server:{graphId:100,name:'_GSTS_ABYSS_VIEW_PROBE'},skill:{graphId:200,name:'_GSTS_ABYSS_VIEW_PROBE_SKILL'},skillId:300});
const js=code=>code.replace(/^import .*$/gm,'').replace(/ as (const|any)/g,'');
test('native skill emits actual feet/world axes/head and two inverse projections once',()=>{
 let callback;const results=[],feet=[7,2,9],added=(a,b)=>a.map((n,i)=>n+b[i]);
 vm.runInNewContext(js(source()[1].code),{g:{characterSkill:()=>({on(_event,fn){callback=fn}})},defineSignal:name=>name});
 callback({}, {getSelfEntity:()=>42,getEntityLocation:()=>feet,getCustomVariable:()=>({asType:()=>1n}),_3dVectorAddition:added,
  worldCoordinatesToScreenCoordinates:world=>({screenX:world[0]*100,screenY:world[1]*100}),
  screenCoordinatesToViewportCoordinates:(x,y)=>({viewportX:x/100,viewportY:y/100}),
  viewportCoordinatesToScreenCoordinates:(x,y)=>({screenX:x*100,screenY:y*100}),
  screenCoordinatesToWorldCoordinates:(x,y,depth)=>[depth,2*depth,3*depth],
  split3dVector:v=>({xComponent:v[0],yComponent:v[1],zComponent:v[2]}),
  sendSignalToServerNodeGraph:(signal,...values)=>results.push({signal,values})});
 assert.equal(results.length,6);assert.ok(results.every(r=>r.signal==='ABYSS_VIEW_POINT'));
 assert.deepEqual(results.map(r=>r.values.slice(4)),[feet,[10.2,2,9],[7,2,12.2],[7,3.7,9],[1,2,3],[2,4,6]]);
 assert.deepEqual(results.map(r=>r.values[1]),[0n,1n,2n,3n,4n,5n]);
 assert.doesNotMatch(source()[1].code,/notifyServerNodeGraph|teleport|performAttack|setCustomVariable/);
});
test('character timer schedules one bounded automatic Q cast and never edits camera or rules',()=>{
 const handlers={},timers=[],casts=[];
 const owner={on(event,fn){handlers[event]=fn;return owner},onSignal(){return owner}};
 vm.runInNewContext(js(source()[0].code),{g:{server:()=>owner},defineSignal:name=>name,CharacterSkillSlot:{Skill2Q:2},TopOfStackSkillDestructionType:{Destroy:0}});
 const f={addCharacterSkill(){},startTimer:(...args)=>timers.push(args),printString(){},setCustomVariable(){},castSkillFromSpecifiedPanelSlot:(...args)=>casts.push(args)};
 handlers.whenEntityIsCreated({eventSourceEntity:42},f);assert.equal(timers.length,1);assert.equal(timers[0][3][0],5);
 handlers.whenTimerIsTriggered({eventSourceEntity:42,timerName:'unrelated'},f);assert.equal(casts.length,0);
 handlers.whenTimerIsTriggered({eventSourceEntity:42,timerName:'ABYSS_VIEW_SAMPLE'},f);assert.deepEqual(casts,[[42,2,false]]);
 assert.doesNotMatch(source().map(s=>s.code).join('\n'),/setPlayerCount|modifyEntityFaction|teleport|setPlayerCamera/);
});
test('prepare works only on a distinct copied GIL and compiles the two added graphs',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'abyss-viewport-probe-')),base=join(dir,'source.gil'),original=Buffer.from('isolated fixture');writeFileSync(base,original);
 const calls=[];let graph=100;
 const result=await prepareViewportProbe({mapPath:base,output:join(dir,'output'),call:async(name,args)=>{
  calls.push({name,args});assert.notEqual(args.mapPath,base);
  if(name==='scene_add_graph')return {graphId:graph++,name:'_GSTS_'+args.name};
  if(name==='scene_add_skill')return {skillId:300};
  if(name==='write_graphs')return {written:args.graphs.map(g=>g.graphId)};
  if(name==='inspect_map')return {graphs:[{id:100,nodeCount:10},{id:101,nodeCount:10}]};
  return {};
 }});
 assert.equal(result.statuses.compile,'passed');assert.equal(result.statuses.playtest,'not_run');assert.equal(result.graphName,'_GSTS_ABYSS_VIEW_PROBE');
 assert.deepEqual(readFileSync(base),original);
 assert.ok(!calls.some(c=>/playtest|editor_|player_count/.test(c.name)));
 assert.equal(calls.find(c=>c.name==='scene_add_skill').args.type,'instant');
});
