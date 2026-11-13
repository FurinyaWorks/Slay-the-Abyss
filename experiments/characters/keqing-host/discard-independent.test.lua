package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local data=C.copy(D);data.cards.cards[#data.cards.cards+1]={id='KQ043',name='candidate',type='skill',target='SELF',cost=1,experimental=true,keqingCandidate=true,keqingStage='043',effects={{op='keqingDiscard',value=4}},upgrade={effects={{op='keqingDiscard',value=7}}}}
for _,up in ipairs({false,true})do for _,noDraw in ipairs({false,true})do for _,modified in ipairs({false,true})do
 local deck={};for i=1,7 do deck[i]={cardId='KQ043',upgraded=up}end
 local s=C.new(data,{deck=deck,enemies={'jaw_worm'},seed=42,candidateLifecycle={kind='keqing',relicEnabled=true}})
 local source=s.hand[1];local drawn=s.draw[#s.draw];local initialHand=#s.hand
 if noDraw then s.player.noDraw=true end
 if modified then s.player.statuses.dexterity=3;s.player.statuses.frail=1 end
 assert(C.play(s,source.uid));local p=assert(s.pendingDiscard);eq(s.energy,2);eq(s.player.block,0);eq(#s.hand,initialHand-(noDraw and 1 or 0));eq(s.cardInUse,source)
 local chosen=noDraw and s.hand[1] or drawn;local found=false;for _,u in ipairs(p.handUids)do assert(u~=source.uid);if u==chosen.uid then found=true end end;assert(found)
 local before=C.copy(s);local hand=s.hand;local pending=s.pendingPlay;local rng=s.rng;local queue=s.actionQueue
 for _,args in ipairs({{{},p.token},{{source.uid},p.token},{{chosen.uid,chosen.uid},p.token},{{chosen.uid},p.token+1}})do eq(C.chooseDiscard(s,args[1],args[2]),false);same(s,before)end
 eq(C.endTurn(s),false);same(s,before);eq(C.play(s,s.hand[1].uid),false);same(s,before)
 local apply=C.applyEffects;local reached=false
 C.applyEffects=function(state,effects,...)local r=apply(state,effects,...);for _,e in ipairs(effects)do if state==s and e.op=='block'then reached=true;error('after block independent')end end;return r end
 eq(pcall(C.chooseDiscard,s,{chosen.uid},p.token),false);C.applyEffects=apply;assert(reached);same(s,before);eq(s.hand,hand);eq(s.pendingPlay,pending);eq(s.pendingDiscard,p);eq(s.rng,rng);eq(s.actionQueue,queue);eq(s.cardInUse,source)
 assert(C.chooseDiscard(s,{chosen.uid},p.token));eq(s.energy,2);eq(s.player.block,modified and(up and 7 or 5)or(up and 7 or 4));eq(s.keqingResource.relicUsed,false);eq(s.pendingPlay,nil);eq(s.pendingDiscard,nil)
 local seen={};local total=0;for _,name in ipairs({'hand','draw','discard','exhaust'})do for _,c in ipairs(s[name])do assert(not seen[c.uid]);seen[c.uid]=true;total=total+1 end end;eq(total,7)
 local done=C.copy(s);eq(C.chooseDiscard(s,{chosen.uid},p.token),false);same(s,done)
end end end
for _,up in ipairs({false,true})do
 local deck={};for i=1,12 do deck[i]={cardId='KQ043',upgraded=up}end
 local s=C.new(data,{deck=deck,enemies={'jaw_worm'},seed=42,candidateLifecycle={kind='keqing',relicEnabled=false}})
 C.draw(s,5);eq(#s.hand,10);local source=s.hand[1];local drawn=s.draw[#s.draw]
 assert(C.play(s,source.uid));eq(#s.hand,10);local p=assert(s.pendingDiscard);local found=false;for _,u in ipairs(p.handUids)do if u==drawn.uid then found=true end end;assert(found)
 assert(C.chooseDiscard(s,{drawn.uid},p.token));eq(#s.hand,9);eq(s.player.block,up and 7 or 4);eq(s.energy,2)
 local seen={};local count=0;for _,name in ipairs({'hand','draw','discard','exhaust'})do for _,c in ipairs(s[name])do assert(not seen[c.uid]);seen[c.uid]=true;count=count+1 end end;eq(count,12)
end
print('KQ043_INDEPENDENT_8_PASS')
