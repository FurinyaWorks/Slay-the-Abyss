package.path='src/lua/?.lua;build/lua/?.lua;'..package.path
local H=dofile('tests/helpers/act2_event_relics.lua');local C,D,R,eq,same=H.C,H.Data,H.Run,H.eq,H.same
local F=require('abyss_keqing_utility_reward_run');local Paid=require('abyss_keqing_paid_cards')
for _,id in ipairs({'KQ046','KQ051','KQ066'})do for _,up in ipairs({false,true})do for _,mode in ipairs({'stage'})do
 local r=F.new(D,42);assert(R.obtainCard(r,id,{upgraded=up}));local uid=r.deck[#r.deck].uid;assert(R.startCombat(r,'cultist_solo'))
 local s=r.combat;local c;for _,pile in ipairs({s.hand,s.draw})do for i=#pile,1,-1 do if pile[i].deckUid==uid then c=table.remove(pile,i)end end end
 assert(c);s.hand[#s.hand+1]=c;s.keqingResource.infusion=2;s.keqingResource.wedgeUntil=s.turn+1
 local snap=C.copy(r);local resources,hand,deck,combat=s.keqingResource,s.hand,r.deck,r.combat;local original=Paid.dispatch;local draw=C.draw;local hit=false
 if mode=='stage'then
 Paid.dispatch=function(core,state,e,q)local out=original(core,state,e,q);if state==s then hit=true;error('after resource draw')end;return out end
 else C.draw=function(state,n)local out=draw(state,n);if state==s then hit=true;error('after actual draw')end;return out end end
 eq(pcall(R.play,r,c.uid),false);Paid.dispatch=original;C.draw=draw;assert(hit);same(r,snap);eq(r.deck,deck);eq(r.combat,combat);eq(s.hand,hand);eq(s.keqingResource,resources)
 assert(R.play(r,c.uid));eq((id=='KQ051'and s.discard or s.exhaust)[#(id=='KQ051'and s.discard or s.exhaust)],c);eq(c.deckUid,uid);eq(s.keqingResource.infusion,2)
end end end
print('KEQING_UTILITY_RUN_ROLLBACK_PASS 6 base/up permanent UID whole graph rollback retry')
