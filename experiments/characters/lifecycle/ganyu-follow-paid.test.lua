package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,Run,eq,same=H.C,H.Data,H.Run,H.eq,H.same
local Paid=require('abyss_ganyu_paid_cards');local defs=Paid.followDefinitions().cards
local function fresh(d,up,charge,n)
 local data=C.copy(D);for _,v in ipairs(defs)do data.cards.cards[#data.cards.cards+1]=C.copy(v)end
 local deck={};for i=1,12 do deck[i]=d.id end;local enemies={};for i=1,n or 1 do enemies[i]='cultist'end
 local s=C.new(data,{deck=deck,enemies=enemies,seed=42,candidateLifecycle={kind='ganyu',relicEnabled=false}})
 local c=s.hand[1];c.upgraded=up;s.ganyuResource.charge=charge
 for _,e in ipairs(s.enemies)do e.hp=100;e.maxHp=100 end
 return s,c
end
local by={};for _,d in ipairs(defs)do by[d.id]=d end;local count=0
for _,d in ipairs(defs)do for _,up in ipairs({false,true})do for charge=0,2 do for n=1,3 do
 local s,c=fresh(d,up,charge,n);s.player.statuses.strength=2;s.player.statuses.weak=1;s.player.statuses.dexterity=2;s.player.statuses.frail=1
 for _,e in ipairs(s.enemies)do e.statuses.vulnerable=1 end
 local direct=d.id=='ganyu_lab_46'and(up and 7 or 5)or(up and 5 or 3);local bloom=up and 6 or 5
 local dmg=C.attackAmount(s,s.player,s.enemies[1],direct);local aoe=C.attackAmount(s,s.player,s.enemies[1],bloom);local block=C.blockAmount(s,s.player,up and 10 or 7);local hand=#s.hand
 assert(C.play(s,c.uid,1));eq(s.energy,3-d.cost)
 if d.id=='ganyu_lab_46'then
  eq(s.player.block,block);eq(s.ganyuResource.charge,charge==2 and 0 or charge)
  for i,e in ipairs(s.enemies)do eq(e.hp,100-(i==1 and dmg or 0)-(charge==2 and aoe or 0))end
 elseif d.id=='ganyu_lab_49'then eq(#s.hand,hand);eq(s.ganyuResource.storm.amount,up and 4 or 3);eq(s.ganyuResource.storm.turns,2);eq(s.ganyuResource.charge,charge)
 else eq(s.enemies[1].hp,100-dmg);eq(s.ganyuResource.storm.amount,up and 3 or 2);eq(s.ganyuResource.storm.turns,1);eq(s.ganyuResource.charge,charge)end
 eq((d.exhaust and s.exhaust or s.discard)[1],c);count=count+1
end end end end
-- Full charge is read after actual Block, not captured in preflight.
for _,charge in ipairs({0,2})do local d=by.ganyu_lab_46;local s,c=fresh(d,false,charge,2);local old=Paid.dispatch;local hit=false
 Paid.dispatch=function(core,state,e,q)if state==s then hit=true;eq(s.player.block,7);s.ganyuResource.charge=charge==0 and 2 or 0 end;return old(core,state,e,q)end
 assert(C.play(s,c.uid,1));Paid.dispatch=old;assert(hit);eq(s.ganyuResource.charge,0);eq(s.enemies[1].hp,charge==0 and 90 or 95);eq(s.enemies[2].hp,charge==0 and 95 or 100)
end
-- Setup precedes draw even under NoDraw, full-hand or no-card constraints.
for _,mode in ipairs({'locked','empty','full','shuffle'})do local s,c=fresh(by.ganyu_lab_49,false,1,1)
 if mode=='locked'then require('abyss_actor').applyNoDraw(s,s.player)
 elseif mode=='empty'then s.draw={};s.discard={}
 elseif mode=='full'then while #s.hand<11 do s.hand[#s.hand+1]=table.remove(s.draw)end
 else s.discard=s.draw;s.draw={}end
 local n=#s.hand;assert(C.play(s,c.uid));eq(s.ganyuResource.storm.amount,3);eq(s.ganyuResource.storm.turns,2);eq(#s.hand,n-1+(mode=='shuffle'and 1 or 0));eq(s.discard[#s.discard],c)
end
for _,d in ipairs({by.ganyu_lab_49,by.ganyu_lab_67})do local s,c=fresh(d,false,0,1);s.ganyuResource.storm={amount=8,turns=3};assert(C.play(s,c.uid,1));same(s.ganyuResource.storm,{amount=8,turns=3})end
for _,id in ipairs({'ganyu_lab_46','ganyu_lab_67'})do
 local s,c=fresh(by[id],false,2,1);s.enemies[1].hp=1;assert(C.play(s,c.uid,1));eq(s.enemies[1].hp,0);if id=='ganyu_lab_67'then eq(s.ganyuResource.storm,nil)end
 s,c=fresh(by[id],false,2,1);s.player.hp=1;s.enemies[1].statuses.thorns=99;assert(C.play(s,c.uid,1));eq(s.player.hp,0);if id=='ganyu_lab_67'then eq(s.ganyuResource.storm,nil)end
end
for _,d in ipairs(defs)do for _,up in ipairs({false,true})do
 for _,field in ipairs({'cost','upgrade','text','marker','extra','effect'})do local s,c=fresh(d,up,0,1);local source=s.catalog.cards[d.id]
  if field=='cost'then source.cost=0 elseif field=='upgrade'then source.upgrade.cost=0 elseif field=='text'then source.text='drift'elseif field=='marker'then source.productionEnabled=true elseif field=='extra'then source.unknown=true else source.effects[1].value=999 end
  local snap=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,snap)
 end
 for _,mode in ipairs({'value','step','uid','replay','after'})do local s,c=fresh(d,up,0,1);local b=C.copy(s);local old=Paid.dispatch;local hit=false
  Paid.dispatch=function(core,state,e,q)hit=true;if mode=='value'then e.payload.unknown=true elseif mode=='step'then e.step=99 elseif mode=='uid'then e.uid='bad'end;local out=old(core,state,e,q);if mode=='replay'then old(core,state,e,q)elseif mode=='after'then error('after actual compound stage')end;return out end
  eq(pcall(C.play,s,c.uid,1),false);Paid.dispatch=old;assert(hit);same(s,b);assert(C.play(s,c.uid,1))
 end
 local r=require('abyss_ganyu_follow_reward_run').new(D,42);assert(Run.obtainCard(r,d.id,{upgraded=up}));local uid=r.deck[#r.deck].uid;assert(Run.startCombat(r,'cultist_solo'));local s=r.combat;local c
 for _,pile in ipairs({s.hand,s.draw})do for i=#pile,1,-1 do if pile[i].deckUid==uid then c=table.remove(pile,i)end end end
 assert(c);s.hand[#s.hand+1]=c;s.enemies[1].hp=100;s.enemies[1].maxHp=100;local snap=C.copy(r);local old=Paid.dispatch;local hit=false;local deck,combat,hand,resource=r.deck,r.combat,s.hand,s.ganyuResource
 Paid.dispatch=function(core,state,e,q)local out=old(core,state,e,q);if state==s then hit=true;error('after actual follow mutation')end;return out end
 eq(pcall(Run.play,r,c.uid,1),false);Paid.dispatch=old;assert(hit);same(r,snap);eq(r.deck,deck);eq(r.combat,combat);eq(s.hand,hand);eq(s.ganyuResource,resource);assert(Run.play(r,c.uid,1));eq(c.deckUid,uid)
end end
-- Native Corruption/FNP, no bespoke cleanup.
do local s,c=fresh(by.ganyu_lab_49,false,0,1);assert(require('abyss_corruption').prepare(s));assert(require('abyss_corruption').apply(s,1));s.player.statuses.feel_no_pain=3;require('abyss_exhaust').rememberPower(s,'feel_no_pain');assert(C.play(s,c.uid));eq(s.energy,3);eq(s.player.block,3);eq(s.exhaust[#s.exhaust],c)end
print('GANYU_FOLLOW_PAID_PASS '..count..' face/charge/enemy modifiers; live charge; draw boundaries; terminal; 36 drift; 30 stage rollback; 6 whole Run; Corruption')
