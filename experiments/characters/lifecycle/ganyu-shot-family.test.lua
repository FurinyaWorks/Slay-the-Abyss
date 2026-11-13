package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local C=require('abyss_combat');local D=require('abyss_data');local Paid=require('abyss_ganyu_paid_cards');local A=require('abyss_card_actions')
local defs=Paid.shotFamilyDefinitions();local function eq(a,b)assert(a==b,tostring(a)..' != '..tostring(b))end
local function same(a,b)if type(a)~='table'then eq(a,b);return end;for k,v in pairs(a)do same(v,b[k])end;for k in pairs(b)do assert(a[k]~=nil)end end
local function fresh(def,up,charge)
 local d=C.copy(D);for _,v in ipairs(defs.cards)do d.cards.cards[#d.cards.cards+1]=v end
 local s=C.new(d,{deck={def.id,def.id,def.id,def.id,def.id,def.id,def.id,def.id},enemies={'jaw_worm','jaw_worm'},seed=42,candidateLifecycle={kind='ganyu',relicEnabled=false}})
 local c=s.hand[1];c.upgraded=up;s.ganyuResource.charge=charge
 for _,e in ipairs(s.enemies)do e.hp=100;e.maxHp=100;e.block=0 end
 return s,c
end
local expected={ganyu_lab_27={2,7,6,10,8,true,false},ganyu_lab_51={1,8,8,11,10,false,true}}
for _,d in ipairs(defs.cards)do local e=assert(expected[d.id]);eq(d.cost,e[1]);eq(d.upgrade.cost,e[1]);eq(d.effects[1].direct,e[2]);eq(d.effects[1].bloom,e[3]);eq(d.upgrade.effects[1].direct,e[4]);eq(d.upgrade.effects[1].bloom,e[5]);eq(d.selfRetain,e[6]);eq(d.exhaust,e[7]);eq(d.rarity,'uncommon')end
local n=0
for _,def in ipairs(defs.cards)do for _,up in ipairs({false,true})do
 local effect=up and def.upgrade.effects[1]or def.effects[1]
 for charge=0,2 do for _,weak in ipairs({false,true})do
  local s,c=fresh(def,up,charge);s.player.statuses.strength=2;if weak then s.player.statuses.weak=1 end
  local direct=C.attackAmount(s,s.player,s.enemies[1],effect.direct);local bloom=C.attackAmount(s,s.player,s.enemies[2],effect.bloom)
  local before=C.copy(s);eq(C.play(s,c.uid,999),false);same(s,before)
  assert(C.play(s,c.uid,1));eq(s.enemies[1].hp,100-direct-(charge==2 and bloom or 0));eq(s.enemies[2].hp,100-(charge==2 and bloom or 0))
  eq(s.ganyuResource.charge,charge==2 and 0 or charge);eq(s.energy,3-def.cost);eq(s.pendingPlay,nil);eq(s.cardInUse,nil)
  eq((def.exhaust and s.exhaust or s.discard)[1],c);n=n+1
 end end
 -- Native retain when unplayed, actual discard/exhaust when played.
 if def.selfRetain then local s,c=fresh(def,up,0);assert(C.endTurn(s));local found=false;for _,v in ipairs(s.hand)do if v==c then found=true end end;assert(found);eq(c.upgraded,up)end
 -- Paid resource and native damage failure restore original aliases.
 do local s,c=fresh(def,up,2);local before=C.copy(s);local res,hand,enemy=s.ganyuResource,s.hand,s.enemies[1];local damage=C.damage;local reached=false
 C.damage=function(...)damage(...);reached=true;error('after native hit')end
 assert(not pcall(C.play,s,c.uid,1));C.damage=damage;assert(reached);same(s,before);eq(s.ganyuResource,res);eq(s.hand,hand);eq(s.hand[1],c);eq(s.enemies[1],enemy);assert(C.play(s,c.uid,1))end
 -- Direct kill retains bloom to other living target, does not redirect the direct hit.
 do local s,c=fresh(def,up,2);s.enemies[1].hp=1;assert(C.play(s,c.uid,1));eq(s.enemies[1].hp,0);eq(s.enemies[2].hp,100-effect.bloom)end
 -- Pause after immutable capture, resume with live charge, restore failed resume aliases.
 do local s,c=fresh(def,up,0);local dispatch=Paid.dispatch;local once=false
 Paid.dispatch=function(combat,state,e,q)if not once then once=true;q.pushTop(state,{kind='effect',effect=e});q.pushTop(state,{kind='effect',effect={op='scry',value=1}});return true end;return dispatch(combat,state,e,q)end
 assert(C.play(s,c.uid,1));Paid.dispatch=dispatch;local pending=assert(s.pendingScry);s.ganyuResource.charge=2;s.player.statuses.strength=100
 local before=C.copy(s);local resource=s.ganyuResource;local paid=s.pendingPlay.ganyuPaid
 Paid.dispatch=function(...)dispatch(...);error('after resumed stage')end
 assert(not pcall(C.chooseScry,s,{},pending.token));Paid.dispatch=dispatch;same(s,before);eq(s.ganyuResource,resource);eq(s.pendingPlay.ganyuPaid,paid)
 assert(C.chooseScry(s,{},pending.token));eq(s.enemies[1].hp,100-effect.direct-effect.bloom);eq(s.enemies[2].hp,100-effect.bloom);eq(s.ganyuResource.charge,0)end
 -- Reaction death follows native terminal policy; scheduled bloom is not resumed.
 do local s,c=fresh(def,up,2);s.player.hp=1;s.enemies[1].statuses.thorns=3;s.enemies[1].powerOrder={'thorns'}
 assert(C.play(s,c.uid,1));eq(s.player.hp,0);eq(s.enemies[2].hp,100);eq(s.ganyuResource.charge,0);eq(s.cardInUse,c)end
 -- Strict source identity, including automatic native gate.
 for _,mode in ipairs({'normal','cost','retain','exhaust','flag','amount','upgradeCost','foreignMarker'})do
  local s,c=fresh(def,up,2);local d=s.catalog.cards[def.id]
  if mode=='cost'then d.cost=0 elseif mode=='retain'then d.selfRetain=not d.selfRetain elseif mode=='exhaust'then d.exhaust=not d.exhaust elseif mode=='flag'then d.ethereal=true elseif mode=='amount'then d.effects[1].direct=99;d.upgrade.effects[1].direct=99 elseif mode=='upgradeCost'then d.upgrade.cost=0 elseif mode=='foreignMarker'then d.keqingCandidate=true end
  if mode~='normal'then local before=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,before)end
  table.remove(s.hand,1);C.queueCard(s,c,{targetIndex=1,exhaustCards=false});A.drain(C,s);eq(s.energy,3);eq(s.ganyuResource.charge,mode=='normal'and 0 or 2)
 end
end end
print('PASS shot family '..n..' base/up resource-modifier cases + strict32auto/retain/exhaust/native rollback/target death')
