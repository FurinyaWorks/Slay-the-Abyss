-- Source aa965300 role values, now exercising the real host payment/zone command.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local Run=require('abyss_run');local Factory=require('abyss_zhongli_starter_run')
local function definition(id)
 local attack=id=='zl39'
 return {id=id,name='HOLD '..id,type=attack and 'attack'or 'skill',cost=0,target='ENEMY',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,exhaust=true,
 effects={{op='zhongliCard',kind='spendJade',value=3},attack and {op='damage',value=6}or{op='applyStatus',status='weak',value=1}},
 upgrade={effects={{op='zhongliCard',kind='spendJade',value=3},attack and {op='damage',value=8}or{op='applyStatus',status='weak',value=2}}}}
end
local function data()local d=C.copy(D);for _,id in ipairs({'zl39','zl73'})do d.cards.cards[#d.cards.cards+1]=definition(id)end;return d end
local function fresh(id,up,jade)
 local s=C.new(data(),{seed=4,deck={{cardId=id,upgraded=up}},enemies={'cultist'},candidateLifecycle={kind='zhongli',relicEnabled=true}})
 s.energy=0;s.zhongliCandidate.jade=jade;return s,s.hand[1]
end
local function absent(s,c)
 for _,p in ipairs({s.hand,s.draw,s.discard})do for _,v in ipairs(p)do assert(v~=c,'consumed UID returned')end end
 eq(s.exhaust[1],c);eq(s.cardInUse,nil);eq(s.pendingPlay,nil)
end
for _,id in ipairs({'zl39','zl73'})do for _,up in ipairs({false,true})do for jade=0,20 do
 local s,c=fresh(id,up,jade);local before=C.copy(s);local hp=s.enemies[1].hp
 if jade<3 then eq(C.play(s,c.uid,1),false);same(s,before)
 else
  assert(C.play(s,c.uid,1));eq(s.energy,0);eq(s.zhongliCandidate.jade,jade-3);absent(s,c)
  if id=='zl39'then eq(s.enemies[1].hp,hp-(up and 8 or 6))else eq(s.enemies[1].statuses.weak,up and 2 or 1)end
  before=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,before)
 end
end end end
-- Actual native tail has happened before the injected failure; host restores aliases and retries.
for _,id in ipairs({'zl39','zl73'})do for _,up in ipairs({false,true})do
 local s,c=fresh(id,up,3);local before=C.copy(s);local z,enemy,hand,exhaust=s.zhongliCandidate,s.enemies[1],s.hand,s.exhaust
 local apply=C.applyEffects;local hit=false
 C.applyEffects=function(state,effects,...)local out=apply(state,effects,...);for _,e in ipairs(effects)do if state==s and(e.op=='damage'or e.op=='applyStatus')then hit=true;error('after native zero tail')end end;return out end
 eq(pcall(C.play,s,c.uid,1),false);C.applyEffects=apply;assert(hit);same(s,before)
 eq(s.zhongliCandidate,z);eq(s.enemies[1],enemy);eq(s.hand,hand);eq(s.hand[1],c);eq(s.exhaust,exhaust)
 assert(C.play(s,c.uid,1));eq(z.jade,0);absent(s,c)
end end
-- Native modifiers and Artifact do not refund spent jade.
local Actors=require('abyss_actor')
for _,up in ipairs({false,true})do
 local s,c=fresh('zl39',up,3);s.player.statuses.strength=2;s.player.statuses.weak=1;s.enemies[1].statuses.vulnerable=1;s.enemies[1].block=5;local hp=s.enemies[1].hp
 assert(C.play(s,c.uid,1));eq(s.enemies[1].hp,hp-(math.floor(((up and 8 or 6)+2)*0.75*1.5)-5));eq(s.zhongliCandidate.jade,0)
 s,c=fresh('zl73',up,3);Actors.applyPower(s,s.enemies[1],'artifact',1,s.enemies[1]);assert(C.play(s,c.uid,1));eq(s.enemies[1].statuses.artifact,0);eq(s.enemies[1].statuses.weak,nil);eq(s.zhongliCandidate.jade,0);absent(s,c)
end
local Auto=require('abyss_card_actions')
for _,id in ipairs({'zl39','zl73'})do for _,mode in ipairs({'normal','unmarked','exhaust','retain','face','extra','tail'})do
 local s,c=fresh(id,false,3);local d=s.catalog.cards[id]
 if mode=='unmarked'then d.zhongliCandidate=nil elseif mode=='exhaust'then d.exhaust=false elseif mode=='retain'then d.selfRetain=true elseif mode=='face'then c.upgraded='false'elseif mode=='extra'then d.effects[1].fixed=true elseif mode=='tail'then d.effects[2].times=2 end
 if mode~='normal'then local before=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,before)end
 table.remove(s.hand,1);C.queueCard(s,c,{targetIndex=1});Auto.drain(C,s);eq(s.energy,0);eq(s.zhongliCandidate.jade,mode=='normal'and 0 or 3)
end end
for _,id in ipairs({'zl39','zl73'})do for _,up in ipairs({false,true})do
 local s,c=fresh(id,up,3);local before=C.copy(s);eq(C.play(s,c.uid,99),false);same(s,before)
end end
-- Source starter supplies exactly the three jade spent; acquisition and UID are real Run operations.
for _,id in ipairs({'zl39','zl73'})do for _,up in ipairs({false,true})do
 local r=Factory.new(data(),23);assert(Run.startCombat(r,'cultist_solo'))
 C.damage(r.combat,r.combat.player,r.combat.enemies[1],999,true);assert(Run.finishCombat(r))
 r.rewards.cards={id};r.rewards.cardUpgrades={up};r.rewards.cardResolved=false;assert(Run.claimCardReward(r,1));local deckUid=r.deck[#r.deck].uid
 assert(Run.leaveCombatRewards(r));assert(Run.startCombat(r,'cultist_solo'));local s=r.combat;local card
 for _,p in ipairs({s.hand,s.draw})do for i=#p,1,-1 do if p[i].deckUid==deckUid then card=table.remove(p,i);break end end;if card then break end end
 assert(card);eq(card.upgraded,up);s.hand[#s.hand+1]=card;eq(s.zhongliCandidate.jade,3);s.energy=0
 assert(Run.play(r,card.uid,1));eq(s.energy,0);eq(s.zhongliCandidate.jade,0);absent(s,card)
 local before=C.copy(r);eq(Run.play(r,card.uid,1),false);same(r,before);assert(Run.endTurn(r))
 for _,p in ipairs({s.hand,s.draw,s.discard})do for _,c in ipairs(p)do assert(c~=card)end end
end end
print('ZHONGLI_ZERO_PAID_PASS 84 resource faces+4 actual tail rollback+4 modifiers+14auto+4badtarget')
print('AUTHOR_ZL_ZERO_RUN_PASS four real reward UID/sourcejade3/zeroenergy/exhaust paths; controlled offers not natural pool')
