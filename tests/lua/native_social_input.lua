local Input=require('abyss_native_social_input')
local actions={'MoveForward','MoveBackward','MoveLeft','MoveRight','Jump','Drop','NormalAttack','CharacterSkill1','CharacterSkill2','CharacterSkill3','CharacterSkill4'}
local function fixture(original)
 local state={barrier=original==nil and true or original,showCursor=true,blockCursor=true,listeners={},adds=0,removes=0,writes=0,alive=true}
 local keys={KeyboardSprintKeyDown='sprint',KeyboardSprintKeyUp='sprintUp',KeyboardCraftspersonKey20Down='socialN',ControllerJumpKeyDown='padJump',KeyboardChatKeyDown='chat',KeyboardVoiceKeyDown='voice'}
 for _,action in ipairs(actions)do for _,suffix in ipairs({'Down','Up'})do local key='Keyboard'..action..'Key'..suffix;keys[key]=key end end
 local root={}
 local methods={}
 function methods.AddKeyEventListener(_,event,callback)
  assert(state.alive,'native access after engine destroy');state.adds=state.adds+1
  local listeners=state.listeners[event] or {};state.listeners[event]=listeners;listeners[#listeners+1]=callback
  if state.failAdd==state.adds then error('partial add')end
 end
 function methods.RemoveKeyEventListener(_,event,callback)
  assert(state.alive,'native access after engine destroy');state.removes=state.removes+1
  if state.failRemove then state.failRemove=false;error('remove rejected')end
  local list=state.listeners[event] or {}
  for i=#list,1,-1 do if list[i]==callback then table.remove(list,i)end end
 end
 setmetatable(root,{__index=function(_,key)
  if key=='alive'then return state.alive end
  if key=='disableKeyEventPassthrough'then return state.barrier end
  return methods[key] or state[key]
 end,__newindex=function(_,key,value)
  assert(state.alive,'native write after engine destroy')
  if key=='disableKeyEventPassthrough'then
   state.writes=state.writes+1;state.barrier=value
   if state.failWrite then state.failWrite=false;error('partial barrier write')end
  else state[key]=value end
 end})
 return root,keys,state,methods
end
local tests={}
local function test(name,fn)tests[#tests+1]={name,fn}end
test('native property opens only keyboard passthrough and consumes gameplay events',function()
 local root,keys,s=fixture();local release,why=Input.attach(root,keys)
 assert(type(release)=='function' and not why)
 assert(s.barrier==false and s.showCursor==true and s.blockCursor==true)
 local n=0;for event,list in pairs(s.listeners)do n=n+1;assert(#list==1 and list[1]()==true,'gameplay event not consumed: '..event)end
 assert(n==22 and s.adds==22,'unexpected gameplay input coverage')
 for _,key in ipairs({'KeyboardSprintKeyDown','KeyboardSprintKeyUp','KeyboardCraftspersonKey20Down','ControllerJumpKeyDown','KeyboardChatKeyDown','KeyboardVoiceKeyDown'})do assert(not s.listeners[keys[key]],'non-owned/social input was registered')end
 release();assert(s.barrier==true and s.removes==22)
 local writes,removes=s.writes,s.removes;release();assert(s.writes==writes and s.removes==removes,'repeat release touched native API')
end)
test('existing same-event callbacks survive release and original false barrier restores',function()
 local root,keys,s=fixture(false);local other=function()return 'existing'end
 root:AddKeyEventListener(keys.KeyboardJumpKeyDown,other)
 local release=Input.attach(root,keys);assert(#s.listeners[keys.KeyboardJumpKeyDown]==2)
 release();assert(s.barrier==false and #s.listeners[keys.KeyboardJumpKeyDown]==1 and s.listeners[keys.KeyboardJumpKeyDown][1]==other)
end)
test('engine-destroy release never reads or writes the expired native root',function()
 local root,keys,s=fixture();local release=Input.attach(root,keys)
 s.alive=false;setmetatable(root,{__index=function()error('expired root read')end,__newindex=function()error('expired root write')end})
 assert(release(true));assert(release(true))
end)
test('already marked dead root releases without invoking native methods',function()
 local root,keys,s=fixture();local release=Input.attach(root,keys);local removes=s.removes;s.alive=false
 release();assert(s.removes==removes)
end)
test('missing API or incomplete event enum preserves the original barrier',function()
 for _,missing in ipairs({'AddKeyEventListener','RemoveKeyEventListener','event'})do
  local root,keys,s,methods=fixture()
  if missing=='event'then keys.KeyboardJumpKeyUp=nil else methods[missing]=nil end
  local release,why=Input.attach(root,keys);assert(type(release)=='function' and why)
  assert(s.barrier==true and s.adds==0 and s.writes==0);release()
 end
end)
test('partial registration and partial property write roll back owned callbacks',function()
 for _,failure in ipairs({'add','write'})do
  local root,keys,s=fixture();if failure=='add'then s.failAdd=3 else s.failWrite=true end
  local release,why=Input.attach(root,keys);assert(why,'native failure was not reported')
  assert(s.barrier==true,'failed installation opened passthrough')
  for _,list in pairs(s.listeners)do assert(#list==0,'partial listener retained')end
  release()
 end
end)
test('failed listener retirement remains retryable without removing foreign callbacks',function()
 local root,keys,s=fixture();local release=Input.attach(root,keys);s.failRemove=true
 local ok=release();assert(ok==false and s.barrier==true)
 assert(release());for _,list in pairs(s.listeners)do assert(#list==0)end
end)
for i,entry in ipairs(tests)do entry[2]();print('ok native social input '..i..' - '..entry[1])end
print('NATIVE_SOCIAL_INPUT_PASS '..#tests)
