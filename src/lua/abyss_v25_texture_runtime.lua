-- Lossless RGBA rectangle data, allocated only for a requested live surface.
-- Child creation/page/reveal/cleanup stays in the mature portrait controller.
-- The 64-step/8ms update bound is global; native calls are not preemptible.
local M={}
local function integer(n)return type(n)=='number' and n>=0 and n<math.huge and n%1==0 end
local function alive(c)
 if type(c)~='table' and type(c)~='userdata'then return false end
 local ok,value=pcall(function()if c.alive==false then return false end;return c.alive end);return ok and value~=false
end
local function invoke(c,method,...)
 if not alive(c)then return false end
 local ok,value=pcall(function(...)local f=c[method];if type(f)~='function'then return false end;return f(c,...)end,...)
 return ok and value~=false and alive(c)
end
local function noop(api)
 local self={}
 local surface={instantiate=api.instantiate,destroy=api.destroy,ready=alive}
 function self.surfaceApi()return surface end
 function self.clear()return true end
 function self.onDestroy()return true end
 function self.update()return false end
 function self.syncMask()return false end
 function self.status()return {roots=0,retained=0,ready=0}end
 return self
end
local function hex(blocks,at,n)
 local value=tonumber(blocks:sub(at,at+n-1),16);assert(value,'invalid V25 texture hex');return value
end
local function offsets(asset)
 assert(integer(asset.width) and asset.width>0 and integer(asset.height) and asset.height>0,'invalid V25 texture dimensions')
 assert(integer(asset.count) and integer(asset.drawCount) and asset.drawCount<=asset.count,'invalid V25 texture count')
 assert(type(asset.blocks)=='string' and #asset.blocks==asset.count*24,'invalid V25 texture blocks')
 local result={}
 for at=1,#asset.blocks,24 do if hex(asset.blocks,at+22,2)>0 then result[#result+1]=at end end
 assert(#result==asset.drawCount,'V25 texture drawCount mismatch');return result
end
local function lazyData(asset)
 local visible=offsets(asset);local width,height=asset.width,asset.height
 local position=asset.display and asset.display.position or {0,0}
 assert(type(position)=='table' and #position==2,'invalid V25 texture display position')
 for _,v in ipairs(position)do assert(type(v)=='number' and v==v and math.abs(v)<math.huge,'invalid V25 texture position')end
 local rows=setmetatable({},{__len=function()return #visible end,__index=function(_,index)
  local at=visible[index];if not at then return nil end
  local x,y,w,h=hex(asset.blocks,at,4),hex(asset.blocks,at+4,4),hex(asset.blocks,at+8,4),hex(asset.blocks,at+12,4)
  assert(w>0 and h>0 and x+w<=width and y+h<=height,'V25 texture rectangle outside source')
  return {100001,position[1]-width/2+x+w/2,position[2]+height/2-y-h/2,w,h,.5,.5,.5,.5,.5,.5,1,1,0,
   hex(asset.blocks,at+16,2),hex(asset.blocks,at+18,2),hex(asset.blocks,at+20,2),hex(asset.blocks,at+22,2)}
 end,__newindex=function()error('V25 texture rows are read-only')end})
 return {width=width,height=height,count=#visible,sourceCount=asset.count,rows=rows,rectanglesOnly=true,runtimeV2=true}
end
local function snapshot(s)
 local result={};for _,row in pairs(s.records)do result[#result+1]=row end
 table.sort(result,function(a,b)return a.serial<b.serial end);return result
end
local function blocked(s)return s.dead or s.closing or s.cleaning end
local function epochValid(s,token)return token==s.epoch and not blocked(s)end
local function valid(s,row)
 if s.dead or row.retired or row.epoch~=s.epoch or s.records[row.serial]~=row then return false end
 local live=alive(row.root) and alive(row.parent) and alive(row.root)
 return live and not s.dead and not row.retired and row.epoch==s.epoch and s.records[row.serial]==row
end
local function forget(s,row)
 if s.records[row.serial]~=row then return end
 s.records[row.serial]=nil
 if row.root then s.byRoot[row.root]=nil end
 local parent=s.byParent[row.parent];if parent and parent[row.id]==row then parent[row.id]=nil end
 if s.mask==row then s.mask=nil end
end
local function releaseController(row)
 if not row.controller then return true end
 local ok,result=pcall(row.controller.release,row.controller)
 if not ok or result==false then row.reason=ok and 'texture child cleanup rejected' or tostring(result);return false end
 local read,status=pcall(row.controller.status,row.controller)
 return read and (status.owned or 0)==0
end
local function cleanup(s,row)
 if row.creating or s.cleaning then return false end
 s.cleaning=true
 local clean=releaseController(row)
 if row.busy then s.cleaning=false;return false end -- release cancels its in-flight generation; step drains children
 if clean and alive(row.root)then
  invoke(row.root,'SetVisible',false);invoke(row.root,'SetActive',false)
  local ok,result=pcall(s.api.destroy,row.root)
  clean=ok and result~=false
  if not clean then row.reason=ok and 'texture root destroy rejected' or tostring(result)end
 end
 if clean then
  if row.controller then pcall(row.controller.destroy,row.controller)end
  forget(s,row)
 end
 s.cleaning=false;return clean
end
local function retire(s,row)
 if not row then return true end
 row.retired=true;row.ready=false;return cleanup(s,row)
end
local function clear(s)
 s.epoch=s.epoch+1;local closing=s.closing;s.closing=true;s.mask=nil;s.maskIntentKnown=false;s.maskIntent=nil
 local rows=snapshot(s);for _,row in ipairs(rows)do row.retired=true;row.ready=false end
 local clean=true;for _,row in ipairs(rows)do if not cleanup(s,row)then clean=false end end
 s.closing=closing;return clean and next(s.records)==nil
end
local function dataFor(s,asset)
 local data=s.data[asset]
 if not data then data=lazyData(asset);s.data[asset]=data end
 return data
end
local function beginController(s,row,data)
 if data.count==0 then
  local ok=invoke(row.root,'SetSizeDelta',data.width,data.height);row.ready=ok;return ok
 end
 local factory=s.api.createController or require('abyss_traveler_portraits').createController
 row.controller=factory(row.root,data,data.width,{imagePrefabId=s.binding.imageTemplateId,containerPrefabId=s.binding.groupTemplateId})
 assert(type(row.controller)=='table','V25 texture controller unavailable')
 if not valid(s,row)then return false end
 return row.controller:begin()~=false and valid(s,row)
end
local function allocate(s,row,data)
 row.creating=true
 local ok,root=pcall(s.api.instantiate,s.binding.groupTemplateId,row.parent)
 if ok and (type(root)=='table' or type(root)=='userdata')then row.root=root;s.byRoot[root]=row end
 row.creating=false
 if not ok or not valid(s,row)then retire(s,row);return nil end
 if not invoke(root,'SetVisible',false) or not valid(s,row)then retire(s,row);return nil end
 row.busy=true;local started,result=pcall(beginController,s,row,data);row.busy=false
 if not started or not result or not valid(s,row)then
  row.reason=not started and tostring(result) or 'V25 texture creation cancelled';retire(s,row);return nil
 end
 return root
end
local function instantiate(s,id,parent)
 local token=s.epoch
 if blocked(s) or not alive(parent) or not epochValid(s,token)then return nil end
 local asset=s.binding.textures[id] or s.binding.textures[tostring(id)];if type(asset)~='table'then return nil end
 local parentRows=s.byParent[parent];local old=parentRows and parentRows[id]
 if old and valid(s,old)then return old.root end
 if old and not retire(s,old)then return nil end
 if not epochValid(s,token)then return nil end
 local ok,data=pcall(dataFor,s,asset);if not ok then s.reason=tostring(data);return nil end
 s.serial=s.serial+1
 local row={id=id,parent=parent,serial=s.serial,epoch=s.epoch,data=data}
 s.records[row.serial]=row;parentRows=parentRows or {};s.byParent[parent]=parentRows;parentRows[id]=row
 return allocate(s,row,data)
end
local function ready(s,control)
 local row=s.byRoot[control];return row~=nil and row.ready==true and valid(s,row)
end
local function advance(s,row)
 if row.retired then return false end -- retry requires an explicit fresh release/page intent
 if not valid(s,row)then retire(s,row);return false end
 if row.ready or not row.controller then return false end
 row.busy=true;local ok=pcall(row.controller.step,row.controller);row.busy=false
 if not ok or not valid(s,row)then retire(s,row);return false end
 local read,status=pcall(row.controller.status,row.controller)
 if not read or not valid(s,row)then retire(s,row);return false end
 if status.phase=='failed' or status.phase=='release_failed'then retire(s,row);return false end
 if status.phase=='ready'then row.ready=true;return true end
 return false
end
local function update(s)
 if s.updating or s.closing or s.cleaning then return false end
 local rows=snapshot(s);if #rows==0 then return false end
 s.updating=true;local token=s.epoch;local start=s.clock();local changed,idle=false,0
 for _=1,64 do
  if s.clock()-start>=.008 then break end
  s.cursor=s.cursor%#rows+1;local row=rows[s.cursor]
  if s.records[row.serial]==row then
   local pending=not row.ready and not row.retired
   if advance(s,row)then changed=true end
   idle=pending and 0 or idle+1
  else idle=idle+1 end
  if idle>=#rows then break end
 end
 s.updating=false;return changed and epochValid(s,token)
end
local function child(parent,name)
 if not alive(parent)then return nil end
 local ok,value=pcall(parent.GetChild,parent,name);if ok then return value end
end
local function maskHost(s,stage)
 local panel=child(stage,'characterPanel');if not alive(panel)then return nil end
 local ok,visible=pcall(function()return panel.active~=false and panel.visible~=false end)
 if not ok or not visible then return nil end
 local selected=child(child(panel,'v25Roster'),'selected')
 return child(selected,s.binding.uiMask.hostName)
end
local function createMask(s,host)
 local config=s.binding.uiMask;local root=instantiate(s,config.templateId,host);if not root then return false end
 local row=s.byRoot[root];s.mask=row
 local size=config.displaySize;local ok=invoke(root,'SetLocalScale',size[1]/row.data.width,size[2]/row.data.height,1)
 if not ok or not valid(s,row)then retire(s,row);return false end
 return true
end
local function maskCached(s,host)return s.mask and s.mask.parent==host and valid(s,s.mask)end
local function repeatedMaskIntent(s,host)
 if s.maskIntentKnown and s.maskIntent==host then return true end
 s.maskIntentKnown=true;s.maskIntent=host;return false
end
local function syncMask(s,stage)
 if blocked(s) or not s.binding.uiMask then return false end
 local token=s.epoch;local host=maskHost(s,stage)
 if not epochValid(s,token)then return false end
 if repeatedMaskIntent(s,host)then return false end
 if not host then if s.mask then return retire(s,s.mask)end;return false end
 if maskCached(s,host)then return false end
 if s.mask and not retire(s,s.mask)then return false end
 if not epochValid(s,token)then return false end
 return createMask(s,host)
end
local function status(s)
 local result={roots=0,retained=0,ready=0,destroyed=s.dead,reason=s.reason}
 for _,row in pairs(s.records)do
  result.roots=result.roots+1
  if row.retired then result.retained=result.retained+1 end
  if row.ready then result.ready=result.ready+1 end
 end
 return result
end
function M.new(binding,api)
 binding=binding or {};api=api or {}
 if type(binding.textures)~='table' or next(binding.textures)==nil then return noop(api)end
 if binding.enabled==false and not binding.uiMask then return noop(api)end
 assert(type(api.instantiate)=='function' and type(api.destroy)=='function','V25 texture native API unavailable')
 assert(integer(binding.imageTemplateId) and binding.imageTemplateId>0 and integer(binding.groupTemplateId) and binding.groupTemplateId>0,'V25 texture templates unavailable')
 local s={binding=binding,api=api,records={},byRoot={},byParent=setmetatable({},{__mode='k'}),data=setmetatable({},{__mode='k'}),epoch=0,serial=0,cursor=0,clock=api.clock or os.clock}
 local self={};local surface={instantiate=function(id,parent)return instantiate(s,id,parent)end,
  destroy=function(root)local row=s.byRoot[root];return row~=nil and retire(s,row)end,ready=function(root)return ready(s,root)end}
 function self.surfaceApi()return surface end
 function self.clear()return clear(s)end
 function self.onDestroy()s.dead=true;return clear(s)end
 function self.update()return update(s)end
 function self.syncMask(_,stage)return syncMask(s,stage)end
 function self.status()return status(s)end
 return self
end
return M
