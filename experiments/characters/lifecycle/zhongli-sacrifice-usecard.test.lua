-- Public paid resource guard, not a new absorption or counter engine.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local Run=require('abyss_run');local Factory=require('abyss_zhongli_starter_run');local Actors=require('abyss_actor')
local function definition(id)
 local counter=id=='zl32'
 return {id=id,name='HOLD '..id,type='skill',cost=1,target='SELF',selfRetain=not counter,exhaust=not counter,rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,
 effects={{op='zhongliCard',kind='spendJade',value=3},counter and{op='gainStatus',status='flame_barrier',value=6}or{op='block',value=12}},
 upgrade={effects={{op='zhongliCard',kind='spendJade',value=3},counter and{op='gainStatus',status='flame_barrier',value=8}or{op='block',value=16}}}}
end
local function data()local d=C.copy(D);for _,id in ipairs({'zl32','zl40'})do d.cards.cards[#d.cards.cards+1]=definition(id)end;return d end
local function fresh(id,up,jade)
 local s=C.new(data(),{seed=4,deck={{cardId=id,upgraded=up}},enemies={'cultist'},candidateLifecycle={kind='zhongli',relicEnabled=true}})
 s.zhongliCandidate.jade=jade;return s,s.hand[1]
end
for _,id in ipairs({'zl32','zl40'})do for _,up in ipairs({false,true})do for jade=0,20 do
 local s,c=fresh(id,up,jade);local before=C.copy(s)
 if jade<3 then eq(C.play(s,c.uid),false);same(s,before)
 else assert(C.play(s,c.uid));eq(s.energy,2);eq(s.zhongliCandidate.jade,jade-3)
 if id=='zl32' then eq(s.player.statuses.flame_barrier,up and 8 or 6);eq(s.discard[1],c)else eq(s.player.block,up and 16 or 12);eq(s.exhaust[1],c)end
 before=C.copy(s);eq(C.play(s,c.uid),false);same(s,before)end
end end end
-- Retain is not passive resource spending; played 40 exhausts and cannot return.
for _,up in ipairs({false,true})do
 local s,c=fresh('zl40',up,3);assert(C.endTurn(s));eq(s.hand[1],c);eq(s.zhongliCandidate.jade,3)
 assert(C.play(s,c.uid));eq(s.exhaust[1],c);assert(C.endTurn(s));eq(#s.hand,0);eq(#s.draw,0);eq(#s.discard,0)
 s,c=fresh('zl32',up,3);assert(C.play(s,c.uid));s.player.hp=1;s.player.block=0;s.enemies[1].hp=1
 C.damage(s,s.enemies[1],s.player,1,false);eq(s.player.hp,0);eq(s.enemies[1].hp,1);eq(C.outcome(s),'defeat');eq(s.zhongliCandidate.jade,0)
 s,c=fresh('zl32',up,3);assert(C.play(s,c.uid));local hp=s.enemies[1].hp;C.damage(s,s.enemies[1],s.player,0,false);eq(s.enemies[1].hp,hp-(up and 8 or 6));assert(C.endTurn(s));eq(s.player.statuses.flame_barrier or 0,0)
end
local Auto=require('abyss_card_actions')
for _,id in ipairs({'zl32','zl40'})do for _,mode in ipairs({'normal','unmarked','exhaust','retain','face','extra','tail'})do
 local s,c=fresh(id,false,3);local d=s.catalog.cards[id]
 if mode=='unmarked'then d.zhongliCandidate=nil elseif mode=='exhaust'then d.exhaust=not d.exhaust elseif mode=='retain'then d.selfRetain=not d.selfRetain elseif mode=='face'then c.upgraded='false'elseif mode=='extra'then d.effects[1].fixed=true elseif mode=='tail'then d.effects[2].times=2 end
 if mode~='normal'then local before=C.copy(s);eq(C.play(s,c.uid),false);same(s,before)end
 table.remove(s.hand,1);C.queueCard(s,c,{});Auto.drain(C,s);eq(s.energy,3);eq(s.zhongliCandidate.jade,mode=='normal'and 0 or 3)
end end
for _,id in ipairs({'zl32','zl40'})do for _,up in ipairs({false,true})do
 local s,c=fresh(id,up,3);s.energy=0;local before=C.copy(s);eq(C.play(s,c.uid),false);same(s,before)
end end
-- Actual Run fixed reward, cross-battle UID and full Run native-tail failure restore/retry.
for _,id in ipairs({'zl32','zl40'})do for _,up in ipairs({false,true})do
 local r=Factory.new(data(),23);assert(Run.startCombat(r,'cultist_solo'));C.damage(r.combat,r.combat.player,r.combat.enemies[1],999,true);assert(Run.finishCombat(r))
 r.rewards.cards={id};r.rewards.cardUpgrades={up};r.rewards.cardResolved=false;assert(Run.claimCardReward(r,1));local deckUid=r.deck[#r.deck].uid
 assert(Run.leaveCombatRewards(r));assert(Run.startCombat(r,'cultist_solo'));local s=r.combat;local card
 for _,p in ipairs({s.hand,s.draw})do for i=#p,1,-1 do if p[i].deckUid==deckUid then card=table.remove(p,i);break end end;if card then break end end
 assert(card);eq(card.upgraded,up);s.hand[#s.hand+1]=card;eq(s.zhongliCandidate.jade,3)
 local before=C.copy(r);local deck,hand,z,enemy,player=r.deck,s.hand,s.zhongliCandidate,s.enemies[1],s.player;local apply=C.applyEffects;local hit=false
 C.applyEffects=function(state,effects,...)local out=apply(state,effects,...);for _,e in ipairs(effects)do if state==s and(e.op=='block'or e.op=='gainStatus')then hit=true;error('after native guard tail')end end;return out end
 eq(pcall(Run.play,r,card.uid,1),false);C.applyEffects=apply;assert(hit);same(r,before);eq(r.deck,deck);eq(s.hand,hand);eq(s.zhongliCandidate,z);eq(s.enemies[1],enemy);eq(s.player,player)
 assert(Run.play(r,card.uid,1));eq(s.energy,2);eq(z.jade,0);eq((id=='zl40'and s.exhaust or s.discard)[1],card)
 before=C.copy(r);eq(Run.play(r,card.uid,1),false);same(r,before)
end end
print('ZHONGLI_SACRIFICE_PAID_PASS 84resource+retain/exhaust+nativecounter+14auto+4cost')
print('AUTHOR_ZL_SACRIFICE_RUN_PASS four fixed reward UID and wholeRun tail fault/retry')
