-- Presentation observes committed combat events; Run/Combat remain the sole rule owners.
local M={}
local lastSequence=0
local artwork={'portrait','officialFigure','battlePose','monsterArt','artSamples','border','plate','shadow','glow'}
local function child(parent,name)
 if not parent then return nil end
 local ok,value=pcall(parent.GetChild,parent,name)
 return ok and value or nil
end
function M.attach(view,root,api)
 api=api or {}
 local config=api.config or require('abyss_native_battle_config')
 local self={clock=0,queue={},slots={},masked={},maxActors=config.maxActors or 3}
 local stage=child(root,'stage')
 local panel=child(stage,'battlePanel')
 local fail
 local function log(message)
  if api.log then api.log(message)else print('ABYSS_NATIVE_BATTLE '..message)end
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
 local function maskBox(box)
  for _,name in ipairs(artwork)do conceal(child(box,name))end
 end
 local function masks()
  if not self.ready or self.destroyed then return end
  conceal(child(root,'canvasBackdrop'));conceal(child(root,'backdrop'))
  conceal(child(stage,'officialBattleBackdrop'))
  for _,name in ipairs({'backdrop','battleBackground','officialBackground','lowpolyScene','vista','sceneArt'})do conceal(child(panel,name))end
  maskBox(child(panel,'hero'))
  local surfaces
  if api.surfaces then surfaces=api.surfaces(panel)
  else
   local ok,value=pcall(function()return require('abyss_monster_surfaces').get(panel)end)
   if ok then surfaces=value end
  end
  for index,slot in pairs(self.slots)do
   if slot.ready then
    maskBox(child(panel,'enemy'..index))
    if surfaces and surfaces.records then
     local record=surfaces.records[slot.id]
     if record then maskBox(record.box)end
    end
   end
  end
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
  self.queue={};self.pending=nil;self.ready=false;self.slots={};restore()
  if self.owned then enqueue('hide',0)end
 end
 fail=function(reason,hideFailed)
  log('fallback '..tostring(reason));self.failedBattle=self.battle
  cleanup()
  if hideFailed then self.suspended=true;self.queue={}end
 end
 local function slotFor(id)
  for index,slot in pairs(self.slots)do if slot.id==id then return index,slot end end
 end
 local function present(enemy)
  return not enemy.escaped and not enemy.isDying and (enemy.hp>0 or enemy.halfDead or enemy.awakenedRebirthPending)
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
    enqueue('death',index,slot.model);self.slots[index]=nil;replaced=true
   end
  end
  for _,enemy in ipairs(battle.enemies)do
   if wanted[enemy.id] and not slotFor(enemy.id)then
    local free=1;while self.slots[free]do free=free+1 end
    local slot={id=enemy.id,model=modelFor(enemy)};self.slots[free]=slot
    if not enqueue('show',free,slot.model)then fail('presentation queue full');return end
   end
  end
  if replaced then
   restore();self.ready=false
   for _,slot in pairs(self.slots)do if slot.ready then self.ready=true end end
   safeMasks()
  end
 end
 local function pump()
  if self.pending or #self.queue==0 or self.destroyed then return end
  local request
  repeat
   request=table.remove(self.queue,1)
  until not request or request.command=='hide' or request.command=='death' or self.slots[request.actor]==request.slot
  if not request then return end
  lastSequence=lastSequence+1;request.seq=lastSequence;request.deadline=self.clock+14
  self.pending=request
  if request.command=='show'then self.owned=true end
  local ok,value=pcall(api.send or function()return false end,request.command,request.model,request.actor,request.seq)
  if not ok or value==false then fail('send failed: '..tostring(value),request.command=='hide')end
 end
 function self.ack(_owner,message,sequence)
  local request=self.pending
  if self.destroyed or not request or sequence~=request.seq then return false end
  message=tostring(message)
  if message=='ready' and request.command=='show'then
   self.pending=nil
   local slot=self.slots[request.actor]
   if slot and slot==request.slot then slot.ready=true;self.ready=true;safeMasks()end
  elseif message=='hidden' and request.command=='hide'then
   self.pending=nil;self.owned=false
  elseif message=='completed:'..request.command then self.pending=nil
  elseif message:sub(1,14)=='missing_actor:' and request.command=='death'then
   -- Removing an already absent presentation entity is an idempotent cleanup.
   self.pending=nil
  elseif message:sub(1,12)=='unsupported:'then
   self.pending=nil
   -- Some official models have no hit clip. Keep their idle representation.
   if request.command=='show' or request.command=='hide'then fail(message,request.command=='hide')end
  elseif message:sub(1,6)=='error:' or message:sub(1,14)=='missing_actor:' or message:sub(1,5)=='busy:'then
   self.pending=nil;fail(message,request.command=='hide')
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
   elseif (event.kind=='damage' or event.kind=='hp_loss' or event.kind=='status_damage')and (detail.amount or 0)>0 then
    actor=slotFor(detail.target);command='hit'
   end
   local slot=actor and self.slots[actor]
   if slot and not enqueue(command,actor,slot.model)then fail('presentation queue full');return end
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
  end
  local pending=self.pending
  if pending and self.clock>=pending.deadline then fail('ack timeout',pending.command=='hide')end
  pump()
 end
 function self.destroy(_owner)
  if self.destroyed then return end
  cleanup()
  -- Fire best-effort cleanup while the owning signal sender is still alive.
  if self.owned then pump()end
  self.destroyed=true;self.pending=nil;self.queue={}
  if feedback and feedback.start==self.feedbackWrapper then feedback.start=originalStart end
  if view.refresh==self.refreshWrapper then view.refresh=originalRefresh end
 end
 if api.register then api.register(function(message,sequence)return self:ack(message,sequence)end)end
 return self
end
return M
