import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {v25CardBindingSource} from '../scripts/v25-card-binding.mjs';
import {compileRgbaRectangles} from '../scripts/v25-private-card-assets.mjs';
const require=createRequire(import.meta.url),F=require('fengari');
const texture=compileRgbaRectangles({width:3,height:2,rgba:Uint8Array.from([
 255,0,0,255,0,255,0,128,0,0,0,0,255,0,0,255,0,0,255,64,0,0,255,64,
])});
const data={width:3,height:2,blocks:texture.blocks,count:texture.count,drawCount:texture.drawCount,
 display:{position:[.5,0],size:[3,2]}};
const binding=v25CardBindingSource({binding:{variants:{attack:{common:'attack'},skill:{common:'skill'}},manaTemplateId:'mana'},
 textureData:{attack:data,skill:{...data},mana:{...data}},sourceManifestSha256:'a'.repeat(64)},
 {attack:101,skill:102,mana:103},{imageTemplateId:41,groupTemplateId:73});
const preloads=['abyss_traveler_portraits','abyss_v25_texture_runtime','abyss_v25_card_surface'].map(name=>
 `package.preload['${name}']=function()\n${readFileSync(`src/lua/${name}.lua`,'utf8')}\nend`).join('\n');
// Real generated binding, real runtime and real default portrait controller.
// This models native calls/counts; it makes no client frame-time assertion.
const fixture=`
local Texture=require('abyss_v25_texture_runtime')
local Surface=require('abyss_v25_card_surface')
local binding=(function()\n${binding}\nend)()
local f={created={},destroyed={},clock=0}
local function control(name,parent,id)
 local c={name=name,parent=parent,id=id,alive=true,visible=false,active=false,children={},order={}}
 if parent then parent.children[#parent.children+1]=c;parent.order[#parent.order+1]=c end
 for _,method in ipairs({'SetVisible','SetActive','SetSizeDelta','SetLocalScale','SetAnchoredPosition',
  'SetAnchorMin','SetAnchorMax','SetPivot','SetLocalRotation','SetImage'})do
  c[method]=function(self,value,...)
   assert(self.alive,'use after destroy '..method)
   if method=='SetVisible'then self.visible=value elseif method=='SetActive'then self.active=value end
  end
 end
 function c:SetAsLastSibling(...)
  assert(select('#',...)==0,'SetAsLastSibling expects no value argument')
  if f.siblingFailure=='throw'then error('sibling order rejected')end
  if f.siblingFailure=='false'then return false end
  if f.siblingHook then f.siblingHook(self)end
  local order=self.parent.order
  for i,node in ipairs(order)do if node==self then table.remove(order,i);break end end
  order[#order+1]=self
 end
 function c:GetChild(key)return self.children[key]end
 return c
end
local function instantiate(id,parent)
 local c=control('native',parent,id);f.created[#f.created+1]=c
 if f.createHook then f.createHook(c)end
 return c
end
local function destroy(c)
 assert(c.alive,'double destroy')
 if f.failDestroy and f.failDestroy(c)then return false end
 local function cascade(node)node.alive=false;for _,child in pairs(node.children)do cascade(child)end end
 cascade(c);f.destroyed[#f.destroyed+1]=c;return true
end
game={InstantiateClientUIControl=instantiate,DestroyClientUIControl=destroy}
Enum={ImageSource={StaticReference='static'},ImageType={Stretch=2}}
Color={FromRGBA=function(r,g,b,a)return {r,g,b,a}end}
local runtime=Texture.new(binding,{instantiate=instantiate,destroy=destroy,clock=function()return f.clock end})
local api=runtime:surfaceApi();local rawInstantiate=api.instantiate
local roots={}
api.instantiate=function(id,parent)
 local c=rawInstantiate(id,parent)
 if c then c.assetId=id;roots[#roots+1]=c end
 return c
end
local skin=Surface.new(binding,api)
local function box()
 local b=control('face');b.children.v25Surface=control('v25Surface',b);return b
end
local function mana(b)
 for i=#roots,1,-1 do local c=roots[i];if c.parent==b.children.v25Surface and c.assetId==103 and c.alive then return c end end
end
local function shell(b)
 for i=#roots,1,-1 do local c=roots[i];if c.parent==b.children.v25Surface and c.assetId~=103 and c.alive then return c end end
end
local function layers(b)
 local list={};for _,c in ipairs(b.children.v25Surface.order)do if c.alive then list[#list+1]=c end end
 assert(#list==2 and list[1].assetId~=103 and list[2].assetId==103,'native sibling order put a new shell above retained mana')
end
local function finish(cards,definition)
 for _=1,100 do
  runtime:update();local token=skin:beginFrame();local ready=true
  for i,b in ipairs(cards)do if not skin:apply(b,definition(i),'battle')then ready=false end end
  assert(skin:endFrame(token,{battle=true}))
  if ready then return end
 end
 error('pair repeatedly rebuilt or never reached ready')
end
local function definition(i)return {type=i%2==1 and 'attack' or 'skill',rarity='common'}end
local function live()local n=0;for _,c in ipairs(f.created)do if c.alive then n=n+1 end end;return n end
`;
function vm(code){const L=F.lauxlib.luaL_newstate();F.lualib.luaL_openlibs(L);try{
 const status=F.lauxlib.luaL_dostring(L,F.to_luastring(preloads+'\n'+fixture+'\n'+code));
 assert.equal(status,F.lua.LUA_OK,status===F.lua.LUA_OK?'':F.to_jsstring(F.lua.lua_tostring(L,-1)));
}finally{F.lua.lua_close(L);}}

test('five interleaved generated-binding cards keep each unchanged mana root during a real hand shift',()=>vm(`
local cards={};for i=1,5 do cards[i]=box()end
finish(cards,definition)
local oldMana={};for i,b in ipairs(cards)do oldMana[i]=assert(mana(b))end
local created=#f.created
local token=skin:beginFrame()
for i=1,4 do assert(not skin:apply(cards[i],definition(i+1),'battle'))end
assert(skin:release(cards[5]));cards[5]=nil
assert(skin:endFrame(token,{battle=true}))
for i,b in ipairs(cards)do assert(mana(b)==oldMana[i] and oldMana[i].alive,'unchanged mana was destroyed or replaced')end
assert(not oldMana[5].alive and runtime:status().roots==8)
finish(cards,function(i)return definition(i+1)end)
local complete=#f.created
for _=1,10 do finish(cards,function(i)return definition(i+1)end)end
assert(#f.created==complete,'unchanged redraw rebuilt pixels')
for i,b in ipairs(cards)do assert(mana(b)==oldMana[i] and skin:isReady(b));layers(b)end
assert(skin:clear() and runtime:clear() and live()==0)
`));

test('a pending type change retains the same in-flight mana generation without publishing a half pair',()=>vm(`
local b=box();assert(not skin:apply(b,definition(1),'battle'));local old=assert(mana(b))
assert(not skin:apply(b,definition(2),'battle'))
assert(mana(b)==old and old.alive and not b.children.v25Surface.visible)
finish({b},function()return definition(2)end)
assert(mana(b)==old and skin:isReady(b));assert(skin:clear() and runtime:clear() and live()==0)
`));

test('clear reentry during replacement reclaims the sparse retained mana and late new shell exactly once',()=>vm(`
local b=box();finish({b},definition);local old=mana(b);local fired=false
f.createHook=function()if not fired then fired=true;skin:clear()end end
assert(not skin:apply(b,definition(2),'battle'));f.createHook=nil
assert(fired and not old.alive and not b.children.v25Surface.visible)
assert(skin:clear() and runtime:clear() and live()==0,'replacement cancellation left an unowned root')
`));

test('rejected obsolete-shell cleanup retains its ledger and never allocates another pair before release succeeds',()=>vm(`
local b=box();finish({b},definition);local obsolete=assert(shell(b));local attempts=0
f.failDestroy=function(c)if c==obsolete then attempts=attempts+1;return true end end
local count=#f.created
assert(not skin:apply(b,definition(2),'battle') and not b.children.v25Surface.visible)
assert(#f.created==count and obsolete.alive and runtime:status().retained>0)
assert(not skin:apply(b,definition(2),'battle') and #f.created==count)
assert(attempts>0)
f.failDestroy=nil;assert(skin:clear() and runtime:clear() and live()==0)
`));

for(const failure of ['false','throw'])test(`native sibling-order ${failure} rejects publication and keeps fallback uncovered`,()=>vm(`
local b=box();finish({b},definition);assert(not skin:apply(b,definition(2),'battle'))
f.siblingFailure='${failure}'
for _=1,20 do runtime:update()end
assert(not skin:apply(b,definition(2),'battle') and not skin:isReady(b)and not b.children.v25Surface.visible,
 'failed sibling reorder was silently accepted')
assert(skin:clear()and runtime:clear()and live()==0)
`));

for(const method of ['clear','release','onDestroy'])test(`native sibling-order ${method} reentry cannot publish or revive the retained mana`,()=>vm(`
local b=box();finish({b},definition);assert(not skin:apply(b,definition(2),'battle'))
for _=1,20 do runtime:update()end
local fired=false;f.siblingHook=function()if not fired then fired=true;skin:${method}()end end
assert(not skin:apply(b,definition(2),'battle')and fired and not b.children.v25Surface.visible)
f.siblingHook=nil
assert(skin:clear()and runtime:clear()and live()==0,'late sibling setter retained a cancelled root')
`));
