-- Explicit offline campaign verifier, never a production game module.
-- Reuses the existing visible-state policy and dispatches only real Host/UI
-- commands. No Run/Map/inventory/HP/phase/reward/RNG assignments or shortcuts.
-- Native SetActive below models the engine in the shared generated-tree fixture;
-- it is not official client, physical input, image-rendering or device evidence.
local GameUI=require('abyss_game_ui');local create=GameUI.new;local F
GameUI.new=function(root,data,presentation,event,platform)
 local active={}
 for _,name in ipairs({'nodePanel','choicePanel'})do
  local page=root:GetChild(name);local prior=getmetatable(page);active[page]=true
  setmetatable(page,{__index=function(c,k)if k=='active'then return active[c]end;return prior.__index(c,k)end,
   __newindex=function(c,k,v)assert(k~='active');return prior.__newindex(c,k,v)end})
  page.SetActive=function(c,v)active[c]=v;F.setEngineActive(c,v)end
 end
 platform.nativePageLifecycle=true;platform.campaign=true;platform.campaignProfile='competition-two-act'
 return create(root,data,presentation,event,platform)
end
F=dofile('tests/lua/support/game_ui_fixture.lua')
local Run,Nodes,C=require('abyss_run'),F.Nodes,F.Combat
local Policy=dofile('scripts/warrior75-autoplay-policy.lua')
local EventCards=dofile('scripts/m3-event-card-policy.lua')
local Pending=require('abyss_relic_pending')
local seed=OFFICIAL_CAMPAIGN_SEED or 2
assert(type(seed)=='number' and seed%1==0 and seed>=0)
local Visual=OFFICIAL_CAMPAIGN_CAPTURE and dofile('scripts/official-assets-preview.lua') or nil
local captured={}
local h,root=F.fixture();h.seed=seed -- Explicit Host seed configuration before Start.
local function capture(name)
 if not Visual or captured[name]then return end
 captured[name]=true
 Visual.capture(name,h,root,{kind='natural-continuous-host-run',seed=seed,
  sourceClosure=OFFICIAL_CAMPAIGN_SOURCE,floor=h.run and h.run.floor,act=h.run and h.run.act})
end
capture('menu')
assert(F.click(root,'menuPanel','start'));capture('character')
assert(h:selectCharacter('traveler'));assert(h:selectElement('ironclad'));assert(h:confirmCharacter())
local run,map=h.run,h.map
local coverage,done,bossWins={},{},{};local actions,rooms=0,0
local function checkpoint(label)
 local potions={};for slot=1,Run.potionCapacity(run)do potions[#potions+1]={slot=slot,id=run.potions[slot]or false}end
 local deck={};for _,card in ipairs(run.deck)do deck[#deck+1]={uid=card.uid,cardId=card.cardId,upgraded=card.upgraded==true}end
 -- A bounded public-state trace; the full raw action/feedback stream is also retained.
 local function encode(v)
  if type(v)=='string'then return string.format('%q',v)end
  if type(v)~='table'then return v==nil and 'null' or tostring(v)end
  local out={};if #v>0 then for _,x in ipairs(v)do out[#out+1]=encode(x)end;return '['..table.concat(out,',')..']'end
  for k,x in pairs(v)do out[#out+1]=encode(k)..':'..encode(x)end;return '{'..table.concat(out,',')..'}'
 end
 print('CAMPAIGN_CHECKPOINT '..encode({label=label,actions=actions,rooms=rooms,seed=run.runSeed,
  act=run.act,floor=run.floor,phase=run.phase,hp=run.hp,maxHp=run.maxHp,gold=run.gold,
  victories=run.victories,deck=deck,relics=run.relics,potions=potions,path=map.path,ending=run.ending}))
end
checkpoint('start')
local function drain()
 for i=1,120 do
  if not h.battleUI.busy and not h.motion.deathReveal then return end
  h:update(.5)
 end
 error('feedback did not drain')
end
local function action(label,fn)
 actions=actions+1
 print('CAMPAIGN_ACTION '..actions..' floor='..run.floor..' phase='..run.phase..' hp='..run.hp..' '..label)
 local ok,why=fn();assert(ok~=false,label..': '..tostring(why));drain()
 if run.phase=='reward'and run.nodeFlow.type=='boss'then bossWins[run.act]=true end
 if h.mode=='map'then capture('map-act'..run.act)
 elseif run.phase=='reward'then capture('reward-act'..run.act)
 elseif run.phase=='act_transition'then capture('act-transition')
 elseif h.mode=='battle'then capture('battle-act'..run.act)
 elseif h.mode=='node'then capture((run.nodeFlow.roomKind or run.nodeFlow.type)..'-act'..run.act)end
end
local function press(key)
 action('node:'..key,function()return h.nodeUI:press(key)end)
 h.nodeUI:update(2)
end
local function click(key)
 action('battle:'..key,function()return F.click(root,'battlePanel',key)end)
end
local function selectUID(uid)
 local n=h.nodeUI;local forge=n.picker=='upgrade'
 local rows=forge and n.upgradeRows or n.removeRows
 local index;for i,c in ipairs(rows)do if c.uid==uid then index=i end end
 assert(index,'picker UID missing '..tostring(uid))
 local size=forge and 12 or #F.Theme.layout.nativeNode.picker.columns
 local page=math.floor((index-1)/size)+1
 while n.pickPage~=page do press('pickerView/'..(forge and (n.pickPage<page and 'forgeNext' or 'forgePrevious') or(n.pickPage<page and 'next' or 'previous')))end
 press('pickerView/'..(forge and 'forgeGrid/'or'')..'card'..((index-1)%size+1));press('confirm')
end
while run.phase~='defeat' and run.phase~='victory' and actions<2400 do
 assert(h.run==run and h.map==map,'campaign replaced run/map owner')
 assert(not Pending.owner(run),'mandatory relic choice needs public UI driver extension')
 if run.phase=='act_transition' then
  press('confirm');assert(run.act==2 and h.mode=='map');done={}
  checkpoint('act-two');print('CAMPAIGN_ACT_TWO')
 elseif run.phase=='combat' then
  local b=run.combat;local choice=b.pendingChoice
  if choice then
   local uid,best
   for _,candidate in ipairs(choice.uids)do
    for _,pile in ipairs({b.hand,b.discard,b.exhaust})do for _,card in ipairs(pile)do if card.uid==candidate then
     local def=C.cardDefinition(b,card);local score=math.max(1,Policy.scoreCard(run,card.cardId))+(def.type=='attack'and 10 or 0)
     if def.type=='status'or def.type=='curse'then score=-10000 end
     if choice.op=='exhaustChoose'or choice.op=='handToDraw'then score=-score end
     if not best or score>best then uid,best=candidate,score end
    end end end
   end
   action('choose:'..choice.op..' uid='..uid,function()
    assert(h.deckUI.visible and h.deckUI.choiceToken==choice.token)
    h.deckUI:update(0)
    local grid=root:GetChild('deckPanel'):GetChild('grid');grid:flush()
    for _,item in pairs(grid.items)do
     local binding=h.deckUI.bindings[item]
     if binding and binding.uid==uid then return item:GetChild('hit').click()end
    end
    error('eligible choice UID not bound in native grid')
   end)
  else
   local slot=Policy.choosePotion(run)
   if slot then action('potion:'..slot,function()return h.battleUI:usePotion(slot,1)end)
   else
    local uid,target,plan=Policy.chooseCombat(run)
    if uid then
     action('select:'..plan.cardId..' uid='..uid..' slot='..plan.handIndex,function()h.battleUI:playSlot(plan.handIndex);assert(h.battleUI.selected==uid)end)
     action('play:'..plan.cardId..' uid='..uid..' target='..tostring(target),function()h.battleUI:playSelected(target);assert(h.battleUI.selected==nil)end)
    else action('end_turn',function()h.battleUI:endTurn();assert(h.battleUI.busy)end)end
   end
  end
 elseif run.phase=='reward' then
  local r=run.rewards
  if r.goldClaimed==false then click('goldReward')
  elseif r.potion and not r.potion.resolved and not r.potion.unavailable and Run.potionCount(run)<run.data.rules.player.potionSlots then click('claimPotion')
  elseif not r.cardResolved and not done.skipReward then
   local index=Policy.chooseReward(run)
   if index==0 then done.skipReward=true else click('cardReward');click('card'..index)end
  elseif r.stolenGold and not r.stolenGold.claimed then click('stolenGold')
  else click('continue')end
 elseif h.mode=='node' and h.nodeUI:holding() then press('confirm')
 elseif run.nodeFlow and not run.nodeFlow.complete then
  local flow=run.nodeFlow
  if flow.type=='event' then
   local options=Nodes.eventOptions(run,flow);local selected,index
   for i,o in ipairs(options)do if o.enabled~=false and not o.disabled and(o.choice=='leave'or o.choice=='continue'or o.choice=='proceed')then selected,index=o,i;break end end
   if flow.event.id=='back_to_basics'and flow.event.stage=='intro'then selected,index=options[2],2 end
   if flow.event.id=='neow'then index=flow.event.stage=='neow_blessing'and 2 or 1;selected=options[index]end
   if not selected then for i,o in ipairs(options)do if o.enabled~=false and not o.disabled then selected,index=o,i;break end end end
   assert(selected,'no event option');local uid=EventCards.uid(run,map,selected,Policy.scoreCard)
   press('eventView/option'..index)
   if h.nodeUI.mode=='picker'then assert(uid,'event picker needs UID');selectUID(uid)end
  elseif flow.type=='treasure' then
   if not h.nodeUI.opened then press('treasureView/chest')
   elseif flow.roomKind=='boss_treasure' then
    assert(h.nodeUI.actions['treasureView/rewardItem1'].enabled,'first boss relic unavailable')
    press('treasureView/rewardItem1')
   else
    local item
    for i,v in ipairs(flow.reward.items or {})do if v.kind~='relic'or v.available==true then item=i;break end end
    assert(item,'no claimable treasure');press('treasureView/rewardItem'..item)
   end
  else
   local plan=assert(Policy.suggestNodeAction(run,map,coverage,done),'no node plan')
   if plan.method=='rest'and not h.nodeUI.actions['campView/rest'].enabled then
    local card=h.nodeUI.view.node.upgradeCards[1];assert(card);plan={method='upgrade',uid=card.uid}
   end
   if plan.method=='rest'then press('campView/rest')
   elseif plan.method=='upgrade'then press('campView/forge');selectUID(plan.uid)
   elseif plan.method=='removeCard'then press('shopView/removal');selectUID(plan.uid)
   elseif plan.method=='leaveShop'then press('confirm')
   elseif plan.method=='buyPotion'then press('shopView/potion'..plan.slot);press('confirm')
   elseif plan.method=='buyCardSlot'then press('shopView/card'..plan.slot);press('confirm')
   else error('unsupported plan '..plan.method)end
   coverage[plan.coverage or plan.method]=true;done[plan.coverage or plan.method]=true
  end
 else
  local node=assert(Policy.chooseNode(run,map,coverage),'no legal next room')
  action('enter:'..node.id,function()return h.mapUI:choose(node.id)end)
  rooms=rooms+1;coverage[run.nodeFlow.type]=true;done={}
  assert(run.floor==rooms,'continuous route skipped a floor');checkpoint('room');print('CAMPAIGN_ROOM '..rooms..' floor='..run.floor..' type='..run.nodeFlow.type..' hp='..run.hp)
 end
end
print('CAMPAIGN_RESULT '..run.phase..' floor='..run.floor..' hp='..run.hp..' actions='..actions..' ending='..tostring(run.ending))
assert(run.phase=='victory'and run.ending=='two_act_complete'and run.floor==34)
assert(rooms==34 and bossWins[1]and bossWins[2],'both natural boss victories are required')
checkpoint('victory');capture('victory')
assert(h.mode=='victory'and root:GetChild('menuPanel').visible)
assert(F.click(root,'menuPanel','start')and h.characterOpen)
assert(h:selectCharacter('traveler')and h:selectElement('ironclad')and h:confirmCharacter())
assert(h.run~=run and h.map~=map and h.run.act==1 and h.run.victories==0 and h.run.hp==h.run.maxHp)
assert(h.mode=='node'and h.run.nodeFlow.event.id=='neow')
assert(#h.run.deck==10 and h.run.gold==h.run.data.rules.player.startingGold and h.run.runSeed~=run.runSeed)
capture('restart-neow')
if Visual then Visual.print()end
print('OFFICIAL_CAMPAIGN_PASS')
