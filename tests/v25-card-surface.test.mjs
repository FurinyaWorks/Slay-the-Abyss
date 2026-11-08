import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),F=require('fengari');
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=F;
function vm(code){
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
 try{
  const source=readFileSync('src/lua/abyss_v25_card_surface.lua','utf8');
  const result=lauxlib.luaL_dostring(L,to_luastring(`local Surface=(function()\n${source}\nend)()\n${fixture}\n${code}`));
  assert.equal(result,lua.LUA_OK,result===lua.LUA_OK?'':to_jsstring(lua.lua_tostring(L,-1)));
 }finally{lua.lua_close(L);}
}
const fixture=`
local created,destroyed={},{}
local hook,failCreate,failDestroy,failMethod=nil,nil,false,nil
local function control(name,parent)
 local c={name=name,parent=parent,alive=true,visible=false,active=false}
 function c:SetVisible(value) if failMethod=='visible' then return false end;assert(self.alive);self.visible=value end
 function c:SetActive(value) if failMethod=='active' then error('active failure')end;assert(self.alive);self.active=value end
 return c
end
local function box()
 local b={alive=true,name={text='普通攻击'},cost={text='1'},hit={interactable=true}}
 b.surface=control('surface',b)
 function b:GetChild(name)assert(name=='v25Surface','functional control touched');return self.surface end
 return b
end
local api={}
function api.instantiate(id,parent)
 if failCreate==#created+1 then return false end
 local c=control(id,parent);created[#created+1]=c
 if hook then hook(c)end
 return c
end
function api.destroy(c)
 if failDestroy then return false end
 assert(c.alive,'double destroy');c.alive=false;destroyed[#destroyed+1]=c
end
local config={enabled=true,variants={attack={basic=11,common=12,rare=13},skill={common=21},power={common=31}},manaTemplateId=99}
local s=Surface.new(config,api)
local function alive()local n=0;for _,c in ipairs(created)do if c.alive then n=n+1 end end;return n end
`;

test('a full shell+mana publishes together, reuses exact templates and leaves all functional controls unchanged',()=>vm(`
local b=box();s:beginFrame();assert(s:apply(b,{type='attack',rarity='basic'}));s:endFrame()
assert(#created==2 and created[1].name==11 and created[2].name==99 and b.surface.visible)
for _,c in ipairs(created)do assert(c.active and c.visible)end
assert(s:apply(b,{type='attack',rarity='basic'}) and #created==2)
assert(b.name.text=='普通攻击' and b.cost.text=='1' and b.hit.interactable)
assert(s:clear() and alive()==0 and #destroyed==2)
assert(destroyed[1]==created[2] and destroyed[2]==created[1],'not reverse release')
`));

test('changing type/rarity replaces both roots and retires the previous lease',()=>vm(`
local b=box();assert(s:apply(b,{type='attack',rarity='common'}));local first,second=created[1],created[2]
assert(s:apply(b,{type='skill',rarity='common'}))
assert(#created==4 and created[3].name==21 and not first.alive and not second.alive and alive()==2)
assert(destroyed[1]==second and destroyed[2]==first)
assert(s:release(b) and alive()==0 and not b.surface.visible)
assert(s:apply(b,{type='power',rarity='common'}) and alive()==2)
`));

test('a partial allocation or rejected native setter cannot publish a half shell or cover fallback',()=>vm(`
local b=box();failCreate=2
assert(not s:apply(b,{type='attack',rarity='basic'}))
assert(not b.surface.visible and alive()==0 and b.name.text=='普通攻击')
failCreate=nil;assert(s:apply(b,{type='attack',rarity='basic'}))
failCreate=#created+2
assert(not s:apply(b,{type='attack',rarity='rare'}))
assert(not b.surface.visible and alive()==0,'old wrong-type surface covers legacy fallback')
failCreate=nil;failMethod='active';assert(not s:apply(b,{type='attack',rarity='common'}));assert(alive()==0)
failMethod=nil;assert(s:apply(b,{type='attack',rarity='common'}))
`));

test('frame leases release unused cards and unsupported definitions fall back without allocation',()=>vm(`
local a,b=box(),box();s:beginFrame()
assert(s:apply(a,{type='attack',rarity='common'}));assert(s:apply(b,{type='skill',rarity='common'}));assert(s:endFrame())
assert(alive()==4);s:beginFrame();assert(s:apply(a,{type='attack',rarity='common'}));assert(s:endFrame())
assert(alive()==2 and not b.surface.visible and a.surface.visible)
local count=#created;assert(not s:apply(a,{type='status',rarity='common'}));assert(alive()==0 and #created==count)
for _,kind in ipairs({'curse','unknown'})do assert(not s:apply(box(),{type=kind,rarity='rare'}))end
assert(not s:apply(box(),{type='attack',rarity='missing'}) and #created==count)
local off=Surface.new({enabled=false},{})
assert(not off:apply({},{}));assert(off:clear());assert(off:onDestroy())
`));

test('clear/release/destroy reentry invalidates late allocations and never resurrects an owner',()=>vm(`
for _,method in ipairs({'clear','release','onDestroy'})do
 local owner=Surface.new(config,api);local b=box();local once=false
 hook=function()if not once then once=true;owner[method](owner)end end
 assert(not owner:apply(b,{type='attack',rarity='basic'}))
 hook=nil;assert(alive()==0 and not b.surface.visible,'late allocation survived '..method)
 if method=='onDestroy'then assert(not owner:apply(b,{type='attack',rarity='basic'}))
 else assert(owner:apply(b,{type='attack',rarity='basic'}));assert(owner:clear())end
end
`));

test('dead handles, host destruction and frame completion during allocation cannot report ready',()=>vm(`
local b=box();hook=function(c)c.alive=false end
assert(not s:apply(b,{type='attack',rarity='basic'}));hook=nil;assert(alive()==0)
hook=function()b.alive=false end;assert(not s:apply(b,{type='attack',rarity='basic'}));hook=nil;assert(alive()==0)
local nextBox=box();hook=function()s:endFrame()end
assert(not s:apply(nextBox,{type='attack',rarity='basic'}));hook=nil;assert(alive()==0)
`));

test('rejected destruction is retained for an explicit retry and never treated as a released lease',()=>vm(`
local b=box();assert(s:apply(b,{type='attack',rarity='basic'}));failDestroy=true
assert(not s:clear() and alive()==2 and not b.surface.visible)
assert(not s:apply(b,{type='attack',rarity='basic'}) and #created==2,'unreleased garbage allowed allocations')
failDestroy=false;assert(s:clear() and alive()==0)
assert(s:apply(b,{type='attack',rarity='basic'}));assert(s:onDestroy())
assert(not s:apply(b,{type='attack',rarity='basic'}) and alive()==0)
`));

test('a stale refresh frame token cannot retire the current frame surface',()=>vm(`
local old=s:beginFrame();local b=box();assert(s:apply(b,{type='attack',rarity='basic'}))
local current=s:beginFrame();assert(current~=old);assert(s:apply(b,{type='attack',rarity='basic'}))
assert(not s:endFrame(old) and alive()==2 and b.surface.visible)
assert(s:endFrame(current) and alive()==2)
s:beginFrame();assert(s:endFrame() and alive()==0)
`));

test('publishing setter reentry cannot restore a released surface after its callback returns',()=>vm(`
local b=box();local setter=b.surface.SetVisible;local once=false
b.surface.SetVisible=function(self,value)
 if value and not once then once=true;s:onDestroy()end
 return setter(self,value)
end
assert(not s:apply(b,{type='attack',rarity='basic'}))
assert(alive()==0 and not b.surface.visible,'late setter republished dead owner')
`));

test('allocation and destruction callbacks cannot recursively allocate new card roots',()=>vm(`
local b=box();local calls=0
hook=function()calls=calls+1;assert(not s:apply(b,{type='power',rarity='common'}))end
assert(s:apply(b,{type='attack',rarity='basic'}) and calls==2 and #created==2);hook=nil
local original=api.destroy
api.destroy=function(c)assert(not s:apply(b,{type='power',rarity='common'}));return original(c)end
assert(s:clear() and alive()==0 and #created==2)
`));

test('explicit active scopes retain cached views without repaint and inactive scopes release even touched cards',()=>vm(`
local deck,battle=box(),box();local token=s:beginFrame()
assert(s:apply(deck,{type='attack',rarity='basic'},'deck'))
assert(s:apply(battle,{type='skill',rarity='common'},'battle'))
assert(s:endFrame(token,{deck=true,battle=true}) and alive()==4)
token=s:beginFrame()
assert(s:apply(battle,{type='skill',rarity='common'},'battle'))
assert(s:endFrame(token,{deck=true,battle=false}) and alive()==2)
assert(deck.surface.visible and not battle.surface.visible)
token=s:beginFrame();assert(s:endFrame(token,{deck=false}) and alive()==0)
`));

test('active scope cannot preserve dead owners or half-prepared leases',()=>vm(`
local b=box();local token=s:beginFrame();assert(s:apply(b,{type='attack',rarity='basic'},'deck'))
b.alive=false;assert(s:endFrame(token,{deck=true}) and alive()==0)
local nextBox=box();hook=function()s:endFrame(nil,{deck=true})end
assert(not s:apply(nextBox,{type='attack',rarity='basic'},'deck'));hook=nil;assert(alive()==0)
`));
