package.path='src/lua/?.lua;'..package.path
local Native=require('abyss_native_battle')
local Geometry=require('abyss_native_battle_geometry')
local projections={hero={x=-300,y=20,width=120,height=200},slots={}}
for i=1,5 do projections.slots[i]={x=40+(i-1)*110,y=30,width=100,height=180}end
local function configuration(values)
 values=values or {};values.projections=projections;return values
end
local writes=0
local function control(children)
 local c={children=children or {},activeInHierarchy=true}
 function c:GetChild(name)return self.children[name]end
 function c:SetVisible(value)self.activeInHierarchy=value;writes=writes+1 end
 return c
end
local portrait,hp,intent,hit=control(),control(),control(),control()
local enemy=control({portrait=portrait,hp=hp,intent=intent,hit=hit})
local panel=control({enemy1=enemy,backdrop=control()})
local root=control({stage=control({battlePanel=panel}),canvasBackdrop=control()})
local called=0
local feedback={start=function()called=called+1 end}
local view={battleUI={feedback=feedback},refresh=function()end}
local requests,callback={},nil
local adapter=Native.attach(view,root,{config=configuration({maxActors=3,models={{model=1},{model=2}},enemyModels={slime=2}}),
 send=function(command,model,actor,seq)requests[#requests+1]={command=command,model=model,actor=actor,seq=seq}end,
 register=function(fn)callback=fn end,log=function()end})
local function battle(id)return {player={id='player',hp=10},enemies={{id=id,definitionId='slime',hp=10}},events={}}end
local a=battle('slime1');view.run={phase='combat',combat=a}
adapter:update(.01)
assert(#requests==1 and requests[1].command=='show' and requests[1].model==2,'real battle model must be mapped per actor')
assert(Geometry.enabled() and Geometry.get(a.player).x==-300,'native mode binds the real player projection immediately')
assert(Geometry.get(a.enemies[1]).x==40,'actor projection is bound by identity before native ready')
callback('ready',requests[1].seq)
assert(adapter.slots[1].ready and hp.activeInHierarchy and intent.activeInHierarchy and hit.activeInHierarchy,'ready does not disable HUD or target surfaces')
assert(portrait.activeInHierarchy,'plain mock controls do not run the source renderer; no actor-mask claim')
local steady=writes
for _=1,100 do adapter:update(.01)end
assert(writes==steady and #requests==1,'idle update must not rewrite UI or rebuild entities')
a.events={{kind='damage',detail={target='slime1',amount=2}}}
feedback:start({enemies={{hp=10}}},a,1)
assert(called==1,'original feedback executes once')
adapter:update(.01)
assert(requests[2].command=='hit' and requests[2].actor==1)
local oldseq=requests[2].seq
view.run.phase='map';adapter:update(.01)
assert(Geometry.enabled() and not Geometry.get(a.enemies[1]),'exit clears projections while retaining native source policy')
assert(requests[3].command=='hide' and requests[3].actor==0,'exit removes every native slot')
assert(not callback('completed:hit',oldseq),'late action ack cannot affect next lifecycle')
callback('hidden',requests[3].seq)
local b=battle('slime2');view.run={phase='combat',combat=b};adapter:update(.01)
assert(requests[4].command=='show','a different real battle starts without resetting rules')
callback('ready',requests[4].seq)
b.enemies[2]={id='summon',definitionId='slime',hp=5}
feedback:start({enemies={{hp=10}}},b,1)
adapter:update(.01)
assert(requests[5].command=='show' and requests[5].actor==2,'summons receive a free native slot')
callback('ready',requests[5].seq)
b.enemies[2].hp=0
feedback:start({enemies={{hp=10},{hp=5}}},b,#b.events+1)
adapter:update(.01)
assert(requests[6].command=='death','dead actor retires its native slot')
callback('completed:death',requests[6].seq)
b.enemies[2].hp=5
feedback:start({enemies={{hp=10},{hp=0}}},b,#b.events+1)
adapter:update(.01)
assert(requests[7].command=='show' and requests[7].actor==2,'same identity revival must rebuild its native representation')
callback('ready',requests[7].seq)
adapter:update(15)
assert(not adapter.pending,'ready clears pending action')
adapter:destroy()
assert(feedback.start~=adapter.feedbackWrapper and not Geometry.enabled(),'destroy restores wrapped feedback and releases native mode')
assert(not callback('ready',requests[5].seq),'destroyed runtime rejects callbacks')
local failed=Native.attach(view,root,{config=configuration({maxActors=3,models={{model=1}}}),send=function()return false end,log=function()end})
failed:update(.1)
assert(Geometry.enabled() and Geometry.get(b.enemies[1]) and failed.failedBattle==b,'send failure retains native presentation geometry and rule ownership')
failed:destroy()
do
 local racingBattle=battle('first')
 local racingView={run={phase='combat',combat=racingBattle},battleUI={feedback={start=function()end}},refresh=function()end}
 local racingCallback,racingRequests=nil,{}
 local racing=Native.attach(racingView,root,{config=configuration({maxActors=3}),
  send=function(command,model,actor,seq)racingRequests[#racingRequests+1]={command=command,seq=seq}end,
  register=function(fn)racingCallback=fn end,log=function()end})
 racing:update(.01)
 local firstRequest=racingRequests[1]
 racingBattle.events={{kind='intent',detail={enemy='first'}}}
 racingView.battleUI.feedback:start({enemies={{hp=10}}},racingBattle,1)
 assert(racing.queue[1].command=='attack','old actor action is queued behind its pending show')
 racingBattle.enemies[1]={id='replacement',definitionId='slime',hp=10}
 racingView.battleUI.feedback:start({enemies={{hp=10}}},racingBattle,#racingBattle.events+1)
 racingCallback('ready',firstRequest.seq)
 assert(not racing.slots[1].ready and Geometry.get(racingBattle.enemies[1]),'retired show ack cannot ready replacement or discard its projection')
 racing:update(.01)
 assert(racingRequests[2].command=='death','stale queued attack is skipped before FIFO death cleanup');racingCallback('completed:death',racingRequests[2].seq)
 racing:update(.01)
 assert(racingRequests[3].command=='show');racingCallback('ready',racingRequests[3].seq)
 assert(racing.slots[1].ready,'replacement waits for its own native ready')
 racing:destroy()
end
do
 local absentBattle=battle('never_shown')
 local absentView={run={phase='combat',combat=absentBattle},battleUI={feedback={start=function()end}}}
 local absentCallback
 local absent=Native.attach(absentView,root,{config=configuration({maxActors=3}),send=function()end,
  register=function(fn)absentCallback=fn end,log=function()end})
 absent:update(.01)
 absentCallback('ready',absent.pending.seq)
 absentBattle.enemies[1].hp=0
 absentView.battleUI.feedback:start({},absentBattle,1)
 absent:update(.01)
 assert(absent.pending.command=='death')
 absentCallback('missing_actor:show_first',absent.pending.seq)
 assert(not absent.pending and not absent.failedBattle,'death of an absent actor completes idempotently')
 absentBattle.enemies[1].hp=10
 absentView.battleUI.feedback:start({},absentBattle,1);absent:update(.01)
 assert(absent.pending.command=='show')
 absentCallback('missing_actor:show_first',absent.pending.seq)
 assert(absent.failedBattle==absentBattle,'missing actor during show remains a real presentation failure')
 absent:destroy()
end
do
 local actionBattle=battle('action_enemy')
 local actionFeedback={start=function()end}
 local actionView={run={phase='combat',combat=actionBattle},battleUI={feedback=actionFeedback}}
 local actionCallback,actionRequests=nil,{}
 local actions=Native.attach(actionView,root,{config=configuration({maxActors=3}),
  send=function(command,model,actor,seq)actionRequests[#actionRequests+1]={command=command,seq=seq}end,
  register=function(fn)actionCallback=fn end,log=function()end})
 actions:update(.01);actionCallback('ready',actions.pending.seq)
 local projection=Geometry.get(actionBattle.enemies[1])
 for _,command in ipairs({'attack','hit'})do
  for _,failure in ipairs({'error','timeout'})do
   local event=command=='attack' and {kind='intent',detail={enemy='action_enemy'}}
    or {kind='damage',detail={target='action_enemy',amount=1}}
   actionBattle.events[#actionBattle.events+1]=event
   actionFeedback:start({},actionBattle,#actionBattle.events);actions:update(.01)
   assert(actions.pending and actions.pending.command==command)
   local sequence=actions.pending.seq
   local count=#actionRequests
   if failure=='error'then actionCallback('error:animation_timeout',sequence)else actions:update(14.01)end
   assert(not actions.pending and not actions.failedBattle,'native action failure cannot disable subsequent presentation commands')
   assert(#actionRequests==count and Geometry.enabled() and Geometry.get(actionBattle.enemies[1])==projection,'action error/timeout cannot hide models or restore legacy art')
   assert(not actionCallback('completed:'..command,sequence),'late completion after action failure is stale')
  end
 end
 for _,request in ipairs(actionRequests)do assert(request.command~='hide','only lifecycle exit may hide the arena')end
 actions:destroy()
end
print('native battle lifecycle: mapped models/projections, native-only policy, idle no writes, real feedback, exit, stale ack, summons, teardown, send failure (offline mock only)')

-- Existing production controls and real Run commands remain playable with the adapter.
package.path='build/lua/?.lua;'..package.path
local F=dofile('tests/lua/support/game_ui_fixture.lua')
local host,stage=F.fixture()
local nativeCallback,nativeRequests=nil,{}
local integrated=Native.attach(host,stage.parent,{config=configuration({maxActors=3,models={{model=1}}}),
 send=function(command,model,actor,seq)nativeRequests[#nativeRequests+1]={command=command,seq=seq,actor=actor}end,
 register=function(fn)nativeCallback=fn end,log=function()end})
local faultedActions,timedOutActions=0,0
local function tick()
 integrated:update(.01)
 local p=integrated.pending
 if not p then return end
 if (p.command=='attack' or p.command=='hit') and faultedActions==0 then
  faultedActions=1;nativeCallback('error:animation_timeout',p.seq)
  assert(Geometry.enabled() and not integrated.failedBattle,'action error cannot restore 2D or stop the real run')
 elseif (p.command=='attack' or p.command=='hit') and timedOutActions==0 then
  timedOutActions=1;integrated:update(14.01)
  assert(Geometry.enabled() and not integrated.failedBattle,'action timeout cannot restore 2D or stop the real run')
 else nativeCallback(p.command=='show' and 'ready' or p.command=='hide' and 'hidden' or 'completed:'..p.command,p.seq)end
end
local update=host.update
host.update=function(owner,dt)local result=update(owner,dt);tick();return result end
assert(host.mode=='menu' and not host.run)
tick();assert(#nativeRequests==0,'menu must not create a test run or native actors')
assert(F.start(host));assert(host.mode=='map')
F.click(stage,'mapPanel','node1')
assert(host.mode=='battle' and host.run.phase=='combat')
local originalRun,originalBattle=host.run,host.run.combat
for _=1,8 do tick()end
local actor=F.actorControl(stage:GetChild('battlePanel'),'enemy1')
assert(actor:GetChild('portrait').visible==false,'real dynamic actor surface is found through its actor id')
assert(actor:GetChild('hp').visible~=false,'real HP surface remains usable')
host:refresh()
assert(actor:GetChild('portrait').visible==false,'host source render suppresses legacy art')
assert(host.run==originalRun and host.run.combat==originalBattle,'native presentation keeps original run and combat identities')
F.win(host,stage)
assert(host.run.phase=='reward','normal card/turn controls finish a real battle')
tick();tick()
local picked=host.run.rewards.cards[1]
F.click(stage,'battlePanel','cardReward');F.click(stage,'battlePanel','card1')
if host.run.phase=='reward' and host.run.rewards.manualContinue then
 if host.run.rewards.goldClaimed==false then F.click(stage,'battlePanel','goldReward')end
 F.click(stage,'battlePanel','continue')
end
assert(host.run==originalRun and host.mode=='map' and host.run.phase=='map','real reward returns to same-run map')
assert(host.run.deck[#host.run.deck].cardId==picked,'reward uses the real card transaction')
assert(faultedActions==1 and timedOutActions==1,'real rules remain playable after native action error and 14-second timeout')
local hasAction,hasHide=false,false
for _,request in ipairs(nativeRequests)do
 if request.command=='hit' or request.command=='attack'then hasAction=true end
 if request.command=='hide'then hasHide=true end
end
assert(hasAction and hasHide,'committed events request native actions and reward transition cleans them')
integrated:destroy();host:disable()
print('native battle real GameUI + Run: menu/selection/map/battle/card+turn controls/reward/same-run map passed (mock native bridge, no official client evidence)')
do
 local Combat=F.Combat
 local boss=Combat.new(F.Data,{enemies={'slime_boss'},deck={},seed=42,hp=500,maxHp=500})
 local bossView={run={phase='combat',combat=boss},battleUI={feedback={start=function()end}},refresh=function()end}
 local bossCallback
 local bossNative=Native.attach(bossView,root,{config=configuration({maxActors=5}),send=function()end,
  register=function(fn)bossCallback=fn end,log=function()end})
 local function settle()
  for _=1,40 do
   bossNative:update(.01)
   local p=bossNative.pending
   if p then bossCallback(p.command=='show' and 'ready' or 'completed:'..p.command,p.seq)end
  end
 end
 settle()
 local parent=boss.enemies[1]
 Combat.damage(boss,boss.player,parent,80,true);assert(Combat.endTurn(boss))
 bossView.battleUI.feedback:start({},boss,#boss.events+1);settle()
 assert(#boss.enemies==3 and not bossNative.failedBattle)
 for _,i in ipairs({1,3})do Combat.damage(boss,boss.player,boss.enemies[i],31,true)end
 assert(Combat.endTurn(boss))
 bossView.battleUI.feedback:start({},boss,#boss.events+1);settle()
 local live,slots=0,0
 for _,enemyActor in ipairs(boss.enemies)do if enemyActor.hp>0 then live=live+1 end end
 for _,slot in pairs(bossNative.slots)do slots=slots+1;assert(slot.ready)end
 assert(#boss.enemies==7 and live==4 and slots==4 and not bossNative.failedBattle,'dead split history cannot consume live native slots')
 local target=boss.enemies[#boss.enemies]
 local targetSlot
 for index,slot in pairs(bossNative.slots)do if slot.id==target.id then targetSlot=index end end
 boss.events[#boss.events+1]={kind='damage',detail={target=target.id,amount=1}}
 bossView.battleUI.feedback:start({},boss,#boss.events)
 bossNative:update(.01)
 assert(bossNative.pending.command=='hit' and bossNative.pending.actor==targetSlot,'event actor id maps to native slot independently of historical array index')
 bossNative:destroy()
 print('native battle real Slime Boss double split: 7 historical actors / 4 present native slots; event routing by actor id passed (offline mock bridge)')
end
