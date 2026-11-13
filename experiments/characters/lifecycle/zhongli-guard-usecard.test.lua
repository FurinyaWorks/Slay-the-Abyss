-- Public paid resource guard, not a new absorption or counter engine.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local Run=require('abyss_run');local Factory=require('abyss_zhongli_starter_run');local Actors=require('abyss_actor')
local function definition(id)
 local weak=id=='zl28'
 return {id=id,name='HOLD '..id,type='skill',cost=2,target=weak and 'ENEMY'or'SELF',rarity='common',color='zhongli_candidate',experimental=true,zhongliCandidate=true,
 effects={{op='zhongliCard',kind='gainJade',value=5},weak and{op='applyStatus',status='weak',value=2}or{op='gainStatus',status='flame_barrier',value=3}},
 upgrade={effects={{op='zhongliCard',kind='gainJade',value=7},weak and{op='applyStatus',status='weak',value=3}or{op='gainStatus',status='flame_barrier',value=4}}}}
end
local function data()local d=C.copy(D);for _,id in ipairs({'zl28','zl66'})do d.cards.cards[#d.cards.cards+1]=definition(id)end;return d end
local function fresh(id,up,jade)
 local s=C.new(data(),{seed=4,deck={{cardId=id,upgraded=up}},enemies={'cultist'},candidateLifecycle={kind='zhongli',relicEnabled=true}})
 s.zhongliCandidate.jade=jade;return s,s.hand[1]
end
for _,id in ipairs({'zl28','zl66'})do for _,up in ipairs({false,true})do for jade=0,20 do
 local s,c=fresh(id,up,jade);assert(C.play(s,c.uid,1));eq(s.energy,1);eq(s.zhongliCandidate.jade,math.min(20,jade+(up and 7 or 5)))
 if id=='zl28'then eq(s.enemies[1].statuses.weak,up and 3 or 2)else eq(s.player.statuses.flame_barrier,up and 4 or 3)end
 eq(s.discard[1],c);eq(#s.exhaust,0);local before=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,before)
end end end
-- Artifact consumes Weak only; existing flame_barrier stacks according to native status policy.
for _,up in ipairs({false,true})do
 local s,c=fresh('zl28',up,3);Actors.applyPower(s,s.enemies[1],'artifact',1,s.enemies[1]);assert(C.play(s,c.uid,1));eq(s.enemies[1].statuses.artifact,0);eq(s.enemies[1].statuses.weak,nil);eq(s.zhongliCandidate.jade,up and 10 or 8);eq(s.energy,1)
 s,c=fresh('zl66',up,3);Actors.applyPower(s,s.player,'flame_barrier',2,s.player);assert(C.play(s,c.uid));eq(s.player.statuses.flame_barrier,up and 6 or 5)
end
-- Native lethal incoming damage does not retaliate from a dead player (design HOLD).
for _,up in ipairs({false,true})do
 local s,c=fresh('zl66',up,3);assert(C.play(s,c.uid));local jade=s.zhongliCandidate.jade
 s.player.hp=1;s.player.block=0;s.enemies[1].hp=1;s.enemies[1].block=0
 C.damage(s,s.enemies[1],s.player,1,false)
 eq(s.player.hp,0);eq(s.enemies[1].hp,1);eq(C.outcome(s),'defeat');eq(s.zhongliCandidate.jade,jade)
 local before=C.copy(s);eq(C.play(s,c.uid),false);same(s,before)
end
-- Publicly installed counter: zero/blocked normal hits still trigger; fixed hits do not.
local count=0
for _,up in ipairs({false,true})do for _,hit in ipairs({0,5})do for _,block in ipairs({0,10})do for _,enemyBlock in ipairs({0,2,9})do for _,fixed in ipairs({false,true})do
 local s,c=fresh('zl66',up,3);assert(C.play(s,c.uid));eq(s.energy,1);s.player.block=block;s.enemies[1].block=enemyBlock
 -- Enemy vulnerability and player strength must not amplify fixed native retaliation.
 s.enemies[1].statuses.vulnerable=2;s.player.statuses.strength=10
 local hp,enemyHP,jade=s.player.hp,s.enemies[1].hp,s.zhongliCandidate.jade;local counter=up and 4 or 3
 C.damage(s,s.enemies[1],s.player,hit,fixed)
 eq(s.player.hp,hp-math.max(0,hit-block));eq(s.zhongliCandidate.jade,jade)
 eq(s.enemies[1].hp,enemyHP-(fixed and 0 or math.max(0,counter-enemyBlock)))
 eq(s.enemies[1].block,fixed and enemyBlock or math.max(0,enemyBlock-counter));count=count+1
end end end end end
eq(count,48)
for _,up in ipairs({false,true})do
 local s,c=fresh('zl66',up,3);assert(C.play(s,c.uid));local jade=s.zhongliCandidate.jade;local hp=s.enemies[1].hp
 assert(C.endTurn(s));eq(s.player.statuses.flame_barrier or 0,0);eq(s.enemies[1].hp,hp);eq(s.zhongliCandidate.jade,jade)
 C.damage(s,s.enemies[1],s.player,1,false);eq(s.enemies[1].hp,hp)
end
local Auto=require('abyss_card_actions')
for _,id in ipairs({'zl28','zl66'})do for _,mode in ipairs({'normal','unmarked','exhaust','retain','face','extra','tail'})do
 local s,c=fresh(id,false,3);local d=s.catalog.cards[id]
 if mode=='unmarked'then d.zhongliCandidate=nil elseif mode=='exhaust'then d.exhaust=true elseif mode=='retain'then d.selfRetain=true elseif mode=='face'then c.upgraded='false'elseif mode=='extra'then d.effects[1].fixed=true elseif mode=='tail'then d.effects[2].times=2 end
 if mode~='normal'then local before=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,before)end
 table.remove(s.hand,1);C.queueCard(s,c,{targetIndex=1});Auto.drain(C,s);eq(s.energy,3);eq(s.zhongliCandidate.jade,mode=='normal'and 8 or 3)
 eq(s.player.statuses.flame_barrier,mode=='normal'and id=='zl66'and 3 or nil)
 eq(s.enemies[1].statuses.weak,mode=='normal'and id=='zl28'and 2 or nil)
end end
for _,id in ipairs({'zl28','zl66'})do for _,up in ipairs({false,true})do
 local s,c=fresh(id,up,3);s.energy=1;local before=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,before)
end end
for _,up in ipairs({false,true})do local s,c=fresh('zl28',up,3);local before=C.copy(s);eq(C.play(s,c.uid,99),false);same(s,before)end
-- Actual Run fixed reward, cross-battle UID and full Run native-tail failure restore/retry.
for _,id in ipairs({'zl28','zl66'})do for _,up in ipairs({false,true})do
 local r=Factory.new(data(),23);assert(Run.startCombat(r,'cultist_solo'));C.damage(r.combat,r.combat.player,r.combat.enemies[1],999,true);assert(Run.finishCombat(r))
 r.rewards.cards={id};r.rewards.cardUpgrades={up};r.rewards.cardResolved=false;assert(Run.claimCardReward(r,1));local deckUid=r.deck[#r.deck].uid
 assert(Run.leaveCombatRewards(r));assert(Run.startCombat(r,'cultist_solo'));local s=r.combat;local card
 for _,p in ipairs({s.hand,s.draw})do for i=#p,1,-1 do if p[i].deckUid==deckUid then card=table.remove(p,i);break end end;if card then break end end
 assert(card);eq(card.upgraded,up);s.hand[#s.hand+1]=card;eq(s.zhongliCandidate.jade,3)
 local before=C.copy(r);local deck,hand,z,enemy,player=r.deck,s.hand,s.zhongliCandidate,s.enemies[1],s.player;local apply=C.applyEffects;local hit=false
 C.applyEffects=function(state,effects,...)local out=apply(state,effects,...);for _,e in ipairs(effects)do if state==s and(e.op=='applyStatus'or e.op=='gainStatus')then hit=true;error('after native guard tail')end end;return out end
 eq(pcall(Run.play,r,card.uid,1),false);C.applyEffects=apply;assert(hit);same(r,before);eq(r.deck,deck);eq(s.hand,hand);eq(s.zhongliCandidate,z);eq(s.enemies[1],enemy);eq(s.player,player)
 assert(Run.play(r,card.uid,1));eq(s.energy,1);eq(z.jade,up and 10 or 8);eq(s.discard[1],card)
 before=C.copy(r);eq(Run.play(r,card.uid,1),false);same(r,before)
end end
print('ZHONGLI_GUARD_PAID_PASS 84public+4ArtifactStack+48paidCounter+2expiry+14auto+4cost+2target')
print('AUTHOR_ZL_GUARD_RUN_PASS four fixed reward UID/paid/native-tail wholeRun rollback retry paths')
