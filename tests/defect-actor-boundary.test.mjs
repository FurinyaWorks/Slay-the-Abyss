import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {baseline,defectVm} from './helpers/defect-actor-vm.mjs';
import {analyzeSources} from '../scripts/check-architecture.mjs';
import {discoverSources,dependencyCycles} from '../scripts/lua-quality-metrics.mjs';
import {generatedRuntimeModules} from '../scripts/build-native-candidate.mjs';
import {currentDefectActorReader} from './helpers/m7-core-final-source-inverse.mjs';
import {sourceEpoch,ciRepairSourceEpoch} from './helpers/closeout-source-epoch.mjs';
const require=createRequire(import.meta.url),luaparse=require('luaparse');
const utility='src/lua/abyss_defect_utility_cards.lua',queued='src/lua/abyss_combat_queued_play.lua';
const fixture='tests/lua/defect_utility_build.lua',protocol='tests/lua/support/m9_combat_protocol_baseline.lua';
const read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const actorRead=currentDefectActorReader(read);
// These two original capability-policy contracts describe the complete cb
// runtime, before StS adds a UI-only owner. Authenticate the entire live input
// before materializing that explicit view; never filter arbitrary live modules.
function capabilityPreStyle(raw=discoverSources()){
 const config='config/architecture.json',live={...raw,[config]:read(config)},proof=sourceEpoch.proof;
 assert.deepEqual(Object.keys(live).sort(),Object.keys(proof.current).sort(),'complete live source inventory before preStyle');
 for(const [path,binding]of Object.entries(proof.current))assert.equal(live[path].replaceAll('\r\n','\n'),binding.source,'live preStyle input identity: '+path);
 const admitted=sourceEpoch.preCombinedSource(config,live[config],{target:'stsStylePrior',readSource:read});
 assert.equal(admitted,ciRepairSourceEpoch.proof.current[config].source,'fresh complete current owners authorize the cb view');
 const prior=proof.targets.stsStylePrior.files;
 for(const [path,binding]of Object.entries(ciRepairSourceEpoch.proof.current))assert.deepEqual(prior[path],binding,'complete preStyle target: '+path);
 const sources=Object.fromEntries(Object.entries(prior).filter(([path,binding])=>path.startsWith('src/lua/')&&binding!==null).map(([path,binding])=>[path,binding.source]));
 return {sources,read:path=>{assert(prior[path],'known complete preStyle input');return prior[path].source;}};
}
const pass=options=>{const result=defectVm(options);assert.equal(result.status,0,result.error);return result;};
const mutate=(path,from,to)=>{const source=read(path);assert.equal(source.split(from).length,2,'unique semantic mutation');const changed=source.replace(from,to);luaparse.parse(changed,{luaVersion:'5.3'});return {[path]:changed};};
const cold=`
 local U=require('abyss_defect_utility_cards')
 assert(package.loaded.abyss_actor==nil,'cold planner imported Actor')
 assert(package.loaded.abyss_combat==nil,'cold planner imported Combat')
 local data={cards={cards={}},statuses={statuses={}}}
 local prepared=U.withCards(data)
 assert(#prepared.cards.cards==16 and #data.cards.cards==0 and #data.statuses.statuses==0)
 assert(package.loaded.abyss_actor==nil and package.loaded.abyss_combat==nil)
 local calls=0;local function host()calls=calls+1;error('unexpected host')end
 local effect={op='damage',value=3,child={tag='original'}}
 local out=U.prepareEffect(nil,effect,nil,host)
 assert(out~=effect and out.child~=effect.child and out.value==3 and calls==0)
 assert(select('#',U.prepareEffect(nil,effect))==1)
 assert(U.planEffect({orbs={balls={{kind='frost'}}}},{op='compileDriverDraw',value=1}).top[1].value==1)
 assert(U.planEffect({energy=2},{op='doubleEnergy',value=1}).top[1].value==2)
 local plan=U.planEffect({energy=1,relics={}},{op='xBlock',blockAmount=7},{energyOnUse=1})
 assert(plan.bottom[1].value==7 and plan.bottom[1].remaining==1)
 assert(package.loaded.abyss_relic_queries~=nil,'legitimate query leaf remains usable')
 assert(package.loaded.abyss_actor==nil and package.loaded.abyss_combat==nil)
`;

test('complete before sources and original 52-scenario fixture bind to develop Git blobs',()=>{
 const frozen=baseline();assert.equal(frozen.base,'6a614fc82697750ddb408750e54f59f801c24f1e');
 const expected={
  [utility]:'414d1f260d3a617eb06b4caadfbef013296f1a70',
  [queued]:'d4fda1b3cc44b4a88a9f01fedc11c3e8716e66da',
  'config/architecture.json':'3b79effde6d5cd59a502ecc32982dd98be1f24b6',
  [fixture]:'1b4d005fff243b7ef520f47a0784dfbd6d3721c7',
  [protocol]:'868275d2993c6efde5c732e79c57c039a9d411b9',
 };
 assert.deepEqual(Object.keys(frozen.sources).sort(),Object.keys(expected).sort());
 for(const [path,source]of Object.entries(frozen.sources)){
  const identity=frozen.identities[path];assert.equal(identity.bytes,Buffer.byteLength(source));
  assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0`).update(source).digest('hex'),expected[path]);
  assert.equal(identity.blob,expected[path]);assert.equal(createHash('sha256').update(source).digest('hex'),identity.sha256);
 }
 assert.equal(read(protocol),frozen.sources[protocol],'frozen M9 protocol remains byte-preserved');
 // Reverse only the three explicit capability arguments. All 52 scenarios,
 // assertions and surrounding code must still be exactly the original fixture.
 let current=read(fixture);
 for(const [after,before]of [
  ["value=4},s.enemies[1],function()return require('abyss_actor')end)","value=4},s.enemies[1])"],
  ["threshold=3},s.enemies[1],function()return require('abyss_actor')end)","threshold=3},s.enemies[1])"],
  ["value=7},nil,function()return require('abyss_actor')end)","value=7})"],
 ]){assert.equal(current.split(after).length,2);current=current.replace(after,before);}
 assert.equal(current,frozen.sources[fixture]);
});

test('cold data and non-target preparation never resolve execution capabilities',()=>pass({body:cold}));

// No extra behavior is hidden among the capability changes.
test('production changes remain the two narrow capability edits and one policy rule',()=>{
 const original=baseline().sources;
 assert.equal(read(utility).replace('local M={}\n',"local M={}\nlocal Actors=require('abyss_actor')\n")
  .replace('function M.prepareEffect(state,effect,target,actorHost)','function M.prepareEffect(state,effect,target)')
  .replaceAll('        local Actors=actorHost()\n',''),original[utility]);
 assert.equal(read(queued).replace("local function utilityActorHost()return require('abyss_actor')end\n",'')
  .replace('utility.prepareEffect(state,e,target,utilityActorHost)','utility.prepareEffect(state,e,target)'),original[queued]);
 const policy=JSON.parse(actorRead('config/architecture.json')),prior=JSON.parse(original['config/architecture.json']);
 const view=capabilityPreStyle(),livePolicy=JSON.parse(view.read('config/architecture.json'));
 assert.equal(livePolicy.layers.abyss_lumine_idle,'ui');
 delete livePolicy.layers.abyss_lumine_idle;
 assert.deepEqual(livePolicy,policy,'the exact admitted idle layer is the only change outside the frozen capability policy');
 const rule=policy.dependencyBoundaries.pop();assert.equal(rule.id,'defect-utility-planning');assert.deepEqual(policy,prior);
 assert.deepEqual(rule.from,['abyss_defect_utility_cards']);
 assert.deepEqual(rule.forbiddenTargets,['abyss_actor','abyss_combat','abyss_combat_queued_play','abyss_card_actions']);
 const foreign=discoverSources();foreign['src/lua/abyss_page_reveal.lua']+='\n-- unrelated drift';
 assert.throws(()=>capabilityPreStyle(foreign),/live preStyle input identity/,'historical policy cannot conceal current owner drift');
});

function reachable(report,root){
 const seen=new Set(),pending=[root];
 while(pending.length){const name=pending.pop();if(seen.has(name))continue;seen.add(name);for(const edge of report.edges)if(edge.from===name)pending.push(edge.to);}
 return [...seen].sort();
}
const closure=report=>assert.deepEqual(reachable(report,'abyss_defect_utility_cards'),['abyss_defect_utility_cards','abyss_relic_queries'],'planner closure contains only the read-only query leaf, including deferred/transitive edges');
test('all original 345 modules plus the admitted idle retain complete graphs and reject transitive runtime owners',()=>{
 const view=capabilityPreStyle(),raw=view.sources,sources=Object.fromEntries(Object.entries(raw).map(([p,s])=>[p.split('/').at(-1).slice(0,-4),s]));
 const originalNames=Object.keys(JSON.parse(baseline().sources['config/architecture.json']).layers).filter(n=>!Object.hasOwn(generatedRuntimeModules,n)).sort();
 assert.equal(originalNames.length,345,'frozen original inventory');
 assert.equal(Object.keys(sources).length,346,'complete current inventory');
 assert.deepEqual(Object.keys(sources).filter(n=>n!=='abyss_lumine_idle').sort(),originalNames,'every original source owner retained alongside the one admitted addition');
 assert.deepEqual(Object.keys(sources).sort(),Object.keys(JSON.parse(view.read('config/architecture.json')).layers).filter(n=>!Object.hasOwn(generatedRuntimeModules,n)).sort(),'no unclassified or omitted source owners');
 const policy=JSON.parse(view.read('config/architecture.json')),report=analyzeSources(sources,policy);
 assert.deepEqual(report.errors,[]);closure(report);
 assert(!dependencyCycles(report.nodes,report.edges).some(c=>c.members.includes('abyss_defect_utility_cards')),'planner leaves even the delayed SCC');
 assert.deepEqual(report.edges.filter(e=>e.from==='abyss_defect_utility_cards').map(e=>e.to),['abyss_relic_queries']);
 const hosts=report.edges.filter(e=>e.from==='abyss_combat_queued_play'&&e.to==='abyss_actor');
 assert.equal(hosts.length,3,'original eager Actor, untouched Watcher host and new Utility host');
 for(const name of ['utilityActorHost','watcherActorHost'])assert(hosts.some(e=>read(queued).split('\n')[e.line-1].includes(`local function ${name}()`)));
 // Parse the complete changed module for each mutant, then replace its edges
 // in this run's freshly collected FULL graph. Every other owner and edge is
 // retained, avoiding six redundant parses of 345 unchanged source files.
 const boundary=policy.dependencyBoundaries.find(r=>r.id==='defect-utility-planning');
 for(const [owner,target,delayed]of [
  ['abyss_defect_utility_cards','abyss_actor',false],['abyss_defect_utility_cards','abyss_actor',true],
  ['abyss_defect_utility_cards','abyss_combat',false],['abyss_defect_utility_cards','abyss_card_actions',true],
  ['abyss_relic_queries','abyss_actor',false],['abyss_relic_queries','abyss_combat_queued_play',true],
 ]){
  const injected=delayed?`local function injected()return require('${target}')end\n`:`local injected=require('${target}')\n`;
  const localSources={...Object.fromEntries(Object.keys(sources).map(n=>[n,''])),[owner]:injected+sources[owner]};
  const changed=analyzeSources(localSources,{...policy,deferredImports:[],dependencyBoundaries:[boundary]});
  assert(!changed.errors.some(e=>e.message.includes('Lua parse failed')),'semantic mutation must parse');
  if(owner==='abyss_defect_utility_cards')assert(changed.errors.some(e=>e.message.includes('defect-utility-planning')),'policy rejects the direct/deferred back edge');
  const complete={...report,edges:[...report.edges.filter(e=>e.from!==owner),...changed.edges.filter(e=>e.from===owner)]};
  assert.equal(complete.nodes.length,346);assert.deepEqual(complete.nodes.filter(n=>n!=='abyss_lumine_idle').sort(),originalNames);assert(complete.edges.some(e=>e.from===owner&&e.to===target));
  assert.throws(()=>closure(complete),/planner closure/,'full transitive graph rejects the runtime import');
 }
 const extra={...discoverSources(),'src/lua/unregistered_style_owner.lua':'return {}\n'};
 assert.throws(()=>capabilityPreStyle(extra),/complete live source inventory/,'preStyle must reject rather than drop unknown live source owners');
});

test('original 52 scenarios preserve complete return, error, state and alias graphs in independent VMs',()=>{
 const old=pass({before:true,fixture}),current=pass({fixture});
 assert.equal(old.output.at(-1),'DEFECT_UTILITY_BUILD_PASS 52');assert.deepEqual(current.output,old.output);
 assert(old.graphs.length>100,'observe all Combat calls, not selected gameplay fields');
 assert.deepEqual(current.graphs,old.graphs);
});

const validation=`
 local U=require('abyss_defect_utility_cards');local state={player={}};local target={}
 local calls=0;local failure={kind='host failure'}
 local function host()calls=calls+1;error(failure,0)end
 local function fails(message,e,t)
  local ok,why=pcall(U.prepareEffect,state,e,t,host)
  assert(not ok and type(why)=='string'and string.find(why,message,1,true),tostring(why))
 end
 fails('missing utility effect',nil,target)
 for _,value in ipairs({-1,0.5,2147483648,'3',false})do
  fails('invalid utility attack',{op='barrageDamage',value=value},target)
  fails('invalid utility attack',{op='ftlDamage',value=value,threshold=-1},target)
  fails('invalid X block',{op='xBlock',value=value})
 end
 fails('invalid utility attack',{op='barrageDamage',value=3})
 fails('invalid utility attack',{op='ftlDamage',value=3,threshold=-1})
 fails('invalid X block',{op='xBlock'})
 assert(calls==0,'host resolved before original validation')
 for _,effect in ipairs({{op='barrageDamage',value=3},{op='ftlDamage',value=3,threshold=-1},{op='xBlock',value=7}})do
  local ok,why=pcall(U.prepareEffect,state,effect,target,host)
  assert(not ok and why==failure,'raw host failure identity or precedence changed')
 end
 assert(calls==3,'exactly one capability resolution per targeted preparation')
 local copyFailure={kind='copy failure'}
 local effect=setmetatable({op='xBlock',value=7},{__pairs=function()error(copyFailure,0)end})
 local ok,why=pcall(U.prepareEffect,state,effect,nil,host)
 assert(not ok and why==copyFailure and calls==3,'copy failure must precede host lookup')
`;
test('copy and original input validation precede capability resolution',()=>pass({body:validation}));

const thresholdOrder=`
 local U=require('abyss_defect_utility_cards');local state={player={}};local target={}
 local trace={};local effect=setmetatable({op='ftlDamage',value=5,child={tag='original'}},{
  __pairs=function(self)trace[#trace+1]='copy';return next,self,nil end,
  __index=function(_,key)if key=='threshold'then trace[#trace+1]='threshold';return -1 end end})
 local actors={attackAmount=function(s,p,t,v)
  assert(s==state and p==state.player and t==target and v==5)
  trace[#trace+1]='attack';state.sideEffect=(state.sideEffect or 0)+1;return 6,'ignored'
 end}
 local function host()trace[#trace+1]='host';return actors end
 local ok,why=pcall(U.prepareEffect,state,effect,target,host)
 assert(not ok and string.find(why,'invalid FTL threshold',1,true),'late threshold assertion changed')
 assert(table.concat(trace,',')=='copy,host,attack,threshold','FTL threshold moved ahead of Actor call/result')
 assert(state.sideEffect==1 and effect.normalAmount==nil and effect.child.tag=='original')
 for _,result in ipairs({-1,0.5,2147483648,'bad',false})do
  trace={};actors.attackAmount=function()trace[#trace+1]='attack';return result end
  ok,why=pcall(U.prepareEffect,state,effect,target,host)
  assert(not ok and string.find(why,'utility attack overflow',1,true),'overflow must precede threshold')
  assert(table.concat(trace,',')=='copy,host,attack')
 end
 local failure={kind='arithmetic failure'};trace={}
 actors.attackAmount=function()error(failure,0)end
 ok,why=pcall(U.prepareEffect,state,effect,target,host)
 assert(not ok and why==failure and table.concat(trace,',')=='copy,host')
`;
test('FTL threshold remains after Actor side effects, errors and result validation',()=>pass({body:thresholdOrder}));

const dynamic=`
 local U=require('abyss_defect_utility_cards');local state={player={}};local target={}
 local hosts,reads,calls=0,0,0;local actors={};local effect={op='barrageDamage',value=4,child={tag='original'}}
 setmetatable(actors,{__index=function(_,key)
  reads=reads+1;assert(key=='attackAmount')
  return function(s,p,t,v)calls=calls+1;assert(s==state and p==state.player and t==target and v==4);return 6,'ignored'end
 end})
 local function host()hosts=hosts+1;return actors end
 local values=table.pack(U.prepareEffect(state,effect,target,host));local out=values[1]
 assert(values.n==1 and hosts==1 and reads==1 and calls==1)
 assert(out.normalAmount==6 and out~=effect and out.child~=effect.child and effect.normalAmount==nil)
 out.child.tag='changed';assert(effect.child.tag=='original')
 actors.attackAmount=function()return 9,'ignored'end
 assert(U.prepareEffect(state,effect,target,host).normalAmount==9 and hosts==2 and reads==1)
 local other={attackAmount=function()return 12 end};actors=other
 assert(U.prepareEffect(state,effect,target,host).normalAmount==12 and hosts==3)
 local callable=setmetatable({}, {__call=function(_,s,p,v)assert(s==state and p==state.player and v==7);return 8,'ignored'end})
 actors.blockAmount=callable;effect={op='xBlock',value=7,child={tag='original'}}
 values=table.pack(U.prepareEffect(state,effect,nil,host));out=values[1]
 assert(values.n==1 and out.blockAmount==8 and out~=effect and out.child~=effect.child and effect.blockAmount==nil and hosts==4)
 local failure={kind='method failure'};actors.blockAmount=function()error(failure,0)end
 local ok,why=pcall(U.prepareEffect,state,effect,nil,host);assert(not ok and why==failure and hosts==5)
 for _,bad in ipairs({-1,0.5,2147483648,'7',false})do
  actors.blockAmount=function()return bad end
  ok,why=pcall(U.prepareEffect,state,effect,nil,host)
  assert(not ok and string.find(why,'utility block overflow',1,true)and effect.blockAmount==nil)
 end
 actors.blockAmount=function()return nil end
 ok,why=pcall(U.prepareEffect,state,effect,nil,host);assert(not ok and string.find(why,'utility block overflow',1,true))
`;
test('each call uses live capability and method slots, one return and detached input',()=>pass({body:dynamic}));

const gameplaySetup=`
 local C=require('abyss_combat');local A=require('abyss_actor');local O=require('abyss_orbs')
 local U=require('abyss_defect_utility_cards');local D=require('abyss_data')
 local data=U.withCards(require('abyss_defect_cards').withFoundationCards(D))
 local function setup(id)
  local deck={};for i=1,8 do deck[i]=id end
  return C.new(data,{seed=42,orbSlots=3,orbRandomSeed='17',deck=deck,enemies={'jaw_worm'}})
 end
`;
const rollback=gameplaySetup+`
 for _,case in ipairs({{'barrage','attackAmount'},{'ftl','attackAmount'},{'reinforced_body','blockAmount'}})do
  local s=setup(case[1]);assert(O.channel(s,'frost',C));s.player.statuses.strength=2;s.player.statuses.dexterity=2
  local stateBefore=DEFECT_GRAPH(s);local player,hand,card,orbs=s.player,s.hand,s.hand[1],s.orbs
  local original=A[case[2]];local calls=0;local failure={kind='late amount failure',card=case[1]}
  A[case[2]]=function(...)calls=calls+1;s.energy=1;error(failure,0)end
  local ok,why=pcall(C.play,s,card.uid,1);A[case[2]]=original
  assert(not ok and why==failure and calls==1,'current production call must resolve the live Actor slot')
  assert(DEFECT_GRAPH(s)==stateBefore,'complete failed transaction must restore every field')
  assert(s.player==player and s.hand==hand and s.hand[1]==card and s.orbs==orbs,'rollback preserves original aliases')
  local hp=s.enemies[1].hp
  assert(C.play(s,card.uid,1),'retry must use restored dynamic method')
  if case[1]=='barrage'then assert(s.enemies[1].hp==hp-6 and s.energy==2)
  elseif case[1]=='ftl'then assert(s.enemies[1].hp==hp-7 and #s.hand==5 and s.energy==3)
  else assert(s.player.block==27 and s.energy==0)end
  DEFECT_GRAPH_WRITE(s,case[1]..'-recovered')
 end
`;
test('real Barrage FTL and X block failures roll back complete state and retry through live Actor slots',()=>{
 const old=pass({before:true,body:rollback}),current=pass({body:rollback});assert.equal(old.graphs.length,3);assert.deepEqual(current.graphs,old.graphs);
});

for(const id of ['barrage','ftl','reinforced_body'])test(`frozen protocol and complete old Utility match actual current host: ${id}`,()=>{
 const setup=gameplaySetup+`
 local Q=require('abyss_action_queue');local s=setup('${id}')
 assert(O.channel(s,'frost',C));assert(O.channel(s,'plasma',C))
 s.player.statuses.strength=2;s.player.statuses.dexterity=2;s.player.statuses.frail=1
 local card=s.hand[1];local definition=C.cardDefinition(s,card)
 local hooks={event=function(_,kind,detail)require('abyss_events').emit(s,kind,detail)end,
  paidCost=function()return 0 end,queueUseCopies=function()end,handlers={},finish=function()end}
 Q.run=function()return 'pause'end
 `;
 const old=pass({replace:{[utility]:baseline().sources[utility]},body:setup+`
 local old=dofile('${protocol}')(C,hooks)
 local returned=table.pack(old.begin(s,card.uid,1,card,1,definition))
 DEFECT_GRAPH_WRITE({state=s,returned=returned},'${id}-protocol')
 `});
 const current=pass({body:setup+`
 local returned=table.pack(require('abyss_combat_queued_play').begin(C,hooks,s,card.uid,1,card,1,definition))
 DEFECT_GRAPH_WRITE({state=s,returned=returned},'${id}-protocol')
 `});
 assert.equal(old.graphs.length,1);assert.deepEqual(current.graphs,old.graphs);
});

for(const [name,path,from,to,body,error]of [
 ['host removed',queued,'utility.prepareEffect(state,e,target,utilityActorHost)','utility.prepareEffect(state,e,target,nil)',gameplaySetup+"local s=setup('barrage');assert(C.play(s,s.hand[1].uid,1))",/actorHost/],
 ['Barrage amount lost',utility,'out.normalAmount=Actors.attackAmount(state,state.player,target,effect.value)','out.normalAmount=effect.value',dynamic,/assertion failed/],
 ['X block amount lost',utility,'out.blockAmount=Actors.blockAmount(state,state.player,effect.value)','out.blockAmount=effect.value',dynamic,/assertion failed/],
 ['input copy aliased',utility,'local out=copy(effect)','local out=effect',dynamic,/assertion failed/],
 ['FTL threshold moved early',utility,"        local Actors=actorHost()\n        out.normalAmount=", "        if effect.op=='ftlDamage' then assert(integer(effect.threshold),'invalid FTL threshold') end\n        local Actors=actorHost()\n        out.normalAmount=",thresholdOrder,/FTL threshold moved ahead/],
 ['invalid input reaches host',utility,"        assert(integer(effect.value) and target,'invalid utility attack')\n        local Actors=actorHost()", "        local Actors=actorHost()\n        assert(integer(effect.value) and target,'invalid utility attack')",validation,/table:/],
])test(`parseable semantic regression is rejected: ${name}`,()=>{
 const result=defectVm({replace:mutate(path,from,to),body});assert.notEqual(result.status,0,'semantic mutant survived');assert.match(result.error,error);
});
