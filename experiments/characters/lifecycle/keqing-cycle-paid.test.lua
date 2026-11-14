package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local M=require('abyss_keqing_cycle_cards');local Paid=require('abyss_keqing_paid_cards');local A=require('abyss_actor')
local function fresh(id,up,inf,intent)
 local d=C.copy(D);for _,c in ipairs(M.definitions().cards)do d.cards.cards[#d.cards.cards+1]=c end
 local s=C.new(d,{deck={id,'defend','defend','defend','defend'},enemies={'cultist'},seed=42,candidateLifecycle={kind='keqing',relicEnabled=true}})
 local c=s.hand[1];for _,v in ipairs(s.hand)do if v.cardId==id then c=v end end;c.upgraded=up
 s.keqingResource.infusion=inf;s.keqingResource.wedgeUntil=s.turn+1
 local e=s.enemies[1];e.hp=100;e.maxHp=100;e.intents={{id='test_public',kind=intent>0 and 'attack'or'defend',effects=intent>0 and{{op='damage',value=intent}}or{{op='block',value=5}}}};e.intentIndex=1
 return s,c,e
end
local count=0
for _,id in ipairs({'KQ041','KQ058','KQ061'})do for _,up in ipairs({false,true})do for inf=0,2 do for _,intent in ipairs({0,6})do
 local s,c,e=fresh(id,up,inf,intent);e.block=7;s.player.statuses.strength=2;s.player.statuses.weak=1;s.player.statuses.dexterity=2;s.player.statuses.frail=1;e.statuses.vulnerable=1
 local hit=id=='KQ041'and(up and 7 or 4)or id=='KQ058'and(up and 8 or 5)or(up and 9 or 6)
 local damage=A.attackAmount(s,s.player,e,hit+(inf>0 and 2 or 0));if id=='KQ058'and intent==0 then damage=damage+A.attackAmount(s,s.player,e,4+(inf>0 and 2 or 0))end
 local block=id=='KQ061'and 2 or 7
 assert(C.play(s,c.uid,1));eq(e.hp,100-math.max(0,damage-block));eq(e.block,math.max(0,block-damage));eq(s.energy,2)
 eq(s.player.block,id=='KQ041'and intent>0 and 5 or 0);eq(s.keqingResource.infusion,math.max(0,inf-1));eq(s.keqingResource.wedgeUntil,s.turn+1);eq(s.discard[#s.discard],c);count=count+1
end end
 for _,mode in ipairs({'cost','up','extra','flag','text','face'})do
  local s,c=fresh(id,up,0,0);local d=s.catalog.cards[id]
  if mode=='cost'then d.cost=0 elseif mode=='up'then d.upgrade.cost=0 elseif mode=='extra'then d.effects[1].extra=true elseif mode=='flag'then d.productionEnabled=true elseif mode=='text'then d.text='drift'else c.upgraded='false'end
  local b=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,b)
 end
 for _,mode in ipairs({'step','payload','repeat','after'})do
  local s,c=fresh(id,up,1,0);local b=C.copy(s);local dispatch=Paid.dispatch;local hit=false
  Paid.dispatch=function(core,state,e,q)hit=true;if mode=='step'then e.action.step=99 elseif mode=='payload'then e.payload.value=999 end;local out=dispatch(core,state,e,q);if mode=='repeat'then dispatch(core,state,e,q)elseif mode=='after'then error('post cycle stage')end;return out end
  eq(pcall(C.play,s,c.uid,1),false);Paid.dispatch=dispatch;assert(hit);same(s,b);assert(C.play(s,c.uid,1))
 end
 local s,c,e=fresh(id,up,2,0);e.hp=1;assert(C.play(s,c.uid,1));eq(e.hp,0);assert(not s.pendingChoice)
end end
-- Entry intent survives a mid-resolution change, not a live re-evaluation.
for _,id in ipairs({'KQ041','KQ058'})do
 local s,c,e=fresh(id,false,0,id=='KQ041'and 6 or 0);local dispatch=Paid.dispatch;local changed=false
 Paid.dispatch=function(core,state,stage,q)if not changed then changed=true;e.intents[1].effects={{op='damage',value=id=='KQ041'and 0 or 6}}end;return dispatch(core,state,stage,q)end
 assert(C.play(s,c.uid,1));Paid.dispatch=dispatch;eq(e.hp,id=='KQ041'and 96 or 91);eq(s.player.block,id=='KQ041'and 5 or 0)
 for _,mode in ipairs({'hidden','unknown','unsupported'})do
  local z,k,t=fresh(id,false,0,6)
  if mode=='hidden'then z.relics={'runic_dome'}elseif mode=='unknown'then t.intents[1].kind='unknown'else t.intents[1].effects={{op='futureUnmappedDamage',value=5}}end
  local b=C.copy(z);eq(pcall(C.play,z,k.uid,1),false);same(z,b)
 end
end
-- Finite armor loss is not damage: native thorns only reacts to subsequent hit.
do local s,c,e=fresh('KQ061',false,0,0);e.block=20;e.statuses.thorns=3;local hp=s.player.hp;assert(C.play(s,c.uid,1));eq(e.block,9);eq(e.hp,100);eq(s.player.hp,hp-3)end
print('KEQING_CYCLE_PAID_PASS '..count..' face/infusion/intent modifiers; 36 drift;24 stage rollback; snapshot/hidden/terminal/armor')
