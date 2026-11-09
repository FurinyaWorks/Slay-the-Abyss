package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local F=dofile('tests/lua/support/game_ui_fixture.lua')
local Display=require('abyss_card_display')
local function box()
 local value=F.control({name='card',kind='container',children={{name='art',kind='image'},
  {name='artSamples',kind='container',visible=false,children={{name='group000',kind='container',children={{name='shape0000',kind='image'}}}}}}})
 local slot=value:GetChild('artSamples'):GetChild('group000'):GetChild('shape0000')
 local mt=getmetatable(slot);local resource,mode,reads,writes,reject=100001,nil,0,0,false
 local original=slot.SetImage
 slot.SetImage=function(self,source,id)resource=id;mode=nil;return original(self,source,id)end
 slot.SetLocalRotation=function(self,x,y,z)self.rotation={x,y,z}end
 setmetatable(slot,{__index=function(t,k)
  if k=='imageType'then reads=reads+1;assert(resource>100006,'basic shape has no imageType');return mode end
  if type(mt.__index)=='function'then return mt.__index(t,k)end;return mt.__index and mt.__index[k]
 end,__newindex=function(t,k,v)
  if k=='imageType'then writes=writes+1;assert(resource>100006,'basic shape has no imageType');assert(not reject,'gallery imageType rejected');mode=v
  elseif mt.__newindex then mt.__newindex(t,k,v)else rawset(t,k,v)end
 end})
 return value,slot,function()return reads,writes,mode end,function()reject=true end
end
local function metadata(id)
 return {cardId='cleave',capacity=1,luaSha256='capabilities',slots={{image=id,imageType='stretch',position={1.25,-2.5},size={3.75,4.25},
  anchorMin={.5,.5},anchorMax={.5,.5},pivot={.5,.5},scale={.75,1.25},rotation={13,27,41},colour={5,11,17,23}}}}
end
local plain={imageSource='static',color=function(...)return {...}end}
for id=100001,100006 do
 local b,c,usage=box();assert(Display.writeNativeArt(b,{id='cleave'},metadata(id),plain,b:GetChild('art')),'basic resource failed without unused Enum.ImageType')
 local reads,writes=usage();assert(reads==0 and writes==0,'basic shape mode was accessed')
 assert(c.sizeDeltaX==3.75 and c.sizeDeltaY==4.25 and c.x==1.25 and c.y==-2.5)
 assert(c.rotation[1]==13 and c.rotation[2]==27 and c.rotation[3]==41 and c.imageColor[4]==23,'basic transform/alpha lost')
 assert(Display.clearNativeArt(b))
end
local b,c,usage,reject=box();local gallery={imageSource='static',imageTypes={stretch=23},color=plain.color}
assert(Display.writeNativeArt(b,{id='cleave'},metadata(106057),gallery,b:GetChild('art')))
local reads,writes,mode=usage();assert(reads>0 and writes==1 and mode==23,'gallery mode not strictly written/read back')
Display.clearNativeArt(b);reject()
assert(not Display.writeNativeArt(b,{id='cleave'},metadata(106057),gallery,b:GetChild('art')),'gallery rejection was swallowed')
assert(b:GetChild('art').visible and not b:GetChild('artSamples').visible,'gallery failure covered fallback')
local compact={imageSource='static',compactRectangles=true,color=plain.color}
b,c,usage=box();assert(Display.writeNativeArt(b,{id='cleave'},metadata(100001),compact,b:GetChild('art')))
reads,writes=usage();assert(reads==0 and writes==0 and c.sizeDeltaX==3.75 and c.x==1.25 and c.imageColor[4]==23)
b,c=box();assert(not Display.writeNativeArt(b,{id='cleave'},metadata(100002),compact,b:GetChild('art')),'compact exception spread beyond white rectangle')
compact.imageTypes={stretch=23};b,c,usage,reject=box();c:SetImage('static',106057)
assert(Display.writeNativeArt(b,{id='cleave'},metadata(106057),compact,b:GetChild('art')))
reads,writes,mode=usage();assert(reads>0 and writes==1 and mode==23,'compact gallery mode lost strict readback')
Display.clearNativeArt(b);reject();assert(not Display.writeNativeArt(b,{id='cleave'},metadata(106057),compact,b:GetChild('art')),'compact gallery rejection was swallowed')
print('NATIVE_CARD_ART_IMAGE_CAPABILITIES_PASS basic1-6/no-mode/no-enum/gallery-strict/compact-white')
