package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local Run=require('abyss_run');local D=require('abyss_data');local F=require('abyss_zhongli_starter_run');local Source=require('abyss_zhongli_starter_source')
local function eq(a,b)assert(a==b,tostring(a)..' ~= '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local function hand(s,id,up)
 local card;for _,pile in ipairs({s.hand,s.draw,s.discard})do for i,v in ipairs(pile)do if v.cardId==id then card=table.remove(pile,i);break end end;if card then break end end;assert(card);card.upgraded=up or false;s.hand[#s.hand+1]=card;return card
end
local original=C.copy(D);local d=C.copy(D);d.rules.player.maxHp=80;d.rules.player.energyPerTurn=9;d.rules.player.drawPerTurn=9;d.rules.player.maxHand=20
local saved=C.copy(d);local r=F.new(d,42);same(d,saved);eq(r.hp,60);eq(r.maxHp,60);eq(#r.deck,10);eq(#r.relics,0)
local counts,seen={},{};for _,c in ipairs(r.deck)do assert(not seen[c.uid]);seen[c.uid]=true;counts[c.cardId]=(counts[c.cardId]or 0)+1 end;same(counts,{zl01=4,zl02=4,zl03=1,zl04=1})
assert(Run.startCombat(r,'cultist_solo'));eq(r.combat.energy,3);eq(#r.combat.hand,5);eq(r.combat.zhongliCandidate.jade,3)
-- Source3-energy03->04 real payment; prior jade3 is insufficient for04.
local s=r.combat;local a,b=hand(s,'zl03'),hand(s,'zl04');local before=C.copy(r)
eq(Run.play(r,b.uid,1),false);same(r,before);assert(Run.play(r,a.uid,1));eq(s.energy,1);eq(s.zhongliCandidate.jade,15)
assert(Run.play(r,b.uid,1));eq(s.energy,0);eq(s.zhongliCandidate.jade,9)
-- Real native damage remains ordinary: experimental jade does not absorb any hit.
s.player.block=0;local hp=s.player.hp;C.damage(s,s.enemies[1],s.player,5,false);eq(s.player.hp,hp-5);eq(s.zhongliCandidate.jade,9)
C.damage(s,s.player,s.enemies[1],999,true);assert(Run.finishCombat(r));eq(r.hp,hp-5);assert(Run.claimCardReward(r,0));assert(Run.leaveCombatRewards(r));assert(Run.startCombat(r,'cultist_solo'));eq(r.combat.zhongliCandidate.jade,3);eq(r.combat.player.hp,hp-5);eq(r.combat.player.statuses.zl_candidate_pillar,nil)
-- Baseline false equipment retains0; true starts3 each new combat, never damage interception.
local off=Run.new(D,42,{experimental=true,candidateLifecycle={kind='zhongli',relicEnabled=false}});assert(Run.startCombat(off,'cultist_solo'));eq(off.combat.zhongliCandidate.jade,0)
for _,id in ipairs({'zl01','zl02'})do for _,up in ipairs({false,true})do
 local x=F.new(D,42);assert(Run.startCombat(x,'cultist_solo'));local state=x.combat;local card=hand(state,id,up);state.enemies[1].hp=100;state.enemies[1].maxHp=100
 assert(Run.play(x,card.uid,1));eq(state.energy,2);eq(state.zhongliCandidate.jade,3)
 eq(state.enemies[1].hp,id=='zl01'and(up and 91 or 94)or 100);eq(state.player.block,id=='zl02'and(up and 8 or 5)or 0)
 local found=false;for _,v in ipairs(state.discard)do if v==card then found=true end end;assert(found)
end end
-- Marked native candidates must fail closed before payment, including automatic play.
local A=require('abyss_card_actions')
for _,id in ipairs({'zl01','zl02'})do for _,mode in ipairs({'unmarked','native','extra','badFace','wrongTarget','exhaust'})do
 local x=F.new(D,42);assert(Run.startCombat(x,'cultist_solo'));local state=x.combat;local card=hand(state,id);local def=state.catalog.cards[id]
 if mode=='unmarked'then def.zhongliCandidate=nil elseif mode=='native'then def.runNativeABI=true elseif mode=='extra'then def.effects[1].fixed=true elseif mode=='badFace'then card.upgraded='false'elseif mode=='wrongTarget'then def.target='ALL_ENEMY'else def.exhaust=true end
 before=C.copy(x);eq(Run.play(x,card.uid,1),false);same(x,before)
 for i,v in ipairs(state.hand)do if v==card then table.remove(state.hand,i);break end end
 local enemyHP=state.enemies[1].hp;C.queueCard(state,card,{targetIndex=1,exhaustCards=false});A.drain(C,state);eq(state.energy,3);eq(state.enemies[1].hp,enemyHP);eq(state.player.block,0);eq(state.zhongliCandidate.jade,3)
end end
-- Whole Run paid native failure and initialization failure restore original references.
do
 local x=F.new(D,42);assert(Run.startCombat(x,'cultist_solo'));local state=x.combat;local card=hand(state,'zl01');before=C.copy(x);local deck,resource,handRef=x.deck,state.zhongliCandidate,state.hand
 local damage=C.damage;local reached=false;C.damage=function(...)local v=damage(...);reached=true;error('native starter damage fault')end
 local ok=pcall(Run.play,x,card.uid,1);C.damage=damage;eq(ok,false);assert(reached);same(x,before);assert(x.deck==deck and state.zhongliCandidate==resource and state.hand==handRef);assert(Run.play(x,card.uid,1))
 x=F.new(D,42);before=C.copy(x);deck=x.deck;local cfg=x.candidateLifecycle;local construct=C.new
 C.new=function(...)local v=construct(...);error('post initializer jade fault')end;eq(pcall(Run.startCombat,x,'cultist_solo'),false);C.new=construct;same(x,before);assert(x.deck==deck and x.candidateLifecycle==cfg);assert(Run.startCombat(x,'cultist_solo'));eq(x.combat.zhongliCandidate.jade,3)
end
for _,color in ipairs({'red','green','blue','purple'})do local n=0;for _,c in ipairs(r.data.cards.cards)do if c.color==color then n=n+1 end end;eq(n,75)end
local x=F.new(D,42);before=C.copy(x);eq(Run.startCombat(x,'louse_pair'),false);same(x,before)
assert(not pcall(F.new,D,42,{}));same(D,original)
-- All ten UIDs are actually drawn and paid via ordinary recharge/reshuffle.
-- Fixed harmless enemy makes this a queue/identity proof, not a balance run.
local cycleData=C.copy(D)
cycleData.enemies.enemies[#cycleData.enemies.enemies+1]={id='zl_cycle_fixture',name='test wait',tier='normal',hp=9999,intents={{id='wait',kind='defend',effects={{op='block',value=0}}}}}
cycleData.enemies.encounters[#cycleData.enemies.encounters+1]={id='zl_cycle_room',tier='normal',enemies={'zl_cycle_fixture'},minFloor=1,maxFloor=14}
local cycle=F.new(cycleData,11);assert(Run.startCombat(cycle,'zl_cycle_room'));local played={};local n=0
for turn=1,16 do
 local state=cycle.combat;local progress=true
 while progress do
  progress=false
  for _,c in ipairs(state.hand)do if C.canPlay(state,c.uid,1)then
   assert(Run.play(cycle,c.uid,1));if not played[c.deckUid]then played[c.deckUid]=true;n=n+1 end;progress=true;break
  end end
 end
 if n==10 then break end;assert(Run.endTurn(cycle))
end
eq(n,10);for _,c in ipairs(cycle.deck)do assert(played[c.uid])end
local capped=F.new(D,11);assert(Run.startCombat(capped,'cultist_solo'));local cap=capped.combat
cap.draw[#cap.draw+1]={uid='zl-cap-11',uuid='zl-cap-11',cardId='zl02',upgraded=false};C.draw(cap,20);eq(#cap.hand,10);eq(#cap.draw,1)
local construct=Run.new;local reached=false
Run.new=function(...)local made=construct(...);reached=true;made.data.rules.player.maxHp=1;error('post closed starter constructor')end
assert(not pcall(F.new,D,11));Run.new=construct;assert(reached);same(D,original);eq(F.new(D,11).maxHp,60)
print('ZHONGLI_STARTER_CYCLE_PASS ten actual deckUIDs/native draw paid recharge/eleventh cap/closed constructor source rollback')
print('ZHONGLI_STARTER_RUN_PASS source60/3/5/10/deck10/jade3/real3fee/native4/strict12/wholeRun/reset/noAbsorption')
