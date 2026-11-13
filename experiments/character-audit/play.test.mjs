import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession,parseCommand} from './play-session.mjs';
import {loadAdapter} from './play-adapters.mjs';
import {join} from 'node:path';
const fake=()=>({catalog:[{id:'a'}],start:()=>({hp:10,turn:1,hand:['a'],enemies:[{}]}),outcome:s=>s.hp?'playing':'defeat',
 view:s=>s,play:s=>{s.hand.pop();return s;},end:s=>{s.turn++;return s;}});
test('successful command commits once; stale replay cannot play next slot or end twice',()=>{
 const s=createSession(fake());const result=s.dispatch({type:'play',revision:0,slot:1});
 assert.equal(result.ok,true);assert.equal(result.view.hand.length,0);
 assert.equal(s.dispatch({type:'end',revision:0}).ok,false);
 assert.equal(s.view().turn,1);
});
test('cancel invalidates old intent without changing combat; reset recreates seed state',()=>{
 const s=createSession(fake()),before=s.view();
 const c=s.dispatch({type:'cancel',revision:0});assert.equal(c.ok,true);
 assert.deepEqual({...c.view,revision:0},before);
 assert.equal(s.dispatch({type:'play',revision:0,slot:1}).ok,false);
 s.dispatch({type:'play',revision:1,slot:1});
 const reset=s.dispatch({type:'reset',revision:2});assert.deepEqual({...reset.view,revision:0},before);
 assert.equal(s.dispatch({type:'reset',revision:2}).ok,false);
});
test('throwing or unrenderable model cannot partially commit UI state',()=>{
 const a=fake();a.play=s=>{s.hp=1;throw Error('after mutation');};
 const s=createSession(a),before=s.view();assert.equal(s.dispatch({type:'play',revision:0,slot:1}).ok,false);assert.deepEqual(s.view(),before);
 a.play=s=>{s.hp=1;return s;};a.view=s=>{if(s.hp===1)throw Error('render');return s;};
 assert.equal(s.dispatch({type:'play',revision:0,slot:1}).ok,false);assert.deepEqual(s.view(),before);
});
test('illegal slots, targets, type, malformed numbers leave all state unchanged',()=>{
 const s=createSession(fake()),before=s.view();
 for(const cmd of [{type:'play',revision:0,slot:0},{type:'play',revision:0,slot:1,target:2},{type:'play',revision:0,slot:'1'},{type:'oops',revision:0}]){
 assert.equal(s.dispatch(cmd).ok,false);assert.deepEqual(s.view(),before);}
 for(const line of ['p 0 1 nope','e -1','p 0 1.5','r 0 extra','show extra','p 0','e 9007199254740992'])assert.throws(()=>parseCommand(line));
});
test('snapshot guard blocks commands and terminal states reject further turns',()=>{
 const a=fake();let changed=false;a.assertCurrent=()=>{if(changed)throw Error('changed');};
 const s=createSession(a);changed=true;assert.throws(()=>s.dispatch({type:'end',revision:0}));
 const dead=fake();dead.start=()=>({hp:0,turn:1,hand:[],enemies:[]});assert.equal(createSession(dead).dispatch({type:'end',revision:0}).ok,false);
});
test('public views and catalog are detached from session ownership',()=>{
 const s=createSession(fake());s.view().hand.pop();s.catalog().pop();assert.equal(s.view().hand.length,1);assert.equal(s.catalog().length,1);
});
const pins={ganyu:'c3b152dae42af9c8ddfd1e24d7e2d6026572bf37',xiao:'1e4d02a092f06dbca33f697ffbfdb61925a838bd',keqing:'d2b078e33260549ffe3da17adb71e46f730fd0d0',zhongli:'60c54bdea796b6770f129b02f4c6fa76e2367172'};
for(const [character,head] of Object.entries(pins))test('pinned battle adapter '+character,{skip:!process.env.PLAY_PIN_ROOT},async()=>{
 const root=join(process.env.PLAY_PIN_ROOT,'play-pin-'+character);
 await assert.rejects(loadAdapter(root,character,'0'.repeat(40)),/wrong HEAD/);
 const a=await loadAdapter(root,character,head);
 for(const mode of ['starter','all']){
  const s=createSession(a,{seed:37,mode}),first=s.view();
  assert.ok(first.hand.length>0);assert.ok(first.enemies.length>0);assert.ok(first.relic);
  assert.equal(Object.hasOwn(first,'rng'),false);assert.equal(Object.hasOwn(first,'drawSeed'),false);
  assert.equal(typeof first.zones.draw,'number');assert.equal(first.outcome,'playing');
  if(mode==='all')assert.equal(first.zones.draw+first.hand.length,s.catalog().length,'one copy per candidate fixture');
  assert.ok(s.catalog().every(c=>typeof c.base==='string'&&typeof c.upgraded==='string'&&c.naming==='HOLD'));
  const cancel=s.dispatch({type:'cancel',revision:0});assert.equal(cancel.ok,true);assert.deepEqual({...cancel.view,revision:0},first);
  assert.equal(s.dispatch({type:'play',revision:0,slot:1}).ok,false);
  const invalidBefore=s.view();assert.equal(s.dispatch({type:'play',revision:1,slot:999,target:1}).ok,false);assert.deepEqual(s.view(),invalidBefore);
  let accepted;for(let slot=1;slot<=first.hand.length;slot++){const r=s.dispatch({type:'play',revision:1,slot,target:1});if(r.ok){accepted=r;break;}}
  assert.ok(accepted,'at least one actual model action accepted');assert.equal(accepted.view.revision,2);
  assert.equal(s.dispatch({type:'play',revision:1,slot:1,target:1}).ok,false);
  const end=s.dispatch({type:'end',revision:2});assert.equal(end.ok,true);
  assert.ok(end.view.turn>first.turn||end.view.outcome!=='playing');
  const reset=s.dispatch({type:'reset',revision:3});assert.equal(reset.ok,true);assert.deepEqual({...reset.view,revision:0},first);
 }
 await assert.rejects(loadAdapter(root,character,head),/restart process/);
});
