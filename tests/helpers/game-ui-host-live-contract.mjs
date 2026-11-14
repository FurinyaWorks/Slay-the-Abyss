// CURRENT production scenarios: semantic assertions, not old-UI trace equality.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const common=['construct','start','select','element','confirm'];
const main=['construct','refresh','pointer down','foreign up','foreign click','pointer up','start click','close selection','stale click','start','select','element','confirm','deck','deck close','resize','invalid dt','update','open menu','close menu','dynamic method','dynamic close','second shared platform','first captured controller','begin combat','combat tick','open exit','settle false','settle throw','settle nil','settle once','disable failure','disable retry','disabled update','second disable'];
const sequences={
 '':main,
 'short-clock':[...common,'refresh','disable'], 'short-wide':[...common,'refresh','disable'],
 'short-full-source':[...common,'refresh','disable'],'short-map-failure':[...common,'confirm retry','disable'],
 'short-refresh-reentry':[...common,'refresh mixed capture','disable'],
 'short-disable-live':[...common,'real active combat with pending playback','disable live playback'],
 'short-overlays':[...common,'combat','menu','help','close help','route','close route','resume','disable'],
 'short-egg':[...common,'victory','egg open','egg update','egg close','egg cleanup failure','egg cleanup retry'],
 'short-route':[...common,'real map entry','native end turn and playback','terminal combat fixture and real reward creation','native reward proceed','reward down','reward up','same-content replacement pending owner','stale reward owner click','fresh reward down','fresh reward up','fresh reward reopen','native reward proceed again','disable'],
 'short-chapters':[...common,'controlled chapter one terminal treasure','real chapter one treasure claim','native chapter continue','controlled chapter two terminal treasure','real chapter two ending','disable'],
 ...Object.fromEntries(['deck','battle','map','node','potion','egg'].map(kind=>[kind,['synchronous '+kind]])),
};
const mutantBoundaries={'main:30:30':'settle nil','main:33:33':'disable retry','main:5:5':'foreign click','short-disable-live:7:7':'disable live playback'};
const mutantModules={'main:30:30':'run','main:33:33':'lifecycle','main:5:5':'input','short-disable-live:7:7':'lifecycle'};
const currentRoot=fileURLToPath(new URL('../..',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

const contract=String.raw`
local currentEvents,currentBefore={},nil
local known={}
for label in ([[construct|start|select|element|confirm|confirm retry|refresh|refresh mixed capture|pointer down|foreign up|foreign click|pointer up|start click|close selection|stale click|deck|deck close|resize|invalid dt|update|open menu|close menu|dynamic method|dynamic close|second shared platform|first captured controller|begin combat|combat tick|open exit|settle false|settle throw|settle nil|settle once|disable failure|disable retry|disabled update|second disable|disable|real active combat with pending playback|disable live playback|real map entry|native end turn and playback|terminal combat fixture and real reward creation|native reward proceed|reward down|reward up|same-content replacement pending owner|stale reward owner click|fresh reward down|fresh reward up|fresh reward reopen|native reward proceed again|controlled chapter one terminal treasure|real chapter one treasure claim|native chapter continue|controlled chapter two terminal treasure|real chapter two ending|combat|menu|help|close help|route|close route|resume|victory|egg open|egg update|egg close|egg cleanup failure|egg cleanup retry|synchronous deck|synchronous battle|synchronous map|synchronous node|synchronous potion|synchronous egg]]):gmatch('[^|]+')do known[label]=true end
local uiOnly={}
for label in ([[refresh|refresh mixed capture|update|combat tick|egg update|egg open|egg close|start|select|element|pointer down|foreign up|foreign click|pointer up|start click|close selection|stale click|deck|deck close|dynamic method|dynamic close|resize|invalid dt|open menu|close menu|open exit|menu|help|close help|route|close route|resume|first captured controller|stale reward owner click|reward down|reward up|fresh reward down|fresh reward up|disabled update]]):gmatch('[^|]+')do uiOnly[label]=true end
local function check(value,label,why)assert(value,'CURRENT_HOST '..label..': '..why)end
local currentMismatch
local function different(path,a,b)currentMismatch=currentMismatch or(path..' '..tostring(a)..' / '..tostring(b));return false end
local function same(a,b,forward,reverse,immutable,path)
 path=path or 'run'
 if type(a)~=type(b)then return different(path,a,b)end
 if type(a)~='table'then return a==b or a~=a and b~=b or different(path,a,b)end
 if immutable and (immutable[a]==a or immutable[b]==b)then return a==b end
 if a==b then return true end
 forward,reverse=forward or{},reverse or{}
 if forward[a]or reverse[b]then return forward[a]==b and reverse[b]==a or different(path..' alias',a,b)end
 forward[a],reverse[b]=b,a
 for key,value in pairs(a)do if not same(value,b[key],forward,reverse,immutable,path..'.'..tostring(key))then return false end end
 for key in pairs(b)do if a[key]==nil then return different(path..'.'..tostring(key),nil,b[key])end end
 if not same(getmetatable(a),getmetatable(b),forward,reverse,immutable,path..' metatable')then return false end
 return true
end
local function events(name)
 local out={};for _,row in ipairs(currentEvents)do if row[1]==name then out[#out+1]=row end end;return out
end
ABYSS_HOST_CURRENT_EVENT=function(...)
 local row=table.pack(...)
 if row[1]~='native'and row[1]~='write'then currentEvents[#currentEvents+1]=row end
 if row[1]=='reentry'then check(row[2]==false,'settlement reentry','must reject synchronous reentry')end
 if row[1]=='newSeed'then check(row[2]==false,'confirm','seed factory reentry must be rejected')end
 if row[1]=='live cancel inert'then check(row[2]==true,'disable live playback','cancellation must see inert controllers')end
 if row[1]=='cancel inert'then check(row[2]==true and row[3]==false and row[4]==false and row[5]==false,'disable failure','cancel before inert publication')end
end
ABYSS_HOST_CURRENT_BEFORE=function(label,host,F,hosts)
 check(known[label],label,'unregistered checkpoint')
 local index=(CURRENT_HOST_CHECKED or 0)+1
 check(CURRENT_HOST_LABELS[index]==label,label,'scenario checkpoint order at '..index)
 print('CURRENT_HOST_BEGIN '..index..' '..label)
 if label=='disable retry'then check(host.monsterCleanupPending==true,label,'failed release must retain its pending retry owner')end
 currentEvents={};currentBefore=nil
 if uiOnly[label]then
  currentBefore={source=F.Data,sourceWitness=CURRENT_HOST_SOURCE_WITNESS(F.Data)}
  if host and host.run then
   currentBefore.run,currentBefore.map=host.run,host.map
   currentBefore.data=host.run.data
   currentBefore.dataWitness,currentBefore.memo=CURRENT_HOST_SOURCE_WITNESS(host.run.data,true)
   currentBefore.copy=F.Combat.copy(host.run,currentBefore.memo)
  end
 end
end
ABYSS_HOST_CURRENT_AFTER=function(label,host,result,F,hosts)
 local h=host or hosts[#hosts];local scenario=ABYSS_HOST_CONSTRUCTOR or ''
 local partial={deck='closeDeck',potion='closePotions',egg='refresh'}
 local constructor=label:match('^synchronous (.+)$')
 local expectedFailure=false
 if constructor and partial[constructor]then
  expectedFailure=true
  check(result[1]==false and type(result[2])=='string'and result[2]:find("attempt to call a nil value (method '"..partial[constructor].."')",1,true),label,'exact partial-constructor callback boundary')
 elseif label=='confirm'and scenario=='short-map-failure'then
  expectedFailure=true;check(result[1]==false and type(result[2])=='table'and result[2].kind=='injected Map.generate failure',label,'exact injected map failure identity')
  local failure=events('map error identity');check(#failure==1 and result[2]==failure[1][2],label,'same original thrown map object')
 elseif label=='disable failure'or label=='egg cleanup failure'then
  expectedFailure=true;local marker=label=='disable failure'and'injected cleanup error'or'injected egg release failure'
  check(result[1]==false and type(result[2])=='string'and result[2]:find(marker,1,true),label,'exact injected cleanup failure')
 end
 if not expectedFailure then check(result[1]==true,label,'unexpected pcall failure '..tostring(result[2]))end
 if expectedFailure then check(result.n==2,label,'one exact injected error object, not extra returns')end
 local arities={construct=2,['second shared platform']=2,resize=1,['invalid dt']=3,['disabled update']=3,
  ['settle false']=3,['settle throw']=3,['settle nil']=3,['settle once']=3,disable=2,['second disable']=2,
  ['disable failure']=2,['disable retry']=2,['egg cleanup failure']=2,['egg cleanup retry']=2,['disable live playback']=2}
 check(type(result.n)=='number'and result.n>=1 and result.n<=4,label,'finite packed return arity')
 if arities[label]then check(result.n==arities[label],label,'public packed return arity')end
 if constructor then
  check(#events('constructor callback')==1,label,'constructor callback must execute exactly once')
  if expectedFailure then check(#hosts==0,label,'partial Host cannot be published')
  else
   local resultEvent=events('callback result')[1]
   if constructor=='battle'then check(resultEvent and resultEvent.n==1,label,'not-ready owner suppresses synchronous change without returns')
   else check(resultEvent and resultEvent[2]==false,label,'supported synchronous callback returns false')end
   if constructor=='map'then check(resultEvent.n==3 and resultEvent[3]=='not_on_map',label,'map callback exact rejection')
   elseif constructor=='node'then check(resultEvent.n==2,label,'node callback exact false return arity')end
  end
  if constructor=='potion'then local p=events('canManage callback result')[1];check(p and p.n==2 and p[2]==false,label,'unowned potion cannot be managed')end
  if not expectedFailure then check(h and h.root and result[2]==true,label,'constructor must finish after its supported callback')end
 elseif label=='construct'or label=='second shared platform'then
  check(h and h.mode=='menu'and not h.run and not h.characterOpen,label,'fresh current Host')
  if label=='second shared platform'then check(hosts[1].controller~=h.controller,label,'controller owner must remain distinct')end
 elseif label=='pointer down'or label=='foreign up'or label=='foreign click'or label=='pointer up'or label=='stale click'or label=='close selection'then
  check(not h.characterOpen,label,'foreign/stale input must not open selection')
 elseif label=='start'or label=='start click'then check(h.characterOpen==true,label,'accepted Start must open selection')
 elseif label=='select'or label=='element'then check(result[2]==true,label,'selection command success')
 elseif label=='confirm'or label=='confirm retry'then
  if not expectedFailure then
   check(result[2]==true and h.run and not h.characterOpen and not h.starting,label,'same-run confirmation must commit')
   local seed=scenario=='short-clock'and'-9223372036854775808'or scenario=='short-wide'and'9223372036854775807'or tostring(ABYSS_HOST_SEED)
   check(h.run.runSeed==seed,label,'full exact run seed survives Host boundary')
   if scenario=='short-clock'then check(#events('newSeed')==1,label,'clock seed sampled once')end
  end
 elseif label=='deck'or label=='dynamic method'then
  check(h.deckUI.visible==true and result[2]==true,label,'shared deck opens')
  if label=='dynamic method'then check(#events('replacement refresh')==1,label,'dynamic method replacement is used')end
 elseif label=='deck close'or label=='dynamic close'then check(not h.deckUI.visible,label,'deck closes')
 elseif label=='open menu'or label=='menu'then check(h.exitOpen and h.menuOpen,label,'run menu opens')
 elseif label=='close menu'or label=='resume'then check(not h.exitOpen and not h.menuOpen,label,'run menu resumes')
 elseif label=='help'then check(h.controlsOpen and h.exitOpen,label,'help remains an overlay')
 elseif label=='close help'then check(not h.controlsOpen and h.menuOpen,label,'help returns to its caller')
 elseif label=='route'then check(h.routeOpen and h.exitOpen,label,'route overlay opens')
 elseif label=='close route'then check(not h.routeOpen and not h.exitOpen and not h.menuOpen,label,'route returns directly to its caller, without a hidden parent menu')
 elseif label=='invalid dt'then check(result[2]==false and result[3]=='invalid_delta',label,'reject invalid delta')
 elseif label=='disabled update'then check(result[2]==false and result[3]=='ui_disabled',label,'disabled lifecycle rejects updates')
 elseif label=='first captured controller'then check(#events('first controller')==1 and #events('second controller')==0,label,'captured controller cannot switch owners')
 elseif label=='begin combat'or label=='combat'or label=='real map entry'then check(h.run.phase=='combat'and h.mode=='battle',label,'combat command reaches real battle')
 elseif label=='terminal combat fixture and real reward creation'then check(h.run.phase=='reward',label,'core creates rewards')
 elseif label=='native reward proceed'or label=='native reward proceed again'then check(h.run.phase=='map'and h.run.pendingCombatRewards,label,'reward owner survives returning to map')
 elseif label=='stale reward owner click'then check(result[2]==false and h.run.phase=='map',label,'reject replaced owner')
 elseif label=='fresh reward reopen'then check(h.run.phase=='reward',label,'fresh owner reopens rewards')
 elseif label=='real chapter one treasure claim'then check(h.run.phase=='act_transition',label,'first chapter transition')
 elseif label=='native chapter continue'then check(h.run.act==2 and h.run.phase=='map',label,'same-run second chapter')
 elseif label=='real chapter two ending'or label=='victory'then check(h.run.phase=='victory'and h.mode=='victory',label,'real ending remains visible')
 elseif label=='egg open'then check(h.easterEggOpen==true,label,'egg opens')
 elseif label=='egg close'then check(not h.easterEggOpen,label,'egg closes')
 elseif label=='open exit'then check(h.exitOpen==true,label,'exit opens')
 elseif label=='settle false'or label=='settle throw'then check(result[2]==false and not h.settlementRequested and not h.settlementBusy,label,'failed settlement is retryable')
 elseif label=='settle nil'then check(result[2]==true and h.settlementRequested==true and not h.settlementBusy and #events('settle nil')==1,label,'nil acceptance commits once')
 elseif label=='settle once'then check(result[2]==false and result[3]=='settlement_already_requested'and #events('settle nil')==0,label,'no duplicate settlement')
 elseif label=='disable failure'then check(h.disabled==true,label,'failed release makes the Host inert')
 elseif label=='disable retry'then check(h.disabled==true and not h.monsterCleanupPending and #events('cleanup retry')==1,label,'pending release retries exactly once')
 end
 if label=='disable'or label=='second disable'or label=='disable live playback'or label=='egg cleanup failure'or label=='egg cleanup retry'or label=='disable failure'or label=='disable retry'then
  check(h.disabled==true and h.battleUI.active==false and h.mapUI.visible==false and h.nodeUI.visible==false,label,'all controllers inert')
 end
 if currentBefore then
  check(currentBefore.source==F.Data and currentBefore.sourceWitness==CURRENT_HOST_SOURCE_WITNESS(F.Data),label,'UI command changed complete source data')
  if currentBefore.run then
   if label=='refresh mixed capture'then check(h.run==nil and h.mode=='menu',label,'declared reentrant replacement')
   else check(h.run==currentBefore.run and h.map==currentBefore.map,label,'UI-only command preserves run/map ownership')end
   local run=currentBefore.run
   check(run.data==currentBefore.data and currentBefore.dataWitness==CURRENT_HOST_SOURCE_WITNESS(run.data),label,'UI command changed complete prepared data')
   if label=='update'or label=='combat tick'then
    check(math.abs(run.elapsedSeconds-currentBefore.copy.elapsedSeconds-.05)<1e-9,label,'only the declared .05s clock advance is allowed')
    currentBefore.copy.elapsedSeconds=run.elapsedSeconds
   end
   currentMismatch=nil
   check(same(currentBefore.copy,run,nil,nil,currentBefore.memo),label,'UI-only command changed core values, aliases or RNG: '..tostring(currentMismatch))
  end
 end
 CURRENT_HOST_CHECKED=(CURRENT_HOST_CHECKED or 0)+1
 print('CURRENT_HOST_CHECK '..CURRENT_HOST_CHECKED..' '..label)
end
`;

export function installCurrentHostContract(directory){
 const file=path.join(directory,'tests/lua/support/game_ui_host_trace.lua');let source=fs.readFileSync(file,'utf8');
 for(const [before,after]of [
  ['ABYSS_HOST_CONTROL=function(control)','ABYSS_HOST_CONTROL=function(control)\n if not ABYSS_HOST_FULL_TRACE then return end'],
  ["elseif kind=='battle' then record('callback result',args[7].onChange())", "elseif kind=='battle' then print('CURRENT_HOST_SIGNATURE_ADAPTER battle options=6');assert(args.n==6 and type(args[6])=='table' and type(args[6].onChange)=='function','CURRENT battle constructor exact six-argument API');record('callback result',args[6].onChange())"],
  ['local function record(...)','local function record(...)\n if ABYSS_HOST_CURRENT_EVENT then ABYSS_HOST_CURRENT_EVENT(...) end'],
  ['local result=table.pack(pcall(fn or function()end))','ABYSS_HOST_CURRENT_BEFORE(label,host,F,hosts)\n local result=table.pack(pcall(fn or function()end))\n ABYSS_HOST_CURRENT_AFTER(label,host,result,F,hosts)'],
 ]){assert.equal(source.split(before).length,2,'one original current driver observation boundary');source=source.replace(before,after);}
 fs.writeFileSync(file,contract+'\n'+source);
}

function currentSourceIdentities(directory,scenario,from,to,mutant){
 const key=`${scenario||'main'}:${from}:${to}`,allowed=mutant?'abyss_game_ui_'+mutantModules[key]+'.lua':null,identities={};
 let changes=0;
 for(const base of ['src/lua','build/lua']){
  const names=fs.readdirSync(path.join(currentRoot,base)).sort();assert.deepEqual(fs.readdirSync(path.join(directory,base)).sort(),names,'CURRENT complete live file inventory');
  for(const name of names){
   const expected=hash(fs.readFileSync(path.join(currentRoot,base,name))),actual=hash(fs.readFileSync(path.join(directory,base,name)));
   if(mutant&&base==='src/lua'&&name===allowed){assert.notEqual(actual,expected,'CURRENT original mutation must change its owner');changes++;}
   else assert.equal(actual,expected,'CURRENT must use actual live production/generated bytes: '+base+'/'+name);
   identities[base+'/'+name]={expected,actual};
  }
 }
 if(mutant)assert.equal(changes,1,'CURRENT exactly one original mutation owner');
 return identities;
}
export function executeCurrentHost(directory,{seed=1,scenario='',from=1,to=6}={},mutant=false){
 assert(Object.hasOwn(sequences,scenario),'CURRENT unknown scenario');
 assert(Number.isSafeInteger(from)&&Number.isSafeInteger(to)&&from>=1&&to>=from&&to<=sequences[scenario].length,'CURRENT exact scenario window');
 const key=`${scenario||'main'}:${from}:${to}`,identities=currentSourceIdentities(directory,scenario,from,to,mutant);
 const r=spawnSync(process.execPath,[fileURLToPath(import.meta.url),'--current-vm',String(seed),scenario,String(from),String(to)],{
  cwd:directory,encoding:'utf8',timeout:30000,maxBuffer:32*1024*1024,
  env:{...process.env,LUA_INIT:'',LUA_INIT_5_3:''},windowsHide:true});
 const tag=`${scenario||'main'}-${seed}-${from}-${to}`;
 fs.mkdirSync('build/ui-host-impl',{recursive:true});fs.writeFileSync(`build/ui-host-impl/current-${mutant?'mutant-':''}${tag}.log`,r.stdout+r.stderr);
 fs.writeFileSync(`build/ui-host-impl/current-${mutant?'mutant-':''}${tag}.sources.json`,JSON.stringify({contract:'CURRENT',root:currentRoot,seed,scenario,from,to,mutant,identities},null,2));
 assert.ifError(r.error);
 if(mutant){
  const label=mutantBoundaries[key];assert(label,'CURRENT mutation has an exact registered original boundary');
  assert.notEqual(r.status,0,'CURRENT same semantic mutation must be rejected');
  const began=[...r.stdout.matchAll(/^CURRENT_HOST_BEGIN (\d+) (.+)$/gm)].at(-1);
  assert(began&&Number(began[1])===to&&began[2]===label,'current mutation must reach its original selected checkpoint');
  assert(r.stderr.includes('CURRENT_HOST '+label+':'),'current mutation must fail its precise semantic boundary');
 }
 else {assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/CURRENT_HOST_CONTRACT_PASS/);}
 console.log('CURRENT_HOST_SCENARIO '+JSON.stringify({seed,scenario,from,to,mutant,status:r.status}));return r;
}

if(process.argv[2]==='--current-vm'){
 const require=createRequire(import.meta.url),{lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
 // Complete fresh read-only data witness. No immutable-data exemption, cached
 // field values, JSON transport, or Lua deep-copy of the full source catalogue.
 const identities=new Map();let serial=0;
 lua.lua_pushcfunction(L,L=>{
  try{
  const digest=createHash('sha256'),seen=new Set(),makeMemo=lua.lua_toboolean(L,2),sourceTables=[];
  let chunks=[],chunkBytes=0;
  const flush=()=>{if(chunkBytes)digest.update(Buffer.concat(chunks,chunkBytes));chunks=[];chunkBytes=0;};
  const write=value=>{
   const b=Buffer.isBuffer(value)?value:Buffer.from(String(value)),prefix=Buffer.from(String(b.length)+':');
   chunks.push(prefix,b);chunkBytes+=prefix.length+b.length;if(chunkBytes>=65536)flush();
  };
  function visit(index){
   assert(lua.lua_checkstack(L,8),'CURRENT_HOST source witness stack');
   index=lua.lua_absindex(L,index);const type=lua.lua_type(L,index);write(type);
   if(type===lua.LUA_TNIL)return;
   if(type===lua.LUA_TBOOLEAN){write(lua.lua_toboolean(L,index));return;}
   if(type===lua.LUA_TNUMBER){write(lua.lua_tonumber(L,index));return;}
   if(type===lua.LUA_TSTRING){write(Buffer.from(lua.lua_tolstring(L,index)));return;}
   const pointer=lua.lua_topointer(L,index);if(!identities.has(pointer))identities.set(pointer,++serial);
   const id=identities.get(pointer);write(id);if(seen.has(id))return;seen.add(id);
   if(type===lua.LUA_TTABLE){if(makeMemo)sourceTables.push(lua.lua_toproxy(L,index));lua.lua_pushnil(L);while(lua.lua_next(L,index)){visit(-2);visit(-1);lua.lua_pop(L,1);}}
   if(lua.lua_getmetatable(L,index)){visit(-1);lua.lua_pop(L,1);}write('end');
  }
  visit(1);flush();lua.lua_pushstring(L,to_luastring(digest.digest('hex')));
  if(makeMemo){lua.lua_newtable(L);const memo=lua.lua_absindex(L,-1);for(const push of sourceTables){push(L);push(L);lua.lua_rawset(L,memo);}return 2;}
  return 1;
  }catch(error){console.error('CURRENT_HOST_SOURCE_WITNESS_ERROR '+String(error?.stack??error));throw error;}
 });lua.lua_setglobal(L,to_luastring('CURRENT_HOST_SOURCE_WITNESS'));
 let bytes=0;const write=process.stdout.write.bind(process.stdout);process.stdout.write=(chunk)=>{
  bytes+=Buffer.byteLength(chunk);assert(bytes<=128*1024*1024,'current Host output exceeds unchanged 128MiB bound');return write(chunk);
 };
 const [seed,scenario,fromText,toText]=process.argv.slice(3),from=Number(fromText),to=Number(toText);
 assert(Object.hasOwn(sequences,scenario),'CURRENT unknown scenario');
 const labels=sequences[scenario],total=labels.length;
 const code=`package.path='./build/lua/?.lua;./src/lua/?.lua;'..package.path;CURRENT_HOST_LABELS={${labels.map(v=>JSON.stringify(v)).join(',')}};ABYSS_HOST_FULL_TRACE=false;ABYSS_HOST_SEED=${Number(seed)};ABYSS_HOST_CONSTRUCTOR=${JSON.stringify(scenario)};ABYSS_HOST_FROM=${from};ABYSS_HOST_TO=${to};ABYSS_HOST_TOTAL=${total};local co=coroutine.create(function()dofile('tests/lua/support/game_ui_host_trace.lua')end);local ok,tag=coroutine.resume(co);if not ok then error(tag,0)end;assert(coroutine.status(co)=='dead' or tag=='HOST_WINDOW_DONE','unexpected driver yield');assert(ABYSS_HOST_EXECUTED==math.min(${to},${total}));assert(CURRENT_HOST_CHECKED==ABYSS_HOST_EXECUTED,'every current checkpoint must be validated');assert(${to}<${total} or coroutine.status(co)=='dead','declared total leaves unexecuted commands');print('CURRENT_HOST_CONTRACT_PASS checkpoints='..CURRENT_HOST_CHECKED)`;
 if(lauxlib.luaL_dostring(L,to_luastring(code))!==lua.LUA_OK){
  const foreign=lua.lua_touserdata(L,-1);console.error(foreign instanceof Error?foreign.stack:to_jsstring(lauxlib.luaL_tolstring(L,-1)));process.exitCode=1;
 }
}
