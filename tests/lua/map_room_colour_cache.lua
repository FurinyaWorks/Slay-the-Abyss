local UI=require('abyss_map_ui')
local function fixture()
 local values,writes={},0
 local icon=setmetatable({alive=true,SetSizeDelta=function()end},{__newindex=function(self,key,value)
  if key~='imageColor'then rawset(self,key,value);return end
  writes=writes+1;values.colour=value
  local callback=values.callback;values.callback=nil
  if callback then callback()end
  if values.throw then values.throw=false;error('partial colour write')end
 end})
 local ring={SetSizeDelta=function()end}
 local box={GetChild=function(_,name)return name=='icon' and icon or ring end}
 local function colour(r,g,b,a)return {r=r,g=g,b=b,a=a}end
 local fx={box=box,size=44,scale=.5,state='locked',ink={r=12,g=23,b=34,a=255},alpha=1,colour=colour}
 return fx,icon,values,function()return writes end
end
local a,icon,v,count=fixture()
for _=1,300 do UI.paintRoom(a)end
print('MAP_COLOUR stable frames=300 writes='..count())
assert(count()==1,'stable room resubmitted colour')
a.alpha=.9;UI.paintRoom(a);assert(count()==2 and v.colour.a==230)
a.alpha=.90001;UI.paintRoom(a);assert(count()==2,'same quantized alpha repainted')
a.ink.r=13;UI.paintRoom(a);assert(count()==3 and v.colour.r==13,'in-place ink edit skipped')
local b={box=a.box,size=44,scale=.5,state='locked',ink=a.ink,alpha=a.alpha,colour=a.colour}
UI.paintRoom(b);UI.paintRoom(a);assert(count()==5,'pooled control owner ignored')
local original=a.colour;a.colour=function(...)return original(...)end
UI.paintRoom(a);assert(count()==6,'colour factory binding ignored')
v.throw=true;a.alpha=.5;assert(not pcall(UI.paintRoom,a))
a.alpha=.90001;UI.paintRoom(a);assert(count()==8 and v.colour.a==230,'partial failure retained old colour promise')
UI.paintRoom(a);assert(count()==8)
v.callback=function()UI.paintRoom(b)end;a.alpha=.4;UI.paintRoom(a)
local after=count();UI.paintRoom(a);assert(count()==after+1,'overlapping write was cached')
UI.paintRoom(a);assert(count()==after+1)
local replacement,_,rv,rcount=fixture();a.box=replacement.box
UI.paintRoom(a);assert(rcount()==1 and rv.colour.a==102,'replacement native handle skipped')
local entered=false
a.colour=function(...)
 if not entered then entered=true;UI.paintRoom(b)end
 return original(...)
end
UI.paintRoom(a);assert(entered and rcount()==2,'colour factory did not execute')
-- The factory re-enters through another native handle; both writes must remain valid.
UI.paintRoom(a);assert(rcount()==2,'unrelated native handle invalidated the current promise')
local factory=a.colour
a.colour=function(...)
 a.colour=factory
 UI.paintRoom(a)
 return original(...)
end
UI.paintRoom(a);local overlapping=rcount();UI.paintRoom(a)
assert(rcount()==overlapping+1,'factory reentry on the same handle was cached')
print('MAP_COLOUR_CACHE_PASS ownership factory mutation partial-failure reentry replacement')
