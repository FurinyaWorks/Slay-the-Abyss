package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,R,D,eq,same=H.C,H.Run,H.Data,H.eq,H.same
local Paid=require('abyss_keqing_paid_cards');local F=require('abyss_keqing_starter_run')
local function fresh(id,up,inf,wedge,mods)
 local d=C.copy(D);for _,v in ipairs(Paid.defenseDefinitions().cards)do d.cards.cards[#d.cards.cards+1]=v end
 local s=C.new(d,{deck={{cardId=id,upgraded=up},'defend','defend','defend'},enemies={'cultist'},seed=17,candidateLifecycle={kind='keqing',relicEnabled=true}})
 local c;for _,v in ipairs(s.hand)do if v.cardId==id then c=v end end
 s.keqingResource.infusion=inf;s.keqingResource.wedgeUntil=wedge and s.turn+1 or nil
 if mods then s.player.statuses.dexterity=10;s.player.statuses.frail=1 end
 return s,assert(c)
end
local cases=0
for _,id in ipairs({'KQ006','KQ007'})do for _,up in ipairs({false,true})do for inf=0,2 do for _,wedge in ipairs({false,true})do for _,mods in ipairs({false,true})do
 local s,c=fresh(id,up,inf,wedge,mods);local first=mods and(up and 13 or 11)or(up and 8 or 5)
 local has=id=='KQ006'and wedge or id=='KQ007'and inf>0
 local second=mods and(id=='KQ006'and 11 or 10)or(id=='KQ006'and 5 or 4)
 assert(C.play(s,c.uid));eq(s.energy,2);eq(s.player.block,first+(has and second or 0))
 eq(s.keqingResource.infusion,inf-(id=='KQ007'and inf>0 and 1 or 0))
 eq(s.keqingResource.wedgeUntil,id=='KQ007'and wedge and s.turn+1 or nil)
 eq(s.keqingResource.relicUsed,false);eq(s.discard[#s.discard],c);cases=cases+1
end end end end end
eq(cases,48)
-- A real pending Scry is inserted after first block but before conditional dispatch.
for _,id in ipairs({'KQ006','KQ007'})do for _,grant in ipairs({false,true})do
 local s,c=fresh(id,true,grant and 0 or 2,not grant,true);for i,v in ipairs(s.hand)do if v~=c then s.draw[1]=table.remove(s.hand,i);break end end
 local dispatch=Paid.dispatch;local paused=false
 Paid.dispatch=function(combat,state,e,q)
  if not paused then paused=true;q.pushTop(state,{kind='effect',effect=e});q.pushTop(state,{kind='effect',effect={op='scry',value=1}});return true end
  return dispatch(combat,state,e,q)
 end
 assert(C.play(s,c.uid));Paid.dispatch=dispatch;local p=assert(s.pendingScry);eq(s.player.block,13);eq(s.energy,2)
 if id=='KQ006'then s.keqingResource.wedgeUntil=grant and s.turn+1 or nil else s.keqingResource.infusion=grant and 1 or 0 end
 s.player.statuses.dexterity=50 -- second block must use its original native capture.
 local before=C.copy(s);local res,hand,draw,q,rng=s.keqingResource,s.hand,s.draw,s.actionQueue,s.rng
 local reached=false
 Paid.dispatch=function(...)local result=dispatch(...);reached=true;error('after resource dispatch')end
 eq(pcall(C.chooseScry,s,{},p.token),false);Paid.dispatch=dispatch;assert(reached);same(s,before)
 eq(s.keqingResource,res);eq(s.hand,hand);eq(s.draw,draw);eq(s.actionQueue,q);eq(s.rng,rng);eq(s.pendingScry,p)
 assert(C.chooseScry(s,{},p.token));eq(s.player.block,13+(grant and(id=='KQ006'and 11 or 10)or 0));eq(s.energy,2)
 eq(s.keqingResource.infusion,id=='KQ007'and math.max(0,before.keqingResource.infusion-1)or before.keqingResource.infusion)
 if id=='KQ006'then eq(s.keqingResource.wedgeUntil,nil)else eq(s.keqingResource.wedgeUntil,before.keqingResource.wedgeUntil)end
 local done=C.copy(s);eq(C.chooseScry(s,{},p.token),false);same(s,done)
end end
-- Actual Run.obtainCard then native shuffle/draw; no hand manipulation.
for _,id in ipairs({'KQ006','KQ007'})do for _,up in ipairs({false,true})do
 local r=F.new(D,42);for _,v in ipairs(Paid.defenseDefinitions().cards)do r.data.cards.cards[#r.data.cards.cards+1]=v end
 assert(R.obtainCard(r,id,{upgraded=up}));local acquired=r.deck[#r.deck];eq(#r.deck,11)
 assert(R.startCombat(r,'cultist_solo'));local s=r.combat;local played=false
 for turn=1,4 do
  while s.energy>0 and #s.hand>0 and r.phase=='combat' do
   local chosen=s.hand[1];for _,v in ipairs(s.hand)do if v.deckUid==acquired.uid then chosen=v;break end end
   local oldInf,oldWedge,oldBlock=s.keqingResource.infusion,s.keqingResource.wedgeUntil,s.player.block
   assert(R.play(r,chosen.uid,1))
   if chosen.deckUid==acquired.uid then
    eq(chosen.upgraded,up);eq(chosen.cardId,id);eq(s.player.block,oldBlock+(up and 8 or 5)+((id=='KQ006'and oldWedge~=nil or id=='KQ007'and oldInf>0)and(id=='KQ006'and 5 or 4)or 0))
    eq(s.keqingResource.infusion,oldInf-(id=='KQ007'and oldInf>0 and 1 or 0));played=true;break
   end
  end
  if played then break end
  assert(r.phase=='combat');assert(R.endTurn(r))
 end
 assert(played);local seen,n={},0;for _,pile in ipairs({s.hand,s.draw,s.discard,s.exhaust})do for _,v in ipairs(pile)do assert(not seen[v.deckUid]);seen[v.deckUid]=true;n=n+1 end end;eq(n,11);assert(seen[acquired.uid]);eq(r.deck[#r.deck],acquired)
end end
-- Controlled actual native loseHp after first shield, before custom resource stage.
for _,id in ipairs({'KQ006','KQ007'})do for _,up in ipairs({false,true})do
 local s,c=fresh(id,up,2,true,false);local block=C.block;local reached=false
 C.block=function(...)local result=block(...);if not reached then reached=true;require('abyss_actor').loseHp(s,s.player,999)end;return result end
 assert(C.play(s,c.uid));C.block=block;assert(reached);eq(s.player.hp,0);eq(s.energy,2)
 eq(s.keqingResource.infusion,2);eq(s.keqingResource.wedgeUntil,s.turn+1);eq(s.keqingResource.relicUsed,false)
 local ended=C.copy(s);eq(C.play(s,c.uid),false);same(s,ended)
end end
print('KQ_DEFENSE_INDEPENDENT_48_4_4_4_PASS')
