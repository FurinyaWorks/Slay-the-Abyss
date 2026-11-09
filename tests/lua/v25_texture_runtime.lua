local Texture=require('abyss_v25_texture_runtime')
local Portrait=require('abyss_traveler_portraits')
local cases=0
local function test(name,fn)
 cases=cases+1;if CASE and CASE~=cases then return end
 fn();print('V25_TEXTURE_PASS '..name)
end
local function hex(x,y,w,h,r,g,b,a)return string.format('%04x%04x%04x%04x%02x%02x%02x%02x',x,y,w,h,r,g,b,a)end
local function fixture()
 local f={created={},destroyed={},factories={},clock=0}
 local function control(name,parent,id)
  local c={name=name,parent=parent,id=id,alive=true,visible=true,active=true,children={}}
  if parent then parent.children[#parent.children+1]=c end
  local function call(method,...)
   assert(c.alive,'native use after destroy '..method)
   if f.methodHook then f.methodHook(c,method,...)end
  end
  function c:SetVisible(v)call('visible',v);self.visible=v end
  function c:SetActive(v)call('active',v);self.active=v end
  function c:SetSizeDelta(x,y)call('size',x,y);self.width,self.height=x,y end
  function c:SetLocalScale(x,y,z)call('scale',x,y,z);self.sx,self.sy=x,y end
  function c:SetAnchoredPosition(x,y)call('position',x,y);self.x,self.y=x,y end
  function c:SetAnchorMin(x,y)call('anchorMin',x,y)end
  function c:SetAnchorMax(x,y)call('anchorMax',x,y)end
  function c:SetPivot(x,y)call('pivot',x,y)end
  function c:SetLocalRotation(x,y,z)call('rotation',x,y,z)end
  function c:SetAsLastSibling()call('sibling')end
  function c:SetImage(source,id)call('image',source,id)end
  function c:GetChild(key)if f.childHook then f.childHook(self,key)end;return self.children[key]end
  return c
 end
 f.control=control
 local function instantiate(id,parent)
  local c=control('created'..(#f.created+1),parent,id);f.created[#f.created+1]=c
  if f.createHook then f.createHook(c)end
  return c
 end
 local function destroy(c)
  assert(c.alive,'double native destroy')
  if f.failDestroy and f.failDestroy(c)then return false end
  if f.destroyHook then f.destroyHook(c)end
  local function cascade(n)n.alive=false;for _,child in pairs(n.children)do cascade(child)end end
  cascade(c);f.destroyed[#f.destroyed+1]=c;return true
 end
 game={InstantiateClientUIControl=instantiate,DestroyClientUIControl=destroy}
 Enum={ImageSource={StaticReference='static'},ImageType={Stretch=2}}
 Color={FromRGBA=function(r,g,b,a)return {r,g,b,a}end}
 f.api={instantiate=function(id,parent)local c=instantiate(id,parent);c.ownedRoot=true;return c end,destroy=destroy,
  clock=function()return f.clock end,createController=function(host,data,width,templates)
   f.factories[#f.factories+1]={host=host,data=data,width=width,templates=templates}
   return Portrait.createController(host,data,width,templates)
  end}
 f.texture={width=3,height=2,count=4,drawCount=3,display={position={.5,2},size={3,2}},blocks=
  hex(0,0,1,2,255,0,0,255)..hex(1,0,1,1,0,255,0,128)..hex(2,0,1,1,10,20,30,0)..hex(1,1,2,1,0,0,255,64)}
 f.binding={enabled=true,imageTemplateId=41,groupTemplateId=73,textures={[11]=f.texture,[12]=f.texture}}
 function f:live()local n=0;for _,c in ipairs(self.created)do if c.alive then n=n+1 end end;return n end
 function f:images()local r={};for _,c in ipairs(self.created)do if c.alive and c.id==41 then r[#r+1]=c end end;return r end
 function f:finish(owner,root)
  for _=1,100 do owner:update();if owner:surfaceApi().ready(root)then return end end
  error('texture did not become ready')
 end
 return f
end

test('basic shape images expose no imageType field and still preserve full RGBA geometry',function()
 local f=fixture();local writes=0
 f.createHook=function(c)if c.id==41 then
  setmetatable(c,{__index=function(_,key)if key=='imageType'then return nil end end,
   __newindex=function(self,key,value)if key=='imageType'then writes=writes+1;error('cannot set imageType, no such field')end;rawset(self,key,value)end})
 end end
 local s=Texture.new(f.binding,f.api);local root=s:surfaceApi().instantiate(11,f.control('parent'))
 f:finish(s,root);assert(s:surfaceApi().ready(root) and writes==0)
 local images=f:images();assert(#images==3 and images[2].imageColor[4]==128)
 assert(s:clear() and f:live()==0)
end)

test('all six basic geometry resources keep detailed native transforms without a mode field',function()
 local f=fixture();local writes=0;local rows={}
 f.createHook=function(c)if c.id==41 then setmetatable(c,{__newindex=function(self,key,value)
  if key=='imageType'then writes=writes+1;error('shape has no mode')end;rawset(self,key,value)
 end})end end
 for id=100001,100006 do rows[#rows+1]={id,id-100001,0,1,2,.5,.5,.5,.5,.5,.5,1,1,0,10,20,30,128,0,0}end
 local p=Portrait.createController(f.control('host'),{width=8,height=8,rows=rows,renderProfile='lowpoly-v1'},8,
  {imagePrefabId=41,containerPrefabId=73})
 assert(p:begin());for _=1,30 do p:step()end
 assert(p:status().phase=='ready' and #f:images()==6 and writes==0)
 for _,image in ipairs(f:images())do assert(image.width==1 and image.height==2 and image.imageColor[4]==128)end
 assert(p:release() and f:live()==0)
end)

test('gallery resources retain strict supported mode writes and reject a failed mode setter',function()
 for _,reject in ipairs({false,true})do
  local f=fixture();local writes=0
  f.createHook=function(c)if c.id==41 then
   local mode
   setmetatable(c,{__index=function(_,key)if key=='imageType'then return mode end end,
    __newindex=function(self,key,value)if key=='imageType'then
     writes=writes+1;if reject then error('gallery mode rejected')end;mode=value
    else rawset(self,key,value)end end})
  end end
  local rows={{106057,0,0,1,2,.5,.5,.5,.5,.5,.5,1,1,0,10,20,30,128,0,0}}
  local p=Portrait.createController(f.control('host'),{width=2,height=2,rows=rows,renderProfile='lowpoly-v1'},2,
   {imagePrefabId=41,containerPrefabId=73})
  assert(p:begin());for _=1,10 do p:step()end
  assert(writes==1)
  if reject then assert(p:status().phase=='failed' and f:live()==0)
  else assert(p:status().phase=='ready' and f:images()[1].imageType==Enum.ImageType.Stretch)end
  assert(p:release() and f:live()==0)
 end
end)

test('disabled binding preserves default startup and original API without loading a factory',function()
 local loaded,loader=package.loaded.abyss_traveler_portraits,package.preload.abyss_traveler_portraits
 package.loaded.abyss_traveler_portraits=nil;package.preload.abyss_traveler_portraits=function()error('disabled renderer required portraits')end
 local f=fixture();f.api.createController=function()error('disabled renderer constructed')end
 local s=Texture.new({enabled=false},f.api);local api=s:surfaceApi()
 assert(api.instantiate==f.api.instantiate and api.destroy==f.api.destroy)
 assert(not s:update() and not s:syncMask({}) and s:clear() and s:onDestroy())
 assert(#f.created==0)
 local noop=Texture.new({enabled=false},{});assert(noop:clear() and not noop:update())
 package.loaded.abyss_traveler_portraits=loaded;package.preload.abyss_traveler_portraits=loader
end)

test('lazy rows preserve complete visible RGBA and display coordinates without retaining decoded rows',function()
 local f=fixture();local blocks=f.texture.blocks;local s=Texture.new(f.binding,f.api);assert(#f.created==0 and #f.factories==0)
 local parent=f.control('parent');local root=s:surfaceApi().instantiate(11,parent)
 assert(root and not s:surfaceApi().ready(root));assert(#f.factories==1)
 local factory=f.factories[1];assert(factory.width==3 and factory.data.width==3 and factory.data.height==2 and factory.data.rectanglesOnly)
 local rows=factory.data.rows;assert(#rows==3 and next(rows)==nil,'decoded row table retained')
 local r=rows[1];assert(#r==18 and r[1]==100001 and r[2]==-.5 and r[3]==2 and r[4]==1 and r[5]==2)
 assert(r[15]==255 and r[16]==0 and r[17]==0 and r[18]==255)
 assert(rows[2][18]==128 and rows[3][18]==64 and rows[0]==nil and rows[4]==nil)
 assert(rows[1]~=rows[1] and next(rows)==nil,'ephemeral rows were cached')
 assert(f.texture.blocks==blocks and #blocks==96,'transparent RGB source was discarded')
 f:finish(s,root);local images=f:images();assert(#images==3)
 local pixels={};for _,image in ipairs(images)do
  assert(image.width and image.height and image.imageColor)
  local x,y=math.floor(image.x-.5+1.5-image.width/2+.5),math.floor(2+1-image.y-image.height/2+.5)
  for py=y,y+image.height-1 do for px=x,x+image.width-1 do pixels[py*3+px+1]=image.imageColor end end
 end
 assert(pixels[1][1]==255 and pixels[1][4]==255 and pixels[2][2]==255 and pixels[2][4]==128)
 assert(pixels[3]==nil and pixels[4][1]==255 and pixels[5][3]==255 and pixels[6][4]==64)
 assert(s:clear() and f:live()==0 and parent.alive)
end)

test('two logical templates reuse one root each per parent and report each new ready transition once',function()
 local f=fixture();local s=Texture.new(f.binding,f.api);local api=s:surfaceApi();local parent=f.control('parent')
 local a,b=api.instantiate(11,parent),api.instantiate(12,parent)
 assert(a~=b and api.instantiate(11,parent)==a and api.instantiate(12,parent)==b)
 assert(#f.factories==2 and f.factories[1].data==f.factories[2].data,'identical source lazy view was not shared')
 assert(s:update() and api.ready(a) and api.ready(b));assert(not s:update(),'ready was reported twice')
 assert(api.destroy(a) and not api.ready(a) and not a.alive and b.alive and parent.alive)
 assert(api.destroy(b) and f:live()==0)
end)

test('update shares 64 controller steps or eight milliseconds globally',function()
 local f=fixture();f.texture.count=100;f.texture.drawCount=100;f.texture.blocks=string.rep(hex(0,0,1,1,1,2,3,255),100)
 local steps=0;local create=f.api.createController
 f.api.createController=function(...)local c=create(...);local step=c.step;c.step=function(...)steps=steps+1;return step(...)end;return c end
 local s=Texture.new(f.binding,f.api);local a=s:surfaceApi().instantiate(11,f.control('parent'));local b=s:surfaceApi().instantiate(12,f.control('parent2'))
 s:update();assert(steps==64,'controller budget was per root')
 assert(not s:surfaceApi().ready(a) and not s:surfaceApi().ready(b));steps=0
 f.api.clock=function()return 0 end -- the owner captures the supplied clock once
 f.methodHook=function()f.clock=f.clock+.001 end;s:update();assert(steps>0 and steps<64,'eight millisecond budget ignored')
 f.methodHook=nil;assert(s:clear() and f:live()==0)
end)

test('ready surfaces do not consume the construction quota of a newly visible texture',function()
 local f=fixture();local steps=0;local factory=f.api.createController
 f.api.createController=function(...)local c=factory(...);local step=c.step
  c.step=function(...)steps=steps+1;return step(...)end;return c
 end
 local s=Texture.new(f.binding,f.api);local api=s:surfaceApi();local roots={}
 for i=1,16 do roots[i]=api.instantiate(11,f.control('ready'..i));f:finish(s,roots[i])end
 f.binding.textures[13]={width=3,height=2,count=100,drawCount=100,
  display={position={0,0},size={3,2}},blocks=string.rep(hex(0,0,1,1,1,2,3,255),100)}
 local nextRoot=api.instantiate(13,f.control('newlyVisible'));steps=0
 s:update();assert(steps==64,'ready roots diluted the single pending texture construction quota')
 assert(not api.ready(nextRoot),'test source unexpectedly finished in one quota')
 for _,root in ipairs(roots)do assert(api.ready(root) and root.alive,'ready texture was rebuilt or retired')end
 assert(s:clear() and f:live()==0)
end)

test('mask waits for real page visibility and releases all roots over twenty transitions',function()
 local f=fixture();f.binding.uiMask={templateId=11,hostName='v25Constellation',displaySize={118,118}}
 local stage,panel,roster,selected,host=f.control('stage'),f.control('characterPanel'),f.control('v25Roster'),f.control('selected'),f.control('v25Constellation')
 stage.children.characterPanel=panel;panel.children.v25Roster=roster;roster.children.selected=selected;selected.children.v25Constellation=host
 panel.visible=false;local s=Texture.new(f.binding,f.api);assert(not s:syncMask(stage) and #f.created==0)
 panel.visible=true;panel.active=false;assert(not s:syncMask(stage) and #f.created==0);panel.active=true
 for _=1,20 do
  s:syncMask(stage);assert(s:status().roots==1);local root=f.factories[#f.factories].host
  assert(root.sx==118/3 and root.sy==118/2);f:finish(s,root);assert(root.sx==118/3 and root.sy==118/2,'ready reveal reset mask scale')
  panel.visible=false;s:syncMask(stage);assert(f:live()==0 and s:status().roots==0 and host.alive)
  panel.visible=true
 end
 assert(s:onDestroy() and not s:syncMask(stage) and f:live()==0)
end)

test('clear and destroy during allocation or controller setters cannot resurrect roots',function()
 for _,method in ipairs({'clear','onDestroy'})do for _,when in ipairs({'create','step'})do
  local f=fixture();local s=Texture.new(f.binding,f.api);local parent=f.control('parent');local once=false
  if when=='create'then f.createHook=function()if not once then once=true;s[method](s)end end end
  local root=s:surfaceApi().instantiate(11,parent)
  if when=='step'then f.createHook=function()if not once then once=true;s[method](s)end end;s:update()end
  f.createHook=nil;assert(once and not s:surfaceApi().ready(root) and f:live()==0 and parent.alive,method..'/'..when)
  if method=='onDestroy'then assert(s:surfaceApi().instantiate(11,parent)==nil)else assert(s:surfaceApi().instantiate(11,parent));assert(s:clear())end
 end end
end)

test('root destroy failure keeps a retry ledger and never destroys its parent',function()
 local f=fixture();local s=Texture.new(f.binding,f.api);local parent=f.control('parent');local root=s:surfaceApi().instantiate(11,parent);f:finish(s,root)
 f.failDestroy=function(c)return c.ownedRoot end
 assert(not s:surfaceApi().destroy(root) and root.alive and parent.alive)
 assert(s:status().retained==1 and s:surfaceApi().instantiate(11,parent)==nil and not s:surfaceApi().ready(root))
 f.failDestroy=nil;assert(s:clear() and f:live()==0 and parent.alive and s:status().roots==0)
end)

test('failed child cleanup blocks root destruction until retry succeeds',function()
 local f=fixture();local s=Texture.new(f.binding,f.api);local parent=f.control('parent');local root=s:surfaceApi().instantiate(11,parent);f:finish(s,root)
 f.failDestroy=function(c)return c.id==41 end;assert(not s:clear() and root.alive and s:status().retained==1)
 for _,c in ipairs(f.destroyed)do assert(c~=root,'root destroyed above retained child')end
 f.failDestroy=nil;assert(s:onDestroy() and f:live()==0 and parent.alive)
end)

test('mask native lookup reentry cannot recreate a cleared or destroyed owner',function()
 local f=fixture();f.binding.uiMask={templateId=11,hostName='v25Constellation',displaySize={118,118}}
 local s=Texture.new(f.binding,f.api);local stage=f.control('stage');local panel=f.control('characterPanel');stage.children.characterPanel=panel
 f.childHook=function()s:onDestroy()end
 assert(not s:syncMask(stage) and #f.created==0)
end)

test('transparent-only textures are ready without image allocation and bad blocks fail without leaking',function()
 local f=fixture();f.texture.count=1;f.texture.drawCount=0;f.texture.blocks=hex(0,0,3,2,1,2,3,0)
 local s=Texture.new(f.binding,f.api);local root=s:surfaceApi().instantiate(11,f.control('parent'))
 assert(root and s:surfaceApi().ready(root) and #f:images()==0);assert(s:clear())
 f.texture.blocks='bad';local bad=Texture.new(f.binding,f.api)
 local ok,result=pcall(bad:surfaceApi().instantiate,11,f.control('parent'))
 assert((not ok or result==nil) and bad:clear() and f:live()==0)
end)

test('factory failure and destroy callback reentry retain exclusive ownership',function()
 local f=fixture();f.api.createController=function()error('factory failure')end;local s=Texture.new(f.binding,f.api)
 local ok,result=pcall(s:surfaceApi().instantiate,11,f.control('parent'));assert((not ok or not result) and f:live()==0 and s:clear())
 local g=fixture();local t=Texture.new(g.binding,g.api);local parent=g.control('parent');local root=t:surfaceApi().instantiate(11,parent)
 g.destroyHook=function()t:clear();assert(t:surfaceApi().instantiate(11,parent)==nil)end
 assert(t:surfaceApi().destroy(root) and g:live()==0 and parent.alive)
 assert(not t:surfaceApi().destroy(parent),'unowned parent was destroyed')
end)

test('numeric template calls support serialized string keys without duplicate roots',function()
 local f=fixture();f.binding.textures={['11']=f.texture};local s=Texture.new(f.binding,f.api);local parent=f.control('parent')
 local root=s:surfaceApi().instantiate(11,parent);assert(root and s:surfaceApi().instantiate(11,parent)==root)
 f:finish(s,root);assert(s:clear() and f:live()==0)
end)

test('mask-only binding renders while card binding stays disabled',function()
 local f=fixture();f.binding.enabled=false;f.binding.uiMask={templateId=11,hostName='v25Constellation',displaySize={118,118}}
 local s=Texture.new(f.binding,f.api);local stage,panel,roster,selected,host=f.control('stage'),f.control('panel'),f.control('roster'),f.control('selected'),f.control('mask')
 stage.children.characterPanel=panel;panel.children.v25Roster=roster;roster.children.selected=selected;selected.children.v25Constellation=host
 panel.visible=false;assert(not s:syncMask(stage) and #f.created==0)
 panel.visible=true;assert(s:syncMask(stage) and #f.factories==1);f:finish(s,f.factories[1].host)
 panel.visible=false;s:syncMask(stage);assert(f:live()==0 and s:clear())
end)

test('native parent observation clear cannot be followed by a stale allocation',function()
 local f=fixture();local s=Texture.new(f.binding,f.api);local parent=f.control('parent');parent.alive=nil;local once=false
 setmetatable(parent,{__index=function(_,key)if key=='alive'then if not once then once=true;s:clear()end;return true end end})
 assert(s:surfaceApi().instantiate(11,parent)==nil and #f.created==0,'old call allocated after observation cleared owner')
 assert(s:clear())
end)

test('controller status clear cannot publish an old ready transition',function()
 local f=fixture();local create=f.api.createController;local owner;local once=false
 f.api.createController=function(...)
  local c=create(...);local status=c.status
  c.status=function(self)local value=status(self);if value.phase=='ready' and not once then once=true;owner:clear()end;return value end
  return c
 end
 owner=Texture.new(f.binding,f.api);local root=owner:surfaceApi().instantiate(11,f.control('parent'))
 assert(not owner:update() and once and not owner:surfaceApi().ready(root) and f:live()==0,'stale status published ready')
end)

test('failed destruction stays in the ledger without automatic per-frame retries',function()
 local f=fixture();local owner=Texture.new(f.binding,f.api);local root=owner:surfaceApi().instantiate(11,f.control('parent'));f:finish(owner,root)
 local attempts=0;f.failDestroy=function(c)if c.ownedRoot then attempts=attempts+1;return true end end
 assert(not owner:surfaceApi().destroy(root) and attempts==1)
 for _=1,20 do assert(not owner:update())end
 assert(attempts==1 and owner:status().retained==1,'update retried failed destruction')
 f.failDestroy=nil;assert(owner:clear() and f:live()==0)
end)

test('hidden mask cleanup failure waits for another explicit page intent',function()
 local f=fixture();f.binding.uiMask={templateId=11,hostName='v25Constellation',displaySize={118,118}}
 local owner=Texture.new(f.binding,f.api);local stage,panel,roster,selected,host=f.control('stage'),f.control('panel'),f.control('roster'),f.control('selected'),f.control('mask')
 stage.children.characterPanel=panel;panel.children.v25Roster=roster;roster.children.selected=selected;selected.children.v25Constellation=host
 assert(owner:syncMask(stage));f:finish(owner,f.factories[1].host)
 local attempts=0;f.failDestroy=function(c)if c.ownedRoot then attempts=attempts+1;return true end end
 panel.visible=false;owner:syncMask(stage);assert(attempts==1)
 for _=1,20 do owner:syncMask(stage);owner:update()end
 assert(attempts==1,'hidden page retried failed cleanup each frame')
 f.failDestroy=nil;panel.visible=true;assert(owner:syncMask(stage));assert(owner:clear())
end)

test('every newly returned root is hidden before factory construction including transparent sources',function()
 local f=fixture();local create=f.api.createController
 f.api.createController=function(host,...)assert(host.visible==false,'factory observed a visible unbuilt root');return create(host,...)end
 local owner=Texture.new(f.binding,f.api);local root=owner:surfaceApi().instantiate(11,f.control('parent'));assert(root and not root.visible);assert(owner:clear())
 f.texture.count=1;f.texture.drawCount=0;f.texture.blocks=hex(0,0,3,2,1,2,3,0)
 local empty=Texture.new(f.binding,f.api);local blank=empty:surfaceApi().instantiate(11,f.control('parent'));assert(blank and not blank.visible and empty:clear())
end)

test('real JavaScript binding serialization reaches the default production controller',function()
 assert(type(GENERATED_BINDING)=='table' and GENERATED_BINDING.textures['101'] and GENERATED_BINDING.textures[101]==nil,'fixture did not exercise serialized string key')
 local f=fixture();f.api.createController=nil
 local owner=Texture.new(GENERATED_BINDING,f.api);local parent=f.control('parent')
 local shell=owner:surfaceApi().instantiate(GENERATED_BINDING.variants.attack.common,parent)
 local mana=owner:surfaceApi().instantiate(GENERATED_BINDING.manaTemplateId,parent)
 assert(shell and mana and shell~=mana);f:finish(owner,shell);f:finish(owner,mana)
 assert(#f:images()==6 and shell.width==3 and shell.height==2)
 assert(owner:clear() and f:live()==0 and parent.alive)
end)

test('a later root clearing the owner suppresses earlier ready transitions in the same update',function()
 local f=fixture();local create=f.api.createController;local owner,first;local factories=0;local cancelled=false
 f.api.createController=function(...)
  factories=factories+1;local c=create(...)
  if factories==2 then local step=c.step;c.step=function(self)
   if first and owner:surfaceApi().ready(first) and not cancelled then cancelled=true;owner:clear()end
   return step(self)
  end end
  return c
 end
 owner=Texture.new(f.binding,f.api);local parent=f.control('parent');first=owner:surfaceApi().instantiate(11,parent)
 assert(owner:surfaceApi().instantiate(12,parent))
 assert(not owner:update() and cancelled and f:live()==0,'superseded frame requested a fresh publication')
end)

test('a root alive getter cannot report ready after invalidating its own native handle',function()
 local f=fixture();local owner=Texture.new(f.binding,f.api);local root=owner:surfaceApi().instantiate(11,f.control('parent'));f:finish(owner,root)
 root.alive=nil;setmetatable(root,{__index=function(c,key)if key=='alive'then rawset(c,'alive',false);return true end end})
 assert(not owner:surfaceApi().ready(root),'dead root published from a stale alive observation')
end)

test('a parent alive getter killing its root cannot leave the texture ready',function()
 local f=fixture();local owner=Texture.new(f.binding,f.api);local parent=f.control('parent');local root=owner:surfaceApi().instantiate(11,parent);f:finish(owner,root)
 parent.alive=nil;setmetatable(parent,{__index=function(_,key)if key=='alive'then root.alive=false;return true end end})
 assert(not owner:surfaceApi().ready(root),'dead root published after parent observation')
end)

test('retirement during the last image write cancels controller publication immediately',function()
 local f=fixture();local owner=Texture.new(f.binding,f.api);local root=owner:surfaceApi().instantiate(11,f.control('parent'));local cancelled,stale=false,false
 f.methodHook=function(c,method,value)
  if c.id==41 and method=='visible' and value and #f:images()==3 and not cancelled then
   cancelled=true;owner:clear()
   assert(f.factories[1].data and root.visible==false)
  elseif c==root and method=='visible' and value and cancelled then stale=true end
 end
 owner:update();assert(cancelled and not stale and f:live()==0 and not owner:surfaceApi().ready(root),'cancelled controller tried to republish its root')
end)
