package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,eq,same=H.C,H.eq,H.same
local D=require('abyss_silent_tactics_cards').withCardDefinitions(require('abyss_silent').withFoundationCards(H.Data))
for _,up in ipairs({false,true})do
 local s=C.new(D,{deck={{cardId='concentrate',upgraded=up},'strike','strike','defend','defend'},enemies={'jaw_worm'},seed=42,experimental=true})
 local card;for _,c in ipairs(s.hand)do if c.cardId=='concentrate'then card=c end end
 assert(C.play(s,card.uid,1));local p=assert(s.pendingDiscard);eq(s.energy,3);eq(s.cardInUse,card);assert(s.actionQueue.paused)
 local n=up and 2 or 3;local ids={};for i=1,n do ids[i]=s.hand[i].uid end
 local before=C.copy(s);eq(C.chooseDiscard(s,ids,p.token+1),false);same(s,before)
 local orig=C.applyEffects;assert(type(orig)=='function')
 C.applyEffects=function(state,effects,...)local r=orig(state,effects,...);for _,e in ipairs(effects)do if e.op=='energy'then error('after queued energy')end end;return r end
 eq(pcall(C.chooseDiscard,s,ids,p.token),false);C.applyEffects=orig;same(s,before);eq(s.pendingDiscard,p);eq(s.cardInUse,card)
 assert(C.chooseDiscard(s,ids,p.token));eq(s.energy,5);eq(s.pendingDiscard,nil);eq(s.pendingPlay,nil);eq(s.cardInUse,nil);eq(s.discardedThisTurn,n)
 local done=C.copy(s);eq(C.chooseDiscard(s,ids,p.token),false);same(s,done)
end
print('DISCARD_CONTINUATION_CONTROL_PASS')
