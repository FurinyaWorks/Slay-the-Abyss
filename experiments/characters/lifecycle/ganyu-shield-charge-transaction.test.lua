package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local Paid=require('abyss_ganyu_paid_cards');local Storm=require('abyss_ganyu_queued_card');local Effects=require('abyss_effects');local A=require('abyss_card_actions')
local function fresh(id,up)
 local d=C.copy(D);for _,v in ipairs(Paid.shieldChargeDefinitions().cards)do d.cards.cards[#d.cards.cards+1]=v end
 local s=C.new(d,{deck={id,'defend','defend','defend','defend','defend'},enemies={'cultist'},seed=42,candidateLifecycle={kind='ganyu',relicEnabled=false}})
 local card;for _,pile in ipairs({s.hand,s.draw})do for i,v in ipairs(pile)do if v.cardId==id then card=table.remove(pile,i);break end end;if card then break end end;s.hand[#s.hand+1]=assert(card);card.upgraded=up
 s.player.statuses.dexterity=2;s.player.statuses.frail=1;return s,card
end
for _,id in ipairs({'ganyu_lab_09','ganyu_lab_36','ganyu_lab_56'})do for _,up in ipairs({false,true})do
 local s,c=fresh(id,up);local base=id=='ganyu_lab_09'and(up and 11 or 8)or id=='ganyu_lab_36'and(up and 7 or 4)or(up and 8 or 5);local shield=math.floor((base+2)*.75)
 local b=C.copy(s);local hand,res=s.hand,s.ganyuResource;local old=Storm.dispatch;local reached=false
 Storm.dispatch=function(...)local v=old(...);reached=true;error('after mixed installation')end
 assert(not pcall(C.play,s,c.uid));Storm.dispatch=old;assert(reached);same(s,b);assert(s.hand==hand and s.ganyuResource==res);assert(C.play(s,c.uid));eq(s.player.block,shield)
 -- Pause at queued block dispatch, after native use-time capture but before the shield.
 s,c=fresh(id,up);local prepare=Paid.prepare
 Paid.prepare=function(...)local effects=prepare(...);table.insert(effects,1,{op='scry',value=1});return effects end
 assert(C.play(s,c.uid));Paid.prepare=prepare;local p=assert(s.pendingScry);eq(s.player.block,0);eq(s.energy,id=='ganyu_lab_36'and 2 or 1)
 s.player.statuses.dexterity=100;s.ganyuResource.charge=1;s.ganyuResource.storm={amount=9,turns=1};b=C.copy(s);hand=s.hand;local pending=s.pendingPlay;res=s.ganyuResource
 Storm.dispatch=function(...)old(...);error('after resumed mixed installation')end
 assert(not pcall(C.chooseScry,s,{},p.token));Storm.dispatch=old;same(s,b);assert(s.hand==hand and s.pendingPlay==pending and s.pendingScry==p and s.ganyuResource==res)
 assert(C.chooseScry(s,{},p.token));eq(s.player.block,shield);eq(s.ganyuResource.storm.amount,9);eq(s.ganyuResource.storm.turns,1);eq(s.ganyuResource.charge,2)
 b=C.copy(s);eq(C.chooseScry(s,{},p.token),false);same(s,b)
 -- Controlled native death after the real first shield blocks later custom setup.
 s,c=fresh(id,up);local apply=C.applyEffects;local once=false
 C.applyEffects=function(state,effects,...)
  local result=apply(state,effects,...)
  if effects[1]and effects[1].op=='block'and not once then once=true;require('abyss_actor').loseHp(state,state.player,999)end
  return result
 end
 assert(C.play(s,c.uid));C.applyEffects=apply;assert(once);eq(s.player.hp,0);eq(s.ganyuResource.charge,0);eq(s.energy,id=='ganyu_lab_36'and 2 or 1)
 for _,mode in ipairs({'normal','unmarked','native','badFace','extra','wrongOrder','exhaust','foreign','retain','cost','ethereal','upgradeCost','unknownFlag'})do
  s,c=fresh(id,up);local d=s.catalog.cards[id]
  if mode=='unmarked'then d.ganyuCandidate=nil elseif mode=='native'then d.runNativeABI=true elseif mode=='badFace'then c.upgraded='false'elseif mode=='extra'then d.effects[1].fixed=true;d.upgrade.effects[1].fixed=true elseif mode=='wrongOrder'then d.effects[1],d.effects[2]=d.effects[2],d.effects[1];d.upgrade.effects[1],d.upgrade.effects[2]=d.upgrade.effects[2],d.upgrade.effects[1] elseif mode=='exhaust'then d.exhaust=not d.exhaust elseif mode=='retain'then d.selfRetain=not d.selfRetain elseif mode=='cost'then d.cost=0 elseif mode=='ethereal'then d.ethereal=true elseif mode=='upgradeCost'then d.upgrade.cost=0 elseif mode=='unknownFlag'then d.onDraw={op='block',value=99} elseif mode=='foreign'then s.catalog.cards.foreign=C.copy(d);c.cardId='foreign';s.catalog.cards.foreign.id='foreign'end
  if mode~='normal'then b=C.copy(s);eq(C.play(s,c.uid),false);same(s,b)end
  for i,v in ipairs(s.hand)do if v==c then table.remove(s.hand,i);break end end
  C.queueCard(s,c,{exhaustCards=false});A.drain(C,s);eq(s.energy,3);eq(s.ganyuResource.charge,mode=='normal'and(id=='ganyu_lab_36'and 1 or 2)or 0);eq(s.player.block,mode=='normal'and shield or 0)
 end
end end
print('GANYU_SHIELD_CHARGE_TRANSACTION_PASS shield/captured pause/live charge/death/source flags/78auto')
