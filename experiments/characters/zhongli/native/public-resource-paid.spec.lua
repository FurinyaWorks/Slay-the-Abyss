-- Verified against shared 837f5d12; exact limited evidence in public-resource-paid-results.json.
-- No replacement of public C.play/payment.
package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local Actors=require('abyss_actor')
local function fresh(up)
 local d=C.copy(D)
 d.cards.cards[#d.cards.cards+1]={id='zl03',name='HOLD',type='skill',cost=2,target='SELF',rarity='special',color='colorless',experimental=true,zhongliCandidate=true,effects={{op='zhongliCard',kind='gainJade',value=12}},upgrade={effects={{op='zhongliCard',kind='gainJade',value=16}}}}
 d.cards.cards[#d.cards.cards+1]={id='zl04',name='HOLD',type='attack',cost=1,target='ENEMY',rarity='special',color='colorless',experimental=true,zhongliCandidate=true,effects={{op='zhongliCard',kind='spendJade',value=6},{op='damage',value=14}},upgrade={effects={{op='zhongliCard',kind='spendJade',value=6},{op='damage',value=18}}}}
 local s=C.new(d,{seed=4,deck={{cardId='zl03',upgraded=up},{cardId='zl04',upgraded=up}},enemies={'cultist'},candidateLifecycle={kind='zhongli',relicEnabled=false}})
 s.enemies[1].hp=100;s.enemies[1].maxHp=100
 return s
end
local function card(s,id)for _,c in ipairs(s.hand)do if c.cardId==id then return c end end;error('missing hand card')end
for _,up in ipairs({false,true})do
 local s=fresh(up);local gain=card(s,'zl03');local spend=card(s,'zl04');local before=C.copy(s)
 eq(C.play(s,spend.uid,1),false);same(s,before) -- insufficient resource must reject before energy.
 eq(C.play(s,gain.uid),true);eq(s.energy,1);eq(s.zhongliCandidate.jade,up and 16 or 12)
 before=C.copy(s);eq(C.play(s,spend.uid,99),false);same(s,before)
 assert(C.play(s,spend.uid,1));eq(s.energy,0);eq(s.zhongliCandidate.jade,up and 10 or 6);eq(s.enemies[1].hp,up and 82 or 86)
 eq(#s.discard,2);eq(s.discard[1],gain);eq(s.discard[2],spend);eq(s.pendingPlay,nil);eq(s.cardInUse,nil)
 before=C.copy(s);eq(C.play(s,spend.uid,1),false);same(s,before)
 -- Ordinary modifiers, not fixed final damage. Resource storage does not bypass them.
 s=fresh(up);assert(C.play(s,card(s,'zl03').uid));Actors.applyPower(s,s.player,'strength',2,s.player);Actors.applyPower(s,s.player,'weak',1,s.enemies[1]);Actors.applyPower(s,s.enemies[1],'vulnerable',1,s.player);s.enemies[1].block=5
 assert(C.play(s,card(s,'zl04').uid,1));eq(s.enemies[1].hp,up and 83 or 87)
 -- Cap storage is a legitimate paid no-op, not free energy or a refund.
 s=fresh(up);s.zhongliCandidate.jade=20;assert(C.play(s,card(s,'zl03').uid));eq(s.energy,1);eq(s.zhongliCandidate.jade,20)
 -- Lethal ordinary attack completes original UID disposition; no ad hoc jade refund.
 s=fresh(up);assert(C.play(s,card(s,'zl03').uid));s.enemies[1].hp=1;spend=card(s,'zl04');assert(C.play(s,spend.uid,1));eq(s.zhongliCandidate.jade,up and 10 or 6);eq(s.discard[#s.discard],spend)
end
print('AUTHOR_PUBLIC_ZL_RESOURCE_PAID_PASS: 03->04 fits natural3 energy; resource/UID/cap/ordinary modifiers/lethal disposition')
