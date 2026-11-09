import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {baselineSources,watcherVm} from './helpers/watcher-actor-vm.mjs';
import {analyzeSources} from '../scripts/check-architecture.mjs';
import {luaString} from '../scripts/build-lua-data.mjs';
import {discoverSources,dependencyCycles} from '../scripts/lua-quality-metrics.mjs';
import {componentUiSourceEpoch} from './helpers/component-ui-source-epoch.mjs';
const file='src/lua/abyss_watcher_attack_cards.lua';
const queued='src/lua/abyss_combat_queued_play.lua';
const read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const pass=options=>{const result=watcherVm(options);assert.equal(result.status,0,result.error);return result;};

test('complete original owners bind to independent develop Git blobs',()=>{
 const expected={"src/lua/abyss_watcher_attack_cards.lua": "6f261598ecc5569b17dd2968e1860b8ef988cf97", "src/lua/abyss_combat_queued_play.lua": "c34650f97f2b58c076f9b081ab806345f505aa2a", "config/architecture.json": "d572702dc8966a1770c1c6dab67ef947e563afb8"};
 assert.deepEqual(Object.keys(baselineSources()).sort(),Object.keys(expected).sort());
 for(const [path,source]of Object.entries(baselineSources()))assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0`).update(source).digest('hex'),expected[path]);
});

test('Watcher planning leaves the complete SCC without hiding delayed requires',()=>{
 const raw=discoverSources();const sources=Object.fromEntries(Object.entries(raw).map(([p,s])=>[p.split('/').at(-1).slice(0,-4),s]));
 const policy=JSON.parse(read('config/architecture.json')),report=analyzeSources(sources,policy);
 assert.deepEqual(report.errors,[]);
 const additions=['abyss_actor_presence','abyss_colorless_catalog','abyss_native_pages','abyss_relic_potion_hooks','abyss_turn_power_phases'];
 const componentAdditions=Object.keys(componentUiSourceEpoch.proof.current).filter(path=>componentUiSourceEpoch.proof.targets.componentPrior.files[path]===null).map(path=>path.split('/').at(-1).slice(0,-4));
 const priorNames=Object.keys(sources).filter(name=>!componentAdditions.includes(name));
 for(const name of additions)assert(Object.hasOwn(sources,name),'develop added owner: '+name);
 assert.equal(priorNames.filter(name=>!additions.includes(name)).length,333,'original inventory retained alongside five develop additions');
 assert.equal(priorNames.length,338,'complete pre-component combined inventory');
 assert.equal(componentAdditions.length,6);
 assert.deepEqual(Object.keys(sources).sort(),Object.keys(componentUiSourceEpoch.proof.current).filter(path=>path.startsWith('src/lua/')).map(path=>path.split('/').at(-1).slice(0,-4)).sort(),'complete current inventory retains every original and component owner');
 assert(!dependencyCycles(report.nodes,report.edges).some(c=>c.members.includes('abyss_watcher_attack_cards')));
 assert.deepEqual(report.edges.filter(e=>e.from==='abyss_watcher_attack_cards'),[]);
 const actorEdges=report.edges.filter(e=>e.from==='abyss_combat_queued_play'&&e.to==='abyss_actor');
 assert.equal(actorEdges.length,2,'original eager import and new lazy host require are both measured');
 assert(actorEdges.some(e=>read(queued).split('\n')[e.line-1].includes('local function watcherActorHost()')));
 for(const injected of ["local X=require('abyss_actor')\n","local function X()return require('abyss_actor')end\n"]){
  const mutant=analyzeSources({...sources,abyss_watcher_attack_cards:injected+sources.abyss_watcher_attack_cards},policy);
  assert(mutant.errors.some(e=>JSON.stringify(e).includes('watcher-attack-planning')),'direct and deferred back edges are rejected');
 }
});

for(const fixture of ['tests/lua/watcher_attack_build.lua','tests/lua/watcher_early_turn_autoplay.lua'])test(`unchanged behavior assertions and complete graphs match both VMs: ${fixture}`,()=>{
 const before=pass({before:true,fixture}),after=pass({fixture});
 assert(before.graphs.length>0);assert.deepEqual(after.graphs,before.graphs);
});

test('cold data-only planner admits no execution owner and resolves the host only after Halt validation',()=>pass({body:`
 local Cards=require('abyss_watcher_attack_cards')
 assert(package.loaded.abyss_actor==nil and package.loaded.abyss_combat==nil)
 local calls=0;local failure={kind='host unavailable'}
 local function host()calls=calls+1;error(failure,0)end
 local state={player={},enemies={}}
 assert(#Cards.prepareEffect(state,{op='bowlingBash',value=3},host)==0)
 assert(Cards.prepareEffect(state,{op='damage',value=3},host)[1].value==3)
 for _,effect in ipairs({{op='halt',value=-1,wrathValue=3},{op='halt',value=3,wrathValue=-1}})do
  local ok,why=pcall(Cards.prepareEffect,state,effect,host);assert(not ok and why~=failure)
 end
 assert(calls==0)
 local ok,why=pcall(Cards.prepareEffect,state,{op='halt',value=3,wrathValue=9},host)
 assert(not ok and why==failure and calls==1)
 assert(package.loaded.abyss_actor==nil and package.loaded.abyss_combat==nil)
`}));

test('Halt retains two dynamic method reads, raw failure identity, return arity and detached input',()=>pass({body:`
 local Cards=require('abyss_watcher_attack_cards')
 local state={player={}};local effect
 effect={op='halt',value=3,wrathValue=9,child={tag='original'}}
 local reads,calls=0,0;local actors={}
 local function host()reads=reads+1;return actors end
 actors.blockAmount=function(s,p,n)
  assert(s==state and p==state.player and n==3);calls=calls+1
  actors.blockAmount=function(s2,p2,n2)assert(s2==state and p2==state.player and n2==9);calls=calls+1;return 12,'ignored'end
  return 4,'ignored'
 end
 assert(select('#',Cards.prepareEffect(state,effect,host))==1)
 assert(reads==1 and calls==2 and effect.value==3 and effect.wrathValue==9 and effect.prepared==nil)
 actors.blockAmount=function(_,_,n)return n+1 end
 local out=Cards.prepareEffect(state,effect,host)[1]
 assert(out.value==4 and out.wrathValue==10 and out.prepared and out~=effect and out.child~=effect.child)
 local failure={tag='second arithmetic failure'};calls=0
 actors.blockAmount=function()calls=calls+1;if calls==2 then error(failure,0)end;return 8 end
 local ok,why=pcall(Cards.prepareEffect,state,effect,host)
 assert(not ok and why==failure and calls==2 and effect.value==3 and effect.prepared==nil)
 actors.blockAmount=setmetatable({}, {__call=function(_,_,_,n)return n end})
 assert(Cards.prepareEffect(state,effect,host)[1].value==3)
`}));

test('real queued Halt rolls back a late arithmetic failure and retries through the current dynamic slot',()=>pass({body:`
 local C=require('abyss_combat');local A=require('abyss_actor')
 local P=require('abyss_character_profiles');local D=require('abyss_data')
 local s=C.new(P.prepare(D,'watcher'),{seed=42,cardRandomSeed='42',enableStances=true,deck={'halt'},enemies={'cultist'}})
 local stateBefore=WATCHER_GRAPH(s);local player,hand,card=s.player,s.hand,s.hand[1]
 local original=A.blockAmount;local calls=0;local failure={tag='late Halt amount failure'}
 A.blockAmount=function(...)calls=calls+1;if calls==2 then error(failure,0)end;return original(...)end
 local ok,why=pcall(C.play,s,card.uid,1);A.blockAmount=original
 assert(not ok and why==failure and calls==2)
 assert(WATCHER_GRAPH(s)==stateBefore and s.player==player and s.hand==hand and s.hand[1]==card)
 s.player.stance='Wrath';s.player.statuses.dexterity=-5
 assert(C.play(s,card.uid,1));assert(s.player.block==4)
`}));

for(const [name,before,after]of [
 ['missing host',"state,effect,watcherActorHost)","state,effect,nil)"],
])test(`real gameplay rejects missing capability: ${name}`,()=>{
 const source=read(queued);assert.equal(source.split(before).length,2);
 const result=watcherVm({fixture:'tests/lua/watcher_attack_build.lua',replace:{[queued]:source.replace(before,after)}});
 assert.notEqual(result.status,0);assert.match(result.error,/actorHost/);
});

test('second Halt amount mutation is rejected by the original exact block assertion',()=>{
 const source=read(file),before='Actors.blockAmount(state,state.player,effect.wrathValue)',after='Actors.blockAmount(state,state.player,effect.value)';
 assert.equal(source.split(before).length,2);
 const result=watcherVm({fixture:'tests/lua/watcher_attack_build.lua',replace:{[file]:source.replace(before,after)}});
 assert.notEqual(result.status,0);assert.match(result.error,/3 ~= 8/);
});

// The byte-preserved old protocol still expects the old two-argument planner.
// Pair it with the complete frozen planner instead of rewriting either body.
test('frozen protocol and complete frozen planner agree with current host for Halt',()=>{
 const baseline=baselineSources()[file];
 const setup=`
 local C=require('abyss_combat');local Q=require('abyss_action_queue')
 local P=require('abyss_character_profiles');local D=require('abyss_data')
 local s=C.new(P.prepare(D,'watcher'),{seed=42,cardRandomSeed='42',enableStances=true,deck={'halt'},enemies={'cultist'}})
 s.player.statuses.dexterity=2;s.player.statuses.frail=1
 local card=s.hand[1];local definition=C.cardDefinition(s,card)
 local hooks={event=function(_,kind,detail)require('abyss_events').emit(s,kind,detail)end,
  paidCost=function()return 0 end,queueUseCopies=function()end,handlers={},finish=function()end}
 Q.run=function()return 'pause'end
 `;
 const old=pass({body:setup+`
 package.loaded.abyss_watcher_attack_cards=assert(load(${luaString(baseline)},'@src/lua/abyss_watcher_attack_cards.lua'))()
 local old=dofile('tests/lua/support/m9_combat_protocol_baseline.lua')(C,hooks)
 old.begin(s,card.uid,1,card,1,definition)
 WATCHER_GRAPH_WRITE(s,'halt-protocol')
 `});
 const current=pass({body:setup+`
 require('abyss_combat_queued_play').begin(C,hooks,s,card.uid,1,card,1,definition)
 WATCHER_GRAPH_WRITE(s,'halt-protocol')
 `});
 assert.deepEqual(current.graphs,old.graphs);
});
