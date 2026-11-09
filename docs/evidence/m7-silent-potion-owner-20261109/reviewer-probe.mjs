import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=createRequire(import.meta.url)('fengari');
const paths=['src/lua/abyss_silent_final_cards.lua','src/lua/abyss_silent_potions.lua'];
const old=paths.map(p=>execFileSync('git',['show','HEAD:'+p],{encoding:'utf8'}));
const now=paths.map(p=>readFileSync(p,'utf8'));
const q=s=>'[==========['+s+']==========]';
function run(sources,n,fail){
const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
const program=`
local F=assert(load(${q(sources[0])}))()
local P=assert(load(${q(sources[1])}))()
local trace={};local s={uid=0,insert=0};local fail=${q(fail)}
local function mark(x) trace[#trace+1]=x;if x==fail then error('probe:'..x,0)end end
local C,Actions={},{}
C.canUpgrade=function(state,c) assert(state==s);mark('can');return true end
C.upgrade=function(state,c)assert(state==s);mark('upgrade');c.up=true end
Actions.created=function(combat,state,c)assert(combat==C and state==s);mark('created1');Actions.created=function(combat2,state2,c2) assert(combat2==C and state2==s and c2==c);mark('created2')end end
Actions.fresh=function(combat,state,id) assert(combat==C and state==s and id=='shiv');state.uid=state.uid+1;mark('fresh');return {} end
Actions.toHand=function(state,c)assert(state==s and c.up);state.insert=state.insert+1;mark('hand')end
require=function(name)
 mark('require:'..name)
 if name=='abyss_silent_potions'then return P end
 if name=='abyss_combat'then return C end
 if name=='abyss_card_actions'then return Actions end
 error(name)
end
local out=table.pack(pcall(F.apply,{},s,{effect={kind='potionShivs',value=${n}}}))
return table.concat(trace,','),s.uid,s.insert,out[1],out.n,out[1] and '' or tostring(out[2]):gsub('^.-:%d+: ','')
`;
const status=lauxlib.luaL_dostring(L,to_luastring(program));assert.equal(status,0,status?to_jsstring(lua.lua_tostring(L,-1)):'');
const result=[];for(let i=1;i<=lua.lua_gettop(L);i++){const t=lua.lua_type(L,i);result.push(t===lua.LUA_TBOOLEAN?lua.lua_toboolean(L,i):t===lua.LUA_TNUMBER?lua.lua_tonumber(L,i):to_jsstring(lua.lua_tostring(L,i)));}lua.lua_close(L);return result;
}
let count=0;
for(const n of ['0','-1','1','2','nil','false'])for(const fail of ['','require:abyss_combat','require:abyss_card_actions','fresh','can','upgrade','created1','created2','hand']){
assert.deepEqual(run(now,n,fail),run(old,n,fail),JSON.stringify({n,fail}));count++;
}
console.log('PASS paired historical/current formal dispatch probes:',count);
