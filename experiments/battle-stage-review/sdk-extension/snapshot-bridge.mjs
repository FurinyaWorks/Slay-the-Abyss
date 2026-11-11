// Private SDK backend experiment. Public Fengari API only; no internal table edits.
// Only capture is replaced; the original Lua owners/ownedRestore/release remain.
export function installFullSnapshotBridge(d,L){
 const enc=s=>new TextEncoder().encode(s),top=d.lua_gettop(L);
 for(const key of ['lua_toproxy','lua_topointer','lua_next','lua_rawset','lua_settable','lua_pushjsfunction','lua_isinteger','lua_tointeger','lua_pushinteger','lua_pushnumber','lua_pushlstring'])
  if(typeof d[key]!=='function')throw Error('actual SDK API unavailable: '+key);
 d.lua_getglobal(L,enc('require'));d.lua_pushstring(L,enc('abyss_snapshot'));
 if(d.lua_pcall(L,1,1,0)!==0)throw Error('snapshot module unavailable');
 const module=d.lua_toproxy(L,-1);d.lua_getfield(L,-1,enc('capture'));
 const capture=d.lua_toproxy(L,-1);let owners;
 for(let i=1;i<30;i++){
  const key=d.lua_getupvalue(L,-1,i);if(!key)break;
  if(Buffer.from(key).toString()==='owners')owners=d.lua_toproxy(L,-1);
  d.lua_pop(L,1);if(owners)break;
 }
 if(!owners)throw Error('exact original owners upvalue missing');
 d.lua_pop(L,1);d.lua_getfield(L,-1,enc('ownedRestore'));const ownedRestore=d.lua_toproxy(L,-1);d.lua_pop(L,1);
 d.lua_getfield(L,-1,enc('release'));const release=d.lua_toproxy(L,-1);d.lua_settop(L,top);
 const metrics={captures:[],restores:[]};
 function fail(state,message){d.lua_pushstring(state,enc(message));return d.lua_error(state);}
 function jsCapture(state){
  if(d.lua_type(state,1)!==5)return fail(state,'snapshot requires a table');
  const started=performance.now(),seen=new Map(),pending=[],references=new Map();let proxyCount=0,scalarCount=0;
  function discover(index,push){
   const pointer=d.lua_topointer(state,index);let item=seen.get(pointer);
   if(!item){item={push,entries:[]};seen.set(pointer,item);pending.push(item);}return item;
  }
  function keep(index){
   const type=d.lua_type(state,index);scalarCount++;
   if(type===0)return [0];
   if(type===1)return [1,d.lua_toboolean(state,index)];
   if(type===3){const number=d.lua_tonumber(state,index);if(!Number.isNaN(number))return [d.lua_isinteger(state,index)?19:3,number];}
   if(type===4)return [4,d.lua_tolstring(state,index)]; // Immutable binary bytes, never UTF-8/JSON.
   scalarCount--;const pointer=d.lua_topointer(state,index);let cache=references.get(type);
   if(!cache){cache=new Map();references.set(type,cache);}
   let proxy=cache.get(pointer);
   // Unknown/new types or no stable pointer keep an exact, uncached TValue proxy.
   if(!proxy){proxy=d.lua_toproxy(state,index);proxyCount++;if(pointer!==null&&pointer!==undefined)cache.set(pointer,proxy);}
   if(type===5)discover(index,proxy);return proxy;
  }
  function pushValue(target,value){
   if(typeof value==='function'){value(target);return;}
   const [type,payload]=value;
   if(type===0)d.lua_pushnil(target);
   else if(type===1)d.lua_pushboolean(target,payload);
   else if(type===19)d.lua_pushinteger(target,payload);
   else if(type===3)d.lua_pushnumber(target,payload);
   else if(type===4)d.lua_pushlstring(target,payload,payload.length);
   else throw Error('unknown scalar descriptor');
  }
  keep(1);let entries=0;
  while(pending.length){
   const original=pending.pop();original.push(state);const table=d.lua_absindex(state,-1);
   d.lua_pushnil(state);
   while(d.lua_next(state,table)!==0){
    const key=keep(-2),value=keep(-1);
    original.entries.push([key,value]);entries++;
    d.lua_pop(state,1);
   }
   d.lua_pop(state,1);
  }
  const hasTarget=d.lua_type(state,2)!==-1&&d.lua_type(state,2)!==0;
  if(hasTarget&&(d.lua_type(state,2)!==5||!seen.has(d.lua_topointer(state,2))))return fail(state,'snapshot target is not captured');
  function restore(restoreState){
   const began=performance.now();
   for(const original of seen.values()){
    original.push(restoreState);const table=d.lua_absindex(restoreState,-1);
    d.lua_pushnil(restoreState);
    while(d.lua_next(restoreState,table)!==0){
     d.lua_pop(restoreState,1);d.lua_pushvalue(restoreState,-1);d.lua_pushnil(restoreState);
     d.lua_rawset(restoreState,table);
    }
    for(const [key,value]of original.entries){pushValue(restoreState,key);pushValue(restoreState,value);d.lua_rawset(restoreState,table);}
    d.lua_pop(restoreState,1);
   }
   metrics.restores.push({tables:seen.size,entries,ms:performance.now()-began});return 0;
  }
  d.lua_pushjsfunction(state,restore);const restoreIndex=d.lua_absindex(state,-1);
  if(hasTarget){
   owners(state);const ownerTable=d.lua_absindex(state,-1);
   d.lua_pushvalue(state,restoreIndex);d.lua_pushvalue(state,2);d.lua_settable(state,ownerTable);
   d.lua_pop(state,1);d.lua_pushvalue(state,restoreIndex);
  }
  metrics.captures.push({tables:seen.size,entries,proxyCount,scalarCount,ms:performance.now()-started});return hasTarget?2:1;
 }
 module(L);d.lua_pushjsfunction(L,jsCapture);d.lua_setfield(L,-2,enc('capture'));d.lua_settop(L,top);
 function originalOwnerFunctionsIntact(){
  const before=d.lua_gettop(L);module(L);
  d.lua_getfield(L,-1,enc('ownedRestore'));ownedRestore(L);const a=d.lua_rawequal(L,-1,-2);d.lua_pop(L,2);
  d.lua_getfield(L,-1,enc('release'));release(L);const b=d.lua_rawequal(L,-1,-2);d.lua_settop(L,before);
  return !!a&&!!b;
 }
 return {kind:'private-SDK-fullgraph-capture-backend-extension',metrics,originalOwnerFunctionsIntact,
  uninstall(){const before=d.lua_gettop(L);module(L);capture(L);d.lua_setfield(L,-2,enc('capture'));d.lua_settop(L,before);}};
}
