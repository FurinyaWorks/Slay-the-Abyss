package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,Run,eq,same=H.C,H.Data,H.Run,H.eq,H.same
local Paid=require('abyss_ganyu_paid_cards');local defs=Paid.supplyDefinitions().cards
local function fresh(d,up,charge,n)
 local data=C.copy(D);for _,v in ipairs(defs)do data.cards.cards[#data.cards.cards+1]=C.copy(v)end
 local deck={};for i=1,12 do deck[i]=d.id end;local enemies={};for i=1,n or 1 do enemies[i]='cultist'end
 local s=C.new(data,{deck=deck,enemies=enemies,seed=42,candidateLifecycle={kind='ganyu',relicEnabled=false}})
 local c=s.hand[1];c.upgraded=up;s.ganyuResource.charge=charge
 for _,e in ipairs(s.enemies)do e.hp=100;e.maxHp=100 end
 return s,c
end
local count=0
for _,d in ipairs(defs)do for _,up in ipairs({false,true})do for charge=0,2 do for n=1,3 do
 local s,c=fresh(d,up,charge,n);s.player.statuses.strength=2;s.player.statuses.weak=1
 for _,e in ipairs(s.enemies)do e.statuses.vulnerable=1 end
 local damage={};for i,e in ipairs(s.enemies)do damage[i]=C.attackAmount(s,s.player,e,up and 6 or 4)end
 assert(C.play(s,c.uid,1));eq(s.energy,3-d.cost);eq(s.ganyuResource.charge,math.min(2,charge+1))
 if d.id=='ganyu_lab_71'then eq(s.ganyuResource.storm.amount,up and 4 or 3);eq(s.ganyuResource.storm.turns,2)
 else for i,e in ipairs(s.enemies)do eq(e.hp,100-((d.id=='ganyu_lab_69'or i==1)and damage[i]or 0))end end
 eq((d.exhaust and s.exhaust or s.discard)[1],c);eq(s.pendingPlay,nil);count=count+1
end end
 for _,mutate in ipairs({function(d)d.cost=0 end,function(d)d.effects[2].amount=2 end,function(d)d.productionEnabled=true end,function(d)d.upgrade.cost=0 end,function(d)d.unknown=true end})do
  local s,c=fresh(d,up,0);mutate(s.catalog.cards[d.id]);local b=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,b)
 end
 for _,mode in ipairs({'after','value','step','replay'})do
  local s,c=fresh(d,up,0);local b=C.copy(s);local hand,resource=s.hand,s.ganyuResource;local dispatch=Paid.dispatch;local reached=false
  Paid.dispatch=function(combat,state,e,q)
   reached=true
   if mode=='value'then e.payload.amount=2 elseif mode=='step'then e.step=99 end
   dispatch(combat,state,e,q)
   if mode=='replay'then dispatch(combat,state,e,q)elseif mode=='after'then error('actual supply dispatch fault')end
  end
  eq(pcall(C.play,s,c.uid,1),false);Paid.dispatch=dispatch;assert(reached);same(s,b);eq(s.hand,hand);eq(s.ganyuResource,resource);assert(C.play(s,c.uid,1))
 end
 if d.id~='ganyu_lab_71'then
  local s,c=fresh(d,up,0);s.enemies[1].hp=1;assert(C.play(s,c.uid,1));eq(s.ganyuResource.charge,0)
  s,c=fresh(d,up,0);s.player.hp=1;s.enemies[1].statuses.thorns=5;assert(C.play(s,c.uid,1));eq(s.player.hp,0);eq(s.ganyuResource.charge,0)
 else
  local s,c=fresh(d,up,0);s.ganyuResource.storm={amount=8,turns=3};assert(C.play(s,c.uid));same(s.ganyuResource.storm,{amount=8,turns=3})
  s,c=fresh(d,up,0);assert(require('abyss_corruption').prepare(s));assert(require('abyss_corruption').apply(s,1));s.energy=0;s.player.statuses.feel_no_pain=3;require('abyss_exhaust').rememberPower(s,'feel_no_pain');assert(C.play(s,c.uid));eq(s.player.block,3);eq(s.ganyuResource.charge,1)
 end
end end
print('GANYU_SUPPLY_PAID_PASS '..count..' faces/charge/enemies/native modifiers; 30 source drift, 24 dispatch rollback; terminal/corruption/storm merge')
-- Actual permanent UID, full Run graph rollback after final resource mutation.
for _,d in ipairs(defs)do for _,up in ipairs({false,true})do
 local r=require('abyss_ganyu_supply_reward_run').new(D,42);assert(Run.startCombat(r,'cultist_solo'));C.damage(r.combat,r.combat.player,r.combat.enemies[1],999,true);assert(Run.finishCombat(r))
 r.rewards.cards={d.id};r.rewards.cardUpgrades={up};r.rewards.cardResolved=false;assert(Run.claimCardReward(r,1));local uid=r.deck[#r.deck].uid
 assert(Run.leaveCombatRewards(r));assert(Run.startCombat(r,'cultist_solo'));local s=r.combat;local c
 for _,pile in ipairs({s.hand,s.draw})do for i,v in ipairs(pile)do if v.deckUid==uid then c=table.remove(pile,i);break end end;if c then break end end
 assert(c);s.hand[#s.hand+1]=c;s.enemies[1].hp=100;s.enemies[1].maxHp=100
 local b=C.copy(r);local deck,hand,res=r.deck,s.hand,s.ganyuResource;local dispatch=Paid.dispatch;local reached=false
 Paid.dispatch=function(combat,state,e,q)local out=dispatch(combat,state,e,q);if state==s and state.pendingPlay.ganyuPaid.completed then reached=true;error('after final live supply')end;return out end
 eq(pcall(Run.play,r,c.uid,1),false);Paid.dispatch=dispatch;assert(reached);same(r,b);eq(r.deck,deck);eq(s.hand,hand);eq(s.ganyuResource,res);assert(Run.play(r,c.uid,1))
end end
print('GANYU_SUPPLY_RUN_ROLLBACK_PASS 6 permanent UID whole graph rollback retries')
