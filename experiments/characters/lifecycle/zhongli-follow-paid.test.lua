package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,Run,eq,same=H.C,H.Data,H.Run,H.eq,H.same
local Def=require('abyss_zhongli_follow_definitions');local F=require('abyss_zhongli_starter_run')
local function data()local d=C.copy(D);for _,c in ipairs(Def.definitions())do d.cards.cards[#d.cards.cards+1]=c end;return d end
local function fresh(id,up)
 local deck={{cardId=id,upgraded=up}};for i=1,8 do deck[#deck+1]='defend' end
 local s=C.new(data(),{seed=4,deck=deck,enemies={'cultist'},candidateLifecycle={kind='zhongli',relicEnabled=true}})
 local card;for _,pile in ipairs({s.hand,s.draw})do for i,c in ipairs(pile)do if c.cardId==id then card=table.remove(pile,i);break end end;if card then break end end
 s.hand[#s.hand+1]=card;s.zhongliCandidate.jade=0;s.enemies[1].hp=100;s.enemies[1].maxHp=100;return s,card
end
local ids={'zl47','zl56','zl70'};local Paid=require('abyss_zhongli_paid_cards');local Actor=require('abyss_actor')
for _,id in ipairs(ids)do for _,up in ipairs({false,true})do for jade=0,20,5 do
 local s,c=fresh(id,up);s.zhongliCandidate.jade=jade;s.player.statuses.strength=2;s.player.statuses.weak=1;s.player.statuses.dexterity=2;s.player.statuses.frail=1;s.enemies[1].statuses.vulnerable=1
 local gain=id=='zl70'and(up and 9 or 7)or(up and 4 or 3)
 local raw=id=='zl47'and(up and 4 or 2)or(up and 11 or 8);local hit=C.attackAmount(s,s.player,s.enemies[1],raw);local block=C.blockAmount(s,s.player,up and 12 or 9)
 assert(C.play(s,c.uid,1));eq(s.energy,id=='zl47'and 2 or 1);eq(s.zhongliCandidate.jade,math.min(20,jade+gain))
 if id=='zl56'then eq(s.player.block,block);eq(s.enemies[1].hp,100)else eq(s.enemies[1].hp,100-hit)end
 eq((id=='zl70'and s.exhaust or s.discard)[1],c)
end end end
-- Tail checks live jade after real native action; no up-front credit.
for _,id in ipairs(ids)do
 local s,c=fresh(id,false);s.zhongliCandidate.jade=0;local old=Paid.dispatch;local touched=false
 Paid.dispatch=function(core,state,e,q)if state==s then touched=true;if id=='zl56'then eq(s.player.block,9)else eq(s.enemies[1].hp,id=='zl47'and 98 or 92)end;eq(s.zhongliCandidate.jade,0);s.zhongliCandidate.jade=19 end;return old(core,state,e,q)end
 assert(C.play(s,c.uid,1));Paid.dispatch=old;assert(touched);eq(s.zhongliCandidate.jade,20)
end
for _,id in ipairs({'zl47','zl70'})do
 local s,c=fresh(id,false);s.enemies[1].hp=1;assert(C.play(s,c.uid,1));eq(s.zhongliCandidate.jade,0)
 s,c=fresh(id,false);s.player.hp=1;s.enemies[1].statuses.thorns=99;assert(C.play(s,c.uid,1));eq(s.player.hp,0);eq(s.zhongliCandidate.jade,0)
end
for _,flag in ipairs({'halfDead','escaped','isDying'})do
 local s,c=fresh('zl47',false);local old=Paid.dispatch
 Paid.dispatch=function(core,state,e,q)if state==s then s.enemies[1][flag]=true end;return old(core,state,e,q)end
 assert(C.play(s,c.uid,1));Paid.dispatch=old;eq(s.enemies[1].hp,98);eq(s.zhongliCandidate.jade,0)
end
for _,id in ipairs({'zl47','zl56'})do for _,up in ipairs({false,true})do local s,c=fresh(id,up);assert(C.endTurn(s));local found=false;for _,x in ipairs(s.hand)do if x==c then found=true end end;assert(found);assert(C.play(s,c.uid,1))end end
for _,id in ipairs(ids)do for _,mode in ipairs({'extra','value','marker','retain','exhaust','face','type','target','cost','upgrade','text'})do
 local s,c=fresh(id,false);local d=s.catalog.cards[id]
 if mode=='cost'then d.cost=0 elseif mode=='upgrade'then d.upgrade.effects[2].value=99 elseif mode=='text'then d.text='drift'elseif mode=='extra'then d.extra=true elseif mode=='value'then d.effects[2].value=99 elseif mode=='marker'then d.zhongliCandidate=nil elseif mode=='retain'then d.selfRetain=not d.selfRetain elseif mode=='exhaust'then d.exhaust=not d.exhaust elseif mode=='face'then c.upgraded='false'elseif mode=='type'then d.type='power'elseif mode=='target'then d.target=id=='zl56'and'ENEMY'or'SELF'end
 local b=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,b)
end end
for _,id in ipairs(ids)do for _,mode in ipairs({'uid','turn','playId','value','replay','after'})do
 local s,c=fresh(id,false);local b=C.copy(s);local old=Paid.dispatch;local touched=false
 Paid.dispatch=function(core,state,e,q)if state~=s then return old(core,state,e,q)end;touched=true;local x=C.copy(e)
 if mode=='after'then old(core,state,e,q);error('after actual jade gain')elseif mode=='replay'then old(core,state,e,q);return old(core,state,e,q)elseif mode=='value'then x.payload.value=20 elseif mode=='uid'then x.uid='bad'else x[mode]=99 end;return old(core,state,x,q)end
 eq(pcall(C.play,s,c.uid,1),false);Paid.dispatch=old;assert(touched);same(s,b);assert(C.play(s,c.uid,1))
end end
-- Native Corruption/FNP registration, one real exhaust.
do local s,c=fresh('zl56',false);assert(require('abyss_corruption').prepare(s));assert(require('abyss_corruption').apply(s,1));s.player.statuses.feel_no_pain=3;require('abyss_exhaust').rememberPower(s,'feel_no_pain');assert(C.play(s,c.uid));eq(s.energy,3);eq(s.player.block,12);eq(s.exhaust[#s.exhaust],c);eq(s.zhongliCandidate.jade,3)end
-- Whole Run graph rollback after actual tail mutation, retry permanent UID.
for _,id in ipairs(ids)do for _,up in ipairs({false,true})do
 local r=require('abyss_zhongli_twentyeight_run').new(D,42);assert(Run.obtainCard(r,id,{upgraded=up}));local uid=r.deck[#r.deck].uid;assert(Run.startCombat(r,'cultist_solo'));local s=r.combat;local c
 for _,pile in ipairs({s.hand,s.draw})do for i=#pile,1,-1 do if pile[i].deckUid==uid then c=table.remove(pile,i)end end end
 assert(c);s.hand[#s.hand+1]=c;s.enemies[1].hp=100;s.enemies[1].maxHp=100;local snap=C.copy(r);local old=Paid.dispatch;local touched=false;local deck,combat,hand,z=r.deck,r.combat,s.hand,s.zhongliCandidate
 Paid.dispatch=function(core,state,e,q)local out=old(core,state,e,q);if state==s then touched=true;error('after actual tail gain')end;return out end
 eq(pcall(Run.play,r,c.uid,1),false);Paid.dispatch=old;assert(touched);same(r,snap);eq(r.deck,deck);eq(r.combat,combat);eq(s.hand,hand);eq(s.zhongliCandidate,z);assert(Run.play(r,c.uid,1));eq(c.deckUid,uid)
end end
print('ZHONGLI_FOLLOW_PAID_PASS 30 face/jade/modifier; live tail; terminal; retained; 33 drift; 18 staged rollback; 6 whole Run rollback; corruption')
