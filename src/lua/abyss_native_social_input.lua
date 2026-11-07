-- Keep native social keys outside the gameplay-only input consumer.
-- Native event routing still requires client verification; this module sends no chat.
local M={}
local actions={'MoveForward','MoveBackward','MoveLeft','MoveRight','Jump','Drop','NormalAttack',
 'CharacterSkill1','CharacterSkill2','CharacterSkill3','CharacterSkill4'}
local function unchanged()return true end
local function eventsFor(keys)
 if not keys then return nil end
 local events,seen={},{}
 for _,action in ipairs(actions)do for _,suffix in ipairs({'Down','Up'})do
  local event=keys['Keyboard'..action..'Key'..suffix]
  if event==nil or seen[event]then return nil end
  seen[event]=true;events[#events+1]=event
 end end
 return events
end
local function ports(root)
 if not root or root.alive==false then return nil end
 if type(root.AddKeyEventListener)~='function' or type(root.RemoveKeyEventListener)~='function'
  or type(root.disableKeyEventPassthrough)~='boolean' then return nil end
 return {add=root.AddKeyEventListener,remove=root.RemoveKeyEventListener,barrier=root.disableKeyEventPassthrough}
end
function M.attach(root,keys)
 local ok,api=pcall(ports,root)
 if not ok or not api then return unchanged,'native_key_api_unavailable' end
 local events=eventsFor(keys)
 if not events then return unchanged,'native_key_enum_incomplete' end
 local pending,enabled,released={},false,false
 local function consume()return enabled end
 -- Pass true from the engine-destroy callback: no property read on expired handles.
 local function release(engineDestroyed)
  if released then return true end
  enabled=false
  if engineDestroyed==true or root.alive==false then pending={};released=true;return true end
  local restored,why=pcall(function()root.disableKeyEventPassthrough=api.barrier end)
  local remaining={}
  for _,event in ipairs(pending)do
   local removed,result=pcall(api.remove,root,event,consume)
   if not removed or result==false then remaining[#remaining+1]=event;why=removed and 'key listener removal rejected' or result end
  end
  pending=remaining;released=restored and #pending==0
  return released,not released and why or nil
 end
 local installed,why=pcall(function()
  for _,event in ipairs(events)do
   -- Registration can apply and then fail; retain its cleanup obligation first.
   pending[#pending+1]=event
   assert(api.add(root,event,consume)~=false,'key listener registration rejected')
  end
  enabled=true
  root.disableKeyEventPassthrough=false
 end)
 if not installed then release();return release,tostring(why) end
 return release
end
return M
