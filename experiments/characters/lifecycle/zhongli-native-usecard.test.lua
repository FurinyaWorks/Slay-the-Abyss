package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,Run,eq,same=H.C,H.Data,H.Run,H.eq,H.same
local Def=require('abyss_zhongli_native_definitions');local F=require('abyss_zhongli_starter_run')
local function data()local d=C.copy(D);for _,c in ipairs(Def.definitions())do d.cards.cards[#d.cards.cards+1]=c end;return d end
local function fresh(id,up)
 local deck={{cardId=id,upgraded=up}};for i=1,8 do deck[#deck+1]='defend' end
 local s=C.new(data(),{seed=4,deck=deck,enemies={'cultist'},candidateLifecycle={kind='zhongli',relicEnabled=true}})
 local card;for _,pile in ipairs({s.hand,s.draw})do for i,c in ipairs(pile)do if c.cardId==id then card=table.remove(pile,i);break end end;if card then break end end
 s.hand[#s.hand+1]=card;s.enemies[1].hp=100;s.enemies[1].maxHp=100;return s,card
end
local ids={'zl07','zl12','zl13','zl14','zl15'}
local expected={zl07={{'damage',5,7},{'block',5,7}},zl12={{'block',3,4},{'draw',1,2}},zl13={{'applyStatus',2,3,'vulnerable'}},zl14={{'damage',13,18}},zl15={{'block',8,11},{'gainStatus',3,4,'flame_barrier'}}}
for _,d in ipairs(Def.definitions())do local e=expected[d.id];eq(d.cost,(d.id=='zl14'or d.id=='zl15')and 2 or 1);eq(d.upgrade.cost,d.cost);eq(d.rarity,'common');eq(d.selfRetain==true,d.id=='zl14');eq(d.exhaust,nil)
 for i,v in ipairs(e)do local a,b={op=v[1],value=v[2]},{op=v[1],value=v[3]};if v[4]then a.status=v[4];b.status=v[4]end;same(d.effects[i],a);same(d.upgrade.effects[i],b)end
end
for _,id in ipairs(ids)do for _,up in ipairs({false,true})do for jade=0,20,5 do
 local s,c=fresh(id,up);s.zhongliCandidate.jade=jade;local count=#s.hand;assert(C.play(s,c.uid,1));eq(s.energy,(id=='zl14'or id=='zl15')and 1 or 2);eq(s.zhongliCandidate.jade,jade)
 if id=='zl07'then eq(s.enemies[1].hp,100-(up and 7 or 5));eq(s.player.block,up and 7 or 5)
 elseif id=='zl12'then eq(s.player.block,up and 4 or 3);eq(#s.hand,count-1+(up and 2 or 1))
 elseif id=='zl13'then eq(s.enemies[1].statuses.vulnerable,up and 3 or 2)
 elseif id=='zl14'then eq(s.enemies[1].hp,100-(up and 18 or 13))
 else eq(s.player.block,up and 11 or 8);eq(s.player.statuses.flame_barrier,up and 4 or 3)end
 local b=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,b)
end end end
for _,up in ipairs({false,true})do local s,c=fresh('zl14',up);assert(C.endTurn(s));local found=false;for _,x in ipairs(s.hand)do if x==c then found=true end end;assert(found);assert(C.play(s,c.uid,1))end
local Auto=require('abyss_card_actions')
for _,id in ipairs(ids)do for _,mode in ipairs({'extra','value','marker','retain','exhaust','face','type','target'})do
 local s,c=fresh(id,false);local d=s.catalog.cards[id]
 if mode=='extra'then d.effects[1].fixed=true elseif mode=='value'then d.effects[1].value=99 elseif mode=='marker'then d.zhongliCandidate=nil elseif mode=='retain'then d.selfRetain=not d.selfRetain elseif mode=='exhaust'then d.exhaust=true elseif mode=='face'then c.upgraded='false'elseif mode=='type'then d.type='power'elseif mode=='target'then d.target='SELF'if id=='zl12'or id=='zl15'then d.target='ENEMY'end end
 local b=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,b)
 for i,v in ipairs(s.hand)do if v==c then table.remove(s.hand,i);break end end
 local hp,block,n=s.enemies[1].hp,s.player.block,#s.hand;C.queueCard(s,c,{targetIndex=1});Auto.drain(C,s);eq(s.enemies[1].hp,hp);eq(s.player.block,block);eq(#s.hand,n);eq(s.energy,3)
end end
-- Native No Draw and Corruption exhaust; retained attack is not a skill.
for _,up in ipairs({false,true})do
 local s,c=fresh('zl12',up);s.player.noDraw=true;local n=#s.hand;assert(C.play(s,c.uid));eq(#s.hand,n-1);eq(s.player.block,up and 4 or 3)
 for _,id in ipairs({'zl12','zl13','zl15'})do s,c=fresh(id,up);assert(require('abyss_corruption').prepare(s));assert(require('abyss_corruption').apply(s,1));s.player.statuses.feel_no_pain=3;require('abyss_exhaust').rememberPower(s,'feel_no_pain');s.energy=0;assert(C.play(s,c.uid,1));eq(s.energy,0);eq(s.exhaust[#s.exhaust],c);assert(s.player.block>=3)end
end
-- Native tail failures restore the entire Run graph, then retry the same permanent UID.
for _,id in ipairs(ids)do for _,up in ipairs({false,true})do
 local r=F.new(data(),23);assert(Run.startCombat(r,'cultist_solo'));C.damage(r.combat,r.combat.player,r.combat.enemies[1],999,true);assert(Run.finishCombat(r))
 r.rewards.cards={id};r.rewards.cardUpgrades={up};r.rewards.cardResolved=false;assert(Run.claimCardReward(r,1));local uid=r.deck[#r.deck].uid
 assert(Run.leaveCombatRewards(r));assert(Run.startCombat(r,'cultist_solo'));local s=r.combat;local c
 for _,pile in ipairs({s.hand,s.draw})do for i,v in ipairs(pile)do if v.deckUid==uid then c=table.remove(pile,i);break end end;if c then break end end
 assert(c);s.hand[#s.hand+1]=c;s.enemies[1].hp=100;s.enemies[1].maxHp=100
 local b=C.copy(r);local deck,hand,player,enemy,z=r.deck,s.hand,s.player,s.enemies[1],s.zhongliCandidate;local apply=C.applyEffects;local hit=false
 C.applyEffects=function(state,fx,...)local out=apply(state,fx,...);if state==s then hit=true;error('native tail failure')end;return out end
 eq(pcall(Run.play,r,c.uid,1),false);C.applyEffects=apply;assert(hit);same(r,b);eq(r.deck,deck);eq(s.hand,hand);eq(s.player,player);eq(s.enemies[1],enemy);eq(s.zhongliCandidate,z)
 assert(Run.play(r,c.uid,1));eq(s.discard[#s.discard],c);eq(s.zhongliCandidate.jade,3)
end end
print('ZHONGLI_NATIVE_PAID_PASS 50 resource faces /40 malformed paid+auto /native NoDraw Corruption retain /10 fixed reward Run rollback')
