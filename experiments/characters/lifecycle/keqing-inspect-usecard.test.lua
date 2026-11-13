package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,eq,same=H.C,H.eq,H.same
local D=C.copy(H.Data)
D.cards.cards[#D.cards.cards+1]={id='kq044',name='HOLD',type='skill',target='SELF',cost=1,exhaust=true,experimental=true,keqingCandidate=true,keqingStage='044',effects={{op='keqingInspect',value=3}},upgrade={effects={{op='keqingInspect',value=4}}}}
local function fresh(up,n)
 local deck={{cardId='kq044',upgraded=up}};for i=1,14 do deck[#deck+1]='strike'end
 local s=C.new(D,{deck=deck,enemies={'jaw_worm'},seed=42,candidateLifecycle={kind='keqing',relicEnabled=false}})
 local card;for _,pile in ipairs({s.hand,s.draw})do for i,c in ipairs(pile)do if c.cardId=='kq044'then card=table.remove(pile,i);break end end end
 -- Controlled existing UID arrangement, not a claim of natural acquisition.
 for i=#s.hand,1,-1 do s.draw[#s.draw+1]=table.remove(s.hand,i)end
 s.hand[1]=card;while #s.draw>n do s.discard[#s.discard+1]=table.remove(s.draw,1)end
 return s,card
end
local P=require('abyss_pile_choice')
for _,up in ipairs({false,true})do for position=1,(up and 4 or 3)do
 local s,c=fresh(up,6);local old=C.copy(s.draw);local selected=s.draw[#s.draw-position+1];local rng=C.copy(s.rng)
 assert(C.play(s,c.uid));local p=assert(s.pendingPileChoice);eq(p.mode,'keqingInspect');eq(p.count,1);eq(p.requested,1);eq(#p.candidateUids,up and 4 or 3);eq(s.energy,2)
 local view=assert(P.view(s));eq(#view.candidates,up and 4 or 3);for i,uid in ipairs(view.candidateUids)do eq(uid,old[#old-i+1].uid)end
 local before=C.copy(s);eq(C.choosePile(s,{},p.token,p.generation),false);same(s,before)
 eq(C.choosePile(s,{s.draw[1].uid},p.token,p.generation),false);same(s,before)
 eq(C.choosePile(s,{selected.uid},p.token+1,p.generation),false);same(s,before)
 eq(C.choosePile(s,{selected.uid},p.token,p.generation+1),false);same(s,before)
 eq(C.play(s,c.uid),false);eq(C.endTurn(s),false);same(s,before)
 assert(C.choosePile(s,{selected.uid},p.token,p.generation));eq(s.hand[1],selected);eq(s.exhaust[1],c);eq(s.energy,2);same(s.rng,rng)
 table.remove(old,#old-position+1);same(s.draw,old);local done=C.copy(s);eq(C.choosePile(s,{selected.uid},p.token,p.generation),false);same(s,done)
end end
for _,mode in ipairs({'empty','single','locked'})do
 local s,c=fresh(false,mode=='empty'and 0 or mode=='single'and 1 or 12)
 if mode=='locked'then s.player.noDraw=true end
 local n=#s.draw;assert(C.play(s,c.uid));eq(s.pendingPileChoice,nil);eq(s.exhaust[1],c);eq(s.energy,2);eq(#s.draw,n-(mode=='single'and 1 or 0))
end
local Paid=require('abyss_keqing_paid_cards')
-- Controlled intervening native draw fills the last hand slot after payment.
do
 local s,c=fresh(false,14);while #s.hand<10 do s.hand[#s.hand+1]=table.remove(s.draw)end
 local inspect=Paid.inspect;Paid.inspect=function(state,e)C.draw(state,1);return inspect(state,e)end
 assert(C.play(s,c.uid));Paid.inspect=inspect;eq(#s.hand,10);eq(s.pendingPileChoice,nil);eq(s.exhaust[1],c);eq(s.energy,2)
end
-- Selection-time capacity/NoDraw/ordered graph changes fail closed without reroll.
for _,mutation in ipairs({'lock','reorder','full'})do
 local s,c=fresh(false,3);assert(C.play(s,c.uid));local p=s.pendingPileChoice
 if mutation=='lock'then s.player.noDraw=true elseif mutation=='reorder'then s.draw[1],s.draw[2]=s.draw[2],s.draw[1]
 else while #s.hand<10 do s.hand[#s.hand+1]=table.remove(s.discard)end end
 local before=C.copy(s);eq(C.choosePile(s,{p.candidateUids[1]},p.token,p.generation),false);same(s,before)
end
-- Failure after actual chosen move restores the paid, revealed boundary including aliases.
for _,up in ipairs({false,true})do
 local s,c=fresh(up,6);assert(C.play(s,c.uid));local p=s.pendingPileChoice;local uid=p.candidateUids[2]
 local before=C.copy(s);local hand,draw,paid,q,r=s.hand,s.draw,s.pendingPlay,s.actionQueue,s.rng
 local complete=Paid.complete;local hit=false
 Paid.complete=function(...)complete(...);hit=true;error('after bounded choice completion')end
 eq(pcall(C.choosePile,s,{uid},p.token,p.generation),false);Paid.complete=complete;assert(hit);same(s,before)
 eq(s.hand,hand);eq(s.draw,draw);eq(s.pendingPlay,paid);eq(s.pendingPileChoice,p);eq(s.actionQueue,q);eq(s.rng,r);eq(s.cardInUse,c)
 assert(C.choosePile(s,{uid},p.token,p.generation));eq(s.exhaust[1],c);eq(s.energy,2)
end
-- A fault just after revealing but before play returns restores pre-payment state.
do
 local s,c=fresh(false,6);local before=C.copy(s);local hand,draw=s.hand,s.draw;local begin=P.begin
 P.begin=function(...)begin(...);error('after inspect offer')end
 eq(pcall(C.play,s,c.uid),false);P.begin=begin;same(s,before);eq(s.hand,hand);eq(s.draw,draw)
end
print('KQ044_PUBLIC_INSPECT_PASS')
local CardActions=require('abyss_card_actions')
for _,up in ipairs({false,true})do for _,mode in ipairs({'normal','unmarked','native','extra','noExhaust'})do
 local s,c=fresh(up,6);local def=s.catalog.cards.kq044
 if mode=='unmarked'then def.keqingCandidate=nil elseif mode=='native'then def.silentFinalCard=true elseif mode=='noExhaust'then def.exhaust=false elseif mode=='extra'then def.effects[1].fixed=true;def.upgrade.effects[1].fixed=true end
 if mode~='normal'then local before=C.copy(s);eq(C.play(s,c.uid),false);same(s,before)end
 table.remove(s.hand,1);C.queueCard(s,c,{exhaustCards=true});CardActions.drain(C,s);eq(s.energy,3)
 if mode=='normal'then local p=assert(s.pendingPileChoice);assert(C.choosePile(s,{p.candidateUids[1]},p.token,p.generation));eq(s.exhaust[1],c);eq(s.energy,3)else eq(s.pendingPileChoice,nil);eq(#s.hand,0)end
end end
print('KQ044_AUTOMATIC_GATE_PASS')
