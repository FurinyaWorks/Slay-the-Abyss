package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,R,D,eq,same=H.C,H.Run,H.Data,H.eq,H.same
local F=require('abyss_keqing_conditional_attacks');local Starter=require('abyss_keqing_starter_run')
local beforeData=C.copy(D)
for _,id in ipairs({'KQ008','KQ018','KQ025'})do for _,up in ipairs({false,true})do
 local d=C.copy(D);for _,def in ipairs(F.definitions().cards)do d.cards.cards[#d.cards.cards+1]=def end
 local r=Starter.new(d,42);assert(R.obtainCard(r,id,{upgraded=up}));local permanent=r.deck[#r.deck];eq(#r.deck,11)
 assert(R.startCombat(r,'cultist_solo'));local s=r.combat;local played=false
 local original={};for _,c in ipairs(r.deck)do original[c.uid]={cardId=c.cardId,upgraded=c.upgraded}end
 local function identity()
  local seen,uids,n={},{},0
  for _,name in ipairs({'hand','draw','discard','exhaust'})do for _,c in ipairs(s[name])do
   local source=assert(original[c.deckUid]);assert(not seen[c.deckUid]and not uids[c.uid]);seen[c.deckUid]=true;uids[c.uid]=true;n=n+1;eq(c.cardId,source.cardId);eq(c.upgraded,source.upgraded)
  end end
  eq(n,11);for owner in pairs(original)do assert(seen[owner])end
 end
 for turn=1,5 do
  identity();local found
  for _,c in ipairs(s.hand)do if c.deckUid==permanent.uid then found=c end end
  if found then
   -- Branch based only on the visible acquired UID. No hidden-order selection.
   local energy=s.energy;local inf=s.keqingResource.infusion;local wedge=s.keqingResource.wedgeUntil
   assert(R.play(r,found.uid,1));eq(s.energy,energy-(id=='KQ025'and 2 or 1));eq(s.keqingResource.infusion,math.max(0,inf-1));eq(s.keqingResource.wedgeUntil,wedge);identity();played=true;break
  end
  -- Spend visible defensive cards only to stay alive while naturally drawing the acquisition.
  for i=#s.hand,1,-1 do local c=s.hand[i];if c.cardId=='KQ002'and s.energy>0 then assert(R.play(r,c.uid,1));identity()end end
  assert(R.endTurn(r));identity()
 end
 assert(played,'acquired support card did not reach real paid play')
 print('SUPPORT_PAIR_PUBLIC_PLAY '..id..' upgraded='..tostring(up))
end end
same(D,beforeData);print('KQ_CONDITIONAL_PUBLIC_ACQUISITION_PASS 6')
