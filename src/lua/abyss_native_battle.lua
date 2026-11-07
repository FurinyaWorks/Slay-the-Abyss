-- Presentation observes committed combat events; Run/Combat remain the sole rule owners.
local M={}
local Geometry=require('abyss_native_battle_geometry')
local Projection=require('abyss_native_projection')
local lastSequence=0
local function child(parent,name)
 if not parent then return nil end
 local ok,value=pcall(parent.GetChild,parent,name)
 return ok and value or nil
end
function M.attach(view,root,api)
 api=api or {}
 local config=api.config or require('abyss_native_battle_config')
 Geometry.configure(true)
 local self={clock=0,queue={},slots={},showing={},masked={},recent={},recentOrder={},worlds={},maxActors=config.maxActors or 3}
 self.camera=config.camera
 local stage=child(root,'stage')
 local panel=child(stage,'battlePanel')
 local fail
 local function log(message)
  if api.log then api.log(message)else print('ABYSS_NATIVE_BATTLE '..message)end
 end
 if api.keyEvents then
  local why
  self.releaseInput,why=require('abyss_native_social_input').attach(root,api.keyEvents)
  log(why and ('social_input_unverified '..why) or 'native_social_passthrough')
 end
 local function restore()
  for c,value in pairs(self.masked)do
   if c.alive~=false then pcall(c.SetVisible,c,value)end
  end
  self.masked={}
 end
 local function conceal(c)
  if not c or c.alive==false then return end
  if self.masked[c]==nil then self.masked[c]=c.activeInHierarchy~=false end
  if c.activeInHierarchy~=false then c:SetVisible(false)end
 end
 local function masks()
  if not self.battle or self.destroyed then return end
  conceal(child(root,'canvasBackdrop'));conceal(child(root,'backdrop'))
  conceal(child(stage,'officialBattleBackdrop'))
  for _,name in ipairs({'backdrop','battleBackground','officialBackground','lowpolyScene','vista','sceneArt'})do conceal(child(panel,name))end
 end
 local function safeMasks()
  local ok,why=pcall(masks)
  if not ok then fail('art mask failed: '..tostring(why))end
 end
 local function modelFor(enemy)
  local choice=(config.enemyModels or {})[enemy.definitionId or enemy.id] or config.defaultModel or 1
  if type(choice)=='table'then choice=choice.model end
  return choice
 end
 local function enqueue(command,index,model)
  if #self.queue>=64 then return false end
  self.queue[#self.queue+1]={command=command,actor=index,model=model or 1,slot=self.slots[index]}
  return true
 end
 local function cleanup()
  self.queue={};self.pending=nil;self.showing={};self.ready=false;self.slots={};self.worlds={};self.recent={};self.recentOrder={};restore();Geometry.clear()
  if self.owned then enqueue('hide',0)end
 end
 fail=function(reason,hideFailed)
  log('native_failure '..tostring(reason));self.failedBattle=self.battle
  self.queue={};self.pending=nil;self.showing={}
  -- The production 3D arena never restores legacy actor pictures after errors.
  -- Keep extant models, targets and rules responsive; only presentation is degraded.
  if view.battleUI and view.battleUI.root then
   local notice=child(view.battleUI.root,'notice')
   if notice then notice.text='3D表现暂不可用：'..tostring(reason) end
  end
  if hideFailed then self.suspended=true;self.queue={}end
 end
 local function slotFor(id)
  for index,slot in pairs(self.slots)do if slot.id==id then return index,slot end end
 end
 local function present(enemy)
  return not enemy.escaped and not enemy.isDying and (enemy.hp>0 or enemy.halfDead or enemy.awakenedRebirthPending)
 end
 local function bindWorld(actor,feet,body)
  self.worlds[actor.id]={actor=actor,feet=feet,body=body}
  Geometry.bind(actor,Projection.body(feet,body,self.camera,self.uiHeight))
 end
 local function reconcile(battle)
  if not battle or self.failedBattle==battle or self.suspended then return end
  local wanted,count={},0
  for _,enemy in ipairs(battle.enemies)do
   if present(enemy)then wanted[enemy.id]=enemy;count=count+1 end
  end
  if count>self.maxActors then fail('actor capacity exceeded');return end
  local replaced=false
  for index,slot in pairs(self.slots)do
   if not wanted[slot.id]then
    -- Committed lethal feedback still reads this actor's shadow after retirement.
    -- Its weak projection stays valid until battle cleanup (or same-ID rebinding).
    enqueue('death',index,slot.model);self.slots[index]=nil;replaced=true
   end
  end
  for _,enemy in ipairs(battle.enemies)do
   if wanted[enemy.id] and not slotFor(enemy.id)then
    local free=1;while self.slots[free]do free=free+1 end
    local slot={id=enemy.id,model=modelFor(enemy),actor=enemy};self.slots[free]=slot
    local projections=config.projections
    local rect=projections and ((projections.models and projections.models[slot.model] and projections.models[slot.model][free]) or projections.slots[free])
    if rect then Geometry.bind(enemy,rect)end
    if config.worldFeet and config.bodies and config.camera then bindWorld(enemy,config.worldFeet[free],config.bodies[slot.model])end
    if not enqueue('show',free,slot.model)then fail('presentation queue full');return end
   end
  end
  if replaced then
   restore();self.ready=false
   for _,slot in pairs(self.slots)do if slot.ready then self.ready=true end end
   safeMasks()
  end
 end
 local function nextRequest()
  local request
  repeat
   request=table.remove(self.queue,1)
  until not request or request.command=='hide' or request.command=='death' or self.slots[request.actor]==request.slot
  return request
 end
 local function issue(request)
  lastSequence=lastSequence+1;request.seq=lastSequence;request.deadline=self.clock+14
  request.battle=self.battle;self.recent[request.seq]=request;self.recentOrder[#self.recentOrder+1]=request.seq
  if #self.recentOrder>64 then self.recent[table.remove(self.recentOrder,1)]=nil end
  self.pending=self.pending or request
  if request.command=='show'then self.owned=true;self.showing[request.seq]=request end
  local ok,value=pcall(api.send or function()return false end,request.command,request.model,request.actor,request.seq)
  if not ok or value==false then fail('send failed: '..tostring(value),request.command=='hide')end
 end
 function self.position(_owner,actor,sequence,x,y,z)
  local request=self.recent[sequence]
  if self.destroyed or not self.battle or not config.camera or not config.bodies or not request or request.battle~=self.battle
   or request.command=='hide' or request.command=='death' then return false end
  for i=1,3 do local v=({x,y,z})[i];if type(v)~='number' or v~=v or math.abs(v)==math.huge then return false end end
  if actor==-1 then
   if sequence<(self.cameraPositionSeq or 0)then return false end
   self.cameraPositionSeq=sequence
   local camera={};for key,value in pairs(self.camera)do camera[key]=value end
   camera.focus={x,y,z};self.camera=camera
   for _,record in pairs(self.worlds)do Geometry.bind(record.actor,Projection.body(record.feet,record.body,camera,self.uiHeight))end
   self.geometryDirty=true
   return true
  end
  local slot=actor~=0 and self.slots[actor] or nil
  if actor~=0 and (not slot or request.actor~=actor or request.slot~=slot or sequence<(slot.positionSeq or 0))then return false end
  if actor==0 and sequence<(self.heroPositionSeq or 0)then return false end
  if actor==0 then self.heroPositionSeq=sequence;bindWorld(self.battle.player,{x,y,z},config.heroBody)
  else slot.positionSeq=sequence;bindWorld(slot.actor,{x,y,z},config.bodies[slot.model])end
  self.geometryDirty=true
  return true
 end
 function self.resize(_owner,width,height)
  if not config.camera then return end
  local scale=math.min(width/1280,height/720)
  self.uiHeight=height/scale
  for _,record in pairs(self.worlds)do Geometry.bind(record.actor,Projection.body(record.feet,record.body,self.camera,self.uiHeight))end
  if self.battle then self.geometryDirty=true end
 end
 local function pump()
  if self.pending or #self.queue==0 or self.destroyed then return end
  local request=nextRequest()
  if not request then return end
  issue(request)
  if request.command~='show'then return end
  -- Spawn independent actors together; never serialize 4.5s initialization per foe.
  while self.queue[1] and self.queue[1].command=='show' do
   request=nextRequest()
   if request then issue(request)end
  end
 end
 local function complete(request)
  self.showing[request.seq]=nil
  if self.pending==request then
   local _,pending=next(self.showing)
   self.pending=pending
  end
 end
 function self.ack(_owner,message,sequence)
  local request=self.showing[sequence] or self.pending
  if self.destroyed or not request or sequence~=request.seq then return false end
  message=tostring(message)
  if message=='ready' and request.command=='show'then
   complete(request)
   local slot=self.slots[request.actor]
   if slot and slot==request.slot then slot.ready=true;self.ready=true;safeMasks()end
  elseif message=='hidden' and request.command=='hide'then
   complete(request);self.owned=false
  elseif message=='completed:'..request.command then complete(request)
  elseif message:sub(1,14)=='missing_actor:' and request.command=='death'then
   -- Removing an already absent presentation entity is an idempotent cleanup.
   complete(request)
  elseif message:sub(1,12)=='unsupported:'then
   complete(request)
   -- Some official models have no hit clip. Keep their idle representation.
   if request.command=='show' or request.command=='hide'then fail(message,request.command=='hide')end
  elseif message:sub(1,6)=='error:' or message:sub(1,14)=='missing_actor:' or message:sub(1,5)=='busy:'then
   complete(request)
   if request.command=='attack' or request.command=='hit' or request.command=='idle'then
    log('native_action_unverified '..message)
   else fail(message,request.command=='hide')end
  end
  return true
 end
 local function observe(_before,battle,first)
  if self.destroyed or self.battle~=battle or self.failedBattle==battle then return end
  reconcile(battle)
  if self.failedBattle==battle then return end
  for index=first or 1,#battle.events do
   local event=battle.events[index];local detail=event.detail or {}
   local actor,command
   if event.kind=='intent'then actor=slotFor(detail.enemy);command='attack'
   elseif event.kind=='play' and battle.catalog and battle.catalog.cards[detail.cardId]
    and battle.catalog.cards[detail.cardId].type=='attack' then actor=0;command='attack'
   elseif (event.kind=='damage' or event.kind=='hp_loss' or event.kind=='status_damage')and (detail.amount or 0)>0 then
    actor=detail.target=='player' and 0 or slotFor(detail.target);command='hit'
   end
   local slot=actor and self.slots[actor]
   if (slot or actor==0) and not enqueue(command,actor,slot and slot.model or 1)then fail('presentation queue full');return end
  end
 end
 local feedback=view.battleUI and view.battleUI.feedback
 local originalStart=feedback and feedback.start
 if originalStart then
  self.feedbackWrapper=function(owner,before,battle,first,...)
   local ok,why=pcall(observe,before,battle,first)
   if not ok then fail(why)end
   return originalStart(owner,before,battle,first,...)
  end
  feedback.start=self.feedbackWrapper
 end
 local originalRefresh=view.refresh
 if originalRefresh then
  self.refreshWrapper=function(owner,...)
   local result=originalRefresh(owner,...)
   safeMasks()
   return result
  end
  view.refresh=self.refreshWrapper
 end
 function self.update(_owner,dt)
  if self.destroyed then return end
  self.clock=self.clock+(dt or 0)
  local run=view.run
  local battle=run and run.phase=='combat' and run.combat or nil
  if battle~=self.battle or run~=self.run then
   cleanup();self.battle=battle;self.run=run;self.failedBattle=nil
   reconcile(battle)
   if battle then
    if config.projections and config.projections.hero then Geometry.bind(battle.player,config.projections.hero)end
    if config.camera and config.heroFeet then bindWorld(battle.player,config.heroFeet,config.heroBody)end
    safeMasks()
    if view.refresh then view:refresh()end
   end
  end
  local pending=self.pending
  if pending and self.clock>=pending.deadline then
   if pending.command=='attack' or pending.command=='hit' or pending.command=='idle'then
    self.pending=nil;log('native_action_unverified ack timeout')
   else fail('ack timeout',pending.command=='hide')end
  end
  pump()
  if self.geometryDirty then
   self.geometryDirty=nil
   if view.refresh then view:refresh()end
  end
 end
 function self.destroy(_owner,engineDestroyed)
  if self.destroyed then return end
  if self.releaseInput then self.releaseInput(engineDestroyed)end
  cleanup()
  -- Fire best-effort cleanup while the owning signal sender is still alive.
  if self.owned then pump()end
  self.destroyed=true;self.pending=nil;self.queue={}
  if feedback and feedback.start==self.feedbackWrapper then feedback.start=originalStart end
  if view.refresh==self.refreshWrapper then view.refresh=originalRefresh end
  Geometry.configure(false)
 end
 if api.register then api.register(function(message,sequence)return self:ack(message,sequence)end)end
 if api.registerPosition then api.registerPosition(function(...)return self:position(...)end)end
 return self
end
return M
