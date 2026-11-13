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
test('reward revision protocol prevents double claim, validates choice and commits rendering atomically',()=>{
 const a=fake();a.start=()=>({hp:10,hand:[],enemies:[],reward:true,claimed:false});a.outcome=s=>s.reward?'reward':'playing';
 a.reward=(s,type,choice)=>{if(type==='claim'){s.claimed=true;s.choice=choice;}else if(type==='proceed')s.reward=false;return s;};
 const session=createSession(a,{mode:'run'}),before=session.view();
 assert.equal(session.dispatch({type:'claim',revision:0,choice:0}).ok,false);assert.deepEqual(session.view(),before);
 assert.equal(session.dispatch({type:'claim',revision:0,choice:2}).view.choice,1);
 assert.equal(session.dispatch({type:'claim',revision:0,choice:1}).ok,false);
 assert.equal(session.dispatch({type:'proceed',revision:1}).ok,true);
 assert.equal(session.dispatch({type:'open',revision:2}).ok,false);
 assert.deepEqual(parseCommand('k 3 2'),{type:'claim',revision:3,choice:2});
 for(const line of ['k 0','k 0 1 2','o 0 1','n -1','s nope'])assert.throws(()=>parseCommand(line));
});
test('real current Ganyu four-room adapter reaches and carries reward without duplicating rules',{skip:!process.env.GANYU_RUN_ROOT},async()=>{
 const a=await loadAdapter(process.env.GANYU_RUN_ROOT,'ganyu',process.env.GANYU_RUN_HEAD,{run:true});
 const session=createSession(a,{mode:'run'});let v=session.view();
 for(let steps=0;steps<200&&v.outcome==='playing';steps++){
  let played=false;
  for(const c of v.hand){const result=session.dispatch({type:'play',revision:v.revision,slot:c.slot,target:v.enemies.find(e=>e.hp>0)?.target});if(result.ok){v=result.view;played=true;break;}}
  if(!played)v=session.dispatch({type:'end',revision:v.revision}).view;
 }
 assert.equal(v.outcome,'reward');const hp=v.hp;const n=v.persistentDeckSize;
 v=session.dispatch({type:'open',revision:v.revision}).view;assert.equal(v.reward.cards.length,3);
 const first=v.reward.cards.map(c=>c.id);v=session.dispatch({type:'skip',revision:v.revision}).view;assert.deepEqual(v.reward.cards,[]);
 v=session.dispatch({type:'open',revision:v.revision}).view;assert.deepEqual(v.reward.cards.map(c=>c.id),first);
 v=session.dispatch({type:'claim',revision:v.revision,choice:1}).view;assert.equal(v.persistentDeckSize,n+1);
 assert.equal(session.dispatch({type:'claim',revision:v.revision,choice:1}).ok,false);
 v=session.dispatch({type:'proceed',revision:v.revision}).view;assert.equal(v.room,2);assert.equal(v.hp,hp);assert.equal(v.reward,null);assert.equal(v.persistentDeckSize,n+1);
 for(const key of ['draw','drawSeed','rewardSeed','battleSeed'])assert.equal(Object.hasOwn(v,key),false);
});
test('current Xiao run keeps campaign immediate-next-room reward semantics',{skip:!process.env.XIAO_RUN_ROOT},async()=>{
 const root=process.env.XIAO_RUN_ROOT;
 const a=await loadAdapter(root,'xiao',process.env.XIAO_RUN_HEAD,{run:true});
 const {pathToFileURL}=await import('node:url');
 const {observe,choose}=await import(pathToFileURL(join(root,'experiments/characters/xiao/research.mjs')).href);
 const session=createSession(a,{seed:37,mode:'run'});let raw=a.start(37),v=session.view();
 for(let n=0;n<200&&v.outcome==='playing';n++){
  const action=choose(observe(raw.battle),'guard');const c=action?{type:'play',revision:v.revision,slot:action.index+1,target:action.target+1}:{type:'end',revision:v.revision};
  raw=action?a.play(raw,action.index,action.target):a.end(raw);
  const r=session.dispatch(c);assert.equal(r.ok,true);v=r.view;assert.deepEqual({...v,revision:undefined,seed:undefined,mode:undefined},{...a.view(raw),revision:undefined,seed:undefined,mode:undefined});
 }
 assert.equal(v.outcome,'reward');assert.equal(v.reward.open,true);assert.equal(v.reward.immediateNextRoom,true);const hp=v.hp,deck=v.persistentDeckSize,rev=v.revision;
 for(const type of ['open','skip']){assert.equal(session.dispatch({type,revision:rev}).ok,false);assert.equal(session.view().revision,rev);}
 const result=session.dispatch({type:'claim',revision:rev,choice:1});assert.equal(result.ok,true);v=result.view;
 assert.equal(v.room,2);assert.equal(v.hp,hp);assert.equal(v.persistentDeckSize,deck+1);assert.equal(v.reward,null);
 assert.equal(session.dispatch({type:'claim',revision:rev,choice:1}).ok,false);
 for(const k of ['rng','seed','rewardRng','draw'])assert.equal(Object.hasOwn(a.view(raw),k),false);
 const skipped=a.reward(raw,'proceed');assert.equal(skipped.stage,1);assert.equal(skipped.deck.length,deck);assert.equal(skipped.battle.hp,hp);
});
test('latest Keqing 75-card adapter forwards only explicit visible choices and blocks synchronous reveals',{skip:!process.env.KEQING_LATEST_ROOT},async()=>{
 const root=process.env.KEQING_LATEST_ROOT,a=await loadAdapter(root,'keqing',process.env.KEQING_LATEST_HEAD);
 const {pathToFileURL}=await import('node:url');const b=await import(pathToFileURL(join(root,'experiments/characters/keqing/battle.mjs')).href);
 assert.equal(a.catalog.length,75);
 const setup=id=>b.createBattle({deckIds:[id,'KQ001','KQ003',...Array(7).fill('KQ002')],order:Array.from({length:10},(_,i)=>i)});
 for(const upgraded of [false,true]){
  for(const [id,opts] of [['KQ016',{move:'starter-2'}],['KQ048',{move:'starter-1'}],['KQ024',{retain:['starter-1']}],['KQ060',{purge:[]}]] ){
   const state=setup(id);state.hand[0].upgraded=upgraded;const before=structuredClone(state);
   assert.deepEqual(a.play(state,0,0,opts),b.useCard(state,'starter-0',0,opts));assert.deepEqual(state,before);
  }
  for(const id of ['KQ043','KQ044']){const s=setup(id);s.hand[0].upgraded=upgraded;const before=structuredClone(s);assert.throws(()=>a.play(s,0,0),/synchronous revealed/);assert.deepEqual(s,before);}
 }
 const s=setup('KQ016');for(const opts of [{choose:()=>null},{drawCards:()=>{}},null,[]])assert.throws(()=>a.play(s,0,0,opts));
 const session=createSession({...a,start:()=>setup('KQ024')});const result=session.dispatch({type:'play',revision:0,slot:1,target:1,options:{retain:['starter-1']}});assert.equal(result.ok,true);assert.deepEqual(result.view.hand,a.view(b.useCard(setup('KQ024'),'starter-0',0,{retain:['starter-1']})).hand);
 const view=a.view(s);assert.equal(view.hand[0].instance,'starter-0');assert.equal(Object.hasOwn(view,'draw'),false);assert.equal(Object.hasOwn(view,'rng'),false);
 assert.deepEqual(parseCommand('j {"type":"play","revision":0,"slot":1,"target":1,"options":{"retain":["starter-1"]}}').options,{retain:['starter-1']});
 for(const x of ['j null','j []','j {"type":"end"}','j {"type":"play","unexpected":1}'])assert.throws(()=>parseCommand(x));
});
