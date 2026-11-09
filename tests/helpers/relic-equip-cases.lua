local H,S=require('abyss_relic_hooks'),require('abyss_sts_random')
local U,R,B,Shop=require('abyss_uncommon_relics'),require('abyss_rare_relics'),require('abyss_boss_relics'),require('abyss_shop_relics')
local function eq(a,b,label)assert(a==b,'[RELIC_EQUIP] '..label..': '..tostring(a)..' ~= '..tostring(b))end
local function state()
 local attack={uid=1,cardId='strike',upgraded=false};local skill={uid=2,cardId='defend',upgraded=false}
 return {hp=30,maxHp=80,phase='map',seed=42,gold=10,character='ironclad',relics={},
  relicCounters={sentinel=9},unknown={chances={tinyChestCount=8}},miscRng=S.fromSeed('42'),
  deck={attack,skill,{uid=3,cardId='power',upgraded=false}},anchors={attack,skill},
  data={cards={cards={{id='strike',type='attack',upgrade={damage=9}},{id='defend',type='skill',upgrade={block=8}},{id='power',type='power',upgrade={cost=0}}}},rules={player={potionSlots=3}}}}
end
local function apply(label,run,id,api,extra)
 local loads={};local old=require
 require=function(name)loads[#loads+1]=name;return old(name)end
 local result=table.pack(pcall(H.onEquip,run,id,api));require=old
 if not result[1]and type(result[2])=='string'then EQUIP_ERROR(result[2]);result[2]=EQUIP_ERRORS[result[2]]or result[2]end
 EQUIP_GRAPH_WRITE({run=run,id=id,api=api,result=result,loads=loads,extra=extra},label,false)
 return table.unpack(result,1,result.n)
end
if EQUIP_GROUP=='ordinary'then
 local counts={nloths_mask=1,neows_lament=3,omamori=2,maw_bank=0,happy_flower=0,pen_nib=0,nunchaku=0,ancient_tea_set=-1}
 for _,id in ipairs({'nloths_mask','neows_lament','omamori','maw_bank','happy_flower','pen_nib','nunchaku','ancient_tea_set'})do
  for _,existing in ipairs({false,true})do local r=state();if not existing then r.relicCounters=nil end
   local called,ok=apply('counter-'..id..tostring(existing),r,id);eq(called,true,'counter called');eq(ok,true,'counter returns');eq(r.relicCounters[id],counts[id],'counter value')end
 end
 for _,value in ipairs({false,0,1,8})do local r=state();r.relicCounters.circlet=value or nil;apply('circlet',r,'circlet');eq(r.relicCounters.circlet,value or 1,'preserve circlet')end
 local falseCirclet=state();falseCirclet.relicCounters.circlet=false;apply('circlet-false',falseCirclet,'circlet');eq(falseCirclet.relicCounters.circlet,false,'false circlet retained')
 for _,valid in ipairs({true,false})do local r=state();if not valid then r.unknown={}end;local called=apply('tiny-chest',r,'tiny_chest');eq(called,valid,'tiny validation')end
 for _,slots in ipairs({false,0,3,2147483645,2147483646,-1,1.5,'3',math.huge,0/0})do
  local r=state();r.potionSlots=slots;local called,ok=apply('capacity',r,'potion_belt');local valid=slots==false or slots==0 or slots==3 or slots==2147483645 or slots==2147483646
  eq(called,valid,'capacity admission');if valid then eq(ok,true,'capacity return');eq(r.potionSlots,(slots or 3)+2,'capacity delta')end
 end
 for _,id in ipairs({'Strawberry','pear','mango',"Lee's Waffle",'old_coin','lizard_tail','unknown','sundial','matryoshka','ink_bottle','incense_burner','prismatic_shard','dollys_mirror'})do
  local r=state();r.relics={id};local called,ok=apply('real-family-'..id,r,id);eq(called,true,'real family called');eq(ok,true,'real family accepted')
 end
 for _,id in ipairs({'strawberry','pear','mango','lees_waffle'})do local r=state();r.hp=-1;eq(apply('invalid-health-'..id,r,id),false,'invalid health')end
 for _,id in ipairs({'bottled_flame','bottled_lightning','bottled_tornado'})do
  for _,pending in ipairs({false,true})do local r=state();if pending then r.pendingBottledRelic={old=true}end
   local called,ok,why=apply('bottle-'..id..tostring(pending),r,id);eq(called,true,'bottle called');eq(ok,not pending,'bottle pending');if pending then eq(why,'bottled_relic_pending','bottle reason')end
  end
  local r=state();r.deck={};r.pendingBottledRelic={old=true};local _,ok=apply('bottle-empty-'..id,r,id);eq(ok,true,'empty bottle proceeds')
 end
 for _,id in ipairs({'empty_cage','astrolabe','pandoras_box','calling_bell','tiny_house'})do local r=state();r.pendingBossRelic={old=true};local _,ok,why=apply('boss-pending-'..id,r,id);eq(ok,false,'boss pending');eq(why,'boss_relic_pending','boss reason')end
 for _,id in ipairs({false,13,{}})do apply('unrecognized-type',state(),id)end
 apply('nil-id',state(),nil)
end
if EQUIP_GROUP=='upgrades'then
 for _,id in ipairs({'whetstone','war_paint'})do for n=0,4 do
  local r=state();r.deck={};for i=1,n do r.deck[i]={uid=i,cardId=id=='whetstone'and'strike'or'defend',upgraded=false}end;r.anchors=r.deck
  local before=r.miscRng.counter;local called,ok=apply('upgrade-'..id..n,r,id);eq(called,true,'upgrade called');eq(ok,true,'upgrade accepted');eq(r.miscRng.counter,before+1,'shuffle consumption')
  local count=0;for _,card in ipairs(r.deck)do if card.upgraded then count=count+1 end end;eq(count,math.min(n,2),'upgrade count')
 end end
 for _,mode in ipairs({'allow','reject','throw','deny-all','missing-can','missing-upgrade'})do
  local r=state();local calls={};local api={canUpgrade=function(card)calls[#calls+1]={'can',card};return mode~='deny-all'end,
   upgrade=function(card,id)calls[#calls+1]={'upgrade',card,id};card.partial=true;if mode=='throw'then error('upgrade injected',0)elseif mode=='reject'then return false,'upgrade rejected'end;card.upgraded=true end}
  if mode=='missing-can'then api.canUpgrade=nil elseif mode=='missing-upgrade'then api.upgrade=nil end
  apply('upgrade-api-'..mode,r,'whetstone',api,calls)
 end
 local r=state();r.deck[2].cardId='missing';eq(apply('unknown-card',r,'whetstone'),false,'unknown card fails')
 for _,mode in ipairs({'success','false','nil','throw','missing'})do local r=state();local calls={}
  local api={obtainCard=function(id)calls[#calls+1]=id;if mode=='throw'then error('obtain injected',0)elseif mode=='false'then return false,'rejected'elseif mode=='nil'then return nil,'nil-rejected'end;return true end}
  if mode=='missing'then api={}end
  apply('necronomicon-'..mode,r,'necronomicon',api,calls)
 end
end
if EQUIP_GROUP=='dynamic'then
 local original={U.onEquip,R.onEquip,B.onEquip,Shop.onEquip,U.bottleCandidates,H.localId,H.gainGold,H.previewCardReward,H.hpChanged}
 for _,stop in ipairs({'none','uncommon','rare','boss-false','boss-nil','boss-throw','shop-false','shop-nil','shop-throw'})do
  local r=state();local calls={}
  U.onEquip=function(run,id)calls[#calls+1]={'uncommon',run,id};run.first=true;if stop=='uncommon'then error('uncommon injected',0)end;return original[1](run,id)end
  R.onEquip=function(run,id)calls[#calls+1]={'rare',run,id};run.second=true;if stop=='rare'then error('rare injected',0)end;return original[2](run,id)end
  B.onEquip=function(run,id)calls[#calls+1]={'boss',run,id};run.third=true;if stop=='boss-throw'then error('boss injected',0)elseif stop=='boss-false'then return false,'boss false'elseif stop=='boss-nil'then return nil,'boss nil'end;return original[3](run,id)end
  Shop.onEquip=function(run,id)calls[#calls+1]={'shop',run,id};run.fourth=true;if stop=='shop-throw'then error('shop injected',0)elseif stop=='shop-false'then return false,'shop false'elseif stop=='shop-nil'then return nil,'shop nil'end;return original[4](run,id)end
  local result=table.pack(apply('admission-'..stop,r,'omamori',nil,calls))
  eq(r.relicCounters.omamori~=nil,stop=='none'or stop=='shop-nil','admission stops')
  if stop=='boss-nil'then eq(result[2],false,'nil boss rejects')end
 end
 U.onEquip,R.onEquip,B.onEquip,Shop.onEquip=table.unpack(original,1,4)
 local candidates={19,27};U.bottleCandidates=function()return candidates end
 local r=state();apply('candidate-alias',r,'bottled_flame',nil,candidates);eq(r.pendingBottledRelic.uids,candidates,'candidate identity');U.bottleCandidates=original[5]
 local calls={};H.localId=function(id)calls[#calls+1]={'normalize',id};H.gainGold=function(run,amount)calls[#calls+1]={'gold',run,amount};run.gold=run.gold+amount end;return 'old_coin'end
 r=state();apply('dynamic-gold',r,'translated',nil,calls);eq(r.gold,310,'dynamic gold');H.localId=original[6];H.gainGold=original[7]
 for _,id in ipairs({'toxic_egg','molten_egg','frozen_egg'})do for _,mode in ipairs({'all','resolved','map','closed','other','none','throw'})do
  r=state();r.phase=mode=='map'and'map'or'reward';r.rewards={marker='combat',cardResolved=mode=='resolved'}
  local a,b,c={marker='a'},{marker='b',claimed=true},{marker='c'};r.nodeFlow={event={id=mode=='other'and'other'or'sensory_stone',rewardScreenOpen=mode~='closed',rewards={a,b,c}}}
  if mode=='none'then r.nodeFlow=nil;r.rewards=nil end
  calls={};local function nextPreview(run,reward)calls[#calls+1]={'next',run,reward};reward.visited='next';if mode=='throw'then error('preview injected',0)end end
  H.previewCardReward=function(run,reward)calls[#calls+1]={'first',run,reward};reward.visited='first';H.previewCardReward=nextPreview end
  apply('egg-'..id..mode,r,id,nil,calls);eq(b.visited,nil,'claimed skipped');if mode=='all'then eq(#calls,3,'egg visits');eq(a.visited,'next','dynamic preview read')end
 end end
 H.previewCardReward=original[8]
 local health=require('abyss_max_hp_relics');local equip=health.equip;r=state();calls={}
 local newHp=function()end;R.onEquip=function(run,id)H.hpChanged=newHp;return original[2](run,id)end
 health.equip=function(run,id,callback)calls[#calls+1]={run,id,callback};eq(callback,newHp,'dynamic hp callback');return equip(run,id,callback)end
 apply('dynamic-hp',r,'pear',nil,calls);health.equip=equip;R.onEquip=original[2];H.hpChanged=original[9]
 -- Instrument real run-field access without replacing any imported behavior.
 for _,id in ipairs({'unknown','omamori','circlet','tiny_chest','potion_belt','old_coin','pear','bottled_flame','whetstone','toxic_egg'})do
  local backing=state();backing.phase='reward';backing.rewards={cardResolved=true};backing.nodeFlow={event={id='other'}}
  local access={};local proxy=setmetatable({}, {__index=function(_,key)access[#access+1]={'read',key};return backing[key]end,
   __newindex=function(_,key,value)access[#access+1]={'write',key,value};backing[key]=value end})
  local called=apply('eager-run-access-'..id,proxy,id,nil,{backing=backing,access=access});eq(called,true,'proxy behavior')
 end
 local event=require('abyss_act2_event_relics');local old=event.onEquip;event.onEquip=function()return nil,'second',nil,4 end
 local packed=table.pack(apply('event-return-arity',state(),'necronomicon'));eq(packed.n,5,'tail return arity');event.onEquip=old
end
if EQUIP_GROUP=='integration'then
 local Run=require('abyss_run');local data=require('abyss_data')
 for _,id in ipairs({'whetstone','war_paint','strawberry','potion_belt','omamori','bottled_flame','empty_cage','tiny_house','toxic_egg'})do
  local r=Run.new(data,42);local result=table.pack(pcall(Run.obtainRelic,r,id))
  EQUIP_GRAPH_WRITE({run=r,result=result},'real-run-obtain-'..id,false);eq(result[1],true,'real run call');eq(result[2],true,'real run obtain')
 end
end
