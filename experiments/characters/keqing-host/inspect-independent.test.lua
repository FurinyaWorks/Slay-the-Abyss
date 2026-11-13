package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,eq,same=H.C,H.eq,H.same
local D=C.copy(H.Data)
D.cards.cards[#D.cards.cards+1]={id='KQ044',name='candidate',type='skill',target='SELF',cost=1,exhaust=true,experimental=true,keqingCandidate=true,keqingStage='044',effects={{op='keqingInspect',value=3}},upgrade={effects={{op='keqingInspect',value=4}}}}
local P=require('abyss_pile_choice');local Paid=require('abyss_keqing_paid_cards')
local function fresh(up,n)
 local deck={{cardId='KQ044',upgraded=up}};for i=1,14 do deck[#deck+1]='strike'end
 local s=C.new(D,{deck=deck,enemies={'jaw_worm'},seed=29,candidateLifecycle={kind='keqing',relicEnabled=false}})
 local c;for _,pile in ipairs({s.hand,s.draw})do for i=#pile,1,-1 do if pile[i].cardId=='KQ044'then c=table.remove(pile,i)end end end
 while #s.hand>0 do s.draw[#s.draw+1]=table.remove(s.hand)end;s.hand[1]=assert(c)
 while #s.draw>n do s.discard[#s.discard+1]=table.remove(s.draw,1)end
 local ids={};for _,pile in ipairs({s.hand,s.draw,s.discard})do for _,v in ipairs(pile)do ids[v.uid]={v.cardId,v.upgraded}end end
 local function conserved()
  local seen,count={},0;for _,pile in ipairs({s.hand,s.draw,s.discard,s.exhaust})do for _,v in ipairs(pile)do
   assert(not seen[v.uid]);seen[v.uid]=true;count=count+1;local d=assert(ids[v.uid]);eq(v.cardId,d[1]);eq(v.upgraded,d[2])
  end end;eq(count,15)
 end
 return s,c,conserved
end
local total=0
for _,up in ipairs({false,true})do for n=1,6 do for pos=1,math.min(n,up and 4 or 3)do
 local s,c,conserved=fresh(up,n);local original={};for i,v in ipairs(s.draw)do original[i]=v end
 local chosen=original[#original-pos+1];local rng=C.copy(s.rng)
 assert(C.play(s,c.uid));eq(s.energy,2)
 if n>1 then
  local p=assert(s.pendingPileChoice);eq(p.mode,'keqingInspect');eq(p.window,up and 4 or 3)
  local v=assert(P.view(s));eq(#v.candidates,math.min(n,up and 4 or 3))
  for i,uid in ipairs(v.candidateUids)do eq(uid,original[#original-i+1].uid)end
  local b=C.copy(s);eq(C.choosePile(s,{},p.token,p.generation),false);eq(C.choosePile(s,{c.uid},p.token,p.generation),false)
  eq(C.choosePile(s,{chosen.uid},p.token+1,p.generation),false);eq(C.choosePile(s,{chosen.uid},p.token,p.generation+1),false)
  eq(C.play(s,c.uid),false);eq(C.endTurn(s),false);same(s,b)
  assert(C.choosePile(s,{chosen.uid},p.token,p.generation));local done=C.copy(s)
  eq(C.choosePile(s,{chosen.uid},p.token,p.generation),false);same(s,done)
 end
 eq(s.hand[1],chosen);eq(s.exhaust[1],c);eq(s.pendingPlay,nil);eq(s.pendingPileChoice,nil);eq(s.energy,2);same(s.rng,rng)
 table.remove(original,#original-pos+1);eq(#s.draw,#original);for i,v in ipairs(original)do eq(s.draw[i],v)end
 conserved();total=total+1
end end end
eq(total,33)
for _,up in ipairs({false,true})do
 for _,mode in ipairs({'empty','locked','full-at-start'})do
  local s,c,conserved=fresh(up,mode=='empty'and 0 or 14)
  if mode=='locked'then s.player.noDraw=true end
  if mode=='full-at-start'then while #s.hand<10 do s.hand[#s.hand+1]=table.remove(s.draw)end end
  local n=#s.draw;assert(C.play(s,c.uid));eq(s.energy,2)
  if mode=='full-at-start'then local p=assert(s.pendingPileChoice);assert(C.choosePile(s,{p.candidateUids[1]},p.token,p.generation));eq(#s.hand,10);eq(#s.draw,n-1)
  else eq(s.pendingPileChoice,nil);eq(#s.draw,n)end
  eq(s.exhaust[1],c);conserved()
 end
 local s,c,conserved=fresh(up,6);assert(C.play(s,c.uid));local p=s.pendingPileChoice;local uid=p.candidateUids[2]
 local b=C.copy(s);local refs={s.hand,s.draw,s.discard,s.exhaust,s.pendingPlay,s.actionQueue,s.rng}
 local complete=Paid.complete;local hit=false
 Paid.complete=function(...)complete(...);hit=true;error('independent post choice fault')end
 eq(pcall(C.choosePile,s,{uid},p.token,p.generation),false);Paid.complete=complete;assert(hit);same(s,b)
 local now={s.hand,s.draw,s.discard,s.exhaust,s.pendingPlay,s.actionQueue,s.rng};for i,v in ipairs(refs)do eq(now[i],v)end;eq(s.pendingPileChoice,p);eq(s.cardInUse,c)
 assert(C.choosePile(s,{uid},p.token,p.generation));conserved()
end
print('KQ044_INDEPENDENT_33_PLUS8_PASS')
