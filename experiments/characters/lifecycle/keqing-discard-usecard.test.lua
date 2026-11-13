package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,eq,same=H.C,H.eq,H.same
local D=require('abyss_silent').withFoundationCards(C.copy(H.Data))
D.cards.cards[#D.cards.cards+1]={id='kq043',name='HOLD KQ043',type='skill',target='SELF',cost=1,experimental=true,keqingCandidate=true,keqingStage='043',effects={{op='keqingDiscard',value=4}},upgrade={effects={{op='keqingDiscard',value=7}}}}
local function fresh(up)
 local s=C.new(D,{deck={{cardId='kq043',upgraded=up},'strike','strike','defend','defend','strike','defend'},enemies={'jaw_worm'},seed=42,candidateLifecycle={kind='keqing',relicEnabled=false}})
 local card;for _,pile in ipairs({s.hand,s.draw})do for i,c in ipairs(pile)do if c.cardId=='kq043'then card=c;if pile~=s.hand then table.remove(pile,i);s.hand[#s.hand+1]=c end;break end end end
 assert(card);return s,card
end
for _,up in ipairs({false,true})do
 local s,card=fresh(up);local energy=s.energy;local beforeHand=#s.hand;local drawn=s.draw[#s.draw]
 assert(C.play(s,card.uid));local p=assert(s.pendingDiscard);eq(s.energy,energy-1);eq(s.player.block,0);eq(#s.hand,beforeHand)
 eq(s.cardInUse,card);eq(s.keqingResource.infusion,0)
 local found=false;for _,uid in ipairs(p.handUids)do assert(uid~=card.uid);if uid==drawn.uid then found=true end end;assert(found,'drawn card must be selectable')
 local before=C.copy(s);eq(C.chooseDiscard(s,{},p.token),false);same(s,before)
 eq(C.endTurn(s),false);same(s,before);eq(C.play(s,card.uid),false);same(s,before)
 eq(C.chooseDiscard(s,{drawn.uid},p.token+1),false);same(s,before)
 assert(C.chooseDiscard(s,{drawn.uid},p.token));eq(s.player.block,up and 7 or 4);eq(s.energy,energy-1);eq(s.pendingPlay,nil);eq(s.cardInUse,nil)
 eq(s.discard[#s.discard],card);local done=C.copy(s);eq(C.chooseDiscard(s,{drawn.uid},p.token),false);same(s,done)
end
print('KQ043_PUBLIC_DISCARD_PASS')
-- Revealing the choice commits the paid draw. Failed selection restores only
-- the revealed boundary, not a pre-draw state that could permit rerolling.
for _,up in ipairs({false,true})do
 local s,card=fresh(up);s.player.statuses.dexterity=3;s.player.statuses.frail=1
 assert(C.play(s,card.uid));local p=assert(s.pendingDiscard);local uid=p.handUids[1]
 s.player.statuses.dexterity=50 -- controlled mutation proves use-time block capture
 local before=C.copy(s);local hand=s.hand;local resource=s.keqingResource;local pending=s.pendingPlay;local queue=s.actionQueue
 local apply=C.applyEffects;local hit=false
 C.applyEffects=function(state,effects,...)
  local r=apply(state,effects,...)
  for _,e in ipairs(effects)do if state==s and e.op=='block'then hit=true;error('after actual deferred block')end end
  return r
 end
 eq(pcall(C.chooseDiscard,s,{uid},p.token),false);C.applyEffects=apply;assert(hit)
 same(s,before);eq(s.hand,hand);eq(s.keqingResource,resource);eq(s.pendingPlay,pending);eq(s.actionQueue,queue);eq(s.pendingDiscard,p)
 assert(C.chooseDiscard(s,{uid},p.token));eq(s.player.block,up and 7 or 5)
end
-- Actual draw and reshuffle failure before a choice restores the full pre-pay graph/RNG.
do
 local s,card=fresh(false);for i=#s.draw,1,-1 do s.discard[#s.discard+1]=table.remove(s.draw,i)end
 local before=C.copy(s);local hand=s.hand;local discard=s.discard;local rng=s.rng;local draw=C.draw;local hit=false
 C.draw=function(state,n,...)local r=draw(state,n,...);if state==s then hit=true;error('after actual shuffle and draw')end;return r end
 eq(pcall(C.play,s,card.uid),false);C.draw=draw;assert(hit);same(s,before);eq(s.hand,hand);eq(s.discard,discard);eq(s.rng,rng)
 assert(C.play(s,card.uid));assert(s.pendingDiscard)
end
-- No Draw and a one-card remaining hand use native automatic discard, no fake pause.
do
 local s,card=fresh(false);s.player.noDraw=true
 for i=#s.hand,1,-1 do if s.hand[i]~=card then s.discard[#s.discard+1]=table.remove(s.hand,i)end end
 assert(C.play(s,card.uid));eq(s.pendingDiscard,nil);eq(s.player.block,4);eq(s.discard[#s.discard],card)
 s,card=fresh(false);s.player.noDraw=true
 local keep;for i=#s.hand,1,-1 do if s.hand[i]~=card then if not keep then keep=s.hand[i]else s.discard[#s.discard+1]=table.remove(s.hand,i)end end end
 assert(C.play(s,card.uid));eq(s.pendingDiscard,nil);eq(s.player.block,4);eq(s.discard[#s.discard-1],keep)
end
-- Discard trigger order is native: Tactician TOP precedes block; Reflex BOTTOM follows UseCard.
for _,trigger in ipairs({'tactician','reflex'})do
 local s,card=fresh(false);local chosen;for _,c in ipairs(s.hand)do if c~=card then chosen=c;break end end;chosen.cardId=trigger
 assert(C.play(s,card.uid));local p=assert(s.pendingDiscard);local energy=s.energy;local apply=C.applyEffects;local draw=C.draw;local blockSeen=false;local reflexSeen=false
 C.applyEffects=function(state,effects,...)
  for _,e in ipairs(effects)do if state==s and e.op=='block'then blockSeen=true;eq(state.energy,energy+(trigger=='tactician'and 1 or 0))end end
  return apply(state,effects,...)
 end
 C.draw=function(state,n,...)
  if state==s then reflexSeen=true;assert(blockSeen);assert(state.pendingPlay.keqingPaid.completed);eq(state.cardInUse,nil);eq(state.discard[#state.discard],card)end
  return draw(state,n,...)
 end
 local ok,result=pcall(C.chooseDiscard,s,{chosen.uid},p.token);C.applyEffects=apply;C.draw=draw;assert(ok,result);assert(result);assert(blockSeen);eq(reflexSeen,trigger=='reflex')
end
-- A native draw-time death stops choice and block, retaining actual paid death semantics.
do
 local s,card=fresh(false);local draw=C.draw;local energy=s.energy
 C.draw=function(state,n,...)local r=draw(state,n,...);if state==s then C.applyEffects(state,{{op='loseHp',value=state.player.hp}},state.player,state.player)end;return r end
 local ok,result=pcall(C.play,s,card.uid);C.draw=draw;assert(ok,result);assert(result)
 eq(s.player.hp,0);eq(s.player.block,0);eq(s.energy,energy-1);eq(s.pendingDiscard,nil)
end
-- Same admission protects the free automatic path and refuses unknown semantics.
local CardActions=require('abyss_card_actions')
for _,mode in ipairs({'normal','unmarked','silentFinalCard','runNativeABI','fixed'})do
 local s,card=fresh(false);local def=s.catalog.cards.kq043
 if mode=='unmarked'then def.keqingCandidate=nil elseif mode=='fixed'then def.effects[1].fixed=true elseif mode~='normal'then def[mode]=true end
 for i,c in ipairs(s.hand)do if c==card then table.remove(s.hand,i);break end end
 local energy=s.energy;C.queueCard(s,card,{exhaustCards=false});CardActions.drain(C,s);eq(s.energy,energy)
 if mode=='normal'then local p=assert(s.pendingDiscard);assert(C.chooseDiscard(s,{p.handUids[1]},p.token));eq(s.player.block,4)else eq(s.pendingDiscard,nil);eq(s.player.block,0)end
end
print('KQ043_TRANSACTION_AND_TRIGGER_PASS')
-- Insufficient payment is rejected before draw/reveal or RNG changes.
do
 local s,card=fresh(false);s.energy=0;local before=C.copy(s);eq(C.play(s,card.uid),false);same(s,before)
end
-- Top-level ordinary draw/discard/block remains deliberately rejected.
do
 local s,card=fresh(false);local d=s.catalog.cards.kq043;d.keqingCandidate=nil;d.keqingStage=nil
 d.effects={{op='draw',value=1},{op='requestDiscard',value=1},{op='block',value=4}}
 local before=C.copy(s);local ok,why=C.play(s,card.uid);eq(ok,false);assert(tostring(why):find('discard_must_end_card'));same(s,before)
end
print('KQ043_ADMISSION_PASS')
