package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,eq,same=H.C,H.Data,H.eq,H.same
local defs=require('abyss_ganyu_native_cards').definitions()
for _,id in ipairs({'12','57','61','73'})do for _,up in ipairs({false,true})do
 local d=C.copy(D);for _,v in ipairs(defs.cards)do d.cards.cards[#d.cards.cards+1]=v end
 local key='ganyu_lab_'..id;local s=C.new(d,{deck={{cardId=key,upgraded=up},'defend','defend','defend','defend'},enemies={'jaw_worm'},seed=41,candidateLifecycle={kind='ganyu',relicEnabled=false}})
 eq(s.characterCandidate,'ganyu');assert(s.experimentalMechanics);local c
 for i,v in ipairs(s.hand)do if v.cardId==key then c=table.remove(s.hand,i);break end end;assert(c)
 for i=#s.hand,1,-1 do s.draw[#s.draw+1]=table.remove(s.hand,i)end;s.hand={c};s.enemies[1].hp=1;s.enemies[1].block=0
 local resource=C.copy(s.ganyuResource);assert(C.play(s,c.uid,1));eq(s.enemies[1].hp,0);eq(#s.hand,0);same(s.ganyuResource,resource)
 eq(s.player.block,id=='12'and(up and 4 or 3)or id=='61'and(up and 16 or 12)or 0)
 local seen={};local n=0;for _,pile in ipairs({s.hand,s.draw,s.discard,s.exhaust})do for _,v in ipairs(pile)do assert(not seen[v.uid]);seen[v.uid]=true;n=n+1 end end;eq(n,5)
 local pile=id=='73'and s.exhaust or s.discard;local found=false;for _,v in ipairs(pile)do if v==c then found=true end end;assert(found)
 local before=C.copy(s);eq(C.play(s,c.uid,1),false);same(s,before)
end end
print('AUTHOR_PASS8 base/up final kill native tail distinction, original UID disposition/conservation/replay and ganyu context')
